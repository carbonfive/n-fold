if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
}

var entity = {};

entity.Entity = function(opts) {

  return _.extend({

    id: Math.round(Math.random() * 0xFFFFFFFF).toString(16),
    type: 'Entity',       // entity
    local: true,          // entity
    position: [320, 240], // physics
    velocity: [0, 0],     // physics
    acceleration: [0, 0], // physics
    rotation: 0,          // physics
    drag_coefficient: 0,  // physics
    radius: 0,            // collide
    debug: false,

    apply_physics: function(dt, sim) {
      with (this) {
        var world_bounds = sim.world_bounds();
        if (vec2.nonzero(acceleration)) {
          velocity = vec2.add(velocity, vec2.scale(acceleration, dt));
        }

        if (vec2.nonzero(velocity)) {
          if (drag_coefficient) {
            var speed = vec2.length(velocity);
            var drag = vec2.scale(vec2.normalize(velocity), -speed*speed*drag_coefficient);
            velocity = vec2.add(velocity, vec2.scale(drag, dt));
          }

          var new_pos = vec2.add(position, vec2.scale(velocity, dt));
          position = [
            rangelimit(new_pos[0], world_bounds.min_x, world_bounds.max_x),
            rangelimit(new_pos[1], world_bounds.min_y, world_bounds.max_y)
          ];

          if (position[0] == world_bounds.min_x || position[0] == world_bounds.max_x) {
            velocity[0] = 0;
          }
          if (position[1] == world_bounds.min_y || position[1] == world_bounds.max_y) {
            velocity[1] = 0;
          }
        }
      }
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
      with (this) {
        return {
          id: id,
          position: position,
          velocity: velocity,
          acceleration: acceleration,
          rotation: rotation,
        };
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
};

entity.Projectile = function(opts) {

  var initial_velocity = 500;

  var o = _.extend(entity.Entity({
    type: 'Projectile',
    lifespan: 2.0,
    radius: 4,
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
};

entity.Player = function(opts) {

  return _.extend(entity.Entity({
    type: 'Player',
    radius: 8,
    rotate_speed: 5.0,
    thrust: 500.0,
    drag_coefficient: 0.01,

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
};

if (typeof(exports) !== 'undefined') {
  _.each(entity, function(value, key) {
    exports[key] = value;
  });
}
