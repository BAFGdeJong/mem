import { Entity } from './entity.js';
import * as engine from '../engine.js';

export class EntityDebugBindings extends Entity {
  constructor () {
    super({ tag: 'debug-BINDINGS', groups: ['debug-bindings'] });
  }

  tick() {}

  input(event, e) {
    if (event !== 'keydown' || e.repeat) return;

    if (engine.isActionPressed('toggle_debug')) {
      engine.setDebug();
    }
  }
}