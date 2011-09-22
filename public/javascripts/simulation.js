if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
  collide = require('./collide.js');
  entity = require('./entity.js');
}

var simulation = {};

var some_object = {
  entity: {},  // behaviors
  collide: {},
  physics: {},
}

simulation.Simulation = function() {

  var world = {};
  var callbacks = [];
  var last_sim_time = 0;
  var local_player = null;

  var world_aabb = new collide.AABB({
    center: [0, 0],
    width: 1024,
    height: 1024
  });
  var _world_bounds = world_aabb.bounds();

  var sim = {

    new_entities: [],

    tick: function(input) {
      var start_time = (new Date).getTime();
      var dt = (start_time - last_sim_time) * 0.001;
      var self = this;

      _(world).each(function(o, key) {
        if (o.local_player) {
          o.handle_input(input, dt);
        }

        o.apply_physics(dt, this);
        o.simulate(dt);

        if (o.remove_me) { delete world[o.id]; }
      });

      _.each(callbacks, function(cb) {
        cb(self);
      });

      this.new_entities = [];
      last_sim_time = start_time;
    },

    add_post_tick_callback: function(cb) {
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
      return world[id] || null;
    },

    add_entity: function(opts) {
      o = entity[opts.type](opts);
      world[o.id] = o;
      o.sim = this;
      return o;
    },

    kill: function(id) {
      var o = world[id]
      if (o) { o.kill(); }
    },

    update_entity: function(data) {
      var o = world[data.id]
      if (o) _.extend(o, data);
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

    world_bounds: function() {
      return _world_bounds;
    },

    get_current: function() {
      return this.find_entity(this.current);
    },

    random_location: function() {
      return [
        Math.random() * (_world_bounds.max_x - _world_bounds.min_x) + _world_bounds.min_x,
        Math.random() * (_world_bounds.max_y - _world_bounds.min_y) + _world_bounds.min_y
      ];
    }

  };

  return sim;
};

if (typeof(exports) !== 'undefined') {
  _.each(simulation, function(value, key) { exports[key] = value; });
}
