nfold = {
  background_color: '#222',
  loop_interval: 20,
  render: {
    orient_view: false,
  },
  debug: {
    quadtrees: false,
    collisions: false,
    net: false,
    keystrokes: false,
  }
};

Client = function() {

  var client_id = 'client:' + Math.round(Math.random() * 0xFFFFFFFF).toString(16);

  var $canvas = $('.main canvas');
  var rendering_context = $canvas[0].getContext('2d');
  var width = $canvas.width();
  var height = $canvas.height();
  var viewport = collide.AABB(0, 0, width, height);

  var im = input.InputManager();
  var sim = simulation.Simulation(im, { type: simulation.CLIENT });
  var socket = io.connect();
  var player = null;

  function network_message(msg, fn) {
    socket.on(msg, function(payload) {
      if (nfold.debug.net && msg !== 'entity_update') { console.log('RECV: %s, %o', msg, payload ? payload.data : null); }
      fn(payload ? payload.data : null);
    });
  }

  sim.net = {
    broadcast: function(msg, data) {
      if (nfold.debug.net && msg !== 'entity_update') { console.log('SEND: %s, %o', msg, data); }
      socket.emit(msg, { data: data, broadcast: true });
    }
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

  network_message('chat', function(data) {
    pubsub.publish('chat', data);
  });

  function schedule_loop(loop_time) {
    im.reset_frame();
    setTimeout(loop, Math.max(nfold.loop_interval - loop_time, 0));
  }

  function loop() {
    loop_start_time = (new Date).getTime();
    sim.tick();
    if (player) {
      viewport.update_cwh(player.position, width, height);
    }
    render.render_scene(rendering_context, sim, viewport);

    if (nfold.debug.quadtrees || nfold.debug.collisions) {
      var collide_things = [sim.world_bounds()];
      sim.quadtree.each_node(sim.world_bounds(), function(node) {
        if (nfold.debug.quadtrees) collide_things.push(node.extents);
        if (nfold.debug.collisions) {
          _.each(node.objects, function(o) {
            collide_things.push(o);
          });
        }
      });
      render.render_collision_geometry(rendering_context, viewport, collide_things);
    }

    loop_end_time = (new Date).getTime();
    var loop_time = loop_end_time - loop_start_time;
    schedule_loop(loop_time);
  }

  loop();

  pubsub.subscribe('killed', function(entity_id) {
    if (player && player.id === entity_id) {
      player = null;
    }
  });

  pubsub.subscribe('new_chat', function(data) {
    sim.net.broadcast('chat', data);
    pubsub.publish('chat', data);
  });

  return {
    client_id: client_id,

    join_game: function(name) {

      if (!player) {
        player = sim.spawn({
          id: client_id,
          type: 'Player',
          local_player: true,
          debug: false,
          name: name,
          position: sim.random_location()
        }, true);
        sim.current = player;
      }
    },

    playing: function() {
      return player !== null;
    },

    set_name: function(name) {
      if (player) { player.name = name; }
    },

    get_player: function() {
      return player;
    }

  };

};


$(function() {

  var client = Client();
  //
  // !!! DEBUG !!!
  window.nfold_client = client;
  // !!! DEBUG !!!
  //
  var name = 'player';

  $('span.client_id').html(client.client_id);
  $('input[name=player_name]').val(name);

  $(document).keydown(function(e) {
    if (nfold.debug.keystrokes) {
      console.log(e.keyCode, e);
    }
    if (e.keyCode == 32) {  // space
      if (!client.playing()) {
        e.preventDefault();
        client.join_game(name);
      }
    } else if (e.keyCode === 84) {  // 't'
      e.preventDefault();
      $('form#chat input[name=say_what]').focus();
    } else if (e.keyCode === 72) {  // 'h'
      $('.help').toggle();
    }
  });

  $('form#set_name').keydown(function(e) { e.stopPropagation(); });
  $('form#set_name').submit(function(e) {
    e.preventDefault();
    var $input = $('input[name=player_name]').blur();
    var new_name = $input.val().trim();
    if (new_name.length === 0) {
      $input.val(name); // invalid, set it back
    } else {
      name = new_name;
      client.set_name(name);
    }
  });

  $('form#chat').keydown(function(e) {
    if (e.keyCode == 27) { $('input', this).blur(); }
    e.stopPropagation();
  });

  $('form#chat').submit(function(e) {
    e.preventDefault();
    var $input = $('input[name=say_what]', this).blur();
    var chat_string = $input.val().trim();
    if (chat_string.length > 0) {
      pubsub.publish('new_chat', {
        sender: name,
        entity_id: client.get_player() ? client.get_player().id : null,
        text: chat_string
      });
    }
    $input.val('');
  });

  $('input.debug:checkbox').change(function() {
    var key = $(this).val();
    nfold.debug[key] = $(this).is(':checked');
  });

  pubsub.subscribe('chat', function(data) {
    $('.chat_messages').prepend(_.template('<p><strong><%= sender %>:</strong> <%= text %></p>', data));
  });

});
