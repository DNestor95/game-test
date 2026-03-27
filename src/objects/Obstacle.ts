import Phaser from 'phaser';

/**
 * A static rectangular obstacle that blocks movement for both the player and enemies.
 * Uses a Phaser arcade-physics static body so that arcade colliders push
 * moving objects (player, enemies) out of the rectangle automatically.
 */
export class Obstacle extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    super(scene, x, y, w, h, 0x1a0800, 1);
    this.setStrokeStyle(2, 0x884400, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true = static body
  }
}
