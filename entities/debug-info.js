import { Entity } from './entity.js';
import { UIPanel } from './ui-panel.js';
import { UIText } from './ui-text.js';
import * as engine from '../engine.js';

export class EntityDebugInfo extends Entity {
  constructor({
    tag = 'debug-INFO',
    groups = ['debug'],
    x = 0,
    y = 0,
    width = engine.getScreenSize().width,
  } = {}) {
    super({ tag, groups });

    const fps_panel = new UIPanel({ background: 'rgba(0,0,0,0)', offsetY: -3, direction: 'horizontal' })
      .add(new UIText(() => 'FPS:',{ color: '#ffffff' }))
      .add(new UIText(() => `${Math.floor(engine.getFps())}`));

    const tps_panel = new UIPanel({ background: 'rgba(0,0,0,0)', offsetY: -3, direction: 'horizontal' })
      .add(new UIText(() => 'TPS:',{ color: '#ffffff' }))
      .add(new UIText(() => `${Math.floor(engine.getTps())}`));

    const tc_panel = new UIPanel({ background: 'rgba(0,0,0,0)', offsetY: -3, direction: 'horizontal' })
      .add(new UIText(() => 'TC:',{ color: '#ffffff' }))
      .add(new UIText(() => `${engine.getTickCount()}`));

    const scenes_panel = new UIPanel({ background: 'rgba(0,0,0,0)', offsetY: -3, direction: 'horizontal' })
      .add(new UIText(() => 'Scenes:',{ color: '#ffffff' }))
      .add(new UIText(() => `${engine.getScenes().length}`));

    const entities_panel = new UIPanel({ background: 'rgba(0,0,0,0)', offsetY: -3, direction: 'horizontal' })
      .add(new UIText(() => 'Entities:',{ color: '#ffffff' }))
      .add(new UIText(() => `${engine.getEntities().length}`));

    this.panel = new UIPanel({
      x,
      y,
      width,
      cellAlignX: 'center',
      direction: 'horizontal',
      spread: true
    })
      .add(fps_panel)
      .add(tps_panel)
      .add(tc_panel)
      .add(scenes_panel)
      .add(entities_panel);
  }

  draw(ctx) {
    this.panel.draw(ctx);
  }
}