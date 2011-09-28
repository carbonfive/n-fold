if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
  render = ('./render.js');
  pubsub = require('./pubsub.js');
}

var entity = {
  MOVE_SERVER:      0x0001,
  SIMULATE_SERVER:  0x0002,
  COLLIDE_SERVER:   0x0004,
  MOVE_CLIENT:      0x0008,
  SIMULATE_CLIENT:  0x0010,
  COLLIDE_CLIENT:   0x0020,
  SPAWN_SERVER:     0x0040,
  SPAWN_CLIENT:     0x0080,

  VISIBLE:          0x0010,
  PHYSICAL:         0x0020,

  // POWERUP FLAGS
  PU_DOUBLE_RATE:   0x0001,
  PU_SPREAD_2:      0x0002,
  PU_SPREAD_3:      0x0004,
  PU_NONAGUN:       0x0008,
};

var physics = {

  none: function(dt, sim) {
  },

  standard: function(dt, sim) {
    with (this) {
      var world_bounds = sim.world_bounds();
      if (vec2.nonzero(acceleration)) {
        velocity = vec2.add(velocity, vec2.scale(acceleration, dt));
      }

      if (angular_velocity !== 0) {
        rotation += rangewrap(rotation + angular_velocity*dt);
      }

      if (vec2.nonzero(velocity)) {
        if (drag_coefficient) {
          var speed = vec2.length(velocity);
          var drag = vec2.scale(vec2.normalize(velocity), -speed*speed*drag_coefficient);
          velocity = vec2.add(velocity, vec2.scale(drag, dt));
        }

        var new_pos = vec2.add(position, vec2.scale(velocity, dt));
        position = [
          rangelimit(new_pos[0], world_bounds.min_x, world_bounds.max_x - 0.00001),
          rangelimit(new_pos[1], world_bounds.min_y, world_bounds.max_y - 0.00001)
        ];

        if (position[0] == world_bounds.min_x || position[0] == world_bounds.max_x) {
          velocity[0] = 0;
        }
        if (position[1] == world_bounds.min_y || position[1] == world_bounds.max_y) {
          velocity[1] = 0;
        }
      }
    }
  }

};


