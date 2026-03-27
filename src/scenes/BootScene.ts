import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // no external assets needed — all shapes
  }

  create() {
    this.scene.start('MenuScene');
  }
}
