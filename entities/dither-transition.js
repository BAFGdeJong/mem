import { DitherTexture } from "../textures/dither-texture.js";
import { Entity } from "./entity.js";

export class DitherTransition extends Entity {
  constructor({
    duration = 700,
    color = '#000000',
    ditherDirection = 'horizontal',
    ditherSpacing = 1,
    ditherHarshness = 1.0,
    onComplete = null
  } = {}) {
    super({ tag: 'dither-transition', groups: [] });

    this.duration = duration;
    this.onComplete = onComplete;

    this._texture = new DitherTexture({
      color1: color,
      direction: ditherDirection,
      spacing: ditherSpacing,
      harshness: ditherHarshness,
      size: 4,
    });

    this.progress = 0;
    this.startTime = null;
    this.isActive = false;
    this.isFadingOut = true;
  }

  start(isFadingOut = true) {
    this.isFadingOut = isFadingOut;
    this.startTime = performance.now();
    this.progress = isFadingOut ? 0 : 1;
    this.isActive = true;
  }

  tick(dt) {
    if (!this.isActive) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    const t = Math.min(1, elapsed / this.duration);
    const easedT = t * t * (3 - 2 * t);

    this.progress = this.isFadingOut ? easedT : 1 - easedT;

    if (t >= 1) {
      this.isActive = false;
      if (this.onComplete) this.onComplete();
    }
  }

  draw(ctx) {
    if (!this.isActive && this.progress === 0) return;

    const { width, height } = ctx.canvas;
    const canvas = this._texture.generate(width, height, 0, null, 0.5, this.progress);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }
}
