import { Scene } from './scene.js';
import { UIPanel } from '../entities/ui-panel.js';
import * as engine from '../engine.js';
import { UIButton } from '../entities/ui-button.js'

export class MainMenu extends Scene {
  constructor() {
    super('main-menu', { z: 999 });
  }

  async preload() {}

  async init() {
    const panel = new UIPanel({
      tag: 'main-menu-panel',
      x: engine.getScreenSize().width / 2,
      y: engine.getScreenSize().height / 2,
      alignX: 'center',
      alignY: 'center',
      cellAlignX: 'center',
      cellAlignY: 'center',
      anchor: 'center-middle',
    })
    .add(new UIButton('PLAY', () => engine.switchScene('main-menu', 'game')))
    .add(new UIButton('SETTINGS', () => engine.addScene('settings')))
    .add(new UIButton('EXIT', () => engine.shutdown()));

    engine.addEntity(panel);
  }

  async exit() {}
}