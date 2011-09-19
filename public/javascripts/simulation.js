if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
}

WORLD_WIDTH = 640;
WORLD_HEIGHT = 480;

var simulation = {

  Entity: function(opts) {

    return _.extend({

      id: Math.round(Math.random() * 0xFFFFFFFF).toString(16),
      type: 'Entity',
      local: true,
      position: [320, 240],
      velocity: [0, 0],
      acceleration: [0, 0],
      rotation: 0,
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
        this.position = [rangewrap(new_pos[0], WORLD_WIDTH), rangewrap(new_pos[1], WORLD_HEIGHT)];
      },

      simulate: function(dt) {},

      rotate: function(theta) {
        this.rotation += rangewrap(theta, 2*Math.PI);
      },

      birth: function() {},

      kill: function() {
        this.remove_me = true;
      },

      position_data: function() {
        return {
          id: this.id,
          position: this.position,
          velocity: this.velocity,
          acceleration: this.acceleration,
          rotation: this.rotation,
        }
      },

      serialize: function() {
        var out = {};
        _.each(this, function(v, k) {
          if (_.isNumber(v) || _.isArray(v) || _.isString(v)) {
            out[k] = v;
          }
        });
        return out;
      },

      deserialize: function(data) {
        _.extend(this, data);
      }

    }, opts);
  },

  Projectile: function(opts) {

    var initial_velocity = 500;

    var o = _.extend(simulation.Entity({
      type: 'Projectile',
      lifespan: 2.0,
      radius: Math.random() * 4 + 2,
      age: 0,
      simulate: function(dt) {
        this.age += dt;
        if (this.age > this.lifespan) {
          this.kill();
        }
      },
      birth: function() {
        this.velocity = vec2.add(o.velocity, mat2.transform(mat2.rotate(o.rotation), [0, initial_velocity]))
      }
    }), opts);

    return o;
  },

  Player: function(opts) {

    return _.extend(simulation.Entity({
      type: 'Player',
      rotate_speed: 5.0,
      thrust: 500.0,
      drag_coefficient: 0,

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
        this.sim.create_entity({
          type: 'Projectile',
          position: this.position,
          velocity: this.velocity,
          rotation: this.rotation
        }, true);
      }

    }), opts);
  },

  InputManger: function(sim) {

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
  },

  Simulation: function() {

    var world = {};
    var callbacks = [];
    last_sim_time = 0;

    var sim = {

      new_entities: [],

      tick: function(input) {
        var tick_time = (new Date).getTime();
        var dt = (tick_time - last_sim_time) * .001;
        var self = this;

        _(world).each(function(o, key) {
          if (o.local_player) {
            o.handle_input(input, dt);
          }

          o.apply_physics(dt);
          o.simulate(dt);

          if (o.remove_me) { delete world[o.id]; }
        });

        _.each(callbacks, function(cb) {
          cb(self);
        });

        this.new_entities = [];
        last_sim_time = tick_time;
      },

      add_callback: function(cb) {
        callbacks.push(cb);
      },

      create_entity: function(opts, broadcast) {
        var e = this.add_entity(opts);
        e.birth();
        if (broadcast) {
          this.new_entities.push(o.serialize());
        }
        return e;
      },

      find_entity: function(id) {
        world[id] || null;
      },

      add_entity: function(opts) {
        o = simulation[opts.type](opts);
        world[o.id] = o;
        o.sim = this;
        return o;
      },

      update_entity: function(data) {
        _.extend(world[data.id], data);
      },

      synchronize: function(entities) {
        world = {};
        var self = this;
        _.each(entities, function(opts) {
          self.add_entity.call(self, opts);
        });
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

};

if (typeof(exports) !== 'undefined') {
  _.each(simulation, function(value, key) {
    exports[key] = value;
  });
}
