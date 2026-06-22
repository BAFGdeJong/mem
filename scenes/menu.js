import { Scene } from './scene.js';
import { UIPanel } from '../entities/ui-panel.js';
import * as engine from '../engine.js';
import { UIButton } from '../entities/ui-button.js';
import { UIText } from "../entities/ui-text.js";
import { clamp } from "../game_math.js";
import { animal_type, set_animal_type } from "../game/animal_type.js";

export class MainMenu extends Scene {
  constructor() {
    super('main-menu', { z: 0 });
  }

  async preload() {}

  async init() {
    this.children = [];

    this.title = new UIText("MEMORY", {
        font: 'bold 72px "Trebuchet MS", sans-serif',
        color: '#ffffff',
        align: 'center'
    });

    this.subtitle = new UIText("MADNESSSSSSS", {
        font: 'bold 26px "Trebuchet MS", sans-serif',
        color: '#00ffcc',
        align: 'center'
    });

    this.panel = new UIPanel({
      tag: 'main-menu-panel',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      direction: 'vertical',
      alignX: 'center',
      alignY: 'center',
      background: 'rgba(255, 255, 255, 0.02)',
      padding: 20,
      margin: 24
    });

    this.popupPanel = new UIPanel({
      tag: 'animal-popup',
      visible: false,
      width: 350,
      height: 250,
      background: 'rgba(20,20,20,1)',
      direction: 'vertical',
      alignX: 'center',
      alignY: 'middle',
      padding: 20,
      margin: 10
    });

    this.popupTitle = new UIText('CHOOSE AN ANIMAL', {
      font: 'bold 24px "Trebuchet MS", sans-serif',
      color: '#ffffff',
      align: 'center'
    });

    this.catBtn = new UIButton('CAT', () => {
      set_animal_type('cat');
      this.popupPanel.visible = false;
      engine.switchScene('main-menu', 'game');
    });

    this.dogBtn = new UIButton('DOG', () => {
      set_animal_type('dog');
      this.popupPanel.visible = false;
      engine.switchScene('main-menu', 'game');
    });

    this.cancelBtn = new UIButton('CANCEL', () => {
      this.popupPanel.visible = false;
    });

    this.popupPanel
      .add(this.popupTitle)
      .add(this.catBtn)
      .add(this.dogBtn)
      .add(this.cancelBtn);

    this.startBtn = new UIButton('START GAME', () => {
      this.popupPanel.visible = true;
    });

    this.exitBtn = new UIButton('EXIT', () => {
      engine.shutdown();
      window.close();
    });

    this.panel.add(this.startBtn).add(this.exitBtn);

    this.debugToggle = new UIPanel({
        tag: 'ui-debug-toggle',
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        background: 'rgba(0,0,0,0.3)'
    })
    .add(new UIButton('D', () => { engine.setDebug() }, {
        font: 'bold 20px monospace',
        color: '#666',
        hoverColor: '#fff'
    }));

    this.children.push(this.title);
    this.children.push(this.subtitle);
    this.children.push(this.panel);
    this.children.push(this.debugToggle);
    this.children.push(this.popupPanel);

    const screen = engine.getScreenSize();
    this.layout(screen.width, screen.height);
  }

  layout(W, H) {
    const scale = clamp(0.7, Math.min(W, H) / 480, 1.8);
    const cx = W / 2;

    const titleSize = Math.round(72 * scale);
    const subSize = Math.round(26 * scale);
    this.title.font = `bold ${titleSize}px "Trebuchet MS", sans-serif`;
    this.subtitle.font = `bold ${subSize}px "Trebuchet MS", sans-serif`;

    const textW = Math.min(W * 0.92, 900);
    const titleY = H * 0.16;
    this.title.layout(cx - textW / 2, titleY, textW, titleSize * 1.25);
    this.subtitle.layout(cx - textW / 2, titleY + titleSize * 1.35, textW, subSize * 1.5);

    this.startBtn.text.font = `bold ${Math.round(40 * scale)}px "Trebuchet MS", sans-serif`;
    this.exitBtn.text.font = `bold ${Math.round(30 * scale)}px "Trebuchet MS", sans-serif`;

    const panelW = Math.min(W * 0.82, 440);
    const panelH = Math.round(230 * scale);
    this.panel.x = cx - panelW / 2;
    this.panel.y = H * 0.46;
    this.panel.width = panelW;
    this.panel.height = panelH;
    this.panel.fixedWidth = true;
    this.panel.fixedHeight = true;

    const d = Math.round(40 * scale);
    const m = Math.round(Math.min(W, H) * 0.04);
    this.debugToggle.x = W - m - d;
    this.debugToggle.y = m;
    this.debugToggle.width = d;
    this.debugToggle.height = d;

    if (this.popupPanel) {
      this.popupPanel.layout(
        W / 2 - 175,
        H / 2 - 125,
        350,
        250
      );
    }
  }

  onResize(W, H) {
    this.layout(W, H);
  }

  async exit() {
    this.children = [];
  }
}