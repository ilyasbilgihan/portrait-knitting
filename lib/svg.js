class SVG {
  constructor(width, height, containerId) {
    const container = document.getElementById(containerId);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    container.appendChild(svg);
    this.svg = svg;
  }

  line(x1, y1, x2, y2, color, w, opacity) {
    const aLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    aLine.setAttribute("x1", x1);
    aLine.setAttribute("y1", y1);
    aLine.setAttribute("x2", x2);
    aLine.setAttribute("y2", y2);
    aLine.setAttribute("stroke", color);
    aLine.setAttribute("stroke-width", w);
    aLine.setAttribute("stroke-opacity", opacity);
    this.svg.appendChild(aLine);
  }
}
