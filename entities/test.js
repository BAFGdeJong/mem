import { Entity } from "./entity.js";

import { ComponentRect } from "../component/rect.js";
import { ComponentRenderRect, ComponentRenderText } from "../component/render.js";
import {
  getMousePosition,
  isActionPressed,
} from '../engine.js'

export class EntityTest extends Entity {

  // /**
  //  * @param {x: number, y: number, width: number, height: number, color: string, text: string} Data Card data
  //  */
  constructor({ x = 0, y = 0, width = 0, height = 0, color = '00000000', text = '' }) {
    super();

    this.rect = new ComponentRect(x, y, width, height);
    this.color = new ComponentRenderRect(color);
    this.text = new ComponentRenderText(text, "white");
  }

  tick(dt) {
    const pos = getMousePosition();

    if (this.rect.isInBounds(pos.x, pos.y)) {
      if (isActionPressed('left_mouse')) {
        this.rect.move(100 * dt, 0);
      }
    }

    if (isActionPressed('right_mouse')) {
      this.rect.warp(100, 100);
    }
  }

  draw(ctx) {
    this.color.render(ctx, this.rect);
    this.text.render(ctx, this.rect);
  }
}
