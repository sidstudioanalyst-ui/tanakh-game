// Неигровой персонаж: стоит на месте, с ним можно заговорить (клавиша E рядом с ним).
// Над головой — имя (на языке игры), чтобы персонажей можно было различить ещё до разговора;
// когда игрок рядом, над именем появляется подсказка «E» и имя подсвечивается.
// sprite (id из CONFIG.CHARACTER_SPRITES, например 'guard_spear') + facing ('down'…) в данных
// NPC — вместо квадрата стоит персонаж в стойке; тело (квадрат NPC_SIZE) прежнее, только
// невидимое; имя и подсказка — выше головы. Нет листа — квадрат, как раньше.
class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, data, name) {
    super(scene, x, y, `npc-${data.id}`);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // статичное тело: игрок упирается, но не толкает

    this.npcId = data.id;
    this.dialogueId = data.dialogue;
    this.setDepth(6);
    this.look = Player.makeCharacterSprite(scene, data.sprite, x, y);
    this.labelLift = 0; // насколько поднять имя и подсказку над квадратом
    if (this.look) {
      this.look.setDepth(6);
      Player.showStand(this.look, data.facing || 'down');
      this.setVisible(false); // тело то же, видна только фигура
      this.labelLift = 18;
    }

    this.nameLabel = null;
    this.setName(name);

    this.hint = scene.add
      .text(x, y - 42 - this.labelLift, CONFIG.TOUCH ? '•••' : 'E', { // на тач — кнопка действия, не клавиша
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
    this.nameLabel = addUiText(this.scene, this.x, this.y - 32 - this.labelLift, name || '', {
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
