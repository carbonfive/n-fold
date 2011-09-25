var input = {

  InputManager: function() {

    var keys = []

    var keydown_handlers = {};
    var keyup_handlers = {};

    function handle_key(key_code, value, callbacks) {
      keys[key_code] = value;
      if (callbacks[key_code]) {
        _.each(callbacks[key_code], function(h) { h(); });
      }
    }

    $(document).keydown(function(e) { handle_key(e.keyCode, true, keydown_handlers) });
    $(document).keyup(function(e) { handle_key(e.keyCode, false, keyup_handlers) });

    return {

      is_pressed: function(key_code) {
        return keys[key_code];
      },

      add_keydown_handler: function(key_code, handler) {
        if (!keydown_handlers[key_code]) {
          keydown_handlers[key_code] = [handler];
        } else {
          keydown_handlers[key_code].push(handler);
        }
      }
    };
  }

}
