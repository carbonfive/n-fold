function rangewrap(x, max) {
  return (x > max) ? (x - max) : ((x < 0) ? (x + max) : x);
}

vec2 = {};

vec2.add = function(v0, v1) {
  return [v0[0]+v1[0], v0[1]+v1[1]];
}

vec2.scale = function(v, x) {
  return [v[0]*x, v[1]*x];
}

vec2.nonzero = function(v) {
  return v[0] !== 0 || v[1] !== 0;
}

vec2.rangewrap = function(v, max) {
  return [rangewrap(v[0], max), rangewrap(v[1], max)];
}

vec2.length = function(v) {
  return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
}

vec2.normalize = function(v) {
  return vec2.scale(v, 1.0/vec2.length(v));
}

mat2 = {};

mat2.create = function() {
  return [ 1, 0,
           0, 1 ];
};

mat2.rotate = function(theta) {
  return [ Math.cos(theta), -Math.sin(theta),
           Math.sin(theta), Math.cos(theta) ]
};

mat2.transform = function(m, v) {
  return [ m[0]*v[0] + m[1]*v[1],
           m[2]*v[0] + m[3]*v[1] ];
};
