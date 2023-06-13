//   Based On
//   "Constant Time O(1) Bilateral Filtering". Porikli,Fatih. 2008
//     "http://www.merl.com/publications/docs/TR2008-030.pdf"
//
//   Note this is not nearly as fast as i hoped, nor as accurate.
//
/*

Bilateral Filter. Brute force algorithm
Cody Smith 2014

The MIT License (MIT)

Copyright (c) 2014 Redfish Group and Cody Smith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var _Canvas = undefined;
function createCanvas(w, h) {
  if (typeof document !== 'undefined') {
    // nodejs
    let can = document.createElement('canvas');
    can.width = w;
    can.height = h;
    return can;
  } else {
    if (typeof Canvas == 'undefined') {
      _Canvas = require('canvas');
    }
    return new _Canvas.Canvas(w, h);
  }
}

function getIntensities(imgdata) {
  var result = new Float32Array(imgdata.width * imgdata.height);
  for (var i = 0; i < result.length; i++) {
    var indx = i * 4;
    // 0.2126 * R + 0.7152 * G + 0.0722 * B
    result[i] =
      0.2126 * imgdata.data[indx] +
      0.7152 * imgdata.data[indx + 1] +
      0.0722 * imgdata.data[indx + 2];
  }
  return result;
}

function getImageCanvas(img) {
  var can = createCanvas(img.width, img.height);
  var ctx = can.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx;
}

function convertToImageData(img) {
  if (ArrayBuffer.isView(img)) {
    // it is already some kind of typed array
    return img;
  } else if (img.data && img.data instanceof Uint8ClampedArray) {
    // its an image data
    return img;
  } else if (img.src) {
    // its an image
    return getImageData(img);
  } else {
    // assume its a canvas
    var ctx = img.getContext('2d');
    var imgData = ctx.getImageData(0, 0, img.width, img.height);
    return imgData;
  }
}

function getImageData(img) {
  if (img.data && img.data instanceof Uint8ClampedArray) {
    return copyImageData(img);
  }
  var ctx = getImageCanvas(img);
  var imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  return imgData;
}

function copyImageData(data) {
  var canvas = createCanvas(data.width, data.height);
  var ctx = canvas.getContext('2d');
  ctx.putImageData(data, 0, 0);
  var imageData = ctx.getImageData(0, 0, data.width, data.height);
  return imageData;
}

class gaussianKernel {
  constructor(sigma = 1, w = 13, h) {
    this.w = w;
    this.h = h || w;
    console.log('making kernel', sigma, this.w, 'x', this.h);

    this.kern = new Float32Array(this.w * this.h);
    this.cx = Math.floor(this.w / 2);
    this.cy = Math.floor(this.h / 2);
    this.sigma = sigma;

    var sigma2Sqr = 2.0 * sigma * sigma;

    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        var rx = x - this.cx;
        var ry = y - this.cy;
        var d2 = rx * rx + ry * ry;
        this.kern[y * this.w + x] = this.gausVal(d2); //Math.exp( -d2 / sigma2Sqr );
      }
    }
  }

  gausVal(d) {
    return Math.exp(-d / (2 * this.sigma * this.sigma));
  }

  whats(x, y) {
    return this.kern[(y + this.cy) * this.w + x + this.cx];
  }
}

class integralHistogram {
  constructor(img, bins = 16) {
    this.kernel = new gaussianKernel(this.sigma, this.kernelsize);
    this.binCount = bins;
    this.bins = new Array(bins);
    this.binwidth = 0;
    var start = new Date().getTime();
    console.log('started integral histogram');
    var data = convertToImageData(img);
    this.intens = getIntensities(data); //convert to greyscale intensity values

    this.bins = new Uint32Array(bins * this.intens.length);

    this.width = data.width;
    this.height = data.height;

    this.binwidth = 255 / this.binCount;

    //
    // This code is cleaner and just as fast as the other seperated one
    //
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        var indx = y * this.width + x;
        var meI = this.intens[indx];
        var mybin = Math.round(meI / this.binwidth);
        for (var j = 0; j < this.binCount; j++) {
          var left = this.whatsAt(x - 1, y, j);
          var up = this.whatsAt(x, y - 1, j);
          var ul = this.whatsAt(x - 1, y - 1, j);
          var indxb = indx * this.binCount + j;
          //var me = 1* ( meI > j*binwidth && meI < (j+1)*binwidth )
          this.bins[indxb] = left + up - ul;
        }
        this.bins[indx * this.binCount + mybin] += 1;
      }
    }

    //
    //  I thought this would speed it up but it didn't at all
    //
    /*    for( var y=0; y<this.height; y++){
    for( var x=1; x<this.width; x++){
      var indx = y*this.width + x
      var meI = this.intens[indx]
      var mybin = Math.round( meI/this.binwidth) 
      this.bins[indx*this.binCount + mybin]+=1
      for( var j=0; j<this.binCount;j++){
        var indxb = indx * this.binCount + j
        var indxL = (indx-1) * this.binCount + j
        this.bins[indxb] += this.bins[indxL]
      }
    }
  }

   for( var y=1; y<this.height; y++){
    for( var x=0; x<this.width; x++){
      var indx = y*this.width + x
      var indxUtmp = (y-1)*(this.width) + x
      for( var j=0; j<this.binCount;j++){
        var indxb = indx * this.binCount + j
        var indxU = (indxUtmp) * this.binCount + j
        this.bins[indxb] += this.bins[indxU]
      }
    }
  }
  */
    //
    // end failed speed up attempt
    //

    console.log('integral histogram done in ', new Date().getTime() - start);
  }

  whatsAt(x, y, bin) {
    if (x < 0 || y < 0) {
      return 0;
    }
    var x2 = Math.min(this.width - 1, x);
    var y2 = Math.min(this.height - 1, y);
    //var b2 =  Math.max( 0, Math.min(bin, this.bins.length-1))
    var indx = y2 * this.width + x2;
    return this.bins[indx * this.binCount + bin];
  }

  getblock(x, y, x2, y2, bin) {
    var lr = this.whatsAt(x2, y2, bin);
    var ul = this.whatsAt(x, y, bin);
    var ll = this.whatsAt(x, y2, bin);
    var ur = this.whatsAt(x2, y, bin);
    var result = lr - ur - ll + ul;
    return result;
  }
}

