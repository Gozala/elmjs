"use strict";

var Event = require("./event")
var field = require("oops").field
var map = require("./signal").map

var root = document.documentElement
var Tuple = Array


// The current dimensions of the window (i.e. the area viewable
// to the user, not including scroll bars).
// dimensions : Signal [Int,Int]
var dimensions = map(function() {
  return new Tuple(root.clientWidth, root.clientHeight)
}, Event(window, "resize"))
exports.dimensions = dimensions

// The current width of the window.
// width : Signal Int
var width = map(field(0), dimensions)
exports.width = width

// The current height of the window.
// height : Signal Int
var height = map(field(1), dimensions)
exports.height = height
