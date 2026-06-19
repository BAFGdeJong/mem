import * as engine from './engine.js';
import { BINDINGS } from './keybindings.js';
import { GameScene } from './scenes/game.js';
import { MainMenu } from './scenes/menu.js';
import { DebugScene } from './scenes/debug.js';

await engine.app()
  .withCanvas(null, null, 'transparent')
  .withActions(BINDINGS)
  .withDebug(false)
  .withScenes([new MainMenu(), new GameScene(), new DebugScene()])
  .startScene('main-menu')
  .startScene('debug')
  .run();
