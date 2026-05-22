import * as engine from '../engine.js';
import { Entity } from './entity.js';
import { UIText } from './ui-text.js';
import { hex2Rgb } from "../game_math.js";

const BAYER_2 = [
  [0, 2],
  [3, 1],
];

const BAYER_4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

const BAYER_8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const MATRICES = { 2: BAYER_2, 4: BAYER_4, 8: BAYER_8 };

export class UIButton extends Entity {
  constructor(text, onClick, {
    color = '#aaaaaa',
    hoverColor = '#ffffff',
    font = '14px monospace',
    ditherColors = ['#000000', '#ffffff'],
    ditherSize = 1,
    ditherDirection = 'diagonal',
    ditherSpeed = 0,
    ditherHarshness = 0.0,
    ditherSpacing = 0.00,
  } = {}) {
    super();
    this.onClick = onClick;
    this.color = color;
    this.hoverColor = hoverColor;
    this.hovered = false;
    this.ditherColors = ditherColors;
    this.ditherSize = ditherSize;
    this.ditherDirection = ditherDirection;
    this.ditherSpeed = ditherSpeed;
    this.ditherHarshness = ditherHarshness;
    this.ditherSpacing = ditherSpacing;
    this.ditherCanvas = null;
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.lx = 0; this.ly = 0; this.lw = 0; this.lh = 0;

    this.lastColorsString = JSON.stringify(ditherColors);

    this.seedX = Math.floor(Math.random() * 10000);
    this.seedY = Math.floor(Math.random() * 10000);

    const angle = Math.random() * Math.PI * 2;
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);

