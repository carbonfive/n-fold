(function() {
  var Benchmark, collide, collision_objects, extents, fixture_quadtree, num_objects, quadtree_collision, quadtree_insertion, _;
  Benchmark = require('benchmark');
  collide = require('../public/javascripts/collide');
  _ = require('../public/javascripts/extern/underscore-min.js');
  extents = 10000;
  num_objects = 10000;
  collision_objects = [];
  while (collision_objects.length < num_objects) {
    collision_objects.push(collide.AABB_cwh([Math.random() * extents, Math.random() * extents], Math.random() * 50, Math.random() * 50));
  }
  fixture_quadtree = function(max_depth, threshold) {
    return collide.QuadTree(collide.AABB(0, 0, extents, extents), {
      max_depth: max_depth,
      threshold: threshold
    });
  };
  quadtree_insertion = new Benchmark.Suite('Quadtree Insertion', {
    onCycle: function(event, bench) {
      return console.log(String(bench));
    },
    onComplete: function() {
      return console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    }
  });
  quadtree_collision = new Benchmark.Suite('Quadtree Collision', {
    onCycle: function(event, bench) {
      return console.log(String(bench));
    },
    onComplete: function() {
      return console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    }
  });
  _.each([4, 6, 8], function(max_depth) {
    return _.each([4, 8], function(threshold) {
      var interest_area, quadtree, suite_name;
      quadtree = interest_area = quadtree = null;
      suite_name = _.template('Quadtree query:  num_objects=<%= num_objects %>, max_depth=<%= max_depth %>, threshold=<%= threshold %>', {
        num_objects: num_objects,
        max_depth: max_depth,
        threshold: threshold
      });
      return quadtree_collision.add(suite_name, function() {
        var count;
        count = 0;
        return quadtree.each_object(interest_area, function(o) {
          return count += 1;
        });
      }, {
        setup: function() {
          quadtree = fixture_quadtree(max_depth, threshold);
          _.each(collision_objects, function(o) {
            return quadtree.insert(o);
          });
          return interest_area = collide.AABB_cwh([extents * 0.5, extents * 0.5], 800, 600);
        }
      });
    });
  });
  quadtree_collision.run();
}).call(this);
