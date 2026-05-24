import { hex2Rgb } from "../game_math.js";

const BAYER_2 = [[0, 2], [3, 1]];
const BAYER_4 = [[0, 8, 2, 10], [12, 4, 14,  6], [3, 11, 1, 9], [15, 7, 13, 5]];
const BAYER_8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37], [63, 31, 55, 23, 61, 29, 53, 21]
];
const MATRICES = { 2: BAYER_2, 4: BAYER_4, 8: BAYER_8 };

export class DitherTexture {
  constructor({
    color1 = '#00ff00',
    color2 = '#000000',
    size = 4,
    direction = 'horizontal',
    speed = 0,
    harshness = 1.0,
    spacing = 0.05,
  } = {}) {
    this.color1 = color1;
    this.color2 = color2;
    this.size = size;
    this.direction = direction;
    this.speed = speed;
    this.harshness = harshness;
    this.spacing = spacing;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d'); // Cache context loop access point

    this.lastW = 0;
    this.lastH = 0;

    this.lastColor1 = color1;
    this.lastColor2 = color2;

    this.recycledImageData = null;

    this.seedX = Math.floor(Math.random() * 10000);
    this.seedY = Math.floor(Math.random() * 10000);
    const angle = Math.random() * Math.PI * 2;
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
  }

  isAnimated() {
    return this.speed > 0 || this.direction === 'stars';
  }

