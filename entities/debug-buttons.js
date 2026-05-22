import { Entity } from './entity.js';
import { UIPanel } from './ui-panel.js';
import { UIButton } from './ui-button.js';
import * as engine from '../engine.js';

export class EntityDebugButtons extends Entity {
  constructor({ x = engine.getScreenSize().width - 250, y = 30 } = {}) {
    super({ tag: 'debug-BUTTONS', groups: ['debug'] });

    this.panel = new UIPanel({
      x: engine.getScreenSize().width / 2,
      y: engine.getScreenSize().height - 30,

      alignX: 'center',
      cellAlignX: 'center',
      tag: 'debug-buttons',
      groups: ['debug'],
      direction: 'horizontal',
      anchor: 'center',
    })
    .add(new UIButton('HIDE-DEBUG', () => engine.setDebug(), {
      color: '#ffffff',
      hoverColor: '#ff0000',
      font: '14px monospace'
    }))
    .add(new UIButton('DEBUG-LINES', () => { UIPanel.DEBUG_LINES = !UIPanel.DEBUG_LINES; }, {
      color: '#ffffff',
      hoverColor: '#ffff00',
      font: '14px monospace'
    }))
    .add(new UIButton('TOGGLE-PHYSICS', () => engine.setPhysics(), {
      color: '#ffffff',
      hoverColor: '#00ff00',
      font: '14px monospace'
    }))
    .add(new UIButton('STEP', () => engine.step('physics'), {
      color: '#ffffff',
      hoverColor: '#00ffff',
      font: '14px monospace'
    }));
  }

  input(event, e) {
    this.panel.input(event, e);
  }

  draw(ctx) {
    this.panel.draw(ctx);
  }
}