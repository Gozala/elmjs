"use strict";

var signal = require("../signal")
var Signal = signal.Signal;
var spawn = signal.spawn;

exports["test simple Signal"] = function(assert, done) {
  var input = new Signal(function(next) {
    next(1)
    next(2)
    next(3)

    assert.deepEqual(items, [1, 2, 3], "got all items")
    done()
  }, 0)

  var items = []
  spawn(function(value) {
    items.push(value)
  }, input)
}


exports["test multiple users"] = function(assert, done) {
  var input = new Signal(function(next) {
    next(1)
    next(2)
    next(3)
    next(4)

    assert.deepEqual(xs, [1, 2, 3, 4], "got all xs")
    assert.deepEqual(ys, [1, 2, 3, 4], "got all ys")

    done()
  }, 0)

  var xs = []
  spawn(function(x) {
    xs.push(x.valueOf())
  }, input)

  var ys = []
  spawn(function(y) {
    ys.push(y.valueOf())
  }, input)
}

var constant = signal.constant
exports["test constant"] = function(assert, done) {
  var one = constant(1)

  assert.equal(one.value, 1, "value is given one")

  spawn(function() {
    assert.fail("signal should not change value")
  }, one)


  setTimeout(done, 100)
}

var map = signal.map
exports["test map"] = function(assert, done) {
  var input = Signal(function(next) {
    next(1)
    next(2)
    next(3)
    next(4)

    assert.deepEqual(xs, [2, 3, 4, 5], "values were mapped")
    done()
  }, 0)

  var output = map(function(x) { return x + 1 }, input)
  assert.equal(output.value, 1, "initial value was mapped")

  var xs = []
  spawn(function(x) {
    xs.push(x.valueOf())
  }, output)
}


exports["test map multiple"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(1)
    next(2)
  }, 0)

  var ys = Signal(function(next) {
    next(6)
    next(7)
    next(8)

    assert.deepEqual(actual, [ 6, 7, 8, 9, 10 ], "values were mapped")
    done()
  }, 5)

  var xys = map(function(x, y) {
    return x + y
  }, xs, ys)

  assert.equal(xys.value, 5, "initial value was mapped")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)
}

exports["test concurrent multi map"] = function(assert, done) {
  var sendX = null
  var sendY = null
  var xs = Signal(function(next) { sendX = next }, 0)
  var ys = Signal(function(next) { sendY = next }, 0)

  var xys = map(function(x, y) { return [x, y] }, xs, ys)
  assert.deepEqual(xys.value, [0, 0], "initial value mapped")

  var actual = []
  spawn(function(xy) { actual.push(xy) }, xys)
  assert.deepEqual(actual, [], "nothing dispatched yet")

  setTimeout(function() {
    sendX(1)
    assert.deepEqual(actual, [[1, 0]], "x changed")
    sendX(1)
    assert.deepEqual(actual, [[1, 0], [1, 0]], "x changed again")
    sendY(7)
    assert.deepEqual(actual, [[1, 0], [1, 0], [1, 7]], "y changed")
    sendX(5)
    assert.deepEqual(actual, [[1, 0], [1, 0], [1, 7], [5, 7]], "x changed")
    sendY(7)
    assert.deepEqual(actual, [[1, 0], [1, 0], [1, 7], [5, 7], [5, 7]], "y changed")
    sendY(8)
    assert.deepEqual(actual, [[1, 0], [1, 0], [1, 7], [5, 7], [5, 7], [5, 8]], "y changed")
    done()
  }, 100)
}

var keepIf = signal.keepIf
var isOdd = function(x) { return x % 2 }
var isEven = function(x) { return !(x % 2) }
exports["test keepIf (keep initial)"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(2)
    next(3)
    next(4)
    next(5)

    assert.deepEqual(actual, [3, 5], "odds kept")
    done()
  }, 1)

  var actual = []
  var ys = keepIf(isOdd, 0, xs)
  assert.equal(ys.value, 1, "initial value was kept")

  spawn(function(y) {
    actual.push(y)
  }, ys)
}

exports["test keepIf (update initial)"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(2)
    next(3)
    next(4)
    next(5)

    assert.deepEqual(actual, [2, 4], "evens kept")
    done()
  }, 1)

  var actual = []
  var ys = keepIf(isEven, 0, xs)
  assert.equal(ys.value, 0, "initial value updated")

  spawn(function(y) {
    actual.push(y)
  }, ys)
}

var dropIf = signal.dropIf
exports["test dropIf (update initial)"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(2)
    next(3)
    next(4)
    next(5)

    assert.deepEqual(actual, [2, 4], "odds dropt")
    done()
  }, 1)

  var actual = []
  var ys = dropIf(isOdd, 0, xs)
  assert.equal(ys.value, 0, "initial value updated")

  spawn(function(y) {
    actual.push(y)
  }, ys)
}

exports["test dropIf (keep initial)"] = function(assert, done) {
   var xs = Signal(function(next) {
    next(2)
    next(3)
    next(4)
    next(5)

    assert.deepEqual(actual, [3, 5], "evens dropped")
    done()
  }, 1)

  var actual = []
  var ys = dropIf(isEven, 0, xs)
  assert.equal(ys.value, 1, "initial value kept")

  spawn(function(y) {
    actual.push(y)
  }, ys)
}

require("test").run(exports)
