collide = require('../public/javascripts/collide.js');

describe('collide.AABB_cwh', function() {

  var aabb = null;

  beforeEach(function() {
    aabb = collide.AABB_cwh([0, 0], 2, 2);
  });


  describe('.AABB()', function() {
    it ('succeeds', function() {
      expect(aabb).not.toBeNull();
    });

    it ('sets the correct collide type', function() {
      expect(aabb.collide_type).toEqual('aabb');
    });
  });


  describe('.bounds()', function() {
    it('returns correct bounds', function() {
      var bounds = aabb.bounds();
      expect(bounds.min_x).toEqual(-1);
      expect(bounds.max_x).toEqual(1);
      expect(bounds.min_y).toEqual(-1);
      expect(bounds.max_y).toEqual(1);
    });
  });


  describe('.intersects()', function() {
    it('returns false for non-intersecting bodies', function() {
      var other = collide.AABB_cwh([10, 0], 1, 1);
      expect(aabb.intersects(other)).toBeFalsy();
    });

    it('returns true for barely-intersecting bodies', function() {
      var other = collide.AABB_cwh([2, 0], 2, 2);
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for intersecting bodies', function() {
      var other = collide.AABB_cwh([1, 0], 1, 1);
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for completely enclosed bodies', function() {
      var other = collide.AABB_cwh([0, 0], 0.5, 0.5);
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for completely enclosing bodies', function() {
      var other = collide.AABB_cwh([0, 0], 2, 2);
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for zero-area bodies', function() {
      var other = collide.AABB_cwh([0, 0], 0, 0);
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for problem cases', function() {
      var bb0 = collide.AABB(-64, 0, 0, 64);
      var bb1 = collide.AABB(-8.75, -8.75, -11.25, -11.25);
      expect(bb0.intersects(bb1)).toBeFalsy();
    });
  });


});

describe('QuadTree()', function() {

  var quadtree = null;
  var objects = [];

  function all_objects(qt) {
    var all = [];
    qt.each_object(function(o) { all.push(o); })
    return all;
  }

  beforeEach(function() {
    quadtree = collide.QuadTree(collide.AABB_cwh([0, 0], 128, 128));
    objects = [
      quadtree.insert(collide.AABB_cwh([ 10,  10], 2.5, 2.5)),
      quadtree.insert(collide.AABB_cwh([ 10, -10], 2.5, 2.5)),
      quadtree.insert(collide.AABB_cwh([-10, -10], 2.5, 2.5)),
      quadtree.insert(collide.AABB_cwh([-10,  10], 2.5, 2.5))
    ]
  });

  describe('.each_object()', function() {
    it('iterates over all the collision objects with a null collide', function() {
      var all = []
      quadtree.each_object(function(o) { all.push(o); });
      expect(all.length).toEqual(4);
    });

    it('only returns objects within the collide object', function() {
      var intersecting = [];
      quadtree.each_object(function(o) { intersecting.push(o); }, collide.AABB_cwh([0, 10], 100, 0));
      expect(intersecting.length).toEqual(2);
      expect(intersecting).toContain(objects[0]);
      expect(intersecting).toContain(objects[3]);
    });

    it('doesnt return the same object more than once', function() {
      quadtree.insert(collide.AABB_cwh([0, 0], 5, 5));
      expect(all_objects(quadtree).length).toEqual(5);
    });
  });

  describe('.insert()', function() {
    it('adds an object to the world', function() {
      expect(_.include(all_objects(quadtree), objects[0])).toBeTruthy();
    });
  });

  describe('.remove()', function() {
    beforeEach(function() {
      quadtree.remove(objects[3]);
    });

    it('removes an object from the world', function() {
      expect(all_objects(quadtree)).not.toContain(objects[3]);
    });

    it('deletes the quadtree_id property', function() {
      expect(objects[3].quadtree_id).toBeFalsy();
    });
  });

});
