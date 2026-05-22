import * as engine from '../engine.js';
import { Entity } from './entity.js';

export class UIButton extends Entity {
  constructor(text, onClick, { color = '#ffffff', hoverColor = '#ffff00', font = '14px monospace' } = {}) {
    super()
    this.getText = typeof text === 'function' ? text : () => text;
    this.onClick = onClick;
    this.color = color;
    this.hoverColor = hoverColor;
    this.font = font;
    this.lx = 0;
    this.ly = 0;
    this.lw = 0;
    this.lh = 0;
    this.hovered = false;
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

    ctx.fillStyle = this.hovered ? this.hoverColor : this.color;
    ctx.font = this.font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const text = this.getText();
    const ty = this.ly + this.lh / 2;
    ctx.fillText(text, this.lx, ty);
  }
}