function entity(opts) {
  return _.extend({
    id: Math.round(Math.random() * 0xFFFFFFFF).toString(16),
    position: [320, 240],
    velocity: [0, 0],
    acceleration: [0, 0],
    rotation: 0,
    rotational_velocity: 0,
    rotational_acceleration: 0,
    drag_coefficient: 0,
    debug: false,

    apply_physics: function(dt) {
      if (vec2.nonzero(this.acceleration)) {
        this.velocity = vec2.add(this.velocity, vec2.scale(this.acceleration, dt));
      }

      if (vec2.nonzero(this.velocity)) {
        if (this.drag_coefficient) {
          var speed = vec2.length(this.velocity);
          var drag = vec2.scale(vec2.normalize(this.velocity), -speed*speed*this.drag_coefficient);
          this.velocity = vec2.add(this.velocity, vec2.scale(drag, dt));
        }
      }

      var new_pos = vec2.add(this.position, vec2.scale(this.velocity, dt));
      this.position = [rangewrap(new_pos[0], nfold.view_width), rangewrap(new_pos[1], nfold.view_height)];
    },

    simulate: function(dt) {},

    rotate: function(theta) {
      this.rotation += rangewrap(theta, 2*Math.PI);
    },

    kill: function() {
      this.remove_me = true;
    },

  }, opts);
}

function Projectile(opts) {

  var initial_velocity = 500;

  var o = _.extend(entity({
    lifespan: 1.0,
    radius: Math.random() * 4 + 2,
    age: 0,
    renderer: Render.projectile,
    simulate: function(dt) {
      this.age += dt;
      if (this.age > this.lifespan) {
        this.kill();
      }
    }
  }), opts);

  o.velocity = vec2.add(o.velocity, mat2.transform(mat2.rotate(o.rotation), [0, initial_velocity]))
  return o;
}

function Player(opts) {

  return _.extend(entity({
    rotate_speed: 2.0,
    rotate_speed: 2.0,
    thrust: 500.0,
    drag_coefficient: 0,
    renderer: Render.player,

    handle_input: function(input, dt) {
      if (input.is_pressed(37)) { this.rotate(-this.rotate_speed * dt); }
      if (input.is_pressed(39)) { this.rotate( this.rotate_speed * dt); }
      if (input.is_pressed(38)) {
        this.acceleration = mat2.transform(mat2.rotate(this.rotation), [0, this.thrust]);
      } else {
        this.acceleration = [0, 0];
      }
    },

    fire: function() {
      this.sim.add_entity(Projectile({
        position: this.position,
        velocity: this.velocity,
        rotation: this.rotation
      }));
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

    tick: function(input) {
      var tick_time = (new Date).getTime();
      var dt = (tick_time - last_sim_time) * .001;

      _(world).each(function(o, key) {
        if (o.local_player) {
          o.handle_input(input, dt);
        }

        o.apply_physics(dt);
        o.simulate(dt);

        if (o.remove_me) { delete world[o.id]; }
      });
      last_sim_time = tick_time;
    },

    add_entity: function(o) {
      world[o.id] = o;
      o.sim = this;
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

