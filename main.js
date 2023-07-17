var SIZE = 700,
  MAX_LINE_COUNT,
  PIN_COUNT,
  MIN_DISTANCE,
  D_REDUCE_VALUE,
  C_REDUCE_VALUE,
  SAMPLE_PERCENT,
  LINE_OPACITY,
  LINE_THICKNESS,
  IS_COLORED,
  BILATERAL_FAST_CHECK,
  BILATERAL_NORMAL_CHECK;

var parameterString,
  originalImageData,
  sketchImage,
  colorImage,
  colorData = [],
  linePath = [0],
  pins = [],
  customPinPositions = [],
  lineCount = 0,
  pinArea = document.querySelector('#custom-pin-area'),
  ssim;

var info = document.querySelector('#info');
var downloadData = info.appendChild(document.createElement('a'));
downloadData.download = 'pins-and-colors.txt';
var combinedData = [];

var downloadSVG = info.appendChild(document.createElement('a'));
downloadSVG.download = 'result.svg';

var colors = ['red', 'green', 'blue', 'yellow', 'black'];
var colorTones = {
  red: '#e32322',
  green: '#008e5b',
  blue: '#2a71b0',
  yellow: '#f4e500',
  black: '#000000',
};

var originalImage = new Image();
originalImage.crossOrigin = 'anonymous';

var input = document.querySelector('#input');
input.width = SIZE;
input.height = SIZE;

var svg = new SVG(SIZE, SIZE, '#art');
var canvasBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
canvasBg.setAttribute('cx', '50%');
canvasBg.setAttribute('cy', '50%');
canvasBg.setAttribute('r', SIZE / 2);
canvasBg.setAttribute('fill', 'white');

document.querySelector('#art svg').prepend(canvasBg);

var colorAdjustment = document.querySelector('#color-adjustment');
var colorControls = document.querySelectorAll('#color-tones input');
var canvasBgControl = document.querySelector('#canvas-background input');

var sim = document.querySelector('#similarity div');
var similarityHistory = [];

function preProcess() {
  let parameters = [...document.querySelectorAll('#parameters input')];

  originalImage.src = parameters[0].value || 'https://i.imgur.com/6nlVY3F.png';
  MAX_LINE_COUNT = +parameters[1].value || 3600;
  PIN_COUNT = +parameters[2].value || 180;
  MIN_DISTANCE = +parameters[3].value || 8;
  D_REDUCE_VALUE = +parameters[4].value || 10;
  C_REDUCE_VALUE = +parameters[5].value || 45;
  SAMPLE_PERCENT = +parameters[6].value || 100;
  LINE_OPACITY = 0.8;
  IS_COLORED = parameters[7].checked;
  BILATERAL_FAST_CHECK = parameters[8].checked;
  BILATERAL_NORMAL_CHECK = parameters[9].checked;
  LINE_THICKNESS = 1 / 4;

  parameterString = `Line Count\t\t: ${MAX_LINE_COUNT}
Pin Count\t\t: ${PIN_COUNT}
Min Distance\t\t: ${MIN_DISTANCE}
Darkness Reduce Amount\t: ${D_REDUCE_VALUE}
Color Reduce Amount\t: ${C_REDUCE_VALUE}
Color Sample Percent\t: ${SAMPLE_PERCENT}
Is Colored\t\t: ${IS_COLORED}
Bilateral\t\t: ${
    BILATERAL_FAST_CHECK ? 'Fast' : BILATERAL_NORMAL_CHECK ? 'Normal' : 'false'
  }`;

  document.querySelector('#parameters').style.display = 'none';
}

function customPins() {
  preProcess();
  document.querySelector('.button.custom').style.display = 'none';
  pinArea.width = SIZE;
  pinArea.height = SIZE;
  pinArea.style.display = 'block';

  originalImage.onload = function () {
    const ctx = pinArea.getContext('2d');

    let sourceSize = Math.min(originalImage.width, originalImage.height);
    ctx.drawImage(
      originalImage,
      0,
      0,
      sourceSize,
      sourceSize,
      0,
      0,
      SIZE,
      SIZE
    );

    ctx.fillStyle = 'red';

    pinArea.addEventListener('click', function (e) {
      let x = e.offsetX;
      let y = e.offsetY;
      let pin = new Point(x, y);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
      customPinPositions.push(pin);
    });

    pins = customPinPositions;
  };
}