class bilateralFilterFast {
  constructor(bins = 32) {
    this.bins = bins;
    this.kernelsize = 32;
    this.kernel = null; //new gaussianKernel(this.sigma, this.kernelsize)
    this.hist = null;
    this.sigma = 4;
  }

  run(imgData) {
    var start = new Date().getTime();
    console.log('started bilateral filter fast');
    this.kernel = new gaussianKernel(this.sigma, 2 * this.bins, 1);
    var data = imgData;
    var dataOut = copyImageData(data);
    this.hist = new integralHistogram(data, this.bins);

    var wid = data.width;
    var hei = data.height;
    for (var y = 0; y < hei; y++) {
      for (var x = 0; x < wid; x++) {
        var indx = y * wid + x;
        var myIntens = this.hist.intens[indx];
        var mybin = Math.round(myIntens / (this.hist.binwidth + 0.5));
        var kappa = 0;
        var result = 0;
        for (var j = 0; j < this.bins; j++) {
          var diff = j - mybin;
          var gauW = this.kernel.whats(diff, 0);
          var histVal = this.hist.getblock(
            x - this.kernelsize,
            y - this.kernelsize,
            x + this.kernelsize,
            y + this.kernelsize,
            j
          );
          kappa += histVal * gauW;
          var colorval = j / this.bins;
          result += histVal * gauW * colorval;
        }
        result = result / kappa;
        var indx4 = indx * 4;
        dataOut.data[indx4] = result * 256; //* data.data[indx4]
        dataOut.data[indx4 + 1] = result * 256; //* data.data[indx4+1]
        dataOut.data[indx4 + 2] = result * 256; //* data.data[indx4+2]
      }
    }
    console.log('bilateral filter done in ', new Date().getTime() - start);
    return dataOut;
  }
}

class bilateralFilter {
  constructor() {
    this.sigma = 4;
    this.kernelsize = 16;
    this.kernel = new gaussianKernel(this.sigma, this.kernelsize);
  }

  run(imgData) {
    this.kernel = new gaussianKernel(this.sigma, this.kernelsize);
    var start = new Date().getTime();
    console.log('started bilateral filter normal');
    var data = imgData;
    var dataOut = copyImageData(data);
    var intens = getIntensities(data);

    for (var y = 0; y < data.height; y++) {
      for (var x = 0; x < data.width; x++) {
        var i = y * data.width + x;
        var w1 = intens[i];
        var normFactor = 0;
        var wout = 0;
        var rgb = [0.00000001, 0.0000001, 0.000000001];

        for (var y2 = -this.kernel.cy + 1; y2 < this.kernel.cy; y2++) {
          for (var x2 = -this.kernel.cx + 1; x2 < this.kernel.cx; x2++) {
            if (
              y + y2 > 0 &&
              x + x2 > 0 &&
              y + y2 < data.height &&
              x + x2 < data.width
            ) {
              var i2 = (y + y2) * data.width + (x + x2);
              var w2 = intens[i2];
              var distI = Math.sqrt(Math.pow(w1 - w2, 2));
              var dw = this.kernel.gausVal(distI);
              var weight = this.kernel.whats(x2, y2) * dw;
              normFactor += weight;
              wout += weight * w2;
              rgb[0] += weight * data.data[4 * i2];
              rgb[1] += weight * data.data[4 * i2 + 1];
              rgb[2] += weight * data.data[4 * i2 + 2];
            }
          }
        }

        normFactor = Math.max(0.00001, Math.abs(normFactor));
        wout = wout / normFactor;
        var woutF = wout / 180;
        var i4 = 4 * i;

        dataOut.data[i4] = rgb[0] / normFactor;
        dataOut.data[i4 + 1] = rgb[1] / normFactor;
        dataOut.data[i4 + 2] = rgb[2] / normFactor;

        //dataOut.data[i4]= dataOut.data[i4+1] = dataOut.data[i4+2] = wout
      }
    }

    console.log('bilateral filter done', new Date().getTime() - start, ' ms');
    return dataOut;
  }
}
