if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
  collide = require('./collide.js');
  entity = require('./entity.js');
}

var simulation = {
  SERVER: 0,
  CLIENT: 1,
};

simulation.Simulation = function(opts) {

  var world = {};
  var collidees = [];
  var callbacks = [];
  var last_sim_time = 0;
  var world_bounds = collide.AABB(0, 0, 1024, 1024);

  collision_handlers = {
    Player: {
      Projectile: function(sim, player, projectile) {
        sim.kill(projectile.id, true);
        player.damage(projectile.damage, projectile.owner);
      }
    }
  }

  pubsub.subscribe('damage', function(data) {
    sim.net.broadcast('entity_update', {
      id: data.entity.id,
      health: data.entity.health
    });
  });

  pubsub.subscribe('killed', function(entity_id) {
    sim.net.broadcast('kill', entity_id);
  });

  var sim = {

    type: simulation.SERVER,
    collide_type: collide.CLIENT,
    quadtree: null,
    broadcast_entities: [],

    net: {
      broadcast: function() {},
      send: function() {},
    },

    tick: function(input) {
      var start_time = (new Date).getTime();
      var dt = (start_time - last_sim_time) * 0.001;
      var self = this;

      self.quadtree = collide.QuadTree(world_bounds, {
        max_depth: 5,
        threshold: 4,
      });

      collidees = [];

      _(world).each(function(o, key) {

        if (input && o.local_player) {
          o.handle_input(input, dt);
        }

        o.update_physics(dt, self);
        o.simulate(dt);
        o.update_collide();

        if (o.remove_me) {
          delete world[o.id];
        } else {
          self.quadtree.insert(o.collide);

          if ((self.type == simulation.SERVER && (o.flags & entity.COLLIDE_SERVER)) ||
              (self.type == simulation.CLIENT && (o.flags & entity.COLLIDE_CLIENT))) {
              collidees.push(o);
            }
        }
      });

      self.check_collisions(collidees);

      if (this.broadcast_entities.length > 0) {
        this.net.broadcast('new_entities', _.map(this.broadcast_entities, function(o) {
          return o.serialize();
        }));
      }

      _.each(callbacks, function(cb) {
        cb(self);
      });

      this.broadcast_entities = [];
      last_sim_time = start_time;
    },

    check_collisions: function(players) {
      var self = this;
      _.each(players, function(player) {
        self.quadtree.each_object(player.collide, function(collidee) {
          var e = collidee.entity;
          if (e !== player && e.owner !== player.id) {
            var handler = collision_handlers[player.type] && collision_handlers[player.type][e.type];
            if (handler) {
              // console.log([(new Date).getTime(), player.id, 'collided with', e.id].join(' '));
              handler(self, player, e);
            }
          }
        });
      });
    },

    add_post_tick_callback: function(cb) {
      callbacks.push(cb);
    },

    find_entity: function(id) {
      return world[id] || null;
    },

    // Creates and inserts, then calls the .spawn() method
    spawn: function(opts, broadcast) {
      var e = entity[opts.type](_.extend({ sim: this }, opts));

      if ((this.type === simulation.CLIENT && !(e.flags & entity.SPAWN_CLIENT)) ||
          (this.type === simulation.SERVER && !(e.flags & entity.SPAWN_SERVER))) {
        return;
      }

      world[e.id] = e;
      e.spawn();
      if (broadcast) { this.broadcast_entities.push(e); }
      return e;
    },

    // Creates and inserts
    deserialize: function(opts) {
      o = entity[opts.type](_.extend({ sim: this }, opts));
      world[o.id] = o;
      return o;
    },

    kill: function(id, broadcast) {
      var o = world[id]
      if (o) {
        o.kill();
        if (broadcast) { this.net.broadcast('kill', o.id); }
      } else {
        // console.log("Couldn't find object ", id, " to kill");
      }
    },

    update_entity: function(data) {
      var o = world[data.id]
      if (o) _.extend(o, data);
    },

    synchronize: function(entities) {
      world = {};
      var self = this;
      _.each(entities, function(opts) {
        self.deserialize(opts);
      });
    },

    get_objects: function() {
      return _.values(world);
    },

    each_entity: function(bounds, fn) {
      this.quadtree.each_object(bounds, function(o) { fn(o.entity); });
    },

    get_world: function() {
      return world;
    },

    world_bounds: function() {
      return world_bounds;
    },

    get_current: function() {
      return this.find_entity(this.current);
    },

    random_location: function() {
      return [
        Math.random() * (world_bounds.max_x - world_bounds.min_x) + world_bounds.min_x,
        Math.random() * (world_bounds.max_y - world_bounds.min_y) + world_bounds.min_y
      ];
    }

  };

  return _.extend(sim, opts);
};

if (typeof(exports) !== 'undefined') {
  _.each(simulation, function(value, key) { exports[key] = value; });
}
