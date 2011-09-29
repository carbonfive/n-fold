var Benchmark = require('benchmark');
var collide = require('../public/javascripts/collide.js');
var _ = require('../public/javascripts/extern/underscore-min.js');

var extents = 10000;
var num_objects = 10000;
var bounding_boxes = [];
for (var i = 0; i < num_objects; i++) {
  bounding_boxes.push(collide.AABB_cwh([Math.random()*extents, Math.random()*extents], Math.random()*50, Math.random()*50));
}

function fixture_quadtree(max_depth, threshold) {
  return collide.QuadTree(collide.AABB(0, 0, extents, extents), { max_depth: max_depth, threshold: threshold });
}

var quadtree_insertion = new Benchmark.Suite('Quadtree Insertion', {
  onCycle: function(event, bench) {
    console.log(String(bench));
  },
  onComplete: function() {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'));
  }
});

var quadtree_collision = new Benchmark.Suite('Quadtree Collision', {
  onCycle: function(event, bench) {
    console.log(String(bench));
  },
  onComplete: function() {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'));
  }
});

_.each([0,2,4,6,8], function(max_depth) {
  _.each([2,4,6,8], function(threshold) {

    var quadtree;
    var interest_area;

    var suite_name = _.template(
      'Quadtree insert: num_objects=<%= num_objects %>, max_depth=<%= max_depth %>, threshold=<%= threshold %>',
      { num_objects: num_objects, max_depth: max_depth, threshold: threshold }
    );

    quadtree_insertion.add(suite_name, function() {
      _.each(bounding_boxes, function(o) { quadtree.insert(o); });
    }, {
      setup: function() {
        quadtree = fixture_quadtree(max_depth, threshold);
      }
    });

    suite_name = _.template(
      'Quadtree query:  num_objects=<%= num_objects %>, max_depth=<%= max_depth %>, threshold=<%= threshold %>',
      { num_objects: num_objects, max_depth: max_depth, threshold: threshold }
    );

    quadtree_collision.add(suite_name, function() {
      var count = 0;
      quadtree.each_object(interest_area, function(o) {
        count += 1;
      });
    }, {
      setup: function() {
        quadtree = fixture_quadtree(max_depth, threshold);
        _.each(bounding_boxes, function(o) { quadtree.insert(o); });
        interest_area = collide.AABB_cwh([extents*0.5, extents*0.5], 800, 600);
      }
    });

  });
});

// run async
quadtree_insertion.run();
quadtree_collision.run();
