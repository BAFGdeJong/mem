import { Scene } from './scene.js';
import * as engine from '../engine.js';

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

  async init() {}

  async exit() {
    engine.unloadAsset('gladius_mus');
  }
}