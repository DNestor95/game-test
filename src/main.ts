import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { GameOverScene } from './scenes/GameOverScene';
import { AttachmentShopScene } from './scenes/AttachmentShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a0f',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, UpgradeScene, LevelUpScene, GameOverScene, AttachmentShopScene],
};

new Phaser.Game(config);
