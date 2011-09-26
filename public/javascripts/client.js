nfold = {
  // background_color: '#fff',
  background_color: '#222',
  loop_interval: 20,
  render_qudtree: false,
  client_id: 'Player:' + Math.round(Math.random() * 0xFFFFFFFF).toString(16),

  score: 0,

  debug: {
    quadtrees: false,
    collisions: false,
    net: false,
  }
};

$(function() {

  $('span.client_id').html(nfold.client_id);

  var r = render('.main canvas');
  var sim = simulation.Simulation({
    type: simulation.CLIENT
  })
  var im = input.InputManager();

  var socket = io.connect();

  sim.net = {
    broadcast: function(msg, data) {
      if (nfold.debug.net && msg !== 'entity_update') { console.log('SEND: %s, %o', msg, data); }
      socket.emit(msg, { data: data, broadcast: true });
    }
  }

  var network_message = function(msg, fn) {
    socket.on(msg, function(payload) {
      if (nfold.debug.net && msg !== 'entity_update') { console.log('RECV: %s, %o', msg, payload ? payload.data : null); }
      fn(payload ? payload.data : null);
    });
  };

  network_message('connect', function() {
    sim.net.broadcast('hello', nfold.client_id);
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

  function schedule_loop(loop_time) {
    setTimeout(loop, Math.max(nfold.loop_interval - loop_time, 0));
  }

  var player = null;

  $('button.start').click(function(e) {
    add_local_player();
    $(this).remove();
  });

  function add_local_player() {
    player = sim.spawn({
      id: nfold.client_id,
      type: 'Player',
      local_player: true,
      debug: false,
      name: $('input[name=player_name]').val(),
      position: sim.random_location()
    }, true);

    sim.current = nfold.client_id;

  }

  im.add_keydown_handler(32, function() {
    if (player)
      player.fire();
  });

  var last_pos_update = 0;
  sim.add_post_tick_callback(function() {
    if (player) {
      var t = (new Date).getTime();
      if (t - last_pos_update >= 50) {
        var update_data = _.extend(player.position_data(), { name: player.name });
        sim.net.broadcast('entity_update', update_data);
        last_pos_update = t;
      }
    }
  });

  var last_loop_time = 0;

  function loop() {
    loop_start_time = (new Date).getTime();
    sim.tick(im);
    if (player) {
      r.viewport.update_cwh(player.position, r.width, r.height);
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

  $('#enter_game').submit(function(e) {
    e.preventDefault();
    var $input = $('input[name=player_name]');
    $input.blur();
    if (player) {
      player.name = $input.val();
    }
  });

  $(document).keydown(function(e) {
    if (!player && e.keyCode == 32) {
      e.preventDefault();
      add_local_player();
    }
  });

  pubsub.subscribe('killed', function(entity_id) {
    if (player && player.id === entity_id) {
      player = null;
    }
  });

});
