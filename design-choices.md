# Signals always have values

## Pros

  - Doing `map(f, xs, ys)` or `lift2(f, xs, ys)` is trivial both
    implementation vice and logic vice, since there's no chance
    some `x`s to be dropped while `y`s aren't received. Way to
    avoid loss is:

    ```js
    map(f, cons(initialX, xs), cons(initialY, ys))
    ```

  - Anything that does rendering can write initial state without
    waiting on things.

## Cons

  - GC issues, signal will hold reference to a last state, for
    example last open window, which maybe already closed, and
    could have being GC-ed otherwise.
  - Resumed connections need to recalculate it's value & receive
    it in case it's changed. (The problem is figureing out if
    it is changed as you need to recalculate the value).
  - If signal looses all it's connections it's value will become
    out of date.