entity.Entity = function(opts) {

  var obj = {};

  return _.extend(obj, {

    id: (opts.type || 'Entity') + ':' + Math.round(Math.random() * 0xFFFFFFFF).toString(16),
    type: 'Entity',       // entity

    flags: 0,

    // rendering
    render: render.default,
    prerender: render.prerender,
    postrender: render.postrender,

    // physics
    position: [320, 240],
    velocity: [0, 0],
    acceleration: [0, 0],
    angular_velocity: 0,
    rotation: 0,
    drag_coefficient: 0,
    update_physics: physics.standard,

    debug: false,

    // collision stuff
    radius: 0,
    collide: collide.AABB_cwh([320, 240], 0, 0, {
      entity: obj,
      flags: entity.PHYSICAL | entity.VISIBLE,
    }),
    update_collide: function() {
      this.collide.update_cwh(this.position, this.radius*2, this.radius*2);
    },

    simulate: function(dt) {},

    rotate: function(theta) {
      this.rotation += rangewrap(theta, 2*Math.PI);
    },

    spawn: function() {},

    kill: function() {
      this.remove_me = true;
      pubsub.publish('killed', this.id);
    },

    position_data: function() {
      var self = this;
      with (this) {
        return {
          id: self.id,
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

  var initial_velocity = 300;

  var o = _.extend(entity.Entity({
    type: 'Projectile',

    damage: 25,
    render: render.projectile,

    lifespan: 2.0,
    radius: 1,
    age: 0,
    flags: entity.SPAWN_CLIENT | entity.SPAWN_SERVER,
    simulate: function(dt) {
      this.age += dt;
      if (this.age > this.lifespan) {
        this.kill();
      }
    },

    spawn: function() {
      this.velocity = vec2.add(o.velocity, mat2.transform(mat2.rotate(o.rotation), [0, initial_velocity]))
    },

    kill: function() {
      this.remove_me = true;
      this.sim.spawn({ type: 'Explosion', position: this.position }, false);
    }

  }), opts);

  return o;
};


entity.Explosion = function(opts) {

  var o = _.extend(entity.Entity({
    type: 'Explosion',
    age: 0,
    lifespan: Math.random() * 0.75 + 0.25,
    expansion_rate: Math.random() * 100 + 50,
    radius: 1,
    flags: entity.SPAWN_CLIENT,
    render: render.explosion,

    simulate: function(dt) {
      with (this) {
        age += dt;
        if (age >= lifespan) {
          kill();
        } else {
          radius += expansion_rate * dt;
        }
      }
    },

  }), opts);

  o.collide = collide.AABB_cwh(o.position, o.radius*2, o.radius*2, {
    flags: entity.VISIBLE,
    entity: o
  });

  return o;
};

entity.Player = function(opts) {

  var autofire_rate = 250;
  var last_fire = 0;

  function calculate_powerup_flags(powerups) {
    var flags = 0x0;
    _.each(powerups, function(pu) { flags = (flags | pu.flags); });
    return flags;
  };

  return _.extend(entity.Entity({
    type: 'Player',
    flags: entity.COLLIDE_SERVER | entity.SPAWN_SERVER | entity.SPAWN_CLIENT,

    heal_rate: 10,
    health: 100,
    max_health: 100,
    name: 'player',
    rotate_speed: 4.0,
    thrust: 500.0,
    reverse_thrust: 250.0,

    render: render.player,

    powerup_flags: 0x0,
    powerups: {},
    projectile: 'Projectile',

    // physics
    drag_coefficient: 0.01,

    // collide
    radius: 8,

    handle_input: function(input, dt) {
      if (input.is_pressed(37)) { this.rotate(-this.rotate_speed * dt); }
      if (input.is_pressed(39)) { this.rotate( this.rotate_speed * dt); }

      this.acceleration = [0, 0];
      if (input.is_pressed(38)) { this.acceleration = mat2.transform(mat2.rotate(this.rotation), [0, this.thrust]); }
      if (input.is_pressed(40)) { this.acceleration = mat2.transform(mat2.rotate(this.rotation + Math.PI), [0, this.reverse_thrust]); }

      /*
      var acceleration = [0, 0];
      if (input.is_pressed(69)) { // e
        acceleration = vec2.add(acceleration, mat2.transform(mat2.rotate(this.rotation), [0, this.thrust]));
      }

      if (input.is_pressed(68)) { // d
        acceleration = vec2.add(acceleration, mat2.transform(mat2.rotate(this.rotation), [0, -this.thrust*0.5]));
      }

      if (input.is_pressed(83)) { // s
        acceleration = vec2.add(acceleration, mat2.transform(mat2.rotate(this.rotation), [this.thrust, 0]));
      }

      if (input.is_pressed(70)) { // f
        acceleration = vec2.add(acceleration, mat2.transform(mat2.rotate(this.rotation), [-this.thrust, 0]));
      }

      this.acceleration = acceleration;
      */

      if (input.is_pressed(32)) {
        var rate = this.powerup_flags & entity.PU_DOUBLE_RATE ? autofire_rate*0.25 : autofire_rate;
        var t = (new Date).getTime();
        if (t - last_fire > rate) {
          this.fire();
          last_fire = t;
        }
      }
    },

    fire: function() {
      var opts = {
        type: this.projectile,
        owner: this.id,
        position: this.position,
        velocity: this.velocity,
        rotation: this.rotation,
      };

      function noisy(x, variance) {
        return x + Math.random()*variance - 0.5*variance;
      }

      if (this.powerup_flags & (entity.PU_SPREAD_2 | entity.PU_SPREAD_3 | entity.PU_NONAGUN)) {
        if (this.powerup_flags & entity.PU_SPREAD_2) {
          var spread = 0.0872664626 * 2;
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - spread }), true);
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + spread }), true);
        }
        if (this.powerup_flags & entity.PU_SPREAD_3) {
          var spread = 0.0872664626 * 4;
          this.sim.spawn(opts, true);
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, Math.random()) }), true);
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, noisy(1.0, 0.5)) }), true);
        }
        if (this.powerup_flags & entity.PU_NONAGUN) {
          var count = 9;
          var spread = (2 * Math.PI) / count;
          var variance = 0.25 * spread;
          for (var i = 0; i < count; i++) {
            this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread*i, variance) }), true);
          }
        }
      } else {
        this.sim.spawn(opts, true);
      }

    },

    simulate: function(dt) {
      var self = this;

      this.health = rangelimit(this.health + this.heal_rate * dt, 0, this.max_health);

      // update powerups
      var removed_powerups = [];
      _.each(self.powerups, function(pu) {
        pu.ttl -= dt;
        if (pu.ttl <= 0) { removed_powerups.push(pu); };
      });
      _.each(removed_powerups, function(pu) { self.remove_powerup(pu.type); });
    },

    damage: function(amount, owner) {
      this.health -= amount;
      if (this.health <= 0) {
        this.kill();
      } else {
        pubsub.publish('damage', { entity: this, amount: amount });
      }
    },

    add_powerup: function(powerup_type) {
      var pu = powerups.create(powerup_type);
      console.log("creating: %o", pu);
      this.powerups[powerup_type] = pu;
      pubsub.publish('entity:powerup_added', {
        entity_id: this.id,
        powerup_type: powerup_type
      });
      this.powerup_flags = calculate_powerup_flags(this.powerups);
      console.log("After add %o %o", this.powerup_flags, this.powerups);
    },

    remove_powerup: function(powerup_type) {
      delete this.powerups[powerup_type];
      this.powerup_flags = calculate_powerup_flags(this.powerups);
      console.log("After remove %o %o", this.powerup_flags, this.powerups);
    },

  }), opts);
};

powerups = {
  create: function(powerup_type) { return _.extend({}, powerups[powerup_type]); },
  doublespread: { type: 'doublespread', flags: entity.PU_SPREAD_2, ttl: 10 },
  triplespread: { type: 'triplespread', flags: entity.PU_SPREAD_3, ttl: 10 },
  nonagun: { type: 'nonagun', flags: entity.PU_NONAGUN, ttl: 10 },
};

if (typeof(exports) !== 'undefined') {
  _.each(entity, function(value, key) {
    exports[key] = value;
  });
}
