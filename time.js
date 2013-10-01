"use strict";

var Signal = require("./signal").Signal

// Type alias to make it clearer when you are working with time values.
// Using the `Time` constants instead of raw numbers is very highly recommended.
var Time = Number
exports.Time = Time

// Units of time, making it easier to specify things like a
// half-second `(500 * milliseconds)` without remembering Elm&rsquo;s
// underlying units of time.
// millisecond : Time
var millisecond = 1
exports.millisecond = millisecond

// second : Time
var second = 1000 * millisecond
exports.second = second

// minute : Time
var minute = 60 * second
exports.minute = minute

// hour : Time
var hour = 60 * minute
exports.hour = hour

function inMilliseconds(time) { return time }
exports.inMilliseconds = inMilliseconds

function inSeconds(time) { return time / second }
exports.inSeconds = inSeconds

function inMinutes(time) { return time / minute }
exports.inMinutes = inMinutes

function inHours(time) { return time / hour }
exports.inHours = inHours

// Takes desired number of frames per second (fps). The
// resulting signal gives a sequence of time deltas as
// quickly as possible until it reaches the desired FPS.
// A time delta is the time between the last frame and the
// current frame.
// int -> Signal Time
var fps = function(n) {
  var ms = 1000 / n

  return new Signal(function(next) {
    var before = Date.now()

    function tick() {
      var now = Date.now()
      var diff = before - now
      before = now

      if (next(diff) !== Signal.Break)
        setTimeout(tick, ms)
    }

    setTimeout(tick, ms)
  }, 0)
}
exports.fps = fps

// Same as the fps function, but you can turn it on and off.
// Allows you to do brief animations based on user input without
// major inefficiencies. The first time delta after a pause is always
// zero, no matter how long the pause was. This way summing the deltas
// will actually give the amount of time that the output signal has been
// running.
// fpsWhen : number -> Signal Bool -> Signal Time
function fpsWhen(n, state) {
  return keepWhen(state, fps(n))
}
exports.fpsWhen = fpsWhen

function every(ms) {
  return new Signal(function(next) {
    function tick() {
      if (Signal.Break !== next(Date.now()))
        setTimeout(tick, ms)
    }

    setTimeout(tick, ms)
  }, Date.now())
}
exports.every = every

function fps(n) {
  var tickTimes = every(1000 / n)
  var states = foldp(function(result, time) {
    return [result, result[0] - time]
  }, [0, tickTimes.value], tickTimes)

  return map(field(1), states)
}
exports.fps = fps

//  Add a timestamp to any signal. Timestamps increase monotonically.
// Each timestamp is related to a specfic event, so Mouse.x and Mouse.y
// will always have the same timestamp because they both rely on the same
// underlying event.
// timestamp : Signal a -> Signal (Time, a)
function timestamp(input) {
  return map(function(value) {
    return [Date.now(), value]
  }, input)
}
exports.timestamp = timestamp

// Delay a signal by a certain amount of time. So (delay second Mouse.clicks) will
// update one second later than any mouse click.
// delay : Time -> Signal a -> Signal a
function delay(ms, input) {
  return new Signal(function(next) {
    var result = void(0)
    spawn(function(value) {
      setTimeout(function() { result = next(value) }, ms)
      return result
    }, input)
  }, input.value)
}
exports.delay = delay

function since(ms, input) {
  var on = map(True, input)
  var off = map(False, delay(ms, input))
  return merge(on, off)
}
exports.since = since