function start() {
  preProcess();
  info.style.display = 'flex';
  document.querySelector('.top-bar').style.display = 'flex';
  document.querySelector('.buttons').style.display = 'none';
  document.querySelector('#process').style.display = 'flex';
  pinArea.style.display = 'none';

  originalImage.onload = function () {
    const c = document.querySelector('#input');
    const ctx = c.getContext('2d');

    let sourceSize = Math.min(originalImage.width, originalImage.height);
    ctx.drawImage(
      originalImage,
      0,
      0,
      sourceSize,
      sourceSize,
      0,
      0,
      SIZE,
      SIZE
    );

    // circular crop
    ctx.globalCompositeOperation = 'destination-in';

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(
      SIZE * 0.5, // x
      SIZE * 0.5, // y
      SIZE * 0.5, // radius
      0, // start angle
      2 * Math.PI // end angle
    );
    ctx.fill();

    // restore to default composite operation (is draw over current image)
    ctx.globalCompositeOperation = 'source-over';

    // end of circular crop

    originalImageData = ctx.getImageData(0, 0, SIZE, SIZE); // used for similarity comparision
    sketchImage = new Uint8ClampedArray(originalImageData.data); // used for increasing brightness
    colorImage = new Uint8ClampedArray(originalImageData.data); // used for reducing colors

    if (BILATERAL_FAST_CHECK) {
      const bf = new bilateralFilterFast();
      bf.sigma = 12;
      bf.bins = 64;
      sketchImage = bf.run(originalImageData).data; // used for increasing brightness
    } else if (BILATERAL_NORMAL_CHECK) {
      const bf = new bilateralFilter();
      bf.sigma = 4;
      bf.kernelsize = 4 * bf.sigma;
      sketchImage = bf.run(originalImageData).data; // used for increasing brightness
    }

    if (IS_COLORED) {
      ctx.putImageData(arrayToImageData(sketchImage), 0, 0);
    } else {
      ctx.putImageData(arrayToImageData(rgbToGrayscale(sketchImage)), 0, 0);
    }

    pins = [...generatePins(), ...pins];
    ssim = window.ssim.default;

    generatePath(0);
  };

  let thickness = document.querySelector('#thickness');
  thickness.value = 13;
  let opaque = document.querySelector('#opaque');
  opaque.value = LINE_OPACITY * 100;

  thickness.addEventListener('input', function (e) {
    LINE_THICKNESS = e.target.value / 50;
    combinedData[7] = [
      'Thickness (px)\t: ' + LINE_THICKNESS,
      'Opactiy \t: ' + LINE_OPACITY,
    ].join('\n');
    downloadData.href =
      'data:text/plain;base64,' + btoa(combinedData.join('\n'));

    thickness.setAttribute('title', e.target.value / 50 + 'px');
    [...svg.svg.querySelectorAll('line')].map((l) => {
      l.setAttribute('stroke-width', e.target.value / 50);
    });
  });

  opaque.addEventListener('input', function (e) {
    LINE_OPACITY = e.target.value / 100;
    combinedData[7] = [
      'Thickness (px)\t: ' + LINE_THICKNESS,
      'Opactiy \t: ' + LINE_OPACITY,
    ].join('\n');
    downloadData.href =
      'data:text/plain;base64,' + btoa(combinedData.join('\n'));

    opaque.setAttribute('title', e.target.value / 100);
    [...svg.svg.querySelectorAll('line')].map((l) => {
      l.setAttribute('stroke-opacity', e.target.value / 100);
    });
  });
}

function generatePins(pinCount = PIN_COUNT, diameter = SIZE) {
  let radius = diameter / 2;
  let angle = (Math.PI * 2) / pinCount; // Angle between d1 and d2 vectors which are (d1.x, d1.y) and (d2.x, d2.y)
  let tmpPins = [];

  for (let k = 0; k < pinCount; k++) {
    let x = Math.round(radius + radius * Math.cos(k * angle));
    let y = Math.round(radius + radius * Math.sin(k * angle));

    // lets prevent overflow
    x == SIZE ? x-- : '';
    y == SIZE ? y-- : '';

    tmpPins.push(new Point(x, y));
    // svg.rect(x, y, 1, 1, "red"); // show pins
  }

  return tmpPins;
}

class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

