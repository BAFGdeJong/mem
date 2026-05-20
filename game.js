import { EntityCard } from "./entities/card.js";
import { EntityDebugFPS, EntityDebugTPS } from "./entities/debug.js";

import {addEntity, runEngine } from "./engine.js";
import {EntityTest} from "./entities/test.js";

export class Game {
  init() {
    addEntity(new EntityCard({ x: 0, y: 0, width: 100, height: 100, color: 'red', text: 'Hello World!' }));

    this.fps_debug = addEntity(new EntityDebugFPS({ x: 5, y: 5, width: 150, height: 50 }, "#000033", "FPS", "white"));
    this.tps_debug = addEntity(new EntityDebugTPS({ x: 5, y: 60, width: 150, height: 50 }, "#000022", "TPS", "white"));

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
