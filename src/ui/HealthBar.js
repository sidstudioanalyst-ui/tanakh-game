// Полоска здоровья, закреплённая на экране (не двигается вместе с камерой).
// x — отступ в «русской» раскладке; в иврите полоска переносится вправо и заполняется справа.
class HealthBar {
  constructor(scene, x, y, width, height) {
    this.scene = scene;
    this.x = UI.rtl ? CONFIG.WIDTH - x - width : x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.label = addUiText(scene, this.x + width / 2, y - 1, '', { center: true, size: 12, color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(101);
  }

  draw(current, max) {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    const g = this.graphics;
    g.clear();

    // рамка и фон
    g.fillStyle(0x000000, 0.8);
    g.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
    g.fillStyle(0x4c566a, 1);
    g.fillRect(this.x, this.y, this.width, this.height);

    // заполнение: зелёный → жёлтый → красный; в иврите — от правого края
    const color = ratio > 0.5 ? 0xa3be8c : ratio > 0.25 ? 0xebcb8b : 0xbf616a;
    const fillW = this.width * ratio;
    g.fillStyle(color, 1);
    g.fillRect(UI.rtl ? this.x + this.width - fillW : this.x, this.y, fillW, this.height);

    this.label.setText(UI.t('hud_hp', { value: `${Math.max(0, current)}/${max}` }));
  }
}
