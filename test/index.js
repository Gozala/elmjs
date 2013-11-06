"use strict";

var signal = require("../signal")
var Input = signal.Input
var Break = signal.Break
var Return = signal.Return
var connect = signal.connect
var disconnect = signal.disconnect
var start = signal.start
var stop = signal.stop
var receive = signal.receive
var error = signal.error
var end = signal.end
var send = signal.send

function Subject(options) {
  var options = options || {}
  this[signal.outputs] = []
  this.name = "subject"
  this.onStart = options.onStart
  this.onStop = options.onStop
  this.value = options.value
  this.started = 0
  this.stopped = 0
}
Subject.prototype = new Input()
Subject.prototype[start] = function() {
  this.started = this.started + 1
  if (this.onStart)
    this.onStart()
}
Subject.prototype[stop] = function() {
  this.stopped = this.stopped + 1
  if (this.onStop)
    this.onStop()
}
Subject.prototype.toJSON = function() {
  return {
    started: this.started,
    stopped: this.stopped,
    value: this.value
  }
}

function Client(options) {
  options = options || {}
  this.messages = []
  this.errors = []
  this.ends = []

  this.onNext = options.onNext
  this.onError = options.onError
  this.onEnd = options.onEnd

}
Client.prototype[receive] = function(input, message, source) {
  this.messages.push(message)
  return this.onNext && input.onNext(message, source)
}
Client.prototype[error] = function(input, message, source) {
  this.errors.push(message)
  return this.onError && input.onError(message, source)
}
Client.prototype[end] = function(input, source) {
  this.ends.push(true)
  return this.onEnd && input.onEnd(source)
}
Client.prototype.toJSON = function() {
  return {
    messages: this.messages,
    errors: this.errors,
    ends: this.ends
  }
}

exports["test 2 messages & end"] = function(assert) {
  var subject = new Subject({ value: null })

  assert.deepEqual(subject.toJSON(), {
    started: 0,
    stopped: 0,
    value: null
  }, "nothing changed")

  var client = new Client()
  connect(subject, client)

  assert.deepEqual(subject.toJSON(), {
    started: 1,
    stopped: 0,
    value: null
  }, "subject started")

  assert.deepEqual(client.toJSON(), {
    messages: [],
    errors: [],
    ends: []
  }, "nothing received yet")

  send(subject, 1)

  assert.deepEqual(subject.toJSON(), {
    value: 1,
    started: 1,
    stopped: 0
  }, "value changed to 1")

  assert.deepEqual(client.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "client received one message")

  receive(subject, 2)

  assert.deepEqual(subject.toJSON(), {
    value: 2,
    started: 1,
    stopped: 0
  }, "value changed to 2")

  assert.deepEqual(client.toJSON(), {
    messages: [1, 2],
    errors: [],
    ends: []
  }, "client received second message")

  end(subject)

  assert.deepEqual(subject.toJSON(), {
    value: 2,
    started: 1,
    stopped: 1
  }, "value changed to 2")

  assert.deepEqual(client.toJSON(), {
    messages: [1, 2],
    errors: [],
    ends: [true]
  }, "client received second message")
}

exports["test multiple connections"] = function(assert) {
  var source = new Subject({ value: null });
  var order = []

  assert.deepEqual(source.toJSON(), {
    started: 0,
    stopped: 0,
    value: null
  }, "nothing happened yet")

  var client1 = new Client({
    onNext: function() {
      order.push(1)
    }
  });

  connect(source, client1)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: null
  }, "source was started")

  send(source, 1)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 1
  }, "source.value changed to 1")

  assert.deepEqual(client1.toJSON(), {
    ends: [],
    messages: [1],
    errors: []
  }, "one message received on clien1")

  var client2 = new Client({
    onNext: function() {
      order.push(2)
    }
  })

  connect(source, client2);

  send(source, 2)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 2
  }, "source.value changed to 2");

  assert.deepEqual(client1.toJSON(), {
    ends: [],
    messages: [1, 2],
    errors: []
  }, "messagese received on client 1")

  assert.deepEqual(client2.toJSON(), {
    ends: [],
    messages: [2],
    errors: []
  }, "message received on clien 2");

  var client3 = new Client({
    onNext: function() {
      order.push(3)
      return new Break()
    }
  })

  connect(source, client3)

  send(source, 3)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 3
  }, "source.value changed to 3")

  assert.deepEqual(client1.toJSON(), {
    messages: [1, 2, 3],
    errors: [],
    ends: []
  }, "client1 received 3 messages")

  assert.deepEqual(client2.toJSON(), {
    messages: [2, 3],
    errors: [],
    ends: []
  }, "client2 received 2 messages")

  assert.deepEqual(client3.toJSON(), {
    messages: [3],
    errors: [],
    ends: []
  }, "client3 received 1 message")

  send(source, 4)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 4
  }, "source.value changed to 4")

  assert.deepEqual(client1.toJSON(), {
    messages: [1, 2, 3, 4],
    errors: [],
    ends: []
  }, "client1 received 4 messages")

  assert.deepEqual(client2.toJSON(), {
    messages: [2, 3, 4],
    errors: [],
    ends: []
  }, "client2 received 3 messages")

  assert.deepEqual(client3.toJSON(), {
    messages: [3],
    errors: [],
    ends: []
  }, "client3 did not got last message")

  end(source)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 1,
    value: 4
  }, "source stopped")

  assert.deepEqual(client1.toJSON(), {
    messages: [1, 2, 3, 4],
    errors: [],
    ends: [true]
  }, "client1 received 4 messages")

  assert.deepEqual(client2.toJSON(), {
    messages: [2, 3, 4],
    errors: [],
    ends: [true]
  }, "client2 received 3 messages")

  assert.deepEqual(client3.toJSON(), {
    messages: [3],
    errors: [],
    ends: []
  }, "client3 did not got last message")

  assert.deepEqual(order,
                   [1, 1, 2, 1, 2, 3, 1, 2],
                   "order of received message is correct")
}

