var Render = {};

Render.ModelRenderer = function(opts) {

  return _.extend({
    prerender: function(o, ctx) {
      ctx.save();
      ctx.translate.apply(ctx, o.position);
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
    var radius = 8;
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 1.5*radius);
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

  canvas.width = $canvas.width();
  canvas.height = $canvas.height();

  return {
    render: function(sim) {
      ctx.fillStyle = nfold.background_color,
      ctx.fillRect(0, 0, nfold.view_width, nfold.view_height);
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
    }
  }
}

