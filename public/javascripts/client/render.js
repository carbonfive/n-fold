function render(sel) {

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
        o.prerender(ctx);
        o.render(ctx);
        o.postrender(ctx);
      });
    }
  }
}

