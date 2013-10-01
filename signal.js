"use strict";

var slicer = Array.prototype.slice

function Break() { return Break }
function Skip() { return Skip }

function Signal(generator, initial) {
  var input = this

  input.value = initial
  input.generate = generator

  input.receive = function receive(value) {
    // If `input.dispatch` is set to `null`, then input was already
    // paused so result is a `Break` message. Otherwise result is
    // value returned by dispatch.
    var result = input.send ? input.send(input.value = value, input) : Break
    if (result === Break) input.send = null

    return result
  }
}
Signal.Skip = Skip
Signal.Break = Break

// Method dispatches `value` to an every `customers` of `this` signal.
// This method is only used if `this` signal has multiple customers.
Signal.prototype.dispatch = function dispatch(value) {
  var customers = this.customers
  var count = customers.length
  var index = 0

  // Dispatch updated signal `value` to an every customer of this `signal`.
  while (index < count) {
    var customer = customers[index]

    // If customer wishes to unsubscribe from updates
    // remove it from the set.
    if (customer(value, this) === Break)
      customers.splice(index, 1)
    // Otherwise increment index, to send value to a
    // next customer.
    else
      index = index + 1
  }

  // If no more customers `Break` the generator.
  return consumers.length ? void(0) : Break
}
// Internal field used for holding set of customers
// when `.dispatch` is used for sending values.
Signal.prototype.customers = null

exports.Signal = Signal


// Takes `run` function, `xs` signal and invokes
// `run` with every value of `xs`.

// (x) -> Signal x -> nil
function spawn(run, xs) {
  if (xs.send) {
    xs.customers = [xs.send, run]
    xs.send = xs.dispatch
  }
  else {
    xs.send = run
    setTimeout(xs.generate, 0, xs.receive)
  }
  xs.spawn(run)
}
exports.spawn = spawn


// Create a constant signal that never changes.

// a -> Signal a
function constant(x) {
  return new Signal(function() {}, x)
}
exports.constant = constant

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
      inputs[index](forward)
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
    return x + y
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

// Keep only events that satisfy the given predicate.
// Elm does not allow undefined signals, so a base case
// must be provided in case the predicate is never satisfied.

// (x -> Bool) -> x -> Signal x -> Signal x
function keepIf(p, x, xs) {
  x = p(xs.value) ? x.value : x
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
  x = p(xs.value) ? x : x.value
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



