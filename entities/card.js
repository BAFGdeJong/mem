import { Entity } from "./entity.js";

import { ComponentRect } from "../component/rect.js";
import { ComponentRenderRect, ComponentRenderText } from "../component/render.js";

export class EntityCard extends Entity {

  /**
   * @param {x: number, y: number, width: number, height: number, color: string, text: string} Data Card data
   */
  constructor({ x = 0, y = 0, width = 0, height = 0, color = '00000000', text = '' }) {
    super();

    this.rect = new ComponentRect(x, y, width, height);
    this.color = new ComponentRenderRect(color);
    this.text = new ComponentRenderText(text, "white");
  }

  tick() {
    if (this.rect.x > 1000) {
      this.rect.warp(0, 0);
    }

    this.rect.move(10, 0);
  }

  draw(ctx) {
    this.color.render(ctx, this.rect);
    this.text.render(ctx, this.rect);
  }
}
