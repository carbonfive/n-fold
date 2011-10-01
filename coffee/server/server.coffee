root = exports ? (->this.server={})()

socketio = require('socket.io')
_ = require('../public/javascripts/extern/underscore-min')
simulation = require('../public/javascripts/simulation')
pubsub = require('../public/javascripts/pubsub')
commands = require('../commands')

sim = simulation.Simulation(null, { type: simulation.SERVER })

DEBUG_NET = false

root.startup = (app) ->
  io = socketio.listen(app)
  io.configure ->
    io.set('transports', ['websocket'])
    io.set('log level', 1)

  sim.net.broadcast = (msg, data) ->
    if DEBUG_NET && msg != 'entity_update'
      console.log('SEND: %s, %j', msg, data)
    io.sockets.emit(msg, { data: data, broadcast: false })

  io.sockets.on 'connection', (socket) ->

    network_message = (msg, fn) ->
      socket.on msg, (payload) ->
        payload = payload || {}
        fn(payload.data, payload)
        if DEBUG_NET && msg != 'entity_update'
          console.log('RECV: %s, %j', msg, payload)
        if (payload.broadcast)
          socket.broadcast.emit(msg, payload)

    socket.emit('sync', { data: _.map(sim.get_objects(), (o) -> o.serialize()) })

    network_message 'hello', (data) ->
      socket.set('client_id', data)
      console.log("Client " + data + " connected.")

    network_message 'disconnect', ->
      socket.get 'client_id', (err, client_id) ->
        sim.kill(client_id, true)

    network_message 'entity_update', (data) ->
      sim.update_entity data

    network_message 'new_entities', (data) ->
      _.each data, (opts)->sim.deserialize(opts)

    network_message 'chat', (data, payload) ->
      if data.text[0] == '/'
        tokens = _.compact data.text.split(/\s+/)
        payload.broadcast = false
        commands.handle_command.call(this, socket, sim, data.sender, data.entity_id, tokens[0].slice(1), tokens.slice(1))

  timebox = (fn, cb) ->
    st = (new Date).getTime()
    fn()
    et = (new Date).getTime()
    cb(et - st)

  main_loop = ->
    timebox((-> sim.tick()), (simulation_time) ->
      setTimeout(main_loop, Math.max(20 - simulation_time, 0))
    )

  #seed_powerups = ->
  #  console.log('seeding...')
  #  count = null
  #  sim.each_entity null, (o) ->
  #    if o.type == 'powerup'
  #      count += 1
  #
  #  # make sure there are 10 powerups in the world
  #  for (var i = 0; i < (10 - count); i++) {
  #    var bounds = sim.world_bounds();
  #    sim.spawn({
  #      type: 'powerup_nonagon',
  #      position: [
  #        bounds.min_x + (Math.random() * bounds.max_x - bounds.min_x),
  #        bounds.min_y + (Math.random() * bounds.max_y - bounds.min_y)
  #      ]
  #    }, true);
  #  }
  #  setTimeout(seed_powerups, 10 * 1000);
  #}
  #
  #seed_powerups();

  main_loop()