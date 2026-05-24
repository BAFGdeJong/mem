import * as engine from './engine.js';
import { BINDINGS } from './keybindings.js';
import { DebugScene } from './scenes/debug.js';
import { GameScene } from './scenes/game.js';
import { MainMenu } from './scenes/menu.js';

await engine.app()
  .withCanvas(1080, 680, 'green')
  .withActions(BINDINGS)
  .withDebug(true)
  .withScenes([new DebugScene(), new MainMenu(), new GameScene()])
  .startScene('main-menu')
  .startScene('debug')
  .run();
