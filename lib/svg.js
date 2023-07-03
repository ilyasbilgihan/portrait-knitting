class SVG {
  constructor(width, height, containerElement) {
    const container = document.querySelector(containerElement);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    container.appendChild(svg);
    this.svg = svg;
  }

  line(x1, y1, x2, y2, colorName, colorTone, w, opacity) {
    const aLine = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'line'
    );
    aLine.setAttribute('x1', x1);
    aLine.setAttribute('y1', y1);
    aLine.setAttribute('x2', x2);
    aLine.setAttribute('y2', y2);
    aLine.setAttribute('class', colorName);
    aLine.setAttribute('stroke', colorTone);
    aLine.setAttribute('stroke-width', w);
    aLine.setAttribute('stroke-opacity', opacity);
    this.svg.appendChild(aLine);
  }

  rect(x, y, w, h, color) {
    const aRect = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    );
    aRect.setAttribute('x', x);
    aRect.setAttribute('y', y);
    aRect.setAttribute('width', w);
    aRect.setAttribute('height', h);
    aRect.setAttribute('stroke-width', 0);
    aRect.setAttribute('fill', color);
    this.svg.appendChild(aRect);
  }
}
