input = (->this.input = {})()

input.InputManager = ->

  keys = []

  # mouse
  last_x = 0
  last_y = 0
  cur_x = 0
  cur_y = 0

  $(document).keydown((e) -> keys[e.keyCode] = true)
  $(document).keyup((e) -> keys[e.keyCode] = false)

  $(document).mousemove (e) ->
    cur_x = e.pageX
    cur_y = e.pageY

  return {
    reset_frame: ->
      last_x = cur_x
      last_y = cur_y
    is_pressed: (key_code) -> keys[key_code]
    mouse_movement: -> [cur_x - last_x, cur_y - last_y]
  }
