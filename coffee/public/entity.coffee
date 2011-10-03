entity = exports ? (->this.entity={})()

if exports?
  (->
    this._ = require('../extern/underscore-min')
    require('../math')
    this.render = ('../render')
    this.pubsub = require('../pubsub')
  )()

_.extend entity,
  MOVE_SERVER:      0x0001
  SIMULATE_SERVER:  0x0002
  COLLIDE_SERVER:   0x0004
  MOVE_CLIENT:      0x0008
  SIMULATE_CLIENT:  0x0010
  COLLIDE_CLIENT:   0x0020
  SPAWN_SERVER:     0x0040
  SPAWN_CLIENT:     0x0080
  VISIBLE:          0x0010
  PHYSICAL:         0x0020

physics =

  none: (dt, sim) ->

  standard: (dt, sim) ->
    o = this
    world_bounds = sim.world_bounds()
    if (vec2.nonzero(o.acceleration))
      o.velocity = vec2.add(o.velocity, vec2.scale(o.acceleration, dt))

    if (o.angular_velocity != 0)
      o.rotation += rangewrap(o.rotation + o.angular_velocity*dt);

    if (vec2.nonzero(o.velocity))
      if (o.drag_coefficient)
        speed = vec2.length(o.velocity)
        drag = vec2.scale(vec2.normalize(o.velocity), -speed*speed*o.drag_coefficient)
        o.velocity = vec2.add(o.velocity, vec2.scale(drag, dt))

      new_pos = vec2.add(o.position, vec2.scale(o.velocity, dt))
      o.position = [
        rangelimit(new_pos[0], world_bounds.min_x, world_bounds.max_x - 0.00001),
        rangelimit(new_pos[1], world_bounds.min_y, world_bounds.max_y - 0.00001)
      ]

      if (o.position[0] == world_bounds.min_x || o.position[0] == world_bounds.max_x)
        o.velocity[0] = 0
      if (o.position[1] == world_bounds.min_y || o.position[1] == world_bounds.max_y)
        o.velocity[1] = 0

# Main factory method to create entities
# opts must have a 'type' property, eg. { type: 'player' }
entity.create = (opts) ->
  e = entity[opts.type](opts)
  e._init()
  e

entity.Entity = (opts) ->
  obj = {}
  defaults =
    id: (opts.type || 'Entity') + ':' + Math.round(Math.random() * 0xFFFFFFFF).toString(16)
    type: 'Entity'

    flags: 0

    # rendering
    render: render.none
    prerender: render.prerender
    postrender: render.postrender

    # physics
    position: [320, 240]
    velocity: [0, 0]
    acceleration: [0, 0]
    angular_velocity: 0
    rotation: 0
    drag_coefficient: 0
    update_physics: physics.standard

    # collision stuff
    radius: 0

    init_collide: -> collide.AABB_cwh(this.position, this.radius*2, this.radius*2, { flags: entity.PHYSICAL | entity.VISIBLE })
    update_collide: -> this.collide.update_cwh(this.position, this.radius*2, this.radius*2)
    simulate: (dt) ->
    rotate: (theta) -> this.rotation += rangewrap(theta, 2*Math.PI)
    spawn: ->
    kill: ->
      this.remove_me = true
      pubsub.publish('killed', this.id)

    position_data: ->
      id: this.id
      position: this.position
      velocity: this.velocity
      acceleration: this.acceleration
      rotation: this.rotation

    serialize: ->
      out = {};
      _.each(this, (v, k) ->
        if (_.isNumber(v) || _.isArray(v) || _.isString(v))
          out[k] = v
      )
      out

    deserialize: (data) ->
      _.extend(this, data)

    _init: ->
      this.collide = this.init_collide()
      this.collide.entity = this

    _simulate: (dt, sim) ->
      this.update_physics(dt, sim)
      this.simulate(dt, sim)
      this.update_collide(dt, sim)

  _.extend(obj, defaults, opts)

entity.Projectile = (opts) ->
  initial_velocity = 300

  o =
    type: 'Projectile'
    damage: 25
    render: render.projectile

    lifespan: 2.0
    radius: 1
    age: 0
    flags: entity.SPAWN_CLIENT | entity.SPAWN_SERVER

    init_collide: -> collide.Point(this.position, { flags: entity.PHYSICAL | entity.VISIBLE })
    update_collide: -> this.collide.update_point(this.position)

    simulate: (dt) ->
      this.age += dt
      if (this.age > this.lifespan)
        this.kill()

    spawn: ->
      this.velocity = vec2.add(this.velocity, mat2.transform(mat2.rotate(this.rotation), [0, initial_velocity]))

    kill: ->
      this.remove_me = true
      this.sim.spawn({ type: 'Explosion', position: this.position }, false)

  _.extend(entity.Entity(o), opts)


entity.Explosion = (opts) ->
  o =
    type: 'Explosion'
    age: 0
    lifespan: Math.random() * 0.75 + 0.25
    expansion_rate: Math.random() * 100 + 50
    radius: 1
    flags: entity.SPAWN_CLIENT
    render: render.explosion

    init_collide: -> collide.Point(this.position, { flags: entity.VISIBLE })
    update_collide: ->

    simulate: (dt) ->
      this.age += dt;
      if (this.age >= this.lifespan)
        this.kill()
      else
        this.radius += this.expansion_rate * dt;

  _.extend(entity.Entity(o), opts)

