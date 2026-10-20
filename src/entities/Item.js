// Предмет, лежащий на карте. Подбирается при касании игроком.
// Вид: цветной квадрат (ITEM_SIZE×ITEM_SIZE — так и создана текстура, см. GameScene.createTextures)
// или настоящая иконка (поле icon у предмета в src/data/items.js — крупнее квадрата, см. ниже).
// Хитбокс в обоих случаях — ITEM_SIZE, чтобы подбор работал одинаково независимо от картинки.
class Item extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, itemId, spawnKey) {
    super(scene, x, y, `item-${itemId}`);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // статичное тело — предмет не двигается

    this.itemId = itemId;
    this.spawnKey = spawnKey;
    this.setDepth(4);

    // Квадрат уже нужного размера (ITEM_SIZE) — масштаб 1. Иконка крупнее исходника —
    // уменьшаем до ITEM_ICON_SIZE, хитбокс всё равно ITEM_SIZE (чуть меньше картинки, это ок).
    const isIcon = this.frame.width !== CONFIG.ITEM_SIZE;
    if (isIcon) this.setDisplaySize(CONFIG.ITEM_ICON_SIZE, CONFIG.ITEM_ICON_SIZE);
    this.body.setSize(CONFIG.ITEM_SIZE, CONFIG.ITEM_SIZE, true);
    this.baseScale = this.scaleX;

    // Лёгкое «покачивание», чтобы предмет было видно на полу (относительно своего масштаба —
    // у квадрата это 1→1,25, у более крупной иконки та же пропорция от её масштаба)
    scene.tweens.add({
      targets: this,
      scale: this.baseScale * 1.25,
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
      scale: this.baseScale * 2,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}
