// Точка входа: создаёт экземпляр Phaser.Game.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.WIDTH,
  height: CONFIG.HEIGHT,
  backgroundColor: CONFIG.BACKGROUND,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // вид сверху — гравитации нет
      debug: CONFIG.DEBUG,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
});
