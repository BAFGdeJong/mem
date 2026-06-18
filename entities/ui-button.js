import * as engine from '../engine.js';
import { Entity } from './entity.js';
import { UIText } from './ui-text.js';

export class UIButton extends Entity {
  constructor(text, onClick, {
    color = '#aaaaaa',
    hoverColor = '#ffffff',
    font = '14px monospace',

    textDitherEnabled = false,
    ditherOnHoverOnly = false,
    ditherColors = ['#00ff00', '#000000'],
    ditherSize = 4,
    ditherDirection = 'diagonal',
    ditherSpeed = 100,
    ditherHarshness = 1.0,
    ditherSpacing = 0.05,
  } = {}) {
    super();
    this.onClick = onClick;
    this.color = color;
    this.hoverColor = hoverColor;
    this.hovered = false;

    this.lx = 0; this.ly = 0; this.lw = 0; this.lh = 0;

    this.textDitherEnabled = textDitherEnabled;
    this.ditherOnHoverOnly = ditherOnHoverOnly;

    this.seedX = Math.floor(Math.random() * 10000);
    this.seedY = Math.floor(Math.random() * 10000);

    this.text = new UIText(text, {
      color,
      font,
      align: 'center',
      ditherEnabled: textDitherEnabled,
      ditherColor2: ditherColors[1],
      ditherSize: ditherSize,
      ditherDirection: ditherDirection,
      ditherSpeed: ditherSpeed,
      ditherHarshness: ditherHarshness,
      ditherSpacing: ditherSpacing
    });
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

    const intW = Math.ceil(this.lw);
    const intH = Math.ceil(this.lh);

    if (intW > 0 && intH > 0) {
      ctx.fillStyle = 'transparent';
      ctx.fillRect(Math.round(this.lx), Math.round(this.ly), intW, intH);
    }

    if (this.ditherOnHoverOnly) {
      this.text.ditherEnabled = this.hovered;
    } else {
      this.text.ditherEnabled = this.textDitherEnabled;
    }

    this.text.color = this.hovered ? this.hoverColor : this.color;
    this.text.draw(ctx);
  }
}
