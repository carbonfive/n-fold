exports.handle_command = function(socket, sim, sender, entity_id, command, args) {

  console.log("Command: %s, Arguments: %j", command, args);

  var player_entity = sim.find_entity(entity_id);

  function reply(s) {
    socket.emit('chat', { data: { sender: 'server', text: s } });
  }

  if (!sender) {
    console.log("Unknown sender '%s' of command: %s", sender_id, command);
    return;
  }

  var handlers = {
    powerup: function() {
      if (player_entity) {
        _.each(arguments, function(powerup_type) {
          player_entity.add_powerup(powerup_type);
          reply('Adding powerup ' + powerup_type);
        });
      } else {
        reply('No player to add powerup to.');
      }
    }
  };

  if (handlers[command]) {
    handlers[command].apply(this, args);
  } else {
    reply('Unknown command: ' + command);
  }
};