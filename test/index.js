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
  var xs = Signal(function(next) {
    sendX = next
    if (sendY) runAsserts()
  }, 0)
  var ys = Signal(function(next) {
    sendY = next
    if (sendX) runAsserts()
  }, 0)

  var xys = map(function(x, y) { return [x, y] }, xs, ys)
  assert.deepEqual(xys.value, [0, 0], "initial value mapped")

  var actual = []
  spawn(function(xy) { actual.push(xy) }, xys)
  assert.deepEqual(actual, [], "nothing dispatched yet")

  function runAsserts() {
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
  }
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

var foldp = signal.foldp
exports["test flodp"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(1)
    next(2)
    next(3)
    next(4)

    assert.deepEqual(actual, [6, 8, 11, 15], "values accumulated")
    done()
  }, 0)

  var actual = []
  var ys = foldp(function(p, x) {
    return p + x
  }, 5, xs)
  assert.equal(ys.value, 5, "initial value set")

  spawn(function(y) { actual.push(y) }, ys)
}


var merge = signal.merge
exports["test synchronous merge"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(1)
    next(2)
    next(3)
  }, 0)

  var ys = Signal(function(next) {
    next(11)
    next(12)
    next(13)
    next(14)

    assert.deepEqual(actual, [1, 2, 3, 11, 12, 13, 14],
                     "both signals were merged")
    done()
  }, 10)

  var xys = merge(xs, ys)
  assert.equal(xys.value, xs, "value is taken from first signal")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)
}

exports["test concurrent merge"] = function(assert, done) {
  var sendX = null
  var sendY = null
  var xs = Signal(function(next) {
    sendX = next
    if (sendY) runAsserts()
  }, 0)

  var ys = Signal(function(next) {
    sendY = next
    if (sendX) runAsserts()
  }, 10)

  var xys = merge(xs, ys)
  assert.equal(xys.value, xs, "value is taken from first signal")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)

  function runAsserts() {
    sendX(1)
    assert.deepEqual(actual, [1], "got first from x")
    sendX(2)
    assert.deepEqual(actual, [1, 2], "got second from x")
    sendY(3)
    assert.deepEqual(actual, [1, 2, 3], "got first from y")
    sendX(4)
    assert.deepEqual(actual, [1, 2, 3, 4], "got third from x")

    sendY(5)
    sendY(6)
    assert.deepEqual(actual, [1, 2, 3, 4, 5, 6], "got second & third from y")
    done()
  }
}

var merges = signal.merges
exports["test synchronous merges"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(1)
    next(2)
    next(3)
  }, 0)

  var ys = Signal(function(next) {
    next(11)
    next(12)
    next(13)
    next(14)

    assert.deepEqual(actual, [1, 2, 3, 11, 12, 13, 14],
                     "both signals were merged")
    done()
  }, 10)

  var xys = merges([xs, ys])
  assert.equal(xys.value, xs, "value is taken from first signal")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)
}

exports["test concurrent merges"] = function(assert, done) {
  var sendX = null
  var sendY = null
  var xs = Signal(function(next) {
    sendX = next
    if (sendY) runAsserts()
  }, 0)

  var ys = Signal(function(next) {
    sendY = next
    if (sendX) runAsserts()
  }, 10)

  var xys = merges([xs, ys])
  assert.equal(xys.value, xs, "value is taken from first signal")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)

  function runAsserts() {
    sendX(1)
    assert.deepEqual(actual, [1], "got first from x")
    sendX(2)
    assert.deepEqual(actual, [1, 2], "got second from x")
    sendY(3)
    assert.deepEqual(actual, [1, 2, 3], "got first from y")
    sendX(4)
    assert.deepEqual(actual, [1, 2, 3, 4], "got third from x")

    sendY(5)
    sendY(6)
    assert.deepEqual(actual, [1, 2, 3, 4, 5, 6], "got second & third from y")
    done()
  }
}

var combine = signal.combine
exports["test synchronous combine"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(1)
    next(2)
    next(3)
  }, 0)

  var ys = Signal(function(next) {
    next(11)
    next(12)
    next(13)
    next(14)

    assert.deepEqual(actual, [
      [1, 10],
      [2, 10],
      [3, 10],
      [3, 11],
      [3, 12],
      [3, 13],
      [3, 14]
    ], "signals were combined")
    done()
  }, 10)

  var xys = combine([xs, ys])
  assert.deepEqual(xys.value, [0, 10], "initial value was combined")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)
}

