"use strict";


// The library for general signal manipulation. Includes `lift` function
// (that supports up to 8 inputs), combinations, filters, and past-dependence.
//
// Signals are time-varying values. Lifted functions are reevaluated whenver
// any of their input signals has an event. Signal events may be of the same
// value as the previous value of the signal. Such signals are useful for
// timing and past-dependence.
//
// Some useful functions for working with time (e.g. setting FPS) and combining
// signals and time (e.g. delaying updates, getting timestamps) can be found in
// the Time library.

var slicer = Array.prototype.slice

function Meta(value) {
  return this.value = value
}
Meta.prototype.valueOf = function() {
  return this.value
}

var Break = new Meta(null)
var Skip = new Meta(null)

function Return(value) {
  if (!(this instanceof Return))
    return new Return(value)

  this.value = value
}
Return.prototype = new Meta()


function Signal(generator, initial) {
  if (!(this instanceof Signal))
    return new Signal(generator, initial)

  this.value = initial
  this.generate = generator
}
Signal.Return = Return
Signal.return = Return
Signal.Skip = Skip
Signal.Break = Break


function dispatch(signal) {
  return function dispatch(value) {
    var result = void(0)
    // Optimal case with a single receiver.
    if (signal.receive) {

      result = signal.receive(signal.value = value, signal)
      if (result === Break) signal.receive = null
    }
    // If multiple receivers are subscribed dispatches `value` to eoch one.
    else if (signal.receivers) {
      var receivers = signal.receivers
      var count = receivers.length
      var index = 0

      // Dispatch updated signal `value` to an every customer of this `signal`.
      while (index < count) {
        var receive = receivers[index]

        // If customer wishes to unsubscribe from updates
        // remove it from the set.
        if (receive(value, signal) === Break) {
          receivers.splice(index, 1)
          count = count - 1
        }
        // Otherwise increment index, to send value to a
        // next customer.
        else {
          index = index + 1
        }
      }
      // If no more receivers `Break` the generator.
      result = receivers.length ? void(0) : Break
    }
    else {
      result = Break
    }
    return result
  }
}
// Internal field used for holding set of customers
// when `.dispatch` is used for sending values.
Signal.prototype.receivers = null
Signal.prototype.receive = null
Signal.prototype.valueOf = function() {
  return this.value
}

exports.Signal = Signal


// Takes `run` function, `xs` signal and invokes
// `run` with every value of `xs`.

// (x) -> Signal x -> nil
function spawn(run, signal) {
  // If signal has not being spawned yet set a
  // reciver and schedule a generator.
  if (!signal.receive) {
    signal.receive = run
    setTimeout(signal.generate, 0, dispatch(signal))
  }
  // If signal is already scheduled & there is a
  // single receiver, create an array of active
  // receivers and convert receiver to a dispatcher.
  else if (!signal.receivers) {
    signal.receivers = [signal.receive, run]
    signal.receive = null
  }
  // If signal is already dispatching & there are
  // multiple receivers add new receiver to the
  // array of active receivers.
  else {
    xs.receivers.push(run)
  }
}
exports.spawn = spawn

// # Combine

// Create a constant signal that never changes.

// a -> Signal a
function Constant(value) {
  if (!(this instanceof Constant))
    return new Constant(value)

  this.value = value
}
Constant.prototype = Object.create(Signal.prototype)
Constant.prototype.generate = function() {}
exports.constant = Constant

// Transform given signals with a given function.

// (x -> y -> ...) -> Signal x -> Signal y -> ... -> Signal z
function map(f, xs, ys) {
  var inputs = slicer.call(arguments, 1)
  var count = inputs.length
  var values = new Array(count)
  var index = 0
  while (index < count) {
    values[index] = inputs[index].value
    index = index + 1
  }

  return new Signal(function(next) {
    function forward(value, input) {
      values[inputs.indexOf(input)] = value
      return next(f.apply(f, values))
    }

    var index = 0
    while (index < count) {
      spawn(forward, inputs[index])
      index = index + 1
    }
  }, f.apply(f, values))
}
exports.map = map
exports.lift = map
exports.lift2 = map
exports.lift3 = map
exports.lift4 = map
exports.lift5 = map
exports.lift6 = map
exports.lift7 = map
exports.lift8 = map


// Merge two signals into one, biased towards the
// first signal if both signals update at the same time.

