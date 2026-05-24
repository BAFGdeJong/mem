import { Scene } from './scene.js';
import { UIPanel } from '../entities/ui-panel.js';
import * as engine from '../engine.js';
import { UIButton } from '../entities/ui-button.js';
import { performSceneTransition } from '../perform-scene-transition.js';

export class MainMenu extends Scene {
  constructor() {
    super('main-menu', { z: 0 });
  }

  async preload() {}

  async init() {
    this.children = [];

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
    .add(new UIButton('PLAY', () => { performSceneTransition('main-menu', 'game') }, {
      ditherOnHoverOnly: true,
      ditherSpeed: 100,
      ditherSpacing: 0,
      ditherHarshness: 0.3,
      ditherSize: 4,
      ditherDirection: 'horizontal',
      font: '48px monospace',
    }))
    .add(new UIButton('SETTINGS', () => engine.addScene('settings'), {
      ditherOnHoverOnly: true,
      ditherSpeed: 100,
      ditherSpacing: 0,
      ditherHarshness: 0.3,
      ditherSize: 4,
      ditherDirection: 'horizontal',
      font: '48px monospace',
    }))
    .add(new UIButton('EXIT', () => engine.shutdown(), {
      ditherOnHoverOnly: true,
      ditherSpeed: 100,
      ditherSpacing: 0,
      ditherHarshness: 0.3,
      ditherSize: 4,
      ditherDirection: 'horizontal',
      font: '48px monospace',
    }));

    this.children.push(panel);
  }

  async exit() {
    this.children = [];
  }
}