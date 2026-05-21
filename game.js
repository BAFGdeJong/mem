import { EntityCard } from "./entities/card.js";
import {
  EntityDebugFPS,
  EntityDebugTC,
  EntityDebugTPS,
} from './entities/debug.js'
import { DebugBindingsEntity } from './entities/debug-bindings.js'

import { EntityTest } from "./entities/test.js";
import { BINDINGS } from './keybindings.js'

import * as engine from './engine.js';

export class Game {
  init() {
    engine.setActions(BINDINGS);

    engine.addEntity(new EntityCard({ x: 0, y: 0, width: 100, height: 100, color: 'red', text: 'Hello World!' }));

    this.fps_debug = engine.addEntity(new EntityDebugFPS({ x: 5, y: 5, width: 150, height: 50, background_color: "#000033", text: "FPS", color: "white" }));
    this.tps_debug = engine.addEntity(new EntityDebugTPS({ x: 5, y: 60, width: 150, height: 50, background_color: "#000022", text: "TPS", color: "white" }));
    this.tc_debug = engine.addEntity(new EntityDebugTC({ x: 5, y: 115, width: 150, height: 50, background_color: "#000022", text: "TC", color: "white" }));

    engine.addEntity(new DebugBindingsEntity())

    engine.addEntity(new EntityTest({x: 300, y: 300, width: 100, height: 100, color: "blue", text: "hello" }));
  }

  async run() {
    let shutdown_promise = new Promise((resolve) => {
      engine.run(resolve);
    });

    await shutdown_promise;
  }

  shutdown() {
  }
}
