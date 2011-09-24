if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
}

var collide = {};

// Axis-aligned bounding box
// min values are inclusive, max values are exclusive for intersection tests
collide.AABB = function(min_x, min_y, max_x, max_y, opts) {

  function _intersects_aabb(aabb) {
    return min_x <= aabb.max_x &&
           max_x >  aabb.min_x &&
           max_y >  aabb.min_y &&
           min_y <= aabb.max_y;
  }

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
      return _intersects_aabb(other);
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

  function _each_node(node, collide, fn) {
    if (!node.extents.intersects(collide)) { return; }
    fn(node);
    _.each(node.children, function(child) { _each_node(child, collide, fn); });
  }

  function _each_object(node, visited, collide, fn) {
    _each_node(node, collide, function(subnode) {
      _.each(subnode.objects, function(o) {
        if (visited[o.quadtree_id]) return;
        if (o.intersects(collide)) {
          fn(o, subnode);
          visited[o.quadtree_id] = true;
        }
      });
    });
  }

  function _insert_into_children(node, objects) {
    _.each(node.children, function(c) {
      _.each(objects, function(o) { c.insert(o); });
    });
  }

  function _remove_object(node, o) {
    node.objects.splice(node.objects.indexOf(o), 1);
  }

  function _subdivide(node) {
    var self = node;

    if (self.children.length > 0) { throw new Error("Can't subdivide.  Already have children."); }

    var center_x = (extents.min_x + extents.max_x) * 0.5;
    var center_y = (extents.min_y + extents.max_y) * 0.5;
    var child_opts = {
      depth: self.depth + 1,
      max_depth: self.max_depth,
      parent: self,
      threshold: self.threshold
    };

    self.children = [
      collide.QuadTree(collide.AABB(extents.min_x, center_y, center_x, extents.max_y), child_opts),
      collide.QuadTree(collide.AABB(center_x, center_y, extents.max_x, extents.max_y), child_opts),
      collide.QuadTree(collide.AABB(center_x, extents.min_y, extents.max_x, center_y), child_opts),
      collide.QuadTree(collide.AABB(extents.min_x, extents.min_y, center_x, center_y), child_opts)
    ]

    _insert_into_children(self, self.objects);

    self.objects = null;
  }

  return _.extend({
    children: [],
    depth: 0,
    extents: extents,
    max_depth: 1,
    objects: [],
    parent: null,
    threshold: 2,

    each_object: function(fn, col) {
      _each_object(this, {}, col || extents, fn);
    },

    insert: function(o) {
      if (!this.extents.intersects(o)) return;
      if (this.children.length > 0) {
        _insert_into_children(this, [o]);
      } else {
        this.objects.push(o);
        if (!o.quadtree_id) {
          o.quadtree_id = cur_quadtree_id++;
        }
        if (this.depth < this.max_depth && this.objects.length > this.threshold) {
          _subdivide(this);
        }
      }
      return o;
    },

    remove: function(obj) {
      var removed = null;
      this.each_object(function(o, qt) {
        if (o === obj) {
          removed = o;
          _remove_object(qt, o);
        }
      }, obj);
      if (removed) { delete obj.quadtree_id; }
    },

  }, opts);
};


if (typeof(exports) !== 'undefined') {
  _.each(collide, function(value, key) { exports[key] = value; });
}
