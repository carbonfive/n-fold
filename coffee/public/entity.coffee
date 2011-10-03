entity = exports ? (->@entity={})()

if exports?
  (->
    @_ = require('../extern/underscore-min')
    require('../math')
    @render = require('../render')
    @pubsub = require('../pubsub')
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
    @velocity = vec2.add(@velocity, vec2.scale(@acceleration, dt)) if vec2.nonzero(@acceleration)
    @rotation += rangewrap(@rotation + @angular_velocity*dt) if @angular_velocity != 0

    if vec2.nonzero(@velocity)
      world_bounds = sim.world_bounds()
      if (@drag_coefficient)
        speed = vec2.length(@velocity)
        drag = vec2.scale(vec2.normalize(@velocity), -speed*speed*@drag_coefficient)
        @velocity = vec2.add(@velocity, vec2.scale(drag, dt))

      new_pos = vec2.add(@position, vec2.scale(@velocity, dt))
      @position = [
        rangelimit(new_pos[0], world_bounds.min_x, world_bounds.max_x - 0.00001),
        rangelimit(new_pos[1], world_bounds.min_y, world_bounds.max_y - 0.00001)
      ]
      @velocity[0] = 0 if (@position[0] == world_bounds.min_x || @position[0] == world_bounds.max_x)
      @velocity[1] = 0 if (@position[1] == world_bounds.min_y || @position[1] == world_bounds.max_y)

# Main factory method to create entities
# opts must have a 'type' property, eg. { type: 'player' }
entity.create = (opts) ->
  new entity[opts.type](opts)

class Entity
  type: 'Entity'
  flags: 0

  constructor: (opts) ->
    @id = (opts.type || 'Entity') + ':' + Math.round(Math.random() * 0xFFFFFFFF).toString(16)
    # physics
    @position = [320, 240]
    @velocity = [0, 0]
    @acceleration = [0, 0]
    @angular_velocity = 0
    @rotation = 0

    _.extend(this, opts)
    @collide = @init_collide()
    @collide.entity = this

  update_physics: physics.standard

  render: (o, ctx) ->
    (render[@type.toLowerCase()] ? render.debug)(o, ctx)

  prerender: render.prerender

  postrender: render.postrender

  init_collide: ->
    collide.AABB_cwh(@position, @radius*2, @radius*2, { flags: entity.PHYSICAL | entity.VISIBLE })

  update_collide: ->
    @collide.update_cwh(@position, @radius*2, @radius*2)

  simulate: (dt) ->

  rotate: (theta) ->
    @rotation += rangewrap(theta, 2*Math.PI)

  spawn: ->

  kill: ->
    @remove_me = true
    pubsub.publish('killed', @id)

  position_data: ->
    id: @id
    position: @position
    velocity: @velocity
    acceleration: @acceleration
    rotation: @rotation

  serialize: ->
    out = {}
    _.each this, (v, k) ->
      if (_.isNumber(v) || _.isArray(v) || _.isString(v))
        out[k] = v
    out

  deserialize: (data) ->
    _.extend(this, data)

  _simulate: (dt, sim) ->
    @update_physics(dt, sim)
    @simulate(dt, sim)
    @update_collide(dt, sim)


entity.Projectile = class extends Entity
  initial_velocity = 300
  type: 'Projectile'
  damage: 25
  radius: 1
  lifespan: 2.0
  flags: entity.SPAWN_CLIENT | entity.SPAWN_SERVER

  constructor: (opts) ->
    super opts
    @age = 0

  init_collide: ->
    collide.Point(@position, { flags: entity.PHYSICAL | entity.VISIBLE })

  update_collide: ->
    @collide.update_point(@position)

  simulate: (dt) ->
    @age += dt
    @kill() if @age > @lifespan

  spawn: ->
    @velocity = vec2.add(@velocity, mat2.transform(mat2.rotate(@rotation), [0, initial_velocity]))

  kill: ->
    super
    @sim.spawn({ type: 'Explosion', position: @position }, false)

  collide_player: (player) ->
    @sim.kill(@id, true)
    player.damage(@damage, @owner)

entity.Explosion = class extends Entity
  type: 'Explosion'
  age: 0
  lifespan: Math.random() * 0.75 + 0.25
  expansion_rate: Math.random() * 100 + 50
  radius: 0
  flags: entity.SPAWN_CLIENT

  constructor: (opts) ->
    super opts
    @render_radius = 1

  init_collide: ->
    collide.Point(@position, { flags: entity.VISIBLE })

  update_collide: ->

  simulate: (dt) ->
    @age += dt
    if (@age >= @lifespan) then @kill() else @render_radius += @expansion_rate * dt

entity.Player = class extends Entity
  type: 'Player'
  flags: entity.COLLIDE_SERVER | entity.SPAWN_SERVER | entity.SPAWN_CLIENT
  heal_rate: 10
  rotate_speed: 4.0
  thrust: 500.0
  reverse_thrust: 250.0
  drag_coefficient: 0.01
  radius: 8

  autofire_rate = 250

  calculate_powerup_flags = (powerups) ->
    flags = 0x0
    _.each(powerups, (pu) -> flags = (flags | pu.flags))
    flags

  constructor: (opts) ->
    super opts
    @last_fire = 0
    @health = 100
    @max_health = 100
    @name = 'player'
    @powerup_flags = 0x0
    @powerups = {}
    @projectile = 'Projectile'
    
  handle_input: (input, dt) ->
    @rotate(-@rotate_speed * dt) if (input.is_pressed(37))
    @rotate( @rotate_speed * dt) if (input.is_pressed(39))

    @acceleration = [0, 0]
    @acceleration = mat2.transform(mat2.rotate(@rotation), [0, @thrust]) if input.is_pressed(38)
    @acceleration = mat2.transform(mat2.rotate(@rotation + Math.PI), [0, @reverse_thrust]) if input.is_pressed(40)

    if input.is_pressed(32)
      rate = if (@powerup_flags & PU_DOUBLERATE) then autofire_rate*0.5 else autofire_rate
      t = (new Date).getTime()
      if (t - @last_fire > rate)
        @fire()
        @last_fire = t

  fire: ->
    opts =
      type: @projectile
      owner: @id
      position: @position
      velocity: @velocity
      rotation: @rotation

    noisy = (x, variance) -> x + Math.random()*variance - 0.5*variance

    if (@powerup_flags & (PU_DOUBLESPREAD | PU_TRIPLESPREAD | PU_NONAGUN))
      if (@powerup_flags & PU_DOUBLESPREAD)
        spread = 0.0872664626 * 2
        @sim.spawn(_.extend({}, opts, { rotation: opts.rotation - spread }), true)
        @sim.spawn(_.extend({}, opts, { rotation: opts.rotation + spread }), true)
      if (@powerup_flags & PU_TRIPLESPREAD)
        spread = 0.0872664626 * 4
        @sim.spawn(opts, true)
        @sim.spawn(_.extend({}, opts, { rotation: opts.rotation - noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, Math.random()) }), true)
        @sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, noisy(1.0, 0.5)) }), true)
      if (@powerup_flags & PU_NONAGUN)
        count = 9;
        spread = (2 * Math.PI) / count
        variance = 0.25 * spread;
        i = 0
        while i < count
          @sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread*i, variance) }), true)
          i++
    else
      @sim.spawn(opts, true)

  simulate: (dt, sim) ->
    @handle_input(sim.input, dt) if @local_player
    @health = rangelimit(@health + @heal_rate * dt, 0, @max_health)

    removed_powerups = []
    _.each @powerups, (pu) ->
      pu.ttl -= dt
      removed_powerups.push(pu) if pu.ttl <= 0
    _.each(removed_powerups, ((pu) -> @remove_powerup(pu.type)), this)

  damage: (amount, owner) ->
    @health -= amount
    if (@health <= 0)
      @kill()
    else
      pubsub.publish('damage', { entity: this, amount: amount })

  # server
  add_powerup: (powerup_type) ->
    return if (@sim.type != 'server')
    @powerups[powerup_type] = entity.powerups.create(powerup_type)
    @powerup_flags = calculate_powerup_flags(@powerups)
    @sim.net.broadcast('entity_update', { id: @id, powerups: @powerups, powerup_flags: @powerup_flags })

  # client, server
  remove_powerup: (powerup_type) ->
    delete @powerups[powerup_type]
    @powerup_flags = calculate_powerup_flags(@powerups)