// Signal x -> Signal y -> ... -> Signal z
function merge(xs, ys) {
  var inputs = slicer.call(arguments, 0)
  var count = inputs.length
  return new Signal(function(next) {
    var index = 0
    while (index < count) {
      spawn(next, inputs[index])
      index = index + 1
    }
  }, xs.value)
}
exports.merge = merge

// Merge many signals into one, biased towards the
// left-most signal if multiple signals update simultaneously.
function merges(inputs) {
  return merge.apply(merge, inputs)
}
exports.merges = merges

// Combine a list of signals into a signal of lists.
function combine(inputs) {
  return map.apply(map, [Array].concat(inputs))
}
exports.combine = combine

// # Past-Dependence

// Create a past-dependent signal. Each value given on the input signal
// will be accumulated, producing a new output value.
function foldp(f, x, xs) {
  return new Signal(function(next) {
    var result = x
    spawn(function(current) {
      return next(result = f(result, current))
    }, xs)
  }, x)
}
exports.foldp = foldp

// Count the number of events that have occured.

// Signal x -> Signal Int
function count(xs) {
  return foldp(function(x, y) {
    return x + 1
  }, 0, xs)
}
exports.count = count

// Count the number of events that have occured that
// satisfy a given predicate.

// (x -> Bool) -> Signal x -> Signal Int
function countIf(p, xs) {
  return count(keepIf(p, xs.value, xs))
}
exports.countIf = countIf

// # Filters


// Keep only events that satisfy the given predicate.
// Elm does not allow undefined signals, so a base case
// must be provided in case the predicate is never satisfied.

// (x -> Bool) -> x -> Signal x -> Signal x
function keepIf(p, x, xs) {
  x = p(xs.value) ? xs.value : x
  return new Signal(function(next) {
    spawn(function(x) {
      return p(x) ? next(x) : Skip
    }, xs)
  }, x)
}
exports.keepIf = keepIf

// Drop events that satisfy the given predicate. Elm does not allow
// undefined signals, so a base case must be provided in case the
// predicate is never satisfied.

// (x -> Bool) -> x -> Signal x -> Signal x
function dropIf(p, x, xs) {
  x = p(xs.value) ? x : xs.value
  return new Signal(function(next) {
    spawn(function(x) {
      return p(x) ? Signal.Skip : next(x)
    }, xs)
  }, x)
}
exports.dropIf = dropIf

// Keep events only when the first signal is true. When the first signal
// becomes true, the most recent value of the second signal will be propagated.
// Until the first signal becomes false again, all events will be propagated.
// Elm does not allow undefined signals, so a base case must be provided in case
// the first signal is never true.

// Signal Bool -> x -> Signal x -> Signal x
function keepWhen(state, x, xs) {
  x = state.value ? xs.value : x
  return new Signal(function(next) {
    var keep = state.value
    spawn(function(value) {
      keep = value
      return keep ? next(xs.value) : Skip
    }, dropRepeats(state))
    spawn(function(value) {
      return keep ? next(value) : Skip
    })
  }, x)
}
exports.keepWhen = keepWhen

// Drop events when the first signal is true. When the first signal
// becomes false, the most recent value of the second signal will be
// propagated. Until the first signal becomes true again, all events
// will be propagated. Elm does not allow undefined signals, so a base
// case must be provided in case the first signal is always true.

// Signal Bool -> x -> Signal x -> Signal x
function dropWhen(state, x, xs) {
  x = state.value ? x : xs.value
  state = dropRepeats(state)
  return new Signal(function(next) {
    var drop = state.value
    spawn(function(value) {
      drop = value
      return drop ? Skip : next(xs.value)
    }, state)
    spawn(function(value) {
      return drop ? Skip : next(value)
    })
  }, x)
}
exports.dropWhen = dropWhen

// Drop sequential repeated values. For example, if a signal produces
// the sequence [1,1,2,2,1], it becomes [1,2,1] by dropping the values
// that are the same as the previous value.

// Signal x -> Signal x
function dropRepeats(xs) {
  var last = xs.value
  return new Signal(function(next) {
    spawn(function(x) {
      return last === x ? Skip : next(last = x)
    }, xs)
  }, last)
}
exports.dropRepeats = dropRepeats

// Sample from the second input every time an event occurs on the first
// input. For example, (sampleOn clicks (every second)) will give the
// approximate time of the latest click.

// Signal a -> Signal b -> Signal b
function sampleOn(ticks, data) {
  return new Signal(function(next) {
    var result = data.value

    spawn(function(value) { return result }, data)
    spawn(function(_) { return result = next(data.value) }, ticks)
  }, data.value)
}
exports.sampleOn = sampleOn

