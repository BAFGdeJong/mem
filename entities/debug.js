import { ComponentRenderRect, ComponentRenderText } from "../component/render.js";
import { ComponentRect } from "../component/rect.js";

import {getFps, getIsDebugEnabled, getTps} from "../engine.js";
import { Entity } from './entity.js'

export class EntityDebug extends Entity {
  constructor({
    tag,
    groups = ['debug'],
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    background_color = '00000000',
    text = '',
    color = '00000000'
  }) {
    super(tag, groups);
    this.rect = new ComponentRect(x, y, width, height);

    this.background = new ComponentRenderRect(background_color);
    this.text = new ComponentRenderText(text, color, "30px serif");
  }

  setText(text) {
    this.text.setText(text);
  }

  tick() {}

  draw(ctx) {
    this.background.render(ctx, this.rect);
    this.text.render(ctx, this.rect);
  }
}

export class EntityDebugFPS extends EntityDebug {
  constructor(props) {
    super({ tag: 'debug-FPS', ...props });
  }

  tick() {
    this.setText("FPS: " + Math.floor(getFps()));
  }
}

export class EntityDebugTPS extends EntityDebug {
  constructor(props) {
    super({ tag: 'debug-TPS', ...props });
  }

  tick() {
    this.setText("TPS: " + Math.floor(getTps()));
  }
}
