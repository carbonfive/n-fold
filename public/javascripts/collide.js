if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
}

var collide = {};

collide.AABB = function(min_x, min_y, max_x, max_y, opts) {

  return _.extend({
    min_x: min_x, max_x: max_x,
    min_y: min_y, max_y: max_y,
    collide_type: 'aabb',

    bounds: function() {
      return {
        min_x: min_x, max_x: max_x,
        min_y: min_y, max_y: max_y
      };
    },

    intersects: function(other) {
      return min_x <= other.max_x &&
             max_x >= other.min_x &&
             max_y >= other.min_y &&
             min_y <= other.max_y;
    }
  }, opts);
};

// Construct an AABB with a center, width, and height
collide.AABB_cwh = function(center, width, height, opts) {
  return collide.AABB(
    center[0] - width*0.5,
    center[1] - height*0.5,
    center[0] + width*0.5,
    center[1] + height*0.5,
    opts
  );
};



var cur_quadtree_id = 0;

// Required options:
//   extents: <AABB>
collide.QuadTree = function(extents, opts) {

  var objects = [];
  var children = null;

  return _.extend({
    extents: extents,
    depth: 0,
    max_depth: 1,
    threshold: 2,
    parent: null,

    each_object: function(col, fn) {
      this._each_object({}, col || extents, fn);
    },

    _each_object: function(visited, collide, fn) {
      if (children) {
        _.each(children, function(c) {
          c._each_object(visited, collide, fn);
        });
      } else {
        _.each(objects, function(o) {
          if (visited[o.quadtree_id]) return;
          if (o.intersects(collide)) {
            fn(o);
            visited[o.quadtree_id] = true;
          }
        });
      }
    },

    _each_child: function(fn) {
      _.each(children, function(qt) {
        if (qt) { fn(qt); }
      });
    },

    insert: function(o) {
      if (!this.extents.intersects(o)) {
        return;
      }
      if (children) {
        this._each_child(function(c) { c.insert(o); });
      } else {
        objects.push(o);
        o.quadtree_id = cur_quadtree_id++;
        if (this.depth < this.max_depth && objects.length > this.threshold) {
          this._subdivide();
        }
      }
      return o;
    },

    _subdivide: function() {
      var self = this;

      if (children) { throw new Error("Can't subdivide.  Already have children."); }

      var center_x = (extents.min_x + extents.max_x) * 0.5;
      var center_y = (extents.min_y + extents.max_y) * 0.5;
      var child_opts = {
        depth: this.depth + 1,
        max_depth: this.max_depth,
        parent: this,
        threshold: this.threshold
      };

      children = [
        collide.QuadTree(collide.AABB(extents.min_x, center_y, center_x, extents.max_y), child_opts),
        collide.QuadTree(collide.AABB(center_x, center_y, extents.max_x, extents.max_y), child_opts),
        collide.QuadTree(collide.AABB(center_x, extents.min_y, extents.max_x, center_y), child_opts),
        collide.QuadTree(collide.AABB(extents.min_x, extents.min_y, center_x, center_y), child_opts)
      ]

      _.each(objects, function(o) { self._each_child(function(c) { c.insert(o); }); });

      objects = null;
    },

    remove: function(quadtree_id) {
      var o = objects[quadtree_id];
      if (o) {
        delete o.quadtree_id;
        delete objects[quadtree_id];
      }
      return o;
    },

    __objects: function() { return objects; },
    __children: function() { return children; },
  }, opts);
};


if (typeof(exports) !== 'undefined') {
  _.each(collide, function(value, key) { exports[key] = value; });
}
