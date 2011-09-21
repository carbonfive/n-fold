simulation = require('../public/javascripts/simulation.js');

describe('simulation.AABB', function() {

  var aabb = null;

  beforeEach(function() {
    aabb = simulation.AABB({
      center: [0, 0],
      width: 2,
      height: 2
    });
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
      var other = simulation.AABB({ center: [10, 0], width: 1, height: 1 });
      expect(aabb.intersects(other)).toBeFalsy();
    });

    it('returns true for barely-intersecting bodies', function() {
      var other = simulation.AABB({ center: [2, 0], width: 2, height: 2 });
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for intersecting bodies', function() {
      var other = simulation.AABB({ center: [1, 0], width: 1, height: 1 });
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for completely enclosed bodies', function() {
      var other = simulation.AABB({ center: [0, 0], width: 0.5, height: 0.5 });
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for completely enclosing bodies', function() {
      var other = simulation.AABB({ center: [0, 0], width: 2, height: 2 });
      expect(aabb.intersects(other)).toBeTruthy();
    });

    it('returns true for zero-area bodies', function() {
      var other = simulation.AABB({ center: [0, 0], width: 0, height: 0 });
      expect(aabb.intersects(other)).toBeTruthy();
    });
  });


});

describe('QuadTree()', function() {

  var quadtree = null;
  var aabbs = [];

  beforeEach(function() {
    quadtree = simulation.QuadTree({
      bounds: simulation.AABB({ center: [0, 0], width: 128, height: 128 })
    });
    aabbs = [
      quadtree.insert(simulation.AABB({ center: [ 10,  10], width: 2.5, height: 2.5 })),
      quadtree.insert(simulation.AABB({ center: [ 10, -10], width: 2.5, height: 2.5 })),
      quadtree.insert(simulation.AABB({ center: [-10, -10], width: 2.5, height: 2.5 })),
      quadtree.insert(simulation.AABB({ center: [-10,  10], width: 2.5, height: 2.5 }))
    ]
  });

  describe('.get_all()', function() {
    it('returns all the collision objects', function() {
      expect(quadtree.get_all().length).toEqual(4);
    });
  });

  describe('.insert()', function() {
    it('adds an object to the world', function() {
      expect(quadtree.get_all()).toContain(aabbs[0]);
    });

    it('assigns a quadtree_id', function() {
      expect(aabbs[2].quadtree_id).toBeGreaterThan(0);
    });
  });

  describe('.remove()', function() {
    beforeEach(function() {
      quadtree.remove(aabbs[3].quadtree_id);
    });

    it('removes an object from the world', function() {
      expect(quadtree.get_all()).not.toContain(aabbs[3]);
    });

    it('deletes the quadtree_id property', function() {
      expect(aabbs[3].quadtree_id).toBeFalsy();
    });
  });

  describe('.intersect()', function() {
    var intersecting;

    beforeEach(function() {
      intersecting = quadtree.intersect(simulation.AABB({ center: [0, 10], width: 100, height: 0 }));
    });

    it('returns intersecting objects', function() {
      expect(intersecting.length).toEqual(2);
      expect(intersecting).toContain(aabbs[0]);
      expect(intersecting).toContain(aabbs[3]);
    });
  });

});
