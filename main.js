let size = 800;
let image = document.querySelector("#image");
image.width = size;
image.height = size;
let svg = new SVG(size, size, "art");
svg.line(0, 0, size, size, "blue", 2, 1);
