nfold = {
  background_color: '#fff',
  loop_interval: 10,
  render_qudtree: false,

  debug: {
    quadtrees: false,
    collisions: false,
    net: true,
  }
};

$(function() {

  var ROTATE_LEFT = 37;
  var ROTATE_RIGHT = 39;
  var ROTATE_FIRE = 38;
  var client_id = $('span.name').text();

  var r = render('.main canvas');
  var sim = simulation.Simulation({
    type: simulation.CLIENT
  })
  var im = input.InputManager();

  var socket = io.connect();

  sim.net = {
    broadcast: function(msg, data) {
      if (debug.net && msg !== 'entity_update') { console.log('SEND: %s, %o', msg, data); }
      socket.emit(msg, { data: data, broadcast: true });
    }
  }

  var network_message = function(msg, fn) {
    socket.on(msg, function(payload) {
      if (debug.net && msg !== 'entity_update') { console.log('RECV: %s, %o', msg, payload ? payload.data : null); }
      fn(payload ? payload.data : null);
    });
  };

  network_message('connect', function() {
    sim.net.broadcast('hello', client_id);
  });

  network_message('sync', function(data) {
    sim.synchronize(data);
  });

  network_message('entity_update', function(data) {
    sim.update_entity(data);
  });

  network_message('new_entities', function(data) {
    _.each(data, function(opts) {
      sim.deserialize(opts);
    });
  });

  network_message('kill', function(id) {
    sim.kill(id);
  });

  // sim.add_post_tick_callback(function() {
  //   if (sim.new_entities.length > 0) {
  //     sim.net.broadcast('new_entities', _.map(sim.new_entities, function(o) {
  //       return o.serialize();
  //     }));
  //   }
  // });

  function schedule_loop(loop_time) {
    setTimeout(loop, Math.max(nfold.loop_interval - loop_time, 0));
  }

  function debug(loop_time, frame_time) {
    $('.debug .world_stats').html('num objects: ' + sim.get_objects().length);
    $('.debug .frame_time').html(loop_time.toString() + '/' + frame_time.toString());
  }

  var player = null;
  $('button.start').click(function() {

    player = sim.spawn({
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
        sim.net.broadcast('entity_update', player.position_data());
        last_pos_update = t;
      }
    });

    $(this).remove();
  });

  var last_loop_time = 0;

  function loop() {
    loop_start_time = (new Date).getTime();
    sim.tick(im);
    if (player) {
      // r.viewport.update_cwh(player.position, r.width, r.height);
    }
    r.render(sim);

    if (nfold.debug.quadtrees || nfold.debug.collisions) {
      var debug_quads = [sim.world_bounds()];
      sim.quadtree.each_node(sim.world_bounds(), function(node) {
        if (nfold.debug.quadtrees) debug_quads.push(node.extents);
        if (nfold.debug.collisions) {
          _.each(node.objects, function(o) {
            debug_quads.push(o);
          });
        }
      });
      r.render_bounding_boxes.apply(r, debug_quads);
    }

    loop_end_time = (new Date).getTime();
    var loop_time = loop_end_time - loop_start_time;
    schedule_loop(loop_time);
    last_loop_time = loop_end_time;
  }

  loop();

  $('input.debug:checkbox').change(function() {
    var key = $(this).val();
    nfold.debug[key] = $(this).is(':checked');
  });

});