    this.isAnimated = (this.ditherDirection === 'stars' || this.ditherSpeed > 0);
    this.text = new UIText(text, { color, font, align: 'center', ditherEnabled: true, ditherSpeed: 30, ditherDirection: 'diagonal' });
  }

  generateDither(w, h, time = 0) {
    w = Math.ceil(w);
    h = Math.ceil(h);

    if (!this.ditherCanvas) {
      this.ditherCanvas = document.createElement('canvas');
    }
    if (this.ditherCanvas.width !== w || this.ditherCanvas.height !== h) {
      this.ditherCanvas.width = w;
      this.ditherCanvas.height = h;
    }

    const dctx = this.ditherCanvas.getContext('2d');
    const id = dctx.createImageData(w, h);
    const data = id.data;

    const matrix = MATRICES[this.ditherSize] || BAYER_4;
    const matrixSize = matrix.length;
    const matrixMax = matrixSize * matrixSize;

    const rgb1 = hex2Rgb(this.ditherColors[0]);
    const rgb2 = hex2Rgb(this.ditherColors[1]);

    const tSec = time * 0.001;
    const speedFactor = this.ditherSpeed * 0.05;

    const driftX = Math.floor(tSec * 15 * this.dirX);
    const driftY = Math.floor(tSec * 15 * this.dirY);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let pick = rgb1;

        const sx = x + this.seedX;
        const sy = y + this.seedY;

        if (this.ditherDirection === 'brick') {
          const brickWidth = 8;
          const brickHeight = 4;
          const rowOffset = (Math.floor(sy / brickHeight) % 2 === 0) ? 0 : Math.floor(brickWidth / 2);
          const shiftedX = sx + rowOffset;

          const isMortar = (sy % brickHeight === 0) || (shiftedX % brickWidth === 0);
          pick = isMortar ? rgb1 : rgb2;

        } else if (this.ditherDirection === 'stars') {
          const nx = Math.floor(sx / 12);
          const ny = Math.floor(sy / 6);
          const clusterNoise = Math.abs(Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453) % 1;

          let isStar = false;

          if (clusterNoise > 0.50) {
            const cellSizeA = 7;
            const cellXA = Math.floor(sx / cellSizeA);
            const cellYA = Math.floor(sy / cellSizeA);
            const hashA = Math.abs(Math.sin(cellXA * 57.3 + cellYA * 23.9) * 7531.1235) % 1;

            if (hashA > 0.92) {
              const starXA = Math.floor(hashA * cellSizeA);
              const starYA = Math.floor((hashA * 9) % 1 * cellSizeA);
              if (sx % cellSizeA === starXA && sy % cellSizeA === starYA) {
                isStar = true;
              }
            }

            if (!isStar) {
              const cellSizeB = 6;
              const mx = sx + driftX;
              const my = sy + driftY;
              const cellXB = Math.floor(mx / cellSizeB);
              const cellYB = Math.floor(my / cellSizeB);
              const hashB = Math.abs(Math.sin(cellXB * 135.7 + cellYB * 246.8) * 4242.4242) % 1;

              if (hashB > 0.90) {
                const starXB = Math.floor(hashB * cellSizeB);
                const starYB = Math.floor((hashB * 7) % 1 * cellSizeB);
                if (mx % cellSizeB === starXB && my % cellSizeB === starYB) {
                  isStar = true;
                }
              }
            }
          }

          if (!isStar) {
            const fallingSpeed = 250;
            const shootInterval = 4;

            const cycleTime = tSec % shootInterval;
            const lineOffset = Math.floor(cycleTime * fallingSpeed);
            const lineId = Math.floor(tSec / shootInterval);

            const startTrackY = Math.floor((Math.abs(Math.sin(lineId * 45.67) * 9876.54) % 1) * (h + w));

            const streakX = x + lineOffset;
            const streakY = y + lineOffset;

            if (streakY === startTrackY && streakX >= lineOffset && streakX < lineOffset + 10) {
              isStar = true;
            }
          }

          pick = isStar ? rgb2 : rgb1;

        } else {
          let rawValue;

          if (this.ditherDirection === 'horizontal') {
            rawValue = Math.sin((x * this.ditherSpacing) + (tSec * speedFactor));
          } else if (this.ditherDirection === 'vertical') {
            rawValue = Math.sin((y * this.ditherSpacing) + (tSec * speedFactor));
          } else if (this.ditherDirection === 'diagonal') {
            rawValue = Math.sin(((x + y) * this.ditherSpacing * 0.7) + (tSec * speedFactor));
          } else {
            rawValue = 0;
          }

          let adjusted = rawValue * this.ditherHarshness;
          let t = 0.5 + 0.5 * Math.max(-1, Math.min(1, adjusted));

          const threshold = matrix[y % matrixSize][x % matrixSize] / matrixMax;
          pick = t > threshold ? rgb2 : rgb1;
        }

        const i = (y * w + x) * 4;
        data[i]     = pick.r;
        data[i + 1] = pick.g;
        data[i + 2] = pick.b;
        data[i + 3] = 255;
      }
    }

    dctx.putImageData(id, 0, 0);
    this.lastWidth = w;
    this.lastHeight = h;
    this.lastColorsString = JSON.stringify(this.ditherColors);
  }

  getMinWidth(ctx) { return this.text.getMinWidth(ctx); }
  getMinHeight() { return this.text.getMinHeight(); }

  layout(x, y, w, h) {
    this.lx = x; this.ly = y; this.lw = w; this.lh = h;
    this.text.layout(x, y, w, h);
  }

  isInBounds(mx, my) {
    return mx >= this.lx && mx <= this.lx + this.lw && my >= this.ly && my <= this.ly + this.lh;
  }

  handleInput(event, mouse) {
    if (event === 'mousedown' && mouse.button === 0 && this.isInBounds(mouse.x, mouse.y)) {
      this.onClick?.();
    }
  }

  draw(ctx) {
    const mouse = engine.getMousePosition();
    this.hovered = this.isInBounds(mouse.x, mouse.y);


    this.text.color = this.hovered ? this.hoverColor : this.color;
    this.text.draw(ctx);
  }
}