entity.Player = (opts) ->

  autofire_rate = 250
  last_fire = 0

  calculate_powerup_flags = (powerups) ->
    flags = 0x0
    _.each(powerups, (pu) -> flags = (flags | pu.flags))
    flags

  o =
    type: 'Player'
    flags: entity.COLLIDE_SERVER | entity.SPAWN_SERVER | entity.SPAWN_CLIENT

    heal_rate: 10
    health: 100
    max_health: 100
    name: 'player'
    rotate_speed: 4.0
    thrust: 500.0
    reverse_thrust: 250.0

    render: render.player

    powerup_flags: 0x0
    powerups: {}
    projectile: 'Projectile'

    # physics
    drag_coefficient: 0.01

    # collide
    radius: 8

    handle_input: (input, dt) ->
      if (input.is_pressed(37)) 
        this.rotate(-this.rotate_speed * dt)
      if (input.is_pressed(39))
        this.rotate( this.rotate_speed * dt)

      this.acceleration = [0, 0]
      if (input.is_pressed(38)) 
        this.acceleration = mat2.transform(mat2.rotate(this.rotation), [0, this.thrust])
      if (input.is_pressed(40))
        this.acceleration = mat2.transform(mat2.rotate(this.rotation + Math.PI), [0, this.reverse_thrust])

      if (input.is_pressed(32))
        rate = if (this.powerup_flags & PU_DOUBLERATE) then autofire_rate*0.25 else autofire_rate
        t = (new Date).getTime()
        if (t - last_fire > rate)
          this.fire()
          last_fire = t

    fire: ->
      opts =
        type: this.projectile
        owner: this.id
        position: this.position
        velocity: this.velocity
        rotation: this.rotation

      noisy = (x, variance) -> x + Math.random()*variance - 0.5*variance

      if (this.powerup_flags & (PU_DOUBLESPREAD | PU_TRIPLESPREAD | PU_NONAGUN))
        if (this.powerup_flags & PU_DOUBLESPREAD)
          spread = 0.0872664626 * 2
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - spread }), true)
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + spread }), true)
        if (this.powerup_flags & PU_TRIPLESPREAD)
          spread = 0.0872664626 * 4
          this.sim.spawn(opts, true)
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, Math.random()) }), true)
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, noisy(1.0, 0.5)) }), true)
        if (this.powerup_flags & PU_NONAGUN)
          count = 9;
          spread = (2 * Math.PI) / count
          variance = 0.25 * spread;
          i = 0
          while i < count
            this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread*i, variance) }), true)
            i++
      else
        this.sim.spawn(opts, true)

    simulate: (dt, sim) ->
      self = this
      this.handle_input(sim.input, dt) if this.local_player
      this.health = rangelimit(this.health + this.heal_rate * dt, 0, this.max_health)

      # update powerups
      removed_powerups = []
      _.each(self.powerups, (pu) ->
        pu.ttl -= dt
        removed_powerups.push(pu) if (pu.ttl <= 0)  
      )
      _.each(removed_powerups, (pu) -> self.remove_powerup(pu.type))

    damage: (amount, owner) ->
      this.health -= amount
      if (this.health <= 0)
        this.kill()
      else
        pubsub.publish('damage', { entity: this, amount: amount })


    # server
    add_powerup: (powerup_type) ->
      return if (this.sim.type != 'server')
      this.powerups[powerup_type] = entity.powerups.create(powerup_type)
      this.powerup_flags = calculate_powerup_flags(this.powerups)
      this.sim.net.broadcast('entity_update', { id: this.id, powerups: this.powerups, powerup_flags: this.powerup_flags })

    # client, server
    remove_powerup: (powerup_type) ->
      delete this.powerups[powerup_type]
      this.powerup_flags = calculate_powerup_flags(this.powerups)

  _.extend(entity.Entity(o), opts);

entity.powerup = (opts) ->
  _.extend(entity.Entity({
    type: 'powerup',
    powerup_type: null,
    radius: 2,
    flags: entity.SPAWN_SERVER,
    render: render.debug,
    init_collide: -> collide.Point(this.position, { flags: entity.VISIBLE | entity.PHYSICAL }),
    update_collide: ->,
    collide_player: (player) ->
      player.add_powerup(this.powerup_type)
      this.kill()
  }), opts)

entity.powerup_nonagon = (opts) ->
  entity.powerup(_.extend({
    powerup_type: 'nonagun'
  }, opts))

PU_DOUBLERATE   = 0x0001
PU_DOUBLESPREAD = 0x0002
PU_TRIPLESPREAD = 0x0004
PU_NONAGUN      = 0x0008

entity.powerups =
  create: (powerup_type) ->
    _.extend({}, entity.powerups[powerup_type])
  doublerate:
    flags: PU_DOUBLERATE
    type: 'doublerate'
    ttl: 10
  doublespread:
    flags: PU_DOUBLESPREAD
    type: 'doublespread'
    ttl: 10
  triplespread:
    type: 'triplespread'
    flags: PU_TRIPLESPREAD
    ttl: 10
  nonagun:
    type: 'nonagun'
    flags: PU_NONAGUN
    ttl: 10
  awesomeness:
    type: 'awesomeness'
    flags: PU_DOUBLERATE | PU_NONAGUN
    ttl: 10