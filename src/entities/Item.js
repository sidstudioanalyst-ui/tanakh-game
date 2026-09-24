// Предмет, лежащий на карте. Подбирается при касании игроком.
class Item extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, itemId, spawnKey) {
    super(scene, x, y, `item-${itemId}`);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // статичное тело — предмет не двигается

    this.itemId = itemId;
    this.spawnKey = spawnKey;
    this.setDepth(4);

    // Лёгкое «покачивание», чтобы предмет было видно на полу
    scene.tweens.add({
      targets: this,
      scale: 1.25,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  collect() {
    this.body.enable = false;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}
