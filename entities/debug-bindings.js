import { Entity } from './entity.js';
import * as engine from '../engine.js';

export class DebugBindingsEntity extends Entity {
  constructor () {
    super({ tag: 'debug-BINDINGS', groups: ['debug'] });
  }

  tick() {}

  input(event, e) {
    if (event !== 'keydown' || e.repeat) return;

    if (engine.isActionPressed('stop_physics')) {
      engine.setPhysics();
    }
    if (engine.isActionPressed('step_through')) {
      engine.step('physics');
    }

    if (engine.isActionPressed('toggle_debug')) {
      engine.setDebug();
    }
  }
}