import { ComponentRenderRect, ComponentRenderText } from "../component/render.js";
import { ComponentRect } from "../component/rect.js";

import {getFps, getIsDebugEnabled, getTps} from "../engine.js";

export class EntityDebug {
  constructor({ x, y, width, height }, background_color, text, color) {
    this.rect = new ComponentRect(x, y, width, height);

    this.background = new ComponentRenderRect(background_color);
    this.text = new ComponentRenderText(text, color, "30px serif");
  }

  setText(text) {
    this.text.setText(text);
  }

  tick() {}

  draw(ctx) {
    if (!getIsDebugEnabled()) return;

    this.background.render(ctx, this.rect);
    this.text.render(ctx, this.rect);
  }
}

export class EntityDebugFPS extends EntityDebug {
  tick() {
    if (!getIsDebugEnabled()) return;
    this.setText("FPS: " + Math.floor(getFps()));
  }
}

export class EntityDebugTPS extends EntityDebug {
  tick() {
    if (!getIsDebugEnabled()) return;
    this.setText("TPS: " + Math.floor(getTps()));
  }
}
