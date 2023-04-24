# Portrait Knitting

A simple algorithm which transforms images to knitted threads.

- **Note 1:** Whenever the process ends, you can configure thread details (thread thickness and opaque) that suits your physical threads.

- **Note 2:** Since there is no physical art uses this algorithm, you should be aware that you could get a different result from the digital result.

[Try Live](https://ilyasbilgihan.github.io/portrait-knitting/)

<div style="display: flex; gap: 20px; width: 100%; justify-content: space-between;">
  <img src="./examples/empty-canvas.jpg" alt="Empty Canvase">
  <img src="./examples/canvas.jpg" alt="Canvas">
</div>

## Settings Panel

We have 4 settings and 1 source image url input boxes.

#### The Settings are:

- **Max Line Count** — How many vectors (straight lines) will be in our knitted thread.
- **Pin Count** — How many pins does the circular path have.
- **Min Distance(n)** — There will be no vectors (straight lines) from **i<sup>th</sup>** pin to **(i+1,2,3,...,n-1)<sup>th</sup>** pin.
- **Color Reduce Amount(percent)** — For every line we draw, we will decrease the darkness of the line's pixels from the source image

![Settings Panel](./examples/settings.png)

## Examples

<details>
    <summary>Mustafa Kemal Atatürk</summary>
    <br>
    <img src="./examples/mka.gif" alt="Mustafa Kemal Atatürk GIF">
</details>

<details>
    <summary>Cillian Murphy as Thomas Shelby</summary>
    <br>
    <img src="./examples/cm.gif" alt="Cillian Murphy GIF">
</details>

<details>
    <summary>Keanu Reeves as John Wick</summary>
    <br>
    <img src="./examples/kr.gif" alt="Keanu Reeves GIF">
</details>
