// Окно диалога поверх игры. Данные — src/data/dialogues/<id>.json.
//
// Реплика: { id, speaker, text_he, text_ru, next } или { ..., choices: [...] }
// Выбор:   { text_he, text_ru, next, effects }
// next: id следующей реплики или null — конец диалога.
// entry: [{ if_flag, node }] — с какой реплики начать, если флаг уже стоит (повторный разговор).
//
// В игре показывается иврит; русский — только с ?ru в адресе.
// Управление: 1–9 или клик — выбор; Пробел/Enter — дальше (если выбора нет).
class DialogueScene extends Phaser.Scene {
  constructor() {
    super('DialogueScene');
  }

  init(data) {
    this.dialogue = Content.dialogue(data.dialogueId);
    this.lines = {};
    this.dialogue.lines.forEach((line) => {
      this.lines[line.id] = line;
    });
  }

  create() {
    this.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.35).setOrigin(0);
    this.layer = this.add.container(0, 0);

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length) this.options[n - 1]();
    });
    kb.on('keydown-SPACE', () => this.options.length === 1 && this.options[0]());
    kb.on('keydown-ENTER', () => this.options.length === 1 && this.options[0]());

    this.show(this.entryNode());
  }

  entryNode() {
    const entry = (this.dialogue.entry || []).find((e) => GameState.flags[e.if_flag]);
    return entry ? entry.node : this.dialogue.start;
  }

  show(lineId) {
    if (lineId === null || lineId === undefined) {
      this.close();
      return;
    }
    const line = this.lines[lineId];
    this.layer.removeAll(true);

    const margin = 20;
    const boxRight = CONFIG.WIDTH - margin;
    const innerRight = boxRight - 20;
    const innerWidth = CONFIG.WIDTH - margin * 2 - 40;
    const add = (obj) => obj && this.layer.add(obj) && obj;

    // Сначала раскладываем содержимое от y=0, затем сдвигаем всё к низу экрана
    let y = 16;
    const speaker = this.dialogue.speakers[line.speaker];
    const name = add(addHebrewText(this, innerRight, y, speaker.name_he, { size: 18, bold: true, color: '#ebcb8b' }));
    y += name.height + 2;

    const text = add(addHebrewText(this, innerRight, y, line.text_he, { size: 19, width: innerWidth, lineSpacing: 6 }));
    y += text.height + 4;
    const ru = add(addRuHint(this, innerRight, y, line.text_ru, innerWidth));
    if (ru) y += ru.height + 4;
    y += 8;

    // Варианты: выборы из данных или одна кнопка «дальше» / «конец»
    const label = UI.both(line.next ? 'dialogue_continue' : 'dialogue_end');
    const choices = line.choices || [{ text_he: label.he, text_ru: label.ru, next: line.next }];
    this.options = choices.map((choice) => () => this.choose(choice));
    choices.forEach((choice, i) => {
      const btn = add(
        createChoiceButton(this, {
          rightX: innerRight,
          y,
          width: innerWidth,
          number: i + 1,
          text_he: choice.text_he,
          text_ru: choice.text_ru,
          onSelect: this.options[i],
        })
      );
      y += btn.height + 6;
    });
    y += 10;

    const boxTop = CONFIG.HEIGHT - margin - y;
    const box = this.add.rectangle(margin, 0, CONFIG.WIDTH - margin * 2, y, 0x2e3440, 0.97).setOrigin(0).setStrokeStyle(2, 0x88c0d0);
    this.layer.addAt(box, 0);
    this.layer.y = boxTop;
  }

  choose(choice) {
    const notes = GameState.applyEffects(choice.effects);
    if (notes.length) this.scene.get('GameScene').events.emit('toast', notes.join('\n'));
    this.show(choice.next);
  }

  close() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
