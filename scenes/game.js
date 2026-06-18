import { Scene } from './scene.js';
import * as engine from '../engine.js';
import { UIPanel } from '../entities/ui-panel.js';
import { UIButton } from '../entities/ui-button.js';
import { performSceneTransition } from '../perform-scene-transition.js';
import { Game } from '../game/game.js';
import { Board } from '../game/board.js';
import { Card } from '../game/card.js';
import { SpecialCardBomb } from '../game/cards/specialCardBomb.js';
import { SpecialCardJoker } from '../game/cards/specialCardJoker.js';
import { SpecialCardFreeze } from '../game/cards/specialCardFreeze.js';

import { UIText } from '../entities/ui-text.js';

export class GameScene extends Scene {
  constructor() {
    super('game', { z: 0 });
  }

    async preload() {
    engine.registerAsset('flip_snd', './assets/audio/gladius.mp3', 'audio'); // Using gladius as placeholder if no other
    engine.registerAsset('match_snd', './assets/audio/gladius.mp3', 'audio');
    engine.registerAsset('bomb_snd', './assets/audio/gladius.mp3', 'audio');
    
    engine.registerAsset('apple', './assets/texture/apple.png', 'texture');
    engine.registerAsset('banana', './assets/texture/banana.png', 'texture');
    engine.registerAsset('grapes', './assets/texture/grape.png', 'texture');
    engine.registerAsset('orange', './assets/texture/orange.png', 'texture');
    engine.registerAsset('pear', './assets/texture/pear.png', 'texture');
    engine.registerAsset('cherries', './assets/texture/cherry.png', 'texture');
    engine.registerAsset('strawberry', './assets/texture/strawberry.png', 'texture');
    engine.registerAsset('watermelon', './assets/texture/watermelon.png', 'texture');
    engine.registerAsset('pineapple', './assets/texture/pineapple.png', 'texture');
    engine.registerAsset('peach', './assets/texture/peach.png', 'texture');
    engine.registerAsset('blueberry', './assets/texture/blueberry.png', 'texture');
    engine.registerAsset('joker', './assets/texture/joker.png', 'texture');
    engine.registerAsset('snowflake', './assets/texture/snowflake.png', 'texture');
    engine.registerAsset('bomb', './assets/texture/bomb.png', 'texture');
    engine.registerAsset('mystery', './assets/texture/mystery.png', 'texture');

    await engine.loadAssets((loaded, total, key) => {
      console.log(`${loaded}/${total} - ${key}`);
    });
  }

