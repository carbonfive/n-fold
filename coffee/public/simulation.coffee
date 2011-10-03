simulation = exports ? (->this.simulation={})()

if exports?
  (->
    this._ = require('../extern/underscore-min')
    require('../math')
    this.pubsub = require('../pubsub')
    this.collide = require('../collide')
    this.entity = require('./entity')
  )()

_.extend simulation,
  SERVER: 'server'
  CLIENT: 'client'

simulation.Simulation = (input_manager, opts) ->

  world = {}
  collidees = []
  callbacks = []
  last_sim_time = 0
  world_bounds = collide.AABB(0, 0, 1024, 1024)

  collision_handlers =
    Player:
      Projectile: (sim, player, projectile) ->
        sim.kill(projectile.id, true)
        player.damage(projectile.damage, projectile.owner)

  # move this pubsub crap to network module
  pubsub.subscribe 'damage', (data) ->
    sim.net.broadcast 'entity_update',
      id: data.entity.id
      health: data.entity.health

  pubsub.subscribe 'killed', (entity_id) ->
    sim.net.broadcast('kill', entity_id)

  last_local_player_broadcast = 0
  pubsub.subscribe 'sim_endframe', (sim) ->
    if sim.local_player
      t = (new Date).getTime()
      if (t - last_local_player_broadcast >= 50)
        update_data = _.extend(sim.local_player.position_data(), { name: sim.local_player.name })
        sim.net.broadcast('entity_update', update_data)
        last_local_player_broadcast = t

  pubsub.subscribe 'entity:add_powerup', (data) ->
    world[data.entity_id].add_powerup(data.powerup_type)

  add_to_world = (e) ->
    world[e.id] = e
    sim.local_player = e if (e.local_player)
    e

  remove_from_world = (e) ->
    delete world[e.id]
    sim.local_player = null if (e.local_player)
    e

  create_quadtree = -> collide.QuadTree(world_bounds, { max_depth: 5, threshold: 8 })

  sim =
    type: simulation.SERVER
    collide_type: collide.CLIENT
    local_player: null
    quadtree: create_quadtree()
    broadcast_entities: []
    input: input_manager

    net:
      broadcast: ->
      send: ->

    tick: ->
      start_time = (new Date).getTime()
      dt = (start_time - last_sim_time) * 0.001
      self = this

      self.quadtree = create_quadtree()
      collidees = []

      _.each world, (o, key) ->

        o._simulate(dt, self)

        if o.remove_me
          remove_from_world(o)
        else
          self.quadtree.insert(o.collide)

          if ((self.type == simulation.SERVER && (o.flags & entity.COLLIDE_SERVER)) ||
              (self.type == simulation.CLIENT && (o.flags & entity.COLLIDE_CLIENT)))
            collidees.push(o)
 
      self.check_collisions(collidees)

      if this.broadcast_entities.length > 0
        this.net.broadcast 'new_entities', _.map this.broadcast_entities, (o) ->
          o.serialize()

      pubsub.publish('sim_endframe', self)

      this.broadcast_entities = []
      last_sim_time = start_time

    check_collisions: (players) ->
      self = this
      _.each players, (player) ->
        self.quadtree.each_object player.collide, (collidee) ->
          e = collidee.entity
          if e != player && e.owner != player.id
            handler = collision_handlers[player.type] && collision_handlers[player.type][e.type]
            if handler
              handler(self, player, e)
            else
              handler = e[('collide_' + player.type).toLowerCase()]
              if typeof(handler) == 'function'
                handler.call(e, player)

    find_entity: (id) ->
      world[id] || null

    # Creates and inserts, then calls the .spawn() method
    spawn: (opts, broadcast) ->
      e = entity.create(_.extend({ sim: this }, opts))

      if ((this.type == simulation.CLIENT && !(e.flags & entity.SPAWN_CLIENT)) ||
          (this.type == simulation.SERVER && !(e.flags & entity.SPAWN_SERVER)))
        return

      add_to_world(e)
      e.spawn()
      this.broadcast_entities.push(e) if broadcast
      e

    # Creates and inserts
    deserialize: (opts) ->
      add_to_world(entity.create(_.extend({ sim: this }, opts)))

    kill: (id, broadcast) ->
      o = world[id]
      if o
        o.kill()
        this.net.broadcast('kill', o.id) if broadcast
      else
        # console.log("Couldn't find object ", id, " to kill")

    update_entity: (data) ->
      o = world[data.id]
      _.extend(o, data) if o

    synchronize: (entities) ->
      self = this
      world = {}
      _.each entities, (opts) ->
        self.deserialize(opts)

    get_objects: -> _.values(world)

    each_entity: (bounds, fn) ->
      this.quadtree.each_object(bounds, (o) -> fn(o.entity) )

    get_world: -> world
    world_bounds: -> world_bounds

    get_current: -> this.find_entity(this.current)

    random_location: ->
      [
        Math.random() * (world_bounds.max_x - world_bounds.min_x) + world_bounds.min_x,
        Math.random() * (world_bounds.max_y - world_bounds.min_y) + world_bounds.min_y
      ]

  _.extend(sim, opts)