exports["test combine concurrent signals"] = function(assert, done) {
  var sendX = null
  var sendY = null
  var xs = Signal(function(next) {
    sendX = next
    if (sendY) runAsserts()
  }, 0)

  var ys = Signal(function(next) {
    sendY = next
    if (sendX) runAsserts()
  }, 10)

  var xys = combine([xs, ys])
  assert.deepEqual(xys.value, [0, 10], "initial value combined")

  var actual = []
  spawn(function(xy) {
    actual.push(xy)
  }, xys)

  function runAsserts() {
    sendX(1)
    assert.deepEqual(actual, [[1, 10]],
                     "got first from x")
    sendX(2)
    assert.deepEqual(actual, [[1, 10], [2, 10]],
                     "got second from x")
    sendY(3)
    assert.deepEqual(actual, [[1, 10], [2, 10], [2, 3]],
                     "got first from y")
    sendX(4)
    assert.deepEqual(actual, [[1, 10], [2, 10], [2, 3], [4, 3]],
                     "got third from x")

    sendY(5)
    assert.deepEqual(actual, [[1, 10], [2, 10], [2, 3], [4, 3], [4, 5]],
                     "got second & third from y")
    done()
  }
}

var count = signal.count
exports["test count"] = function(assert, done) {
  var input = Signal(function(next) {
    next("a")
    next("b")
    next("c")
    next("d")

    assert.deepEqual(actual, [1, 2, 3, 4], "values were indexed")
    done()
  }, 0)

  var output = count(input)
  assert.equal(output.value, 0, "initial is 0")

  var actual = []
  spawn(function(x) {
    actual.push(x.valueOf())
  }, output)
}

var countIf = signal.countIf
exports["test countIf"] = function(assert, done) {
  var isUpperCase = function(c) {
    return c.toUpperCase() == c
  }

  var input = Signal(function(next) {
    next("a")
    assert.deepEqual(actual, [], "don't count a")
    next("B")
    assert.deepEqual(actual, [1], "count B")
    next("C")
    assert.deepEqual(actual, [1, 2], "count C")
    next("d")
    assert.deepEqual(actual, [1, 2], "don't count d")
    next("D")
    assert.deepEqual(actual, [1, 2, 3], "count D")

    done()
  }, "B")

  var output = countIf(isUpperCase, input)
  assert.equal(output.value, 0, "initial is 0")

  var actual = []
  spawn(function(x) {
    actual.push(x.valueOf())
  }, output)
}

var dropRepeats = signal.dropRepeats
exports["test dropRepeats"] = function(assert, done) {
  var xs = Signal(function(next) {
    next(0)
    assert.deepEqual([], actual, "drop repeated initial")
    next(1)
    assert.deepEqual([1], actual, "changed to 1")
    next(2)
    assert.deepEqual([1, 2], actual, "changed to 2")
    next(2)
    assert.deepEqual([1, 2], actual, "drop repeated 2")
    next(2)
    assert.deepEqual([1, 2], actual, "drop repeated 2")
    next(3)
    assert.deepEqual([1, 2, 3], actual, "changed to 3")
    next(3)
    assert.deepEqual([1, 2, 3], actual, "drop repeated 3")
    next(4)
    assert.deepEqual([1, 2, 3, 4], actual, "changed to 4")
    next(3)
    assert.deepEqual([1, 2, 3, 4, 3], actual, "changed to 3")
    next(3)
    assert.deepEqual([1, 2, 3, 4, 3], actual, "drop repeated 3")
    next(4)
    assert.deepEqual([1, 2, 3, 4, 3, 4], actual, "changed to 4")
    next(3)
    assert.deepEqual([1, 2, 3, 4, 3, 4, 3], actual, "changed to 3")
    done()
  }, 0)

  var output = dropRepeats(xs)
  assert.equal(output.value, 0, "initial value is kept")

  var actual = []
  spawn(function(x) {
    actual.push(x.valueOf())
  }, output)
}

var keepWhen = signal.keepWhen
exports["test keepWhen"] = function(assert, done) {
  var setState = null
  var setX = null
  var state = new Signal(function(next) {
    setState = next
    if (setX) runAsserts()
  }, false)
  var xs = new Signal(function(next) {
    setX = next
    if (setState) runAsserts()
  }, 0)
  var ys = keepWhen(state, 10, xs)

  assert.equal(ys.value, 10, "inital value set")
  var actual = []
  spawn(function(y) {
    actual.push(y)
  }, ys)

  function runAsserts() {
    setX(1)
    assert.equal(ys.value, 10, "inital value kept")
    assert.deepEqual(actual, [], "not kept until true")

    setX(2)
    assert.equal(ys.value, 10, "inital value kept")
    assert.deepEqual(actual, [], "not kept until true")

    setState(true)
    assert.equal(ys.value, 2, "last value set")
    assert.deepEqual(actual, [2], "not kept until true")

    setX(3)
    assert.equal(ys.value, 3, "value propagated")
    assert.deepEqual(actual, [2, 3], "new value collected")

    setX(3)
    assert.equal(ys.value, 3, "value propagated")
    assert.deepEqual(actual, [2, 3, 3], "new value collected")

    setState(false)
    assert.equal(ys.value, 3, "value didn't change")
    assert.deepEqual(actual, [2, 3, 3], "no changes to ys")

    setX(4)
    assert.equal(ys.value, 3, "value not propagated")
    assert.deepEqual(actual, [2, 3, 3], "value isn't collected")

    setState(false)
    assert.equal(ys.value, 3, "value didn't change")
    assert.deepEqual(actual, [2, 3, 3], "no changes to ys")

    setState(true)
    assert.equal(ys.value, 4, "value didn't change")
    assert.deepEqual(actual, [2, 3, 3, 4], "no changes to ys")

    setState(false)
    assert.equal(ys.value, 4, "value didn't change")
    assert.deepEqual(actual, [2, 3, 3, 4], "no changes to ys")

    setState(true)
    assert.equal(ys.value, 4, "value changed")
    assert.deepEqual(actual, [2, 3, 3, 4, 4],
                     "state chnages propagate same value")

    done()
  }
}

