
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
var _ = require('./public/javascripts/extern/underscore-min.js');
var simulation = require('./public/javascripts/simulation.js');
var pubsub = require('./public/javascripts/pubsub.js');
var sim = simulation.Simulation(null, { type: simulation.SERVER });
var commands = require('./commands');

var DEBUG_NET = false;

// Configuration
//
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

io.configure(function() {
  io.set('transports', ['websocket']);
  io.set('log level', 1);
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'n&bull;fold',
    layout: false
  });
});

sim.net.broadcast = function(msg, data) {
  if (DEBUG_NET && msg !== 'entity_update') { console.log('SEND: %s, %j', msg, data); }
  io.sockets.emit(msg, { data: data, broadcast: false });
};

io.sockets.on('connection', function(socket) {

  var network_message = function(msg, fn) {
    socket.on(msg, function(payload) {
      payload = payload || {};
      fn(payload.data, payload);
      if (DEBUG_NET && msg !== 'entity_update') { console.log('RECV: %s, %j', msg, payload); }
      if (payload.broadcast) {
        socket.broadcast.emit(msg, payload);
      }
    });
  };

  socket.emit('sync', { data: _.map(sim.get_objects(), function(o) { return o.serialize(); })});

  network_message('hello', function(data) {
    socket.set('client_id', data);
    console.log("Client " + data + " connected.");
  });

  network_message('disconnect', function() {
    socket.get('client_id', function(err, client_id) {
      sim.kill(client_id, true);
    });
  });

  network_message('entity_update', function(data) {
    sim.update_entity(data);
  });

  network_message('new_entities', function(data) {
    _.each(data, function(opts) { sim.deserialize(opts); });
  });

  network_message('chat', function(data, payload) {
    if (data.text[0] === '/') {
      var tokens = _.compact(data.text.split(/\s+/));
      payload.broadcast = false;
      commands.handle_command.call(this, socket, sim, data.sender, data.entity_id, tokens[0].slice(1), tokens.slice(1));
    }
  });
});

pubsub.subscribe('entity:powerup_added', function(data) {
  sim.net.broadcast('entity:powerup_added', data);
});

function timebox(fn, cb) {
  var st = (new Date).getTime();
  fn();
  var et = (new Date).getTime();
  cb(et - st);
}

// simulation setup
for (var i = 0; i < 10; i++) {
  var bounds = sim.world_bounds();
  sim.spawn({
    type: 'powerup_nonagon',
    position: [
      bounds.min_x + (Math.random() * bounds.max_x - bounds.min_x),
      bounds.min_y + (Math.random() * bounds.max_y - bounds.min_y)
    ]
  });
}

function loop() {
  timebox(function() { sim.tick(); }, function(simulation_time) {
    setTimeout(loop, Math.max(20 - simulation_time, 0));
  });
}

loop();

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
