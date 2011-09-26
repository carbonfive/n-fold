var Render = {};

Render.ModelRenderer = function(opts) {

  return _.extend({

    prerender: function(o, ctx) {
      ctx.save();
      ctx.translate.apply(ctx, o.position);
      if (o.type === 'Player') {
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(o.name + ' (' + o.health.toFixed(1) + ')', 0, 20);
      }
      if (Render.debug_collisions) {
        ctx.strokeStyle = 'red';
        var r = o.radius;
        ctx.strokeRect(-r, -r, r*2, r*2);
      }
      ctx.rotate(o.rotation);
    },

    render: function(o, ctx) {},

    postrender: function(o, ctx) {
      ctx.restore();
    },

  }, opts);
}

var local_player_color = [255,255,255];
var remote_player_color = [128,128,128];
var damaged_color = [255,0,0];

Render.Player = Render.ModelRenderer({
  render: function(o, ctx) {
    ctx.save();
      ctx.lineWidth = 1;

      var cur_color = vec3.lerp(
        damaged_color,
        o.local_player ? local_player_color : remote_player_color,
        o.health / o.max_health);

      ctx.strokeStyle = 'rgb(' + _.map(cur_color, Math.round).join(',') + ')';

      ctx.beginPath();

      var r = o.radius;
      ctx.moveTo(0, r);
      ctx.lineTo(0, 0);
      ctx.lineTo(-r, -r);
      ctx.lineTo(0, r);
      ctx.lineTo(r, -r);
      ctx.lineTo(0, 0);

      ctx.stroke();
    ctx.restore();
  }
});

Render.Projectile = Render.ModelRenderer({
  render: function(o, ctx) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(255,141,0,1)';
    ctx.lineWidth = '1';
    ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
});

Render.Explosion = Render.ModelRenderer({
  render: function(o, ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,141,0,' + (1.0 - o.age / o.lifespan).toFixed(1) + ')';
    ctx.beginPath();
    ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
});

function render(sel) {

  var debug_dump_template = _.template(
    'id: <%= id %> ' +
    'pos: [<%= position[0].toFixed(2) %>, <%= position[1].toFixed(2) %>] ' +
    ''
  );

  var debug_dump = function(o) {
    return debug_dump_template(o);
  };

  var $canvas = $(sel);
  var canvas = $canvas[0];
  var ctx = canvas.getContext('2d');

  var width = $canvas.width();
  var height = $canvas.height();
  canvas.width = width;
  canvas.height = height;

  return {
    width: width,
    height: height,
    viewport: collide.AABB(0, 0, width, height),

    render: function(sim) {
      ctx.save();

      ctx.fillStyle = nfold.background_color,
      ctx.fillRect(0, 0, width, height);

      var view = this.viewport;
      ctx.translate(-view.min_x, -view.min_y);


      // Draw background
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;

      for (var x = (view.min_x - view.min_x % 50); x < view.max_x; x += 50) {
        ctx.moveTo(x, view.min_y);
        ctx.lineTo(x, view.max_y);
      }
      for (var y = (view.min_y - view.min_y % 50); y < view.max_y; y += 50) {
        ctx.moveTo(view.min_x, y);
        ctx.lineTo(view.max_x, y);
      }
      ctx.stroke();

      // draw boundary of the world
      ctx.strokeStyle = 'gray';
      var world_bounds = sim.world_bounds();
      ctx.strokeRect(
        world_bounds.min_x,
        world_bounds.min_y,
        world_bounds.max_x - world_bounds.min_x,
        world_bounds.max_y - world_bounds.min_y
      );


      var render_count = 0;
      sim.each_entity(view, function(o) {
        var renderer = Render[o.type];
        renderer.prerender(o, ctx);
        renderer.render(o, ctx);
        renderer.postrender(o, ctx);
        render_count += 1;
      });
      ctx.restore();
    },

    render_bounding_boxes: function() {
      ctx.save();
      ctx.translate(-this.viewport.min_x, -this.viewport.min_y);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 0.5;
      _.each(arguments, function(aabb) {
        ctx.strokeRect(aabb.min_x, aabb.min_y, aabb.max_x - aabb.min_x, aabb.max_y - aabb.min_y);
      });
      ctx.restore();
    }
  }
}


