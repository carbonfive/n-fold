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
    ctx.fillStyle = 'red';
    ctx.beginPath();
      ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
      ctx.fill();
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
    render: function(sim) {
      ctx.save();
      ctx.fillStyle = nfold.background_color,
      ctx.fillRect(0, 0, nfold.view_width, nfold.view_height);

      // view transform
      var view_object = sim.get_current();
      if (view_object) {
        ctx.translate.apply(ctx, vec2.inverse(view_object.position));
        ctx.translate(width*0.5, height*0.5);
      }

      var bounds = sim.world_bounds();
      ctx.beginPath();
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 32;

      for (var x = bounds.min_x + 100; x < bounds.max_x; x += 100) {
        ctx.moveTo(x, bounds.min_y);
        ctx.lineTo(x, bounds.max_y);
      }
      for (var y = bounds.min_y + 100; y < bounds.max_y; y += 100) {
        ctx.moveTo(bounds.min_x, y);
        ctx.lineTo(bounds.max_x, y);
      }
      ctx.stroke();

      _(sim.get_objects()).each(function(o) {
        var renderer = Render[o.type];
        renderer.prerender(o, ctx);
        renderer.render(o, ctx);
        renderer.postrender(o, ctx);

        if (o.debug) {
          ctx.save();
          ctx.fillStyle = 'red';
          ctx.textAlign = 'center';
          ctx.translate.apply(ctx, o.position);
          ctx.fillText(debug_dump_template(o), 0, 20);
          ctx.restore();
        }
      });
      ctx.restore();
    }
  }
}