  async init() {
    this.children = [];

    this.backgroundColor = '#1a1a2e';
    
    const game = new Game();
    this.game = game;
    const screenSize = engine.getScreenSize();
    const rows = 4;
    const cols = 4;
    
    const margin = 120;
    const sideMargin = 180; 
    
    const availableWidth = screenSize.width - sideMargin * 2;
    const availableHeight = screenSize.height - margin - 50;
    
    const cardAspectRatio = 0.77;
    
    let cellWidth = availableWidth / cols;
    let cellHeight = availableHeight / rows;
    
    if (cellWidth / cellHeight > cardAspectRatio) {
        cellWidth = cellHeight * cardAspectRatio;
    } else {
        cellHeight = cellWidth / cardAspectRatio;
    }
    
    const boardWidth = cols * cellWidth;
    const boardHeight = rows * cellHeight;

    const boardX = (screenSize.width - boardWidth) / 2;
    const boardY = (screenSize.height - boardHeight) / 2 + 60;

    const board = new Board({
      position: { x: boardX, y: boardY },
      rows: rows,
      columns: cols,
      cellWidth: cellWidth,
      cellHeight: cellHeight,
      game: game
    });
    this.board = board;
    game.setBoard(board);

    this.setupCards();

    const boardBg = new UIPanel({
        tag: 'board-bg',
        x: boardX - 20,
        y: boardY - 20,
        width: boardWidth + 40,
        height: boardHeight + 40,
        background: 'rgba(255, 255, 255, 0.03)'
    });
    this.children.push(boardBg);

    this.children.push(game);
    this.children.push(board);

    const statsPanel = new UIPanel({
        tag: 'stats-panel',
        x: (screenSize.width - 700) / 2,
        y: 20,
        width: 700,
        height: 80,
        direction: 'horizontal',
        alignX: 'center',
        spread: true,
        padding: 20,
        background: 'rgba(255, 255, 255, 0.05)'
    });
    
    statsPanel.add(new UIText(() => `SCORE: ${game.score}`, { font: 'bold 28px "Trebuchet MS", sans-serif', color: '#ffd700' }));
    statsPanel.add(new UIText(() => `TURNS: ${game.turns}`, { font: 'bold 28px "Trebuchet MS", sans-serif', color: '#ffffff' }));

    this.children.push(statsPanel);

    const leftPanel = new UIPanel({
        tag: 'ui-left-panel',
        x: 20,
        y: screenSize.height / 2 - 50,
        width: 160,
        height: 100,
        alignX: 'center',
        alignY: 'middle',
        background: 'rgba(255, 170, 0, 0.1)'
    })
    .add(new UIButton('RESTART', () => { this.restart() }, {
        font: 'bold 24px "Trebuchet MS", sans-serif',
        color: '#ffaa00',
        hoverColor: '#fff',
        textDitherEnabled: true,
        ditherOnHoverOnly: true,
    }));

    const rightPanel = new UIPanel({
        tag: 'ui-right-panel',
        x: screenSize.width - 180,
        y: screenSize.height / 2 - 50,
        width: 160,
        height: 100,
        alignX: 'center',
        alignY: 'middle',
        background: 'rgba(255, 255, 255, 0.05)'
    })
    .add(new UIButton('MENU', () => { performSceneTransition('game', 'main-menu') }, {
      font: 'bold 24px "Trebuchet MS", sans-serif',
      color: '#aaa',
      hoverColor: '#fff',
      textDitherEnabled: true,
      ditherOnHoverOnly: true,
    }));

    this.children.push(leftPanel);
    this.children.push(rightPanel);

    const debugToggle = new UIPanel({
      tag: 'ui-debug-toggle',
      x: screenSize.width - 60,
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

    game.onGameOver = (stats) => {
        console.log("onGameOver triggered", stats);
        this.showGameOver(stats);
    };
  }

  showGameOver(stats) {
    console.log("Showing Game Over Popup");
    const screenSize = engine.getScreenSize();
    
    const overlay = new UIPanel({
        tag: 'game-over-overlay',
        x: 0,
        y: 0,
        width: screenSize.width,
        height: screenSize.height,
        background: 'rgba(10, 10, 25, 0.9)'
    });
    overlay.z = 100;

    const popup = new UIPanel({
        tag: 'game-over-popup',
        x: screenSize.width / 2 - 250,
        y: screenSize.height / 2 - 260,
        width: 500,
        height: 520,
        direction: 'vertical',
        alignX: 'center',
        alignY: 'center',
        padding: 40,
        margin: 40,
        background: 'rgba(255, 255, 255, 0.05)'
    });
    popup.z = 101;

    popup.add(new UIText("VICTORY!", { font: 'bold 64px "Trebuchet MS", sans-serif', color: '#ffd700' }));
    popup.add(new UIPanel({ width: 200, height: 4, background: '#ffd700' })); // Decorative line
    popup.add(new UIText("", { font: '10px sans-serif' }));

    const statsContainer = new UIPanel({
        direction: 'vertical',
        alignX: 'center',
        background: 'transparent'
    });
    statsContainer.add(new UIText(`FINAL SCORE: ${stats.score}`, { font: 'bold 36px "Trebuchet MS", sans-serif', color: '#ffffff' }));
    statsContainer.add(new UIText(`TOTAL TURNS: ${stats.turns}`, { font: 'bold 28px "Trebuchet MS", sans-serif', color: '#aaaaaa' }));
    popup.add(statsContainer);
    
    popup.add(new UIText("", { font: '20px sans-serif' }));

    const playAgainBtn = new UIButton('PLAY AGAIN', () => {
        this.children = this.children.filter(c => c.tag !== 'game-over-overlay' && c.tag !== 'game-over-popup');
        engine.removeEntity(overlay);
        engine.removeEntity(popup);
        engine.removeEntity(playAgainBtn);
        engine.removeEntity(mainMenuBtn);
        this.restart(); 
    }, {
        font: 'bold 32px "Trebuchet MS", sans-serif',
        color: '#ffaa00',
        hoverColor: '#fff',
        textDitherEnabled: true,
        ditherOnHoverOnly: true
    });
    playAgainBtn.z = 102;
    popup.add(playAgainBtn);

    popup.add(new UIText("", { font: '10px sans-serif' }));

    const mainMenuBtn = new UIButton('MAIN MENU', () => { 
        engine.removeEntity(overlay);
        engine.removeEntity(popup);
        engine.removeEntity(playAgainBtn);
        engine.removeEntity(mainMenuBtn);
        performSceneTransition('game', 'main-menu');
    }, {
        font: 'bold 24px "Trebuchet MS", sans-serif',
        color: '#888',
        hoverColor: '#fff',
        textDitherEnabled: true,
        ditherOnHoverOnly: true
    });
    mainMenuBtn.z = 102;
    popup.add(mainMenuBtn);

    this.children.push(overlay);
    this.children.push(popup);
    engine.addEntity(overlay);
    engine.addEntity(popup);
    engine.addEntity(playAgainBtn);
    engine.addEntity(mainMenuBtn);
  }

  setupCards() {
    const rows = 4;
    const cols = 4;
    const cardData = [
      { id: 1, text: "APPLE", imageKey: 'apple' }, { id: 1, text: "APPLE", imageKey: 'apple' },
      { id: 2, text: "BANANA", imageKey: 'banana' }, { id: 2, text: "BANANA", imageKey: 'banana' },
      { id: 3, text: "GRAPES", imageKey: 'grapes' }, { id: 3, text: "GRAPES", imageKey: 'grapes' },
      { id: 4, text: "ORANGE", imageKey: 'orange' }, { id: 4, text: "ORANGE", imageKey: 'orange' },
      { id: 5, text: "PEAR", imageKey: 'pear' }, { id: 5, text: "PEAR", imageKey: 'pear' },
      { id: 6, text: "BOMB", effect: new SpecialCardBomb(1), imageKey: 'bomb' },
      { id: 6, text: "BOMB", effect: new SpecialCardBomb(1), imageKey: 'bomb' },
      { id: 7, text: "JOKER", effect: new SpecialCardJoker(), imageKey: 'joker' },
      { id: 8, text: "FREEZE", effect: new SpecialCardFreeze(1, 2), imageKey: 'snowflake' },
      { id: 9, text: "CHERRY", imageKey: 'cherries' }, { id: 9, text: "CHERRY", imageKey: 'cherries' }
    ];

    const backImage = engine.getAsset('mystery');

    for (let i = cardData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardData[i], cardData[j]] = [cardData[j], cardData[i]];
    }

    for (let i = 0; i < rows * cols; i++) {
      const data = cardData[i] || { id: 10 + i, text: "Extra" };
      this.board.setCard(i, new Card({
        id: data.id,
        text: data.text,
        image: engine.getAsset(data.imageKey),
        backImage: backImage,
        effect: data.effect
      }));
    }
  }

  restart() {
    this.game.score = 0;
    this.game.turns = 0;
    this.game.gameOver = false;
    this.game.selected = [];
    this.game.pendingReset = null;

    for (let i = 0; i < this.board.cards.length; i++) {
        const card = this.board.getCard(i);
        if (card) {
            card.faceUp = false;
            card.targetFlipAnim = 1;
            card.flipAnim = 1;
            card.matched = false;
            card.frozen = 0;
            card.visualPos = null;
        }
    }

    this.setupCards();
  }

  async exit() {
    engine.unloadAsset('flip_snd');
    engine.unloadAsset('match_snd');
    engine.unloadAsset('bomb_snd');
    this.children = [];
  }
}
