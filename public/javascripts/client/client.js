nfold = {
  background_color: '#f8f8f8',
  view_width: 640,
  view_height: 480,
  loop_interval: 10,
  render_debug: true,
};

$(function() {

  var ROTATE_LEFT = 37;
  var ROTATE_RIGHT = 39;
  var ROTATE_FIRE = 38;

  var socket = io.connect('http://localhost:3000');
  socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', { my: 'data' });
  });

  var r = render('canvas.main');
  var sim = simulation();
  var input = input_manager(sim);

  sim.add_entity(Player({position:[100, 100]}));
  var player = sim.add_entity(Player({
    debug: true,
    local_player: true,
    position: [0, 0]
  }));

  var render_timeout = null;

  function schedule_loop() {
    render_timeout = setTimeout(loop, nfold.loop_interval);
  }

  function debug(t) {
    $('.debug .world_stats').html('num objects: ' + sim.get_objects().length);
    $('.debug .frame_time').html(t.toString() + ' ms');
  }

  input.add_keydown_handler(32, function() {
    player.fire();
  });

  var last_time = 0;
  var cur_time = 0;

  function loop() {
    cur_time = (new Date).getTime();
    sim.tick(input);
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
