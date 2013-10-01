// http://elm-lang.org/edit/examples/Elements/HelloWorld.elm

var main = plainText("Hello, World")


// http://elm-lang.org/edit/examples/Elements/Image.elm

var main = image(472, 315, "/stack.jpg")


// http://elm-lang.org/edit/examples/Elements/FittedImage.elm

// fittedImage crops and resizes the image to fill the given area without
// becoming deformed.

var main = fittedImage(300, 300, "/book.jpg")


// http://elm-lang.org/edit/examples/Elements/CroppedImage.elm


// croppedImage cuts a rectangle that starts at the given
// coordinates and has the given dimensions. It can later
// be resized with width and height.

main = croppedImage([10,10], 150, 150, "/yogi.jpg")


// http://elm-lang.org/edit/examples/Elements/Size.elm


/*
  You can set the width and height of the element with
  the following two functions:

        width, height : Int -> Element -> Element

  You can set both width and height at the same time
  with this function:

          size : Int -> Int -> Element -> Element

   Try them out on the car.
*/

main = width(300, image(472, 315, "/car.jpg"))
main = height(200, image(472, 315, "/car.jpg"))
main = size(300, 400, image(472, 315, "/car.jpg"))