function generatePath(currentPinIndex) {
  if (lineCount <= MAX_LINE_COUNT) {
    document.querySelector('#info span').innerHTML = `${(
      (lineCount * 100) /
      MAX_LINE_COUNT
    ).toFixed(2)}%`;

    let nextPinIndex = findNextBestPin(currentPinIndex);
    linePath.push(nextPinIndex);

    decreaseDarkness(pins[currentPinIndex], pins[nextPinIndex]);

    let currP = pins[currentPinIndex];
    let nextP = pins[nextPinIndex];

    if (IS_COLORED) {
      colorData.push(colorizeLine(currP, nextP));
    } else {
      svg.line(
        currP.x,
        currP.y,
        nextP.x,
        nextP.y,
        `black`,
        'black',
        LINE_THICKNESS,
        LINE_OPACITY
      );
    }

    if (lineCount % 50 == 0 || lineCount >= MAX_LINE_COUNT) {
      calculateSimilarity().then((similarity) => {
        similarityHistory.push(similarity);
      });
    }

    setTimeout(function () {
      lineCount++;
      generatePath(nextPinIndex);
    }, 5);
  } else {
    console.log('process finished');

    if (IS_COLORED) {
      colorAdjustment.style.display = 'grid';
      canvasBgControl.addEventListener('input', function (e) {
        let color = e.target.value;
        document.querySelector('#art svg circle').setAttribute('fill', color);
      });

      let colorInputs = [...colorControls];
      let selectedColors = [
        'Red tone\t: #e32322',
        'Green tone\t: #008e5b',
        'Blue tone\t: #2a71b0',
        'Yellow tone\t: #f4e500',
        'Black tone\t: #000000',
      ];
      colorInputs.forEach((input, i) => {
        input.addEventListener('input', function (e) {
          let color = e.target.value;

          let lines = [...document.querySelectorAll(`line.${colors[i]}`)];
          lines.forEach((line) => {
            line.setAttribute('stroke', color);
          });

          selectedColors[i] = selectedColors[i].replace(/\#.+/i, color);
          combinedData[4] = selectedColors.join('\n');
          downloadData.href =
            'data:text/plain;base64,' + btoa(combinedData.join('\n'));
          const resultSVG = document.querySelector('#art svg');
          downloadSVG.href =
            'data:image/svg+xml;base64,' +
            btoa(new XMLSerializer().serializeToString(resultSVG));
        });
      });
    }

    document.querySelector('#info span').remove();
    downloadData.innerHTML = 'Download Data';
    downloadSVG.innerHTML = 'Download SVG';

    combinedData = [
      '# Paramaters Used:',
      parameterString,
      '',
      '# Color Tones:',
      `Red tone\t: #e32322\nGreen tone\t: #008e5b\nBlue tone\t: #2a71b0\nYellow tone\t: #f4e500\nBlack tone\t: #000000`,
      '',
      '# Thread Properties:',
      [
        'Thickness (px)\t: ' + LINE_THICKNESS,
        'Opactiy \t: ' + LINE_OPACITY,
      ].join('\n'),
      '',
      '# Best Similarity:',
      '~line:' +
        50 *
          (similarityHistory.indexOf(`${Math.max(...similarityHistory)}`) + 1),
      '',
      '# Custom Pins (for 700x700 resolution):',
      customPinPositions
        .map((p, i) => `Pin#${PIN_COUNT + i}: ${p.x}, ${p.y}`)
        .join('\n') || 'none',
      '',
      '# Pin Path:',
    ];
    for (let i = 0; i < linePath.length - 1; i++) {
      let lineInfo = `${i + 1}\t: ${linePath[i]} -> ${linePath[i + 1]} ${
        colorData[i] ? ` \t| ${colorData[i]}` : ''
      }`;

      combinedData.push(lineInfo);
    }

    downloadData.href =
      'data:text/plain;base64,' + btoa(combinedData.join('\n'));

    const resultSVG = document.querySelector('#art svg');
    resultSVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    downloadSVG.href =
      'data:image/svg+xml;base64,' +
      btoa(new XMLSerializer().serializeToString(resultSVG));
  }
}

function findNextBestPin(currentPinIndex) {
  let nextPinIndex;
  let maxScore = 0;

  for (let i = 0; i < pins.length; i++) {
    if (currentPinIndex == i || !isPinFarEnough(currentPinIndex, i)) {
      continue;
    }

    let vector = vectorPixelsFromAtoB(pins[currentPinIndex], pins[i]);
    let score = calculateVectorScore(vector);

    // SCORE FOR other colors

    if (score >= maxScore) {
      maxScore = score;
      nextPinIndex = i;
    }
  }
  return nextPinIndex;
}

function isPinFarEnough(current, target) {
  let diff = Math.abs(target - current);
  diff = diff > PIN_COUNT / 2 ? PIN_COUNT - diff : diff;

  return diff >= MIN_DISTANCE;
}

function vectorPixelsFromAtoB(a, b) {
  // 'Bresenham Line Algorithm' from https://stackoverflow.com/a/55666538
  var coordinatesArray = [];

  // Translate coordinates
  var x1 = a.x;
  var y1 = a.y;
  var x2 = b.x;
  var y2 = b.y;

  // Define differences and error check
  var dx = Math.abs(x2 - x1);
  var dy = Math.abs(y2 - y1);
  var sx = x1 < x2 ? 1 : -1;
  var sy = y1 < y2 ? 1 : -1;
  var err = dx - dy;

  // Set first coordinates
  coordinatesArray.push(new Point(x1, y1));

  // Main loop
  while (!(x1 == x2 && y1 == y2)) {
    var e2 = err << 1;
    if (e2 > -dy) {
      err -= dy;
      x1 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y1 += sy;
    }

    // Set coordinates
    coordinatesArray.push(new Point(x1, y1));
  }
  // Return the result
  return coordinatesArray;
}

function calculateVectorScore(vector) {
  let score = 0;

  vector.forEach(function (pixel) {
    let indicesRGB = getRGBIndices(pixel.x, pixel.y);
    let hslColor = rgb2hsl(
      sketchImage[indicesRGB[0]],
      sketchImage[indicesRGB[1]],
      sketchImage[indicesRGB[2]]
    );
    score += (1 - hslColor[2]) / vector.length; // darkness = 1 - lightness
  });
  return score;
}

function decreaseDarkness(a, b) {
  let vector = vectorPixelsFromAtoB(a, b);
  vector.forEach(function (pixel) {
    let indicesRGB = getRGBIndices(pixel.x, pixel.y);

    let hslColor = rgb2hsl(
      sketchImage[indicesRGB[0]],
      sketchImage[indicesRGB[1]],
      sketchImage[indicesRGB[2]]
    );

    // decreasing darkness also means increasing lightness
    let rgbColor = hsl2rgb(
      hslColor[0],
      hslColor[1],
      hslColor[2] + D_REDUCE_VALUE / 100
    );
    sketchImage[indicesRGB[0]] = rgbColor[0];
    sketchImage[indicesRGB[1]] = rgbColor[1];
    sketchImage[indicesRGB[2]] = rgbColor[2];
  });
}

function colorizeLine(a, b) {
  let vector = vectorPixelsFromAtoB(a, b);
  let color = calculateAverageColor(vector);

  let c = findBestColorAndReduceOriginalSourceColor(
    color,
    vector,
    C_REDUCE_VALUE
  );

  svg.line(a.x, a.y, b.x, b.y, c, colorTones[c], LINE_THICKNESS, LINE_OPACITY);
  return c;
}

function calculateAverageColor(vector) {
  let color = [0, 0, 0];

  let start = Math.round((vector.length * (1 - SAMPLE_PERCENT / 100)) / 2);
  let end = Math.round(start + (vector.length * SAMPLE_PERCENT) / 100);
  for (let i = start; i < end; i++) {
    // center of the vector
    let pixel = vector[i];
    let indicesRGB = getRGBIndices(pixel.x, pixel.y);
    color[0] += colorImage[indicesRGB[0]];
    color[1] += colorImage[indicesRGB[1]];
    color[2] += colorImage[indicesRGB[2]];
  }

  color = color.map((c1) => Math.round(c1 / (end - start)));
  return color;
}

function findBestColorAndReduceOriginalSourceColor(color, vector, reduce) {
  let max = Math.max(color[0], color[1], color[2]);
  let c = color.indexOf(max);

  if (c != 2 && color[0] == color[1] && color[1] != color[2]) {
    // if red and green are equal but blue is different and blue is not the max
    // yellow
    c = 3;
  }
  if (color[0] == color[1] && color[1] == color[2]) {
    // if all colors are equal
    // black
    c = 4;
  }

  vector.forEach(function (pixel) {
    let indicesRGB = getRGBIndices(pixel.x, pixel.y);
    if (c == 3) {
      colorImage[indicesRGB[0]] -= reduce;
      colorImage[indicesRGB[1]] -= reduce;
    } else if (c == 4) {
      colorImage[indicesRGB[0]] -= reduce;
      colorImage[indicesRGB[1]] -= reduce;
      colorImage[indicesRGB[2]] -= reduce;
    } else {
      colorImage[indicesRGB[c]] -= reduce;
    }
  });
  return colors[c];
}

function calculateSimilarity() {
  return new Promise((resolve, reject) => {
    let MySVG = document.querySelector('#art svg').cloneNode(true);
    svgToCanvas(MySVG).then((canv) => {
      const { mssim } = ssim(canv, originalImageData, {
        k1: 0.00000000000001,
        k2: 0.00000000000001,
      });

      let similarity = (mssim * 100).toFixed(2);
      console.log(`%${similarity} similar to original image`);
      sim.innerHTML = `Similarity: ${similarity}%`;
      resolve(similarity);
    });
  });
}
