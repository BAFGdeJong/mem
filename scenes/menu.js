import { Scene } from './scene.js';
import { UIPanel } from '../entities/ui-panel.js';
import * as engine from '../engine.js';
import { UIButton } from '../entities/ui-button.js'
import {UIText} from "../entities/ui-text.js";

export class MainMenu extends Scene {
  constructor() {
    super('main-menu', { z: 999 });
  }

  async preload() {}

  async init() {
    const panel = new UIPanel({
      tag: 'main-menu-panel',
      margin: 5,
      x: engine.getScreenSize().width / 2,
      y: engine.getScreenSize().height / 2,
      alignX: 'center',
      alignY: 'center',
      cellAlignX: 'center',
      cellAlignY: 'center',
      anchor: 'center-middle',
      width: 300,
      height: 300,
      spread: true,
    })
    .add(new UIButton('PLAY', () => {}, {
      ditherSize: 4,
      ditherDirection: 'diagonal',
      font: '48px monospace',
    }))
    .add(new UIButton('SETTINGS', () => engine.addScene('settings'), {font: '48px monospace'}))
    .add(new UIButton('EXIT', () => engine.shutdown(), {font: '48px monospace'}));

    engine.addEntity(panel);
  }

  async exit() {}
}
