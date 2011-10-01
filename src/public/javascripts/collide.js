if (typeof(require) === 'function') {
  _ = require('./extern/underscore-min');
  require('./math');
}

var collide = {};

function _intersect_point_point(p, q) {
  return p.x == q.x && p.y == q.y;
}

function _intersect_aabb_point(a, p) {
  return a.min_x <= p.x &&
         a.max_x >  p.x &&
         a.max_y >  p.y &&
         a.min_y <= p.y;
}

function _intersect_aabb_aabb(a, b) {
  return a.min_x <= b.max_x &&
         a.max_x >  b.min_x &&
         a.max_y >  b.min_y &&
         a.min_y <= b.max_y;
}

var _intersection_tests = {
  aabb: {
    aabb: _intersect_aabb_aabb,
    point: _intersect_aabb_point,
  },
  point: {
    point: _intersect_point_point,
    aabb: function(p, aabb) { return _intersect_aabb_point(aabb, p); }
  }
};

collide.intersects = function(c, d) {
  return _intersection_tests[c.collide_type][d.collide_type](c, d);
};

collide.Point = function(pos, opts) {
  return _.extend({
    flags: 0x0,
    collide_type: 'point',
    x: pos[0],
    y: pos[1],

    update_point: function(p) {
      this.x = p[0];
      this.y = p[1];
    }

  }, opts);
};

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

  function _each_node(node, c, fn) {
    if (!collide.intersects(node.extents, c)) { return; }
    fn(node);
    _.each(node.children, function(child) { _each_node(child, c, fn); });
  }

  function _each_object(node, visited, c, fn) {
    _each_node(node, c, function(subnode) {
      _.each(subnode.objects, function(o) {
        if (visited[o.quadtree_id]) return;
        if (collide.intersects(o, c)) {
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
    if (node.children.length > 0) { throw new Error("Can't subdivide.  Already have children."); }

    var center_x = (extents.min_x + extents.max_x) * 0.5;
    var center_y = (extents.min_y + extents.max_y) * 0.5;
    var child_opts = {
      depth: node.depth + 1,
      max_depth: node.max_depth,
      parent: node,
      threshold: node.threshold
    };

    node.children = [
      collide.QuadTree(collide.AABB(extents.min_x, center_y, center_x, extents.max_y), child_opts),
      collide.QuadTree(collide.AABB(center_x, center_y, extents.max_x, extents.max_y), child_opts),
      collide.QuadTree(collide.AABB(center_x, extents.min_y, extents.max_x, center_y), child_opts),
      collide.QuadTree(collide.AABB(extents.min_x, extents.min_y, center_x, center_y), child_opts)
    ];

    _insert_into_children(node, node.objects);

    node.objects = null;
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
      if (!collide.intersects(this.extents, o)) return;
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
