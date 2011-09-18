nfold = {
  background_color: '#f8f8f8',
  view_width: 640,
  view_height: 480,
  loop_interval: 10,
  rotate_speed: 2,
  thrust: 1,
};

$(function() {

  var socket = io.connect('http://localhost:3000');
  socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', { my: 'data' });
  });

  var r = render('canvas.main');
  var sim = simulation();
  var input = input_manager(sim);

  sim.add_entity(ship({position:[100, 100]}));
  var player = sim.add_entity(ship({ position: [320, 240]}));

  var render_timeout = null;

  function schedule_loop() {
    render_timeout = setTimeout(loop, nfold.loop_interval);
  }

  function debug(t) {
    $('.debug .world_stats').html('num objects: ' + sim.get_objects().length);
    $('.debug .frame_time').html(t.toString() + ' ms');
  }

  function handle_input() {
    if (input.is_pressed(37)) {
      player.rotation -= rangewrap((delta_time * 0.001) * nfold.rotate_speed, 2*Math.PI);
    }
    if (input.is_pressed(38)) {
      var impulse = mat2.transform(mat2.rotate(player.rotation), [0, nfold.thrust * delta_time])
      player.velocity = vec2.add(player.velocity, impulse);
    }
    if (input.is_pressed(39)) {
      player.rotation += rangewrap((delta_time * 0.001) * nfold.rotate_speed, 2*Math.PI);
    }
  }

  input.add_keydown_handler(32, function() {
    sim.add_entity(projectile({
      position: player.position,
      velocity: vec2.add(player.velocity, mat2.transform(mat2.rotate(player.rotation), [0, 100]))
    }));
  });

  var last_time = 0;
  var cur_time = 0;
  var delta_time = 0;

  function loop() {
    cur_time = (new Date).getTime();
    delta_time = cur_time - last_time;
    handle_input();
    sim.tick();
    r.render(sim);
    schedule_loop();
    var loop_time = (new Date).getTime() - cur_time;
    last_time = cur_time;
    debug(loop_time);
  }

  loop();

  window.dump_stats = function() {
    console.log("Objects: %o", sim.get_world());
  }

});
