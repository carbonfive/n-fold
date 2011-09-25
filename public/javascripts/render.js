var Render = {};

Render.ModelRenderer = function(opts) {

  return _.extend({

    prerender: function(o, ctx) {
      ctx.save();
      ctx.translate.apply(ctx, o.position);
      if (o.type === 'Player') {
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(o.id +
                     '(' +
                     o.position[0].toFixed(1) +
                     ',' +
                     o.position[1].toFixed(1) + 
                     ') ' +
                     vec2.length(o.velocity).toFixed(1)
                     , 0, 20);
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

Render.Player = Render.ModelRenderer({
  render: function(o, ctx) {
    ctx.save();
      ctx.fillStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeStyle = o.local_player ? 'blue' : 'black';

      ctx.beginPath();

      var r = o.radius;
      ctx.moveTo(0, r);
      ctx.lineTo(0, 0);
      ctx.lineTo(-r, -r);
      ctx.lineTo(0, r);
      ctx.lineTo(r, -r);
      ctx.lineTo(0, 0);

      /*
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 1.5 * r);
      */
        ctx.stroke();
    ctx.restore();
  }
});

Render.Projectile = Render.ModelRenderer({
  render: function(o, ctx) {
    ctx.save();
    ctx.fillStyle = '#888';
    ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    ctx.restore();
  }
});

Render.Explosion = Render.ModelRenderer({
  render: function(o, ctx) {
    ctx.save();
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 2;
    var half_radius = o.radius * 0.5;
    ctx.strokeRect(-o.radius*0.5, -o.radius*0.5, o.radius, o.radius);
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
      // ctx.translate(-view.min_x, -view.min_y);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;

      for (var x = (view.min_x - view.min_x % 50); x < view.max_x; x += 50) {
        ctx.moveTo(x, this.viewport.min_y);
        ctx.lineTo(x, this.viewport.max_y);
      }
      for (var y = (view.min_y - view.min_y % 50); y < view.max_y; y += 50) {
        ctx.moveTo(this.viewport.min_x, y);
        ctx.lineTo(this.viewport.max_x, y);
      }
      ctx.stroke();

      var render_count = 0;
      sim.each_entity(this.viewport, function(o) {
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


