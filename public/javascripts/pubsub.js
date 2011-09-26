pubsub = (function() {

  var listeners = {};

  return {
    publish: function(name, data) {
      _.each(listeners[name], function(fn) {
        fn(data);
      });
    },

    subscribe: function(name, fn) {
      if (!listeners[name]) {
        listeners[name] = [];
      }
      listeners[name].push(fn);
    },
  };

})();

if (typeof(exports) !== 'undefined') {
  _.each(pubsub, function(value, key) {
    exports[key] = value;
  });
}