  generate(w, h, time = performance.now(), alphaMask = null, dispersion = 0.5, progress = null) {
    w = Math.ceil(w);
    h = Math.ceil(h);

    if (w <= 0 || h <= 0) return this.canvas;

    const colorsChanged = this.color1 !== this.lastColor1 || this.color2 !== this.lastColor2;

    // Fast cache escape route if nothing is actively updating or sliding
    if (progress === null && !this.isAnimated() && !colorsChanged && this.lastW === w && this.lastH === h) {
      return this.canvas;
    }

    // FIXED: Grow the underlying storage array only, never downsize it to cause thrashing
    if (w > this.canvas.width || h > this.canvas.height) {
      this.canvas.width = Math.max(this.canvas.width, w);
      this.canvas.height = Math.max(this.canvas.height, h);
      this.recycledImageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    } else if (!this.recycledImageData) {
      this.recycledImageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    }

    const data = this.recycledImageData.data;
    const canvasW = this.canvas.width; // Read from internal backing dimensions

    const matrix = MATRICES[this.size] || BAYER_4;
    const matrixSize = matrix.length;
    const matrixMax = matrixSize * matrixSize;

    const rgb1 = hex2Rgb(this.color1);
    const rgb2 = hex2Rgb(this.color2);

    const tSec = time * 0.001;
    const speedFactor = this.speed * 0.05;
    const driftX = Math.floor(tSec * (this.speed * 0.5) * this.dirX);
    const driftY = Math.floor(tSec * (this.speed * 0.5) * this.dirY);

    for (let y = 0; y < h; y++) {
      // Loop matches layout target boundaries exactly, but indexes using canvas row stride steps
      const layoutRowOffset = y * w;
      const bufferRowOffset = y * canvasW;

      for (let x = 0; x < w; x++) {
        const maskIdx = layoutRowOffset + x;
        const i = (bufferRowOffset + x) * 4;

        const maskValue = alphaMask ? alphaMask[maskIdx] / 255 : 1.0;

        if (alphaMask && maskValue === 0 && dispersion === 0) {
          data[i + 3] = 0;
          continue;
        }

        let pick = rgb1;
        const sx = x + this.seedX;
        const sy = y + this.seedY;

        if (progress !== null) {
          // Transition mode: direction gradient sets fill ORDER, progress sweeps the threshold.
          // Stars/brick pixels get low baseT (fill first), background fills later.
          let baseT = 0;
          if (this.direction === 'stars') {
            const cellSize = Math.max(2, Math.floor(1 / this.spacing));
            const mx = sx + driftX; const my = sy + driftY;
            const cellX = Math.floor(mx / cellSize); const cellY = Math.floor(my / cellSize);
            const starHash = Math.abs(Math.sin(cellX * 57.3 + cellY * 23.9) * 7531.1235) % 1;
            const isStarPixel = (mx % cellSize === Math.floor(starHash * cellSize)) &&
              (my % cellSize === Math.floor(((starHash * 9) % 1) * cellSize));
            const densityThreshold = 0.95 - (this.harshness * 0.02);
            baseT = (isStarPixel && starHash > Math.max(0.5, densityThreshold)) ? 0 : 1;
          } else if (this.direction === 'brick') {
            const brickWidth = 8; const brickHeight = 4;
            const shift = (Math.floor(sy / brickHeight) % 2 === 0) ? 0 : Math.floor(brickWidth / 2);
            const isMortar = (sy % brickHeight === 0) || ((sx + shift) % brickWidth === 0);
            baseT = isMortar ? 0 : 1;
          } else {
            let rawValue = 0;
            if (this.direction === 'horizontal') rawValue = Math.sin(sx * this.spacing);
            else if (this.direction === 'vertical') rawValue = Math.sin(sy * this.spacing);
            else if (this.direction === 'diagonal') rawValue = Math.sin((sx + sy) * this.spacing * 0.7);
            baseT = 0.5 + 0.5 * Math.max(-1, Math.min(1, rawValue * this.harshness));
          }
          const thresholdIntensity = (baseT + matrix[y % matrixSize][x % matrixSize] / matrixMax) / 2;
          if (thresholdIntensity < progress) {
            data[i] = rgb1.r; data[i + 1] = rgb1.g; data[i + 2] = rgb1.b; data[i + 3] = 255;
          } else {
            data[i + 3] = 0;
          }
          continue;
        }

        if (this.direction === 'brick') {
          const brickWidth = 8; const brickHeight = 4;
          const shift = (Math.floor(sy / brickHeight) % 2 === 0) ? 0 : Math.floor(brickWidth / 2);
          const isMortar = (sy % brickHeight === 0) || ((sx + shift) % brickWidth === 0);
          pick = isMortar ? rgb1 : rgb2;

        } else if (this.direction === 'stars') {
          const cellSize = Math.max(2, Math.floor(1 / this.spacing));
          const mx = sx + driftX; const my = sy + driftY;
          const cellX = Math.floor(mx / cellSize); const cellY = Math.floor(my / cellSize);

          const starHash = Math.abs(Math.sin(cellX * 57.3 + cellY * 23.9) * 7531.1235) % 1;
          const isStarPixel = (mx % cellSize === Math.floor(starHash * cellSize)) &&
            (my % cellSize === Math.floor(((starHash * 9) % 1) * cellSize));

          const densityThreshold = 0.95 - (this.harshness * 0.02);
          const starAlpha = isStarPixel && (starHash > Math.max(0.5, densityThreshold)) ? 1.0 : 0.0;

          let t = starAlpha * (1 - dispersion) + (maskValue * starAlpha) * dispersion;
          pick = t > (matrix[y % matrixSize][x % matrixSize] / matrixMax) ? rgb1 : rgb2;

        } else {
          let rawValue = 0;
          if (this.direction === 'horizontal') rawValue = Math.sin((x * this.spacing) + (tSec * speedFactor));
          else if (this.direction === 'vertical') rawValue = Math.sin((y * this.spacing) + (tSec * speedFactor));
          else if (this.direction === 'diagonal') rawValue = Math.sin(((x + y) * this.spacing * 0.7) + (tSec * speedFactor));

          let adjusted = rawValue * this.harshness;
          let baseT = 0.5 + 0.5 * Math.max(-1, Math.min(1, adjusted));
          let t = alphaMask ? (baseT * (1 - dispersion) + (maskValue * baseT) * dispersion) : baseT;

          pick = t > (matrix[y % matrixSize][x % matrixSize] / matrixMax) ? rgb2 : rgb1;
        }

        data[i]     = pick.r;
        data[i + 1] = pick.g;
        data[i + 2] = pick.b;
        data[i + 3] = alphaMask ? Math.max(0, Math.min(255, maskValue * 255 * (1 + dispersion))) : 255;
      }
    }

    this.ctx.putImageData(this.recycledImageData, 0, 0);
    this.lastW = w;
    this.lastH = h;

    this.lastColor1 = this.color1;
    this.lastColor2 = this.color2;

    return this.canvas;
  }
}