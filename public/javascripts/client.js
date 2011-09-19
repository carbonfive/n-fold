nfold = {
  background_color: '#fff',
  view_width: 640,
  view_height: 480,
  loop_interval: 20,
  render_debug: true,
};

$(function() {

  var ROTATE_LEFT = 37;
  var ROTATE_RIGHT = 39;
  var ROTATE_FIRE = 38;
  var client_id = $('span.name').text();

  var socket = io.connect('http://localhost:3000');

  socket.on('connect', function() {
    socket.emit('hello', client_id);
  });

  socket.on('sync', function(data) {
    sim.synchronize(data);
  });

  socket.on('entity_update', function(data) {
    sim.update_entity(data);
  });

  socket.on('new_entities', function(data) {
    _.each(data.entities, function(opts) {
      opts.local = false;
      sim.add_entity.call(sim, opts);
    });
  });

  var r = render('canvas.main');

  var sim = simulation.Simulation()
  sim.add_callback(function() {
    if (sim.new_entities.length > 0) {
      socket.emit('new_entities', { entities: sim.new_entities });
    }
  });
  var input = simulation.InputManger(sim);

  function schedule_loop(loop_time) {
    setTimeout(loop, Math.max(nfold.loop_interval - loop_time, 0));
  }

  function debug(loop_time, frame_time) {
    $('.debug .world_stats').html('num objects: ' + sim.get_objects().length);
    $('.debug .frame_time').html(loop_time.toString() + '/' + frame_time.toString());
  }

  $('button.start').click(function() {

    var player = sim.create_entity({
      id: client_id,
      type: 'Player',
      debug: true,
      position: [Math.random() * 640, Math.random() * 480]
    }, true);

    input.add_keydown_handler(32, function() {
      player.fire();
    });

    sim.add_callback(function() {
      socket.emit('entity_update', player.position_data());
    });

    $(this).remove();
  });

  var last_loop_time = 0;

  function loop() {
    loop_start_time = (new Date).getTime();
    sim.tick(input);
    r.render(sim);
    loop_end_time = (new Date).getTime();
    var loop_time = loop_end_time - loop_start_time;
    schedule_loop(loop_time);
    debug(loop_time, loop_end_time - last_loop_time);
    last_loop_time = loop_end_time;
  }

  loop();

  window.dump_stats = function() {
    console.log("Objects: %o", sim.get_world());
  }

});
