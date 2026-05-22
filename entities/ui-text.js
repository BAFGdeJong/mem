import { Entity } from './entity.js';
import { hex2Rgb } from "../game_math.js";

const BAYER_4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

export class UIText extends Entity {
  constructor(getText, {
    color = '#00ff00',
    font = '14px monospace',
    align = 'left',
    ditherEnabled = false,
    ditherColor2 = '#000000',
    ditherSize = 4,
    ditherDirection = 'horizontal',
    ditherSpeed = 0,
    ditherHarshness = 1.0,
    ditherSpacing = 0.05,
    dispersion = 0.5,
  } = {}) {
    super({ tag: 'ui-text', groups: [] });
    this.getText = typeof getText === 'function' ? getText : () => getText;
    this.color = color;
    this.font = font;
    this.align = align;
    this.lx = 0; this.ly = 0; this.lw = 0; this.lh = 0;

    this.ditherEnabled = ditherEnabled;
    this.ditherColor2 = ditherColor2;
    this.ditherSize = ditherSize;
    this.ditherDirection = ditherDirection;
    this.ditherSpeed = ditherSpeed;
    this.ditherHarshness = ditherHarshness;
    this.ditherSpacing = ditherSpacing;
    this.dispersion = dispersion;

    this.textCanvas = null;
    this.seedX = Math.floor(Math.random() * 10000);
    this.seedY = Math.floor(Math.random() * 10000);

    const angle = Math.random() * Math.PI * 2;
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
  }

  getMinWidth(ctx) {
    ctx.font = this.font;
    return ctx.measureText(this.getText()).width + 10;
  }

  getMinHeight() {
    return parseInt(this.font, 10) + 10;
  }

  layout(x, y, w, h) {
    this.lx = x; this.ly = y; this.lw = w; this.lh = h;
  }

  draw(ctx) {
    const text = this.getText();
    const intW = Math.ceil(this.lw);
    const intH = Math.ceil(this.lh);

    if (intW <= 0 || intH <= 0) return;

    if (!this.ditherEnabled) {
      ctx.fillStyle = this.color;
      ctx.font = this.font;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const ty = this.ly + this.lh / 2;

      if (this.align === 'center') {
        const tw = ctx.measureText(text).width;
        ctx.fillText(text, this.lx + (this.lw - tw) / 2, ty);
      } else {
        ctx.fillText(text, this.lx, ty);
      }
      return;
    }

    if (!this.textCanvas) this.textCanvas = document.createElement('canvas');
    if (this.textCanvas.width !== intW || this.textCanvas.height !== intH) {
      this.textCanvas.width = intW;
      this.textCanvas.height = intH;
    }

    const tctx = this.textCanvas.getContext('2d');
    tctx.clearRect(0, 0, intW, intH);

    tctx.fillStyle = '#ffffff';
    tctx.font = this.font;
    tctx.textBaseline = 'middle';
    tctx.textAlign = 'left';

    const localTy = intH / 2;
    if (this.align === 'center') {
      const tw = tctx.measureText(text).width;
      tctx.fillText(text, (intW - tw) / 2, localTy);
    } else {
      tctx.fillText(text, 0, localTy);
    }

    const textImageData = tctx.getImageData(0, 0, intW, intH);
    const textData = textImageData.data;

    const finalImageData = tctx.createImageData(intW, intH);
    const finalData = finalImageData.data;

    const matrix = BAYER_4;
    const matrixSize = 4;
    const matrixMax = 16;

    const rgb1 = hex2Rgb(this.color);
    const rgb2 = hex2Rgb(this.ditherColor2);

    const tSec = performance.now() * 0.001;
    const speedFactor = this.ditherSpeed * 0.05;

    const driftX = Math.floor(tSec * 15 * this.dirX);
    const driftY = Math.floor(tSec * 15 * this.dirY);

    for (let y = 0; y < intH; y++) {
      for (let x = 0; x < intW; x++) {
        const i = (y * intW + x) * 4;

        const textAlpha = textData[i + 3] / 255;

        if (textAlpha === 0 && this.dispersion === 0) {
          finalData[i + 3] = 0;
          continue;
        }

        let pick = rgb1;
        const sx = x + this.seedX;
        const sy = y + this.seedY;

        if (this.ditherDirection === 'brick') {
          const brickWidth = 8; const brickHeight = 4;
          const rowOffset = (Math.floor(sy / brickHeight) % 2 === 0) ? 0 : Math.floor(brickWidth / 2);
          const shiftedX = sx + rowOffset;
          const isMortar = (sy % brickHeight === 0) || (shiftedX % brickWidth === 0);
          pick = isMortar ? rgb1 : rgb2;

        } else if (this.ditherDirection === 'stars') {
          const nx = Math.floor(sx / 12); const ny = Math.floor(sy / 6);
          const clusterNoise = Math.abs(Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453) % 1;

          let isStar = false;
          if (clusterNoise > 0.50) {
            const cellSizeA = 5;
            const cellXA = Math.floor(sx / cellSizeA); const cellYA = Math.floor(sy / cellSizeA);
            const hashA = Math.abs(Math.sin(cellXA * 57.3 + cellYA * 23.9) * 7531.1235) % 1;
            if (hashA > 0.90 && sx % cellSizeA === Math.floor(hashA * cellSizeA) && sy % cellSizeA === Math.floor((hashA * 9) % 1 * cellSizeA)) {
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

          let baseT = 0.5 + 0.5 * Math.max(-1, Math.min(1, adjusted));

          let t = baseT * (1 - this.dispersion) + (textAlpha * baseT) * this.dispersion;

          const threshold = matrix[y % matrixSize][x % matrixSize] / matrixMax;
          pick = t > threshold ? rgb2 : rgb1;
        }

        finalData[i]     = pick.r;
        finalData[i + 1] = pick.g;
        finalData[i + 2] = pick.b;

        finalData[i + 3] = Math.max(0, Math.min(255, textAlpha * 255 * (1 + this.dispersion)));
      }
    }

    tctx.putImageData(finalImageData, 0, 0);
    ctx.drawImage(this.textCanvas, Math.round(this.lx), Math.round(this.ly));
  }
}
