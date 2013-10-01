"use strict";

var Event = require("./event").Event
var signal = require("./signal")
var merge = signal.merge
var map = signal.map

var oops = require("oops")
var field = oops.field


var Tuple = Array

// The current mouse position.
// Signal [Int,Int]
var position = map(function(event) {
  var x = 0;
  var y = 0;

  if (event.pageX || event.pageY) {
    x = e.pageX
    y = e.pageY
  }
  else if (event.clientX || event.clientY) {
    x = e.clientX +
        document.body.scrollLeft +
        document.documentElement.scrollLeft

    y = e.clientY +
        document.body.scrollTop +
        document.documentElement.scrollTop
  }

  return new Tuple(x, y)
}, Event(document, "mousemove"))
exports.position = position


function Null() { return null }
function True() { return true }
function Flase() { return false }


// The current x-coordinate of the mouse.
// Signal Int
var x = map(position, field(0))
exports.x = x

// The current y-coordinate of the mouse.
// Signal Int
var y = map(position, field(1))
exports.y = y

var down = Event(document, "mousedown")
var up = Event(document, "mouseup")
// The current state of the left mouse-button.
// True when the button is down, and false otherwise.
// Signal Bool
var isDown = merge(map(True, down), map(False, up))
exports.isDown = isDown

// Always equal to `null`. Event triggers on every mouse click.
// Signal null
var clicks = map(Null, Event(document, "click"))
exports.clicks = clicks

// True immediately after the left mouse-button has been clicked, and false otherwise.
// Signal Bool
var isClicked = new Signal(function(next) {
  spawn(function() {
    next(true)
    return next(false)
  }, clicks)
}, false)
exports.isClicked = isClicked