exports["test last disconnect stops"] = function(assert) {
  var source = new Subject({ value: 0 })
  var client = new Client({
    onNext: function(message) {
      return new Break()
    }
  })

  assert.deepEqual(source.toJSON(), {
    value: 0,
    started: 0,
    stopped: 0
  }, "source is in initial state")

  connect(source, client)

  assert.deepEqual(source.toJSON(), {
    value: 0,
    started: 1,
    stopped: 0
  }, "source in started state")
  assert.deepEqual(client.toJSON(), {
    messages: [],
    errors: [],
    ends: []
  }, "client got nothing so far")

  send(source, 1)

  assert.deepEqual(source.toJSON(), {
    value: 1,
    started: 1,
    stopped: 1
  }, "source was stopped")
  assert.deepEqual(client.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "client got one message")
}

exports["test same client can connect once"] = function(assert) {
  var source = new Subject({ value: null })
  var client = new Client()

  connect(source, client)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: null
  }, "source started")

  send(source, 1)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 1
  }, "source value changed to 1")
  assert.deepEqual(client.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "got one message")

  connect(source, client)
  send(source, 2)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 2
  }, "source value changed to 2")
  assert.deepEqual(client.toJSON(), {
    messages: [1, 2],
    errors: [],
    ends: []
  }, "got only one message")
}

exports["test manual disconnect stops"] = function(assert) {
  var source = new Subject({ value: 0 })
  var a = new Client()
  var b = new Client()

  connect(source, a)
  connect(source, b)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 0
  }, "input started")

  send(source, 1)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 1
  }, "source.value is 1")

  assert.deepEqual(a.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "a got a message")

  assert.deepEqual(b.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "b got a message")

  disconnect(source, a)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 1
  }, "source.value is 1")

  assert.deepEqual(a.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "disconnected a did not get a message")

  send(source, 2)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 2
  }, "source.value is 2")

  assert.deepEqual(a.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "disconnected a did not get a message")

  assert.deepEqual(b.toJSON(), {
    messages: [1, 2],
    errors: [],
    ends: []
  }, "b got a message")

  disconnect(source, b)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 1,
    value: 2
  }, "source was stopped")

  assert.deepEqual(a.toJSON(), {
    messages: [1],
    errors: [],
    ends: []
  }, "a didn't change")

  assert.deepEqual(b.toJSON(), {
    messages: [1, 2],
    errors: [],
    ends: []
  }, "b ended")
}


var constant = signal.constant
exports["test constant"] = function(assert) {
  var one = constant(1)

  assert.equal(one.value, 1, "value is given one")

  var received = 0
  var errored = 0
  var ended = 0

  var client = new Client()
  connect(one, client)

  assert.deepEqual(client.toJSON(), {
    messages: [],
    errrs: [],
    ends: []
  }, "nothing received");
}

