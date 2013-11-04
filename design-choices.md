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

# Cons

  - GC is a lot harder.
