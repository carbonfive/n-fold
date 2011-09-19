
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
var _ = require('./public/javascripts/extern/underscore-min.js');
var simulation = require('./public/javascripts/simulation.js');
var sim = simulation.Simulation();

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

io.sockets.on('connection', function(socket) {

  socket.emit('sync', _.map(sim.get_objects(), function(o) {
    return o.serialize();
  }));

  socket.on('hello', function(data) {
    socket.set('client_id', data);
    console.log("Client ID ", data);
  });

  socket.on('disconnect', function() {
    socket.get('client_id', function(err, cid) {
      var player = sim.find_entity(cid);
      if (player) {
        player.kill();
      }
    });
  });

  socket.on('entity_update', function(data) {
    sim.update_entity(data);
    socket.broadcast.emit('entity_update', data);
  });

  socket.on('new_entities', function(data) {
    _.each(data.entities, function(opts) {
      opts.local = false;
      sim.add_entity.call(sim, opts);
    });
    socket.broadcast.emit('new_entities', data);
    console.log(data);
  });
});

var last_loop_time = 0;

function loop() {
  var loop_start = (new Date).getTime();
  sim.tick({});
  var loop_end = (new Date).getTime();
  schedule_loop(loop_end - loop_start);
  last_loop_time = loop_end;
}

function schedule_loop(loop_time) {
  setTimeout(loop, Math.max(20 - loop_time, 0));
}

loop();

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
