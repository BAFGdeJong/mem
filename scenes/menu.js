import { Scene } from './scene.js';
import { UIPanel } from '../entities/ui-panel.js';
import * as engine from '../engine.js';
import { UIButton } from '../entities/ui-button.js';
import { performSceneTransition } from '../perform-scene-transition.js';
import {UIText} from "../entities/ui-text.js";

export class MainMenu extends Scene {
  constructor() {
    super('main-menu', { z: 0 });
  }

  async preload() {}

  async init() {
    this.children = [];
    
    this.backgroundColor = '#0f0f1b';

    const screenSize = engine.getScreenSize();

    const title = new UIText("MEMORY", {
        font: 'bold 96px "Trebuchet MS", sans-serif',
        color: '#ffffff',
        align: 'center'
    });
    title.layout(screenSize.width/2 - 400, screenSize.height/2 - 280, 800, 100);

    const subtitle = new UIText("SPECIAL EDITION", {
        font: 'bold 32px "Trebuchet MS", sans-serif',
        color: '#00ffcc',
        align: 'center'
    });
    subtitle.layout(screenSize.width/2 - 400, screenSize.height/2 - 180, 800, 50);

    this.children.push(title);
    this.children.push(subtitle);

    const panel = new UIPanel({
      tag: 'main-menu-panel',
      x: screenSize.width / 2 - 200,
      y: screenSize.height / 2 - 50,
      width: 400,
      height: 350,
      direction: 'vertical',
      alignX: 'center',
      alignY: 'center',
      background: 'rgba(255, 255, 255, 0.02)',
      padding: 30,
      margin: 50
    })
    .add(new UIButton('START GAME', () => { performSceneTransition('main-menu', 'game') }, {
      ditherOnHoverOnly: true,
      ditherSpeed: 200,
      font: 'bold 44px "Trebuchet MS", sans-serif',
      color: '#fff',
      hoverColor: '#00ffcc',
      textDitherEnabled: true,
    }))
    .add(new UIButton('EXIT', () => engine.shutdown(), {
      ditherOnHoverOnly: true,
      ditherSpeed: 200,
      font: 'bold 32px "Trebuchet MS", sans-serif',
      color: '#666',
      hoverColor: '#ff4444',
      textDitherEnabled: true,
    }));

    this.children.push(panel);

    const debugToggle = new UIPanel({
        tag: 'ui-debug-toggle',
        x: engine.getScreenSize().width - 60,
        y: 20,
        width: 40,
        height: 40,
        background: 'rgba(0,0,0,0.3)'
    })
    .add(new UIButton('D', () => { engine.setDebug() }, {
        font: 'bold 20px monospace',
        color: '#666',
        hoverColor: '#fff'
    }));
    this.children.push(debugToggle);
  }

  async exit() {
    this.children = [];
  }
}