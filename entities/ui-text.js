import { Entity } from './entity.js';

export class UIText extends Entity {
  constructor(getText, {
    color = '#00ff00',
    font = '14px monospace',
    align = 'left',
  } = {}) {
    super({ tag: 'ui-text', groups: [] });
    this.getText = typeof getText === 'function' ? getText : () => getText;
    this.color = color;
    this.font = font;
    this.align = align;
    this.lx = 0; this.ly = 0; this.lw = 0; this.lh = 0;

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
    const text = String(this.getText() ?? '');

    const intW = Math.ceil(this.lw);
    const intH = Math.ceil(this.lh);

    if (intW <= 0 || intH <= 0) return;
    if (!text) return;

    ctx.save();

    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textBaseline = 'middle';

    const ty = this.ly + this.lh / 2;

    if (this.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(text, this.lx + this.lw / 2, ty);
    } else if (this.align === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(text, this.lx + this.lw, ty);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(text, this.lx, ty);
    }

    ctx.restore();
  }
}