nfold = {
  background_color: '#fff',
  view_width: 640,
  view_height: 480,
  loop_interval: 10,
  render_debug: true,
};

$(function() {

  var ROTATE_LEFT = 37;
  var ROTATE_RIGHT = 39;
  var ROTATE_FIRE = 38;
  var client_id = $('span.name').text();

  var r = render('.main canvas');
  var sim = simulation.Simulation()
  var im = input.InputManager();

  var socket = io.connect();

  var network_message = function(msg, fn) {
    socket.on(msg, function(data) { fn(data); });
  };

  network_message('connect', function() {
    socket.emit('hello', client_id);
  });

  network_message('sync', function(data) {
    sim.synchronize(data);
  });

  network_message('entity_update', function(data) {
    sim.update_entity(data);
  });

  network_message('new_entities', function(data) {
    _.each(data, function(opts) {
      opts.local = false;
      sim.add_entity.call(sim, opts);
    });
  });

  network_message('kill', function(id) {
    sim.kill(id);
  });

  sim.add_post_tick_callback(function() {
    if (sim.new_entities.length > 0) {
      socket.emit('new_entities', sim.new_entities);
    }
  });

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
      local_player: true,
      debug: false,
      position: sim.random_location()
    }, true);

    sim.current = client_id;

    im.add_keydown_handler(32, function() {
      player.fire();
    });

    var last_pos_update = 0;
    sim.add_post_tick_callback(function() {
      var t = (new Date).getTime();
      if (t - last_pos_update >= 50) {
        socket.emit('entity_update', player.position_data());
        last_pos_update = t;
      }
    });

    $(this).remove();
  });

  var last_loop_time = 0;

  function loop() {
    loop_start_time = (new Date).getTime();
    sim.tick(im);
    r.render(sim);
    loop_end_time = (new Date).getTime();
    var loop_time = loop_end_time - loop_start_time;
    schedule_loop(loop_time);
    last_loop_time = loop_end_time;
  }

  loop();

  window.dump_stats = function() {
    console.log("Objects: %o", sim.get_world());
  }

});
