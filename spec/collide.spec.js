collide = require('../public/javascripts/collide.js');

describe('collide', function() {

  var aabb = null;
  var point = null;

  beforeEach(function() {
    aabb = collide.AABB_cwh([0, 0], 2, 2);
    point = collide.Point([1, 2]);
  });

  describe('.AABB()', function() {
    it ('succeeds', function() {
      expect(aabb).not.toBeNull();
    });

    it ('sets the correct collide type', function() {
      expect(aabb.collide_type).toEqual('aabb');
    });
  });
  
  describe('.intersects()', function() {
    describe('AABB vs AABB', function() {
      it('is false if non-intersecting', function() {
        var other = collide.AABB_cwh([10, 0], 1, 1);
        expect(collide.intersects(aabb, other)).toBeFalsy();
      });

      it('is true if intersecting', function() {
        var other = collide.AABB_cwh([1, 0], 1, 1);
        expect(collide.intersects(aabb, other)).toBeTruthy();
      });

      it('is true if completely enclosed', function() {
        var other = collide.AABB_cwh([0, 0], 0.5, 0.5);
        expect(collide.intersects(aabb, other)).toBeTruthy();
      });

      it('is true if completely enclosing', function() {
        var other = collide.AABB_cwh([0, 0], 2, 2);
        expect(collide.intersects(aabb, other)).toBeTruthy();
      });

      it('is true for zero-area AABBs', function() {
        var other = collide.AABB_cwh([0, 0], 0, 0);
        expect(collide.intersects(aabb, other)).toBeTruthy();
      });

      it('is true if just touching min_x', function() {
        var other = collide.AABB(-2, -1, -1, 1);
        expect(collide.intersects(aabb, other)).toBeTruthy();
      });

      it('is true if just touching min_y', function() {
        var other = collide.AABB(-1, -2, 1, -1);
        expect(collide.intersects(aabb, other)).toBeTruthy();
      });

      it('is false if just touching max_x', function() {
        var other = collide.AABB(1, -1, 2, 1);
        expect(collide.intersects(aabb, other)).toBeFalsy();
      });

      it('is false if just touching max_y', function() {
        var other = collide.AABB(-1, 1, 1, 2);
        expect(collide.intersects(aabb, other)).toBeFalsy();
      });
    });
    
  });

  describe('.Point()', function() {
    it ('succeeds', function() {
      expect(point).not.toBeNull();
    });

    it ('sets the correct collide type', function() {
      expect(point.collide_type).toEqual('point');
    });
  });

  describe('.intersects()', function() {
;
  });

});

describe('QuadTree()', function() {

  var quadtree = null;
  var objects = [];

  function all_objects(qt) {
    var all = [];
    qt.each_object(null, function(o) { all.push(o); })
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
      quadtree.each_object(null, function(o) { all.push(o); });
      expect(all.length).toEqual(4);
    });

    it('only returns objects within the collide object', function() {
      var intersecting = [];
      quadtree.each_object(collide.AABB_cwh([0, 10], 100, 0), function(o) { intersecting.push(o); });
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
