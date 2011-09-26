var input = {}

input.InputManager = function() {
  var keys = []

  $(document).keydown(function(e) { keys[e.keyCode] = true });
  $(document).keyup(function(e)   { keys[e.keyCode] = false });

  return {
    is_pressed: function(key_code) { return keys[key_code]; },
  };
}
