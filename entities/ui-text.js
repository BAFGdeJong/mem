import { Entity } from './entity.js';
import { hex2Rgb, hexAlpha } from "../game_math.js";

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

    this.textCanvas = document.createElement('canvas');
    this.finalCanvas = document.createElement('canvas');

    this.seedX = Math.floor(Math.random() * 10000);
    this.seedY = Math.floor(Math.random() * 10000);

    const angle = Math.random() * Math.PI * 2;
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
  }

  getMinWidth(ctx) {
    ctx.font = this.font;
    return ctx.measureText(this.getText()).width + 20;
  }

  getMinHeight() {
    const match = /(\d+(?:\.\d+)?)px/.exec(this.font);
    const size = match ? parseFloat(match[1]) : 14;
    return size + 10;
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

    if (this.textCanvas.width !== intW || this.textCanvas.height !== intH) {
      this.textCanvas.width = intW;
      this.textCanvas.height = intH;
    }
    if (this.finalCanvas.width !== intW || this.finalCanvas.height !== intH) {
      this.finalCanvas.width = intW;
      this.finalCanvas.height = intH;
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

    const textData = tctx.getImageData(0, 0, intW, intH).data;
    const fctx = this.finalCanvas.getContext('2d');
    const finalImageData = fctx.createImageData(intW, intH);
    const finalData = finalImageData.data;

    const rgb1 = hex2Rgb(this.color);
    const rgb2 = hex2Rgb(this.ditherColor2);
    const a1 = hexAlpha(this.color);
    const a2 = hexAlpha(this.ditherColor2);
    const tSec = performance.now() * 0.001;
    const speedFactor = this.ditherSpeed * 0.05;

    const dispersionInverse = 1 - this.dispersion;
    const dispersionValue = this.dispersion;
    const alphaMultiplier = 1 + this.dispersion;

    const driftX = Math.floor(tSec * 15 * this.dirX);
    const driftY = Math.floor(tSec * 15 * this.dirY);

    const dir = this.ditherDirection;
    const spacing = this.ditherSpacing;
    const harshness = this.ditherHarshness;
    const seedX = this.seedX;
    const seedY = this.seedY;

    if (dir === 'brick') {
      for (let y = 0; y < intH; y++) {
        const rowOffset = y * intW;
        const sy = y + seedY;
        const rowOffsetShifted = Math.floor(sy / 4) % 2 === 0 ? 0 : 4;
        const isRowMortar = (sy % 4 === 0);

        for (let x = 0; x < intW; x++) {
          const i = (rowOffset + x) * 4;
          const textAlpha = textData[i + 3] / 255;

          if (textAlpha === 0 && dispersionValue === 0) {
            finalData[i + 3] = 0;
            continue;
          }

          const sx = x + seedX;
          const isMortar = isRowMortar || ((sx + rowOffsetShifted) % 8 === 0);
          const pick = isMortar ? rgb1 : rgb2;
          const pickA = isMortar ? a1 : a2;

          finalData[i]     = pick.r;
          finalData[i + 1] = pick.g;
          finalData[i + 2] = pick.b;
          finalData[i + 3] = Math.max(0, Math.min(255, textAlpha * 255 * alphaMultiplier * pickA));
        }
      }
    } else if (dir === 'stars') {
      for (let y = 0; y < intH; y++) {
        const rowOffset = y * intW;
        const sy = y + seedY;
        const ny = Math.floor(sy / 6);

        for (let x = 0; x < intW; x++) {
          const i = (rowOffset + x) * 4;
          const textAlpha = textData[i + 3] / 255;

          if (textAlpha === 0 && dispersionValue === 0) {
            finalData[i + 3] = 0;
            continue;
          }

          const sx = x + seedX;
          const nx = Math.floor(sx / 12);
          const clusterNoise = Math.abs(Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453) % 1;

          let isStar = false;
          if (clusterNoise > 0.50) {
            const cellXA = Math.floor(sx / 5); const cellYA = Math.floor(sy / 5);
            const hashA = Math.abs(Math.sin(cellXA * 57.3 + cellYA * 23.9) * 7531.1235) % 1;
            if (hashA > 0.90 && sx % 5 === Math.floor(hashA * 5) && sy % 5 === Math.floor((hashA * 9) % 1 * 5)) {
              isStar = true;
            }
          }
          const pick = isStar ? rgb2 : rgb1;
          const pickA = isStar ? a2 : a1;

          finalData[i]     = pick.r;
          finalData[i + 1] = pick.g;
          finalData[i + 2] = pick.b;
          finalData[i + 3] = Math.max(0, Math.min(255, textAlpha * 255 * alphaMultiplier * pickA));
        }
      }
    } else {
      const isHoriz = dir === 'horizontal';
      const isVert = dir === 'vertical';
      const isDiag = dir === 'diagonal';
      const timeOffset = tSec * speedFactor;

      for (let y = 0; y < intH; y++) {
        const rowOffset = y * intW;
        const ySpacingOffset = y * spacing;
        const bayerRow = BAYER_4[y % 4];

        for (let x = 0; x < intW; x++) {
          const i = (rowOffset + x) * 4;
          const textAlpha = textData[i + 3] / 255;

          if (textAlpha === 0 && dispersionValue === 0) {
            finalData[i + 3] = 0;
            continue;
          }

          let rawValue = 0;
          if (isHoriz) rawValue = Math.sin((x * spacing) + timeOffset);
          else if (isVert) rawValue = Math.sin(ySpacingOffset + timeOffset);
          else if (isDiag) rawValue = Math.sin(((x + y) * spacing * 0.7) + timeOffset);

          let baseT = 0.5 + 0.5 * Math.max(-1, Math.min(1, rawValue * harshness));
          let t = baseT * dispersionInverse + (textAlpha * baseT) * dispersionValue;

          const useColor2 = t > (bayerRow[x % 4] / 16);
          const pick = useColor2 ? rgb2 : rgb1;
          const pickA = useColor2 ? a2 : a1;

          finalData[i]     = pick.r;
          finalData[i + 1] = pick.g;
          finalData[i + 2] = pick.b;
          finalData[i + 3] = Math.max(0, Math.min(255, textAlpha * 255 * alphaMultiplier * pickA));
        }
      }
    }

    fctx.putImageData(finalImageData, 0, 0);
    ctx.drawImage(this.finalCanvas, Math.round(this.lx), Math.round(this.ly));
  }
}