simulation = require('../public/javascripts/simulation.js');
collide = require('../public/javascripts/collide.js');

describe 'collide', ->
  aabb = null
  point = null

  beforeEach ->
    aabb = collide.AABB_cwh([0, 0], 2, 2)
    point = collide.Point([1, 2])

  describe '.AABB()', ->
    it 'succeeds', ->
      expect(aabb).not.toBeNull