"use strict";

var Signal = require("./signal").Signal

function Event(target, type, initial, options) {
  return new Signal(function(next) {
    function next(event) {
      event = event || window.event || {}
      if (Signal.Break === send(event)) {
        if (target.removeEventListener)
          target.removeEventListener(type, next, capture)
        else
          target.detachEvent("on" + type, next)
      }
    }

    if (target.addEventListener)
      target.addEventListener(type, handler, capture)
    else
      target.attachEvent("on" + type, handler)
  }, initial)
}
exports.Event = Event