entity.powerup = class extends Entity
  type: 'powerup'
  powerup_type: null
  radius: 2
  flags: entity.SPAWN_SERVER

  init_collide: ->
    collide.Point(@position, { flags: entity.VISIBLE | entity.PHYSICAL })

  update_collide: ->

  collide_player: (player) ->
    player.add_powerup(@powerup_type)
    @kill()

entity.powerup_doublerate = class extends entity.powerup
  type: 'powerup_doublerate'
  powerup_type: 'doublerate'

entity.powerup_doublespread = class extends entity.powerup
  type: 'powerup_doublespread'
  powerup_type: 'doublespread'

entity.powerup_triplespread = class extends entity.powerup
  type: 'powerup_triplespread'
  powerup_type: 'triplespread'

entity.powerup_nonagun = class extends entity.powerup
  type: 'powerup_nonagun'
  powerup_type: 'nonagun'

entity.powerup_awesomeness = class extends entity.powerup
  type: 'powerup_awesomeness'
  powerup_type: 'awesomeness'

PU_DOUBLERATE   = 0x0001
PU_DOUBLESPREAD = 0x0002
PU_TRIPLESPREAD = 0x0004
PU_NONAGUN      = 0x0008

entity.powerups =
  create: (powerup_type) ->
    _.extend({ ttl: 10 }, entity.powerups[powerup_type])
  doublerate:
    flags: PU_DOUBLERATE
    type: 'doublerate'
  doublespread:
    flags: PU_DOUBLESPREAD
    type: 'doublespread'
  triplespread:
    type: 'triplespread'
    flags: PU_TRIPLESPREAD
  nonagun:
    type: 'nonagun'
    flags: PU_NONAGUN
  awesomeness:
    type: 'awesomeness'
    flags: PU_DOUBLERATE | PU_NONAGUN