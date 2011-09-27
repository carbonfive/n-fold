var input = {}

input.InputManager = function() {

  var keys = [];
  //
  // mouse
  var last_x = 0;
  var last_y = 0;
  var cur_x = 0;
  var cur_y = 0;

  $(document).keydown(function(e) {
    // console.log(e.keyCode);
    keys[e.keyCode] = true }
  );

  $(document).keyup(function(e) {
    keys[e.keyCode] = false
  });

  $(document).mousemove(function(e) {
    cur_x = e.pageX;
    cur_y = e.pageY;
  });

  return {
    reset_frame: function() {
      last_x = cur_x;
      last_y = cur_y;
    },

    is_pressed: function(key_code) {
      return keys[key_code];
    },

    mouse_movement: function() {
      return [cur_x - last_x, cur_y - last_y];
    },
  };
}
