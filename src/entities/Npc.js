// Неигровой персонаж: стоит на месте, с ним можно заговорить (клавиша E рядом с ним).
// Над головой — имя (на языке игры), чтобы персонажей можно было различить ещё до разговора;
// когда игрок рядом, над именем появляется подсказка «E» и имя подсвечивается.
class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, data, name) {
    super(scene, x, y, `npc-${data.id}`);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // статичное тело: игрок упирается, но не толкает

    this.npcId = data.id;
    this.dialogueId = data.dialogue;
    this.setDepth(6);

    this.nameLabel = null;
    this.setName(name);

    this.hint = scene.add
      .text(x, y - 42, 'E', {
        fontFamily: CONFIG.UI_FONT,
        fontSize: '13px',
        color: '#2e3440',
        backgroundColor: '#ebcb8b',
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setVisible(false);
  }

  // Имя над головой; при смене языка вызывается заново
  setName(name) {
    if (this.nameLabel) this.nameLabel.destroy();
    this.nameLabel = addUiText(this.scene, this.x, this.y - 32, name || '', {
      center: true,
      size: 11,
      color: '#e5e9f0',
      background: '#2e3440cc',
      padding: { x: 4, y: 1 },
    }).setDepth(20);
  }

  setHintVisible(visible) {
    this.hint.setVisible(visible);
    this.nameLabel.setColor(visible ? '#ebcb8b' : '#e5e9f0');
  }
}