var dropWhen = signal.dropWhen
exports["test dropWhen"] = function(assert, done) {
  var setState = null
  var setX = null
  var state = new Signal(function(next) {
    setState = next
    if (setX) runAsserts()
  }, false)
  var xs = new Signal(function(next) {
    setX = next
    if (setState) runAsserts()
  }, 0)
  var ys = dropWhen(state, 10, xs)

  assert.equal(ys.value, 0, "inital value kept")
  var actual = []
  spawn(function(y) {
    actual.push(y)
  }, ys)

  function runAsserts() {
    setX(1)
    assert.equal(ys.value, 1, "value 1 propagated")
    assert.deepEqual(actual, [1], "new value 1 is collected")

    setX(2)
    assert.equal(ys.value, 2, "value 2 propagated")
    assert.deepEqual(actual, [1, 2], "new value 2 collected")

    setState(true)
    assert.equal(ys.value, 2, "last value 2 is kept")
    assert.deepEqual(actual, [1, 2], "nothing propagated")

    setX(3)
    assert.equal(ys.value, 2, "value 3 isn't propagated")
    assert.deepEqual(actual, [1, 2], "value 3 isn't collected")

    setX(3)
    assert.equal(ys.value, 2, "value 3 isn't propagated")
    assert.deepEqual(actual, [1, 2], "value 3 isn't collected")

    setState(false)
    assert.equal(ys.value, 3, "last value 3 is set")
    assert.deepEqual(actual, [1, 2, 3], "last value 3 is collected")

    setX(4)
    assert.equal(ys.value, 4, "value changed to 4")
    assert.deepEqual(actual, [1, 2, 3, 4], "value 4 is collected")

    setState(false)
    assert.equal(ys.value, 4, "value 4 is preserved")
    assert.deepEqual(actual, [1, 2, 3, 4], "last value 4 isn't collected")

    setState(true)
    assert.equal(ys.value, 4, "value didn't change")
    assert.deepEqual(actual, [1, 2, 3, 4], "no changes collected")

    setState(false)
    assert.equal(ys.value, 4, "value didn't change")
    assert.deepEqual(actual, [1, 2, 3, 4, 4], "last value 4 is collected")

    setState(true)
    assert.equal(ys.value, 4, "no changes")
    assert.deepEqual(actual, [1, 2, 3, 4, 4], "no changes collected")

    done()
  }
}

var sampleOn = signal.sampleOn
exports["test sampleOn"] = function(assert, done) {
  var setX = null
  var xs = new Signal(function(next) {
    setX = next
    if (tick) runAsserts()
  }, 0)

  var tick = null
  var ticks = new Signal(function(next) {
    tick = next
    if (setX) runAsserts()
  })

  var ys = sampleOn(ticks, xs)
  var actual = []
  spawn(function(y) {
    actual.push(y)
  }, ys)

  function runAsserts() {
    assert.equal(ys.value, 0, "initial value is copied from xs")
    tick()
    assert.equal(ys.value, 0, "value is 0")
    assert.deepEqual(actual, [0], "value propagated")

    tick()
    assert.equal(ys.value, 0, "value is 0")
    assert.deepEqual(actual, [0, 0], "value propagated")

    setX(1)
    assert.equal(ys.value, 0, "value is still 0")
    assert.deepEqual(actual, [0, 0], "value not propagated")

    setX(2)
    assert.equal(ys.value, 0, "value is still 0")
    assert.deepEqual(actual, [0, 0], "value not propagated")

    tick()
    assert.equal(ys.value, 2, "value is 2")
    assert.deepEqual(actual, [0, 0, 2], "value is propagated")

    done()
  }
}

require("test").run(exports)
