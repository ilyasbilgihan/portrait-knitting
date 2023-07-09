function getRGBIndices(x, y) {
  // A kind of function which returns RGBA values of a pixel of an image with SIZExSIZE;
  let redIndex = y * (SIZE * 4) + x * 4;
  return [redIndex, redIndex + 1, redIndex + 2];
}

function hsl2rgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgb2hsl(r, g, b) {
  (r /= 255), (g /= 255), (b /= 255);
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

function arrayToImageData(array, width = SIZE, height = SIZE) {
  return new ImageData(array, width, height);
}

function rgbToGrayscale(imgData) {
  let tmp = new Uint8ClampedArray(imgData);

  for (let i = 0; i < tmp.length; i += 4) {
    const r = tmp[i] * 0.3; // ------> Red is low
    const g = tmp[i + 1] * 0.59; // ---> Green is high
    const b = tmp[i + 2] * 0.11; // ----> Blue is very low

    const gray = r + g + b;

    tmp[i] = gray;
    tmp[i + 1] = gray;
    tmp[i + 2] = gray;
  }

  return tmp;
}

function svgToCanvas(art) {
  return new Promise((resolve, reject) => {
    let s = new XMLSerializer().serializeToString(art);
    let encodedData = btoa(s);
    let canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    let ctx = canvas.getContext('2d');
    let img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, SIZE, SIZE));
    };
    img.src = 'data:image/svg+xml;base64,' + encodedData;
  });
}
