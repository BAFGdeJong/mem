import { Entity } from './entity.js'

export class UIText extends Entity {
  constructor(getText, { color = '#00ff00', font = '14px monospace', align = 'left' } = {}) {
    super({ tag: 'ui-text', groups: [] });
    this.getText = typeof getText === 'function' ? getText : () => getText;
    this.color = color;
    this.font = font;
    this.align = align;
    this.lx = 0;
    this.ly = 0;
    this.lw = 0;
    this.lh = 0;
  }

  getMinWidth(ctx) {
    ctx.font = this.font;
    return ctx.measureText(this.getText()).width + 10;
  }

  layout(x, y, w, h) {
    this.lx = x;
    this.ly = y;
    this.lw = w;
    this.lh = h;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const text = this.getText();
    const ty = this.ly + this.lh / 2;

    if (this.align === 'center') {
      const tw = ctx.measureText(text).width;
      ctx.fillText(text, this.lx + (this.lw - tw) / 2, ty);
    } else {
      ctx.fillText(text, this.lx, ty);
    }
  }
}