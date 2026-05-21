import { EntityCard } from "./entities/card.js";
import { EntityDebugFPS, EntityDebugTPS } from "./entities/debug.js";

import { addEntity, runEngine, setActions } from './engine.js'
import { EntityTest } from "./entities/test.js";
import { BINDINGS } from './keybindings.js'

export class Game {
  init() {
    setActions(BINDINGS);

    addEntity(new EntityCard({ x: 0, y: 0, width: 100, height: 100, color: 'red', text: 'Hello World!' }));

    this.fps_debug = addEntity(new EntityDebugFPS({ x: 5, y: 5, width: 150, height: 50, background_color: "#000033", text: "FPS", color: "white" }));
    this.tps_debug = addEntity(new EntityDebugTPS({ x: 5, y: 60, width: 150, height: 50, background_color: "#000022", text: "TPS", color: "white" }));

    addEntity(new EntityTest({x: 300, y: 300, width: 100, height: 100, color: "blue", text: "hello" }));
  }

  async run() {
    let shutdown = new Promise((resolve) => {
      runEngine(resolve);
    });

    await shutdown;
  }

  shutdown() {
  }
}
