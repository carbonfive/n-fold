function entity(opts) {
  return _.extend({
    id: Math.round(Math.random() * 0xFFFFFFFF).toString(16),
    position: [320, 240],
    velocity: [0, 0],
    acceleration: [0, 0],
    rotation: 0,
    rotational_velocity: 0,
    rotational_acceleration: 0,
    drag: 0,

    simulate: function(dt) {
      if (vec2.nonzero(this.acceleration)) {
        this.velocity = vec2.add(this.velocity, vec2.scale(this.acceleration, dt));
      }

      if (vec2.nonzero(this.velocity)) {
        var magnitude = vec2.length(this.velocity);
        var new_magnitude = magnitude * (1.0-this.drag*dt);
        this.velocity = vec2.scale(this.velocity, new_magnitude/magnitude);
      }

      var new_pos = vec2.add(this.position, vec2.scale(this.velocity, dt));
      this.position = [rangewrap(new_pos[0], nfold.view_width), rangewrap(new_pos[1], nfold.view_height)];
    },

    prerender: function(ctx) {
      ctx.save();
      ctx.translate(this.position[0], this.position[1]);
      ctx.rotate(this.rotation);
    },

    render: function() {},

    postrender: function(ctx) {
      ctx.restore();
    },
  }, opts);
}

function projectile(opts) {

  var radius = Math.random() * 4 + 2;

  return _.extend(entity({

    render: function(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(50,0,0,1)';
      ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
      ctx.restore();
    }

  }), opts);
}

function ship(opts) {

  var radius = 8;

  return _.extend(entity({

    drag: 1.0,

    render: function(ctx) {
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.strokeStyle = 'black';
      ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 1.5*radius);
        ctx.stroke();
      ctx.restore();
    }

  }), opts);
}

function input_manager(sim) {

  var keys = []

  var keydown_handlers = {};
  var keyup_handlers = {};

  function handle_key(key_code, value, callbacks) {
    keys[key_code] = value;
    if (callbacks[key_code]) {
      _.each(callbacks[key_code], function(h) { h(); });
    }
  }

  $('body').keydown(function(e) { handle_key(e.keyCode, true, keydown_handlers) });
  $('body').keyup(function(e) { handle_key(e.keyCode, false, keyup_handlers) });

  return {

    is_pressed: function(key_code) {
      return keys[key_code];
    },

    add_keydown_handler: function(key_code, handler) {
      if (!keydown_handlers[key_code]) {
        keydown_handlers[key_code] = [handler];
      } else {
        keydown_handlers[key_code].push(handler);
      }
    }
  };
}

function simulation() {

  var world = {};
  last_sim_time = 0;

  var sim = {

    tick: function() {
      var tick_time = (new Date).getTime();
      dt = tick_time - last_sim_time;
      _(world).each(function(o, key) {
        o.simulate(dt * .001);
      });
      // move
      // collide
      //console.log(tick_time - last_sim_time);
      last_sim_time = tick_time;
    },

    add_entity: function(o) {
      world[o.id] = o;
      return o;
    },

    get_objects: function(bb) {
      return _.values(world);
    },

    get_world: function() {
      return world;
    },
  };

  return sim;
}

