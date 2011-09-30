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

  // move this pubsub crap to network module
  pubsub.subscribe('damage', function(data) {
    sim.net.broadcast('entity_update', {
      id: data.entity.id,
      health: data.entity.health
    });
  });

  pubsub.subscribe('killed', function(entity_id) {
    sim.net.broadcast('kill', entity_id);
  });

  var last_local_player_broadcast = 0;
  pubsub.subscribe('sim_endframe', function(sim) {
    if (sim.local_player) {
      var t = (new Date).getTime();
      if (t - last_local_player_broadcast >= 50) {
        var update_data = _.extend(sim.local_player.position_data(), { name: sim.local_player.name });
        sim.net.broadcast('entity_update', update_data);
        last_local_player_broadcast = t;
      }
    }
  });

  pubsub.subscribe('entity:add_powerup', function(data) {
    world[data.entity_id].add_powerup(data.powerup_type);
  });

  function add_to_world(e) {
    world[e.id] = e;
    if (e.local_player) {
      sim.local_player = e;
    }
    return e;
  }

  function remove_from_world(e) {
    delete world[e.id];
    if (e.local_player) {
      sim.local_player = null;
    }
    return e;
  }

  var sim = {

    type: simulation.SERVER,
    collide_type: collide.CLIENT,
    local_player: null,
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
        max_depth: 4,
        threshold: 8,
      });

      collidees = [];

      _.each(world, function(o, key) {

        if (input && o.local_player) {
          o.handle_input(input, dt);
        }

        o.update_physics(dt, self);
        o.simulate(dt);
        o._update_collide();

        if (o.remove_me) {
          remove_from_world(o);
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

      pubsub.publish('sim_endframe', self);

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

    find_entity: function(id) {
      return world[id] || null;
    },

    // Creates and inserts, then calls the .spawn() method
    spawn: function(opts, broadcast) {
      var e = entity.create(_.extend({ sim: this }, opts));

      if ((this.type === simulation.CLIENT && !(e.flags & entity.SPAWN_CLIENT)) ||
          (this.type === simulation.SERVER && !(e.flags & entity.SPAWN_SERVER))) {
        return;
      }

      add_to_world(e);
      e.spawn();
      if (broadcast) { this.broadcast_entities.push(e); }
      return e;
    },

    // Creates and inserts
    deserialize: function(opts) {
      return add_to_world(entity.create(_.extend({ sim: this }, opts)));
    },

    kill: function(id, broadcast) {
      var o = world[id];
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
