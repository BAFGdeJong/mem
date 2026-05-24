import { Scene } from './scene.js';
import * as engine from '../engine.js';
import { UIPanel } from '../entities/ui-panel.js';
import { UIButton } from '../entities/ui-button.js';
import { performSceneTransition } from '../perform-scene-transition.js';

export class GameScene extends Scene {
  constructor() {
    super('game', { z: 0 });
  }

  async preload() {
    engine.registerAsset('gladius_mus', './assets/audio/gladius.mp3', 'audio');
    await engine.loadAssets((loaded, total, key) => {
      console.log(`${loaded}/${total} - ${key}`);
    });
  }

  async init() {
    this.children = [];

    const panel = new UIPanel({
      tag: 'game-panel',
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
    .add(new UIButton('BACK TO MENU', () => { performSceneTransition('game', 'main-menu') }, {
      ditherOnHoverOnly: true,
      ditherSpeed: 100,
      ditherSpacing: 0,
      ditherHarshness: 0.3,
      ditherSize: 4,
      ditherDirection: 'horizontal',
      font: '32px monospace',
    }));

    this.children.push(panel);
  }

  async exit() {
    engine.unloadAsset('gladius_mus');
    this.children = [];
  }
}