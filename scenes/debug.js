import { Scene } from './scene.js';
import { EntityDebugInfo } from '../entities/debug-info.js';
import { EntityDebugBindings } from '../entities/debug-bindings.js';
import { EntityDebugSceneTree } from '../entities/debug-scene-tree.js';
import { EntityDebugSpawnList } from '../entities/debug-spawn-list.js';
import { EntityDebugButtons } from '../entities/debug-buttons.js';
import { GameScene } from './game.js';

export class DebugScene extends Scene {
  constructor() {
    super('debug', { z: 100 });

    this.children = [
      new EntityDebugSceneTree(),
      new EntityDebugInfo(),
      new EntityDebugSpawnList(),
      new EntityDebugButtons(),
      new EntityDebugBindings(),
      new GameScene(),
    ];
  }
}