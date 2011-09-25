
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
var _ = require('./public/javascripts/extern/underscore-min.js');
var simulation = require('./public/javascripts/simulation.js');
var sim = simulation.Simulation({ type: simulation.SERVER });

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
}

io.sockets.on('connection', function(socket) {

  var network_message = function(msg, fn) {
    socket.on(msg, function(payload) {
      payload = payload || {};
      fn(payload.data);
      if (DEBUG_NET && msg !== 'entity_update') { console.log('RECV: %s, %j', msg, payload.data); }
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
});

function timebox(fn, cb) {
  var st = (new Date).getTime();
  fn();
  var et = (new Date).getTime();
  cb(et - st);
}

function loop() {
  timebox(function() { sim.tick(); }, function(simulation_time) {
    setTimeout(loop, Math.max(20 - simulation_time, 0));
  });
}

loop();

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
