if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min.js');
  require('./math.js');
}

var collide = {
};

function intersect_aabb_aabb(a, b) {
  return a.min_x <= b.max_x &&
         a.max_x >  b.min_x &&
         a.max_y >  b.min_y &&
         a.min_y <= b.max_y;
}


// Axis-aligned bounding box
// min values are inclusive, max values are exclusive for intersection tests
collide.AABB = function(x0, y0, x1, y1, opts) {

  return _.extend({
    flags: 0x0,
    collide_type: 'aabb',
    min_x: x0,
    max_x: x1,
    min_y: y0,
    max_y: y1,

    intersects: function(other) {
      return intersect_aabb_aabb(this, other);
    },

    update: function(x0, y0, x1, y1) {
      this.min_x = x0;
      this.max_x = x1;
      this.min_y = y0;
      this.max_y = y1;
    },

    update_cwh: function(c, w, h) {
      this.update(
        c[0] - w*0.5,
        c[1] - h*0.5,
        c[0] + w*0.5,
        c[1] + h*0.5
      );
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
    max_depth: 4,
    objects: [],
    parent: null,
    threshold: 4,

    each_object: function(col, fn) {
      _each_object(this, {}, col || extents, fn);
    },

    each_node: function(col, fn) {
      _each_node(this, col || extents, fn);
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
      this.each_object(obj.collide, function(o, qt) {
        if (o === obj) {
          removed = o;
          _remove_object(qt, o);
        }
      });
      if (removed) { delete obj.quadtree_id; }
    },

  }, opts);
};


if (typeof(exports) !== 'undefined') {
  _.each(collide, function(value, key) { exports[key] = value; });
}
