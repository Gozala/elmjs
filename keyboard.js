"use strict";

var Event = require("./event").Event
var field = require("oops").field
var signal = require("./signal")
var map = signal.map
var dropRepeats = signal.dropRepeats

var keyCode = field("keycode")
function Null() { return null }

var down = map(keyCode, Event(document, "keydown"))
exports.down = down

var up = map(keycode, Event(document, "keyup"))
exports.up = up

var blur = map(Null, Event(document, "blur"))

// The latest key that has been pressed.
// lastPressed : Signal KeyCode
var lastPressed = dropRepeats(down)
exports.lastPressed = lastPressed

// Whether an arbitrary key is pressed.
// KeyCode -> Signal Bool
function isDown(keyCode) {
  return map(is(keyCode), down)
}
exports.isDown = isDown

// Whether the shift key is pressed.
// shift : Signal Bool
var shift = isDown(16)
exports.shift = shift

// Whether the control key is pressed.
// ctrl : Signal Bool
var ctrl = isDown(17)
exports.ctrl = ctrl

// Whether the space key is pressed.
// space : Signal Bool
var space = isDown(32)
exports.space = space

// Whether the enter key is pressed.
// enter : Signal Bool
var enter = isDown(13)
exports.enter = enter

function cons(head, tail) {
  return [head].concat(tail)
}
function remove(array, value) {
  var index = array.indexOf(value)
  if (index >= 0) array.splice(index, 1)
  return array
}
function has(array, value) {
  return array.indexOf(value) >= 0
}

// List of keys that are currently down.
var keysDown = new Signal(function(next) {
  var value = []
  down.spawn(function(keyCode) {
    return next(cons(keyCode, value))
  })
  up.spawn(function(keyCode) {
    return next(remove(value, keyCode))
  })
  blur.spawn(function() {
    return next([])
  })
}, [])
exports.keysDown = keysDown

// Custom key directions so that you can support different locales.
// The plan is to have a locale independent version of this function
// that uses the physical location of keys, but I don't know how to do it.
// directions : KeyCode -> KeyCode -> KeyCode -> KeyCode -> Signal { x:Int, y:Int }

function directions(up, down, left, right) {
  return map(function(keys) {
    var x = has(keys, left) ? -1 :
            has(keys, right) ? 1 :
            0
    var y = has(keys, down) ? -1 :
            has(keys, up) ? 1 :
            0

    return {x:x, y:y}
  }, keysDown)
}
exports.directions = directions

// A signal of records indicating which arrow keys are pressed.

// `{ x = 0, y = 0 }` when pressing no arrows.<br>
// `{ x =-1, y = 0 }` when pressing the left arrow.<br>
// `{ x = 1, y = 1 }` when pressing the up and right arrows.<br>
// `{ x = 0, y =-1 }` when pressing the down, left, and right arrows.
// arrows : Signal { x:Int, y:Int }
var arrows = directions(38, 40, 37, 39)
exports.arrows = arrows

// Just like the arrows signal, but this uses keys w, a, s, and d,
// which are common controls for many computer games.
// wasd : Signal { x:Int, y:Int }
var wasd = directions(87, 83, 65, 68)
exports.wasd = wasd
