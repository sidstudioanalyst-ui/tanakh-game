// Неигровой персонаж: стоит на месте, с ним можно заговорить (клавиша E рядом с ним).
class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, data) {
    super(scene, x, y, `npc-${data.id}`);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // статичное тело: игрок упирается, но не толкает

    this.npcId = data.id;
    this.dialogueId = data.dialogue;
    this.setDepth(6);

    // Подсказка над головой, видна когда игрок рядом
    this.hint = scene.add
      .text(x, y - 26, 'E', {
        fontFamily: CONFIG.UI_FONT,
        fontSize: '13px',
        color: '#2e3440',
        backgroundColor: '#ebcb8b',
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  setHintVisible(visible) {
    this.hint.setVisible(visible);
  }
}
