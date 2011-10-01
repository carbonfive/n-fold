collide = require('../../public/javascripts/collide')

describe 'collide', ->
  aabb = null
  point = null

  beforeEach ->
    aabb = collide.AABB_cwh [0, 0], 2, 2
    point = collide.Point [1, 2]

  describe '.AABB()', ->
    it 'succeeds', ->
      expect(aabb).not.toBeNull

    it 'sets the correct collide type', ->
      expect(aabb.collide_type).toEqual 'aabb'

  describe '.intersects()', ->
    describe 'AABB vs AABB', ->
      it 'is false if non-intersecting', ->
        other = collide.AABB_cwh([10, 0], 1, 1)
        expect(collide.intersects(aabb, other)).toBeFalsy()

      it 'is true if intersecting', ->
        other = collide.AABB_cwh([1, 0], 1, 1)
        expect(collide.intersects(aabb, other)).toBeTruthy()

      it 'is true if completely enclosed', ->
        other = collide.AABB_cwh([0, 0], 0.5, 0.5)
        expect(collide.intersects(aabb, other)).toBeTruthy()

      it 'is true if completely enclosing', ->
        other = collide.AABB_cwh([0, 0], 2, 2)
        expect(collide.intersects(aabb, other)).toBeTruthy()

      it 'is true for zero-area AABBs', ->
        other = collide.AABB_cwh([0, 0], 0, 0)
        expect(collide.intersects(aabb, other)).toBeTruthy()

      it 'is true if just touching min_x', ->
        other = collide.AABB(-2, -1, -1, 1)
        expect(collide.intersects(aabb, other)).toBeTruthy()

      it 'is true if just touching min_y', ->
        other = collide.AABB(-1, -2, 1, -1)
        expect(collide.intersects(aabb, other)).toBeTruthy()

      it 'is false if just touching max_x', ->
        other = collide.AABB(1, -1, 2, 1)
        expect(collide.intersects(aabb, other)).toBeFalsy()

      it 'is false if just touching max_y', ->
        other = collide.AABB(-1, 1, 1, 2)
        expect(collide.intersects(aabb, other)).toBeFalsy()

  describe '.Point()', ->
    it 'succeeds', ->
      expect(point).not.toBeNull()

    it 'sets the correct collide type', ->
      expect(point.collide_type).toEqual('point')

describe 'QuadTree', ->
  quadtree = null
  objects = []

  all_objects = (qt) ->
    all = []
    qt.each_object null, (o) -> all.push o
    all

  beforeEach ->
    quadtree = collide.QuadTree(collide.AABB_cwh([0, 0], 128, 128))
    objects = [
      quadtree.insert(collide.AABB_cwh([ 10,  10], 2.5, 2.5)),
      quadtree.insert(collide.AABB_cwh([ 10, -10], 2.5, 2.5)),
      quadtree.insert(collide.AABB_cwh([-10, -10], 2.5, 2.5)),
      quadtree.insert(collide.AABB_cwh([-10,  10], 2.5, 2.5))
    ]

  describe '.each_object()', ->
    it 'iterates over all the collision objects with a null collide', ->
      all = []
      quadtree.each_object null, (o) -> all.push(o)
      expect(all.length).toEqual 4

    it 'only returns objects within the collide object', ->
      intersecting = []
      quadtree.each_object(collide.AABB_cwh([0, 10], 100, 0), (o) -> intersecting.push(o))
      expect(intersecting.length).toEqual(2)
      expect(intersecting).toContain(objects[0])
      expect(intersecting).toContain(objects[3])

    it 'doesnt return the same object more than once', ->
      quadtree.insert(collide.AABB_cwh([0, 0], 5, 5))
      expect(all_objects(quadtree).length).toEqual(5)

  describe '.insert()', ->
    it 'adds an object to the world', ->
      expect(_.include(all_objects(quadtree), objects[0])).toBeTruthy()

  describe '.remove()', ->
    beforeEach -> quadtree.remove(objects[3])

    it 'removes an object from the world', ->
      expect(all_objects(quadtree)).not.toContain(objects[3])

    it 'deletes the quadtree_id property', ->
      expect(objects[3].quadtree_id).toBeFalsy()