var lift = signal.lift
exports["test lift1"] = function(assert) {
  var order = []
  var source = new Subject({ value: 0 })

  assert.equal(source.value, 0, "value is 0")

  var xs = lift(function(x) { return x + 1 }, source)
  var ys = lift(function(x) { return x * 2 }, source)
  var zs = lift(function(y) { return y + 2 }, ys)

  assert.deepEqual(source.toJSON(), {
    started: 0,
    stopped: 0,
    value: 0
  }, "source isn't started yet")

  assert.equal(xs.value, 1, "xs.value is 1")
  assert.equal(ys.value, 0, "ys.value is 0")
  assert.equal(zs.value, 2, "zs.value is 2")

  var zclient = new Client({ onNext: function() { order.push("z") } })
  connect(zs, zclient)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 0
  }, "source started")

  send(source, 3)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 3
  }, "source value is 3")

  assert.deepEqual(zclient.toJSON(), {
    messages: [8],
    errors: [],
    ends: []
  }, "message received on the client")

  assert.equal(xs.value, 1, "xs.value didn't changed")
  assert.equal(ys.value, 6, "ys.value changed to 6")
  assert.equal(zs.value, 8, "zs.value changed to 8")

  var xclient = new Client({ onNext: function() { order.push("x") }})
  connect(xs, xclient)

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 0,
    value: 3
  }, "source didnt changed")

  assert.deepEqual(zclient.toJSON(), {
    messages: [8],
    errors: [],
    ends: []
  }, "message received on the client")

  assert.deepEqual(xclient.toJSON(), {
    messages: [],
    errors: [],
    ends: []
  }, "nothing happende yet")

  send(source, Return(4))

  assert.deepEqual(source.toJSON(), {
    started: 1,
    stopped: 1,
    value: 4
  }, "source value is 4 and it's stopped")

  assert.deepEqual(zclient.toJSON(), {
    messages: [8, 10],
    errors: [],
    ends: [true]
  }, "z client received message & ended")

  assert.deepEqual(xclient.toJSON(), {
    messages: [5],
    errors: [],
    ends: [true]
  }, "x client received message & ended")

  assert.equal(xs.value, 5, "xs.value changed to 5")
  assert.equal(ys.value, 8, "ys.value changed to 8")
  assert.equal(zs.value, 10, "zs.value changed to 10")
}

exports["test liftN"] = function(assert) {
  var xs = new Subject({ value: 0 })
  var ys = new Subject({ value: 5 })
  var client = new Client();

  var xys = lift(function(x, y) {
    return x + y
  }, xs, ys);

  assert.deepEqual(xs.toJSON(), {
    started: 0,
    stopped: 0,
    value: 0
  }, "xs has not started yet")

  assert.deepEqual(ys.toJSON(), {
    started: 0,
    stopped: 0,
    value: 5
  }, "ys has not started yet")

  assert.equal(xys.value, 5, "xys.value is 5")

  connect(xys, client);

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 0
  }, "xs started")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 0,
    value: 5
  }, "ys started")

  assert.equal(xys.value, 5, "xys.value is still 5")

  send(xs, 1)

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 1
  }, "xs.value changed to 1")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 0,
    value: 5
  }, "ys value didn't change")

  assert.equal(xys.value, 6, "xys.value changed to 6")

  send(ys, 6)

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 1
  }, "xs.value is still 1")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 0,
    value: 6
  }, "ys value changed to 6")

  assert.equal(xys.value, 7, "xys.value changed to 7")

  send(xs, 2)

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 2
  }, "xs.value changed to 2")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 0,
    value: 6
  }, "ys value didn't change")

  assert.equal(xys.value, 8, "xys.value changed to 8")

  send(ys, 8)

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 2
  }, "xs.value didn't change")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 0,
    value: 8
  }, "ys value changed to 8")

  assert.equal(xys.value, 10, "xys.value changed to 10")

  send(ys, Return(5))

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 2
  }, "xs.value didn't change")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 1,
    value: 5
  }, "ys value changed to 5 & stopped")

  assert.equal(xys.value, 7, "xys.value changed to 7")

  send(xs, 5)

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 0,
    value: 5
  }, "xs.value changed to 5")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 1,
    value: 5
  }, "ys value didn't change")

  assert.equal(xys.value, 10, "xys.value changed to 10")

  send(xs, Return(7))

  assert.deepEqual(xs.toJSON(), {
    started: 1,
    stopped: 1,
    value: 7
  }, "stopped and changed xs.value to 7")

  assert.deepEqual(ys.toJSON(), {
    started: 1,
    stopped: 1,
    value: 5
  }, "ys value didn't change")

  assert.equal(xys.value, 12, "xys.value changed to 12")

  assert.deepEqual(client.toJSON(), {
    messages: [6, 7, 8, 10, 7, 10, 12],
    errors: [],
    ends: [true]
  }, "all messages received on the client")
}

/*

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
*/
