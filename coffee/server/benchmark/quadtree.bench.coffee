Benchmark = require('benchmark')
collide = require('../public/javascripts/collide')
_ = require('../public/javascripts/extern/underscore-min.js')

extents = 10000
num_objects = 10000
collision_objects = []
while collision_objects.length < num_objects
#  collision_objects.push([collide.Point(Math.random()*extents, Math.random()*extents)])
  collision_objects.push(collide.AABB_cwh([Math.random()*extents, Math.random()*extents], Math.random()*50, Math.random()*50))

fixture_quadtree = (max_depth, threshold) ->
  collide.QuadTree(collide.AABB(0, 0, extents, extents), { max_depth: max_depth, threshold: threshold })

quadtree_insertion = new Benchmark.Suite 'Quadtree Insertion', {
    onCycle: (event, bench) -> console.log(String(bench))
    onComplete: -> console.log('Fastest is ' + this.filter('fastest').pluck('name'))
  }

quadtree_collision = new Benchmark.Suite 'Quadtree Collision', {
    onCycle: (event, bench) -> console.log(String(bench))
    onComplete: -> console.log('Fastest is ' + this.filter('fastest').pluck('name'))
  }

_.each [4,6,8], (max_depth) ->
  _.each [4,8], (threshold) ->
    quadtree = interest_area = quadtree = null
    suite_name = _.template(
      'Quadtree query:  num_objects=<%= num_objects %>, max_depth=<%= max_depth %>, threshold=<%= threshold %>',
      { num_objects: num_objects, max_depth: max_depth, threshold: threshold }
    )

    quadtree_collision.add suite_name, ->
      count = 0
      quadtree.each_object(interest_area, (o) -> count += 1)
    , { setup: ->
      quadtree = fixture_quadtree(max_depth, threshold)
      _.each collision_objects, (o) -> quadtree.insert(o)
      interest_area = collide.AABB_cwh([extents*0.5, extents*0.5], 800, 600)
    }
#//    suite_name = _.template(
#//      'Quadtree insert: num_objects=<%= num_objects %>, max_depth=<%= max_depth %>, threshold=<%= threshold %>',
#//      { num_objects: num_objects, max_depth: max_depth, threshold: threshold }
#//    )
#//
#//    quadtree_insertion.add(suite_name, function() {
#//      _.each(collision_objects, function(o) { quadtree.insert(o); })
#//    }, {
#//      setup: function() {
#//        quadtree = fixture_quadtree(max_depth, threshold)
#//      }
#//    })


# run async
quadtree_collision.run()