// Окно диалога поверх игры. Данные — src/data/dialogues/<id>.json.
//
// Реплика: { id, speaker, text_he, text_ru, next } или { ..., choices: [...] }
//   style: 'narration' — повествование: чёрный экран и строка текста по центру, без говорящего
//                        (так показываются развязки — например, сцена с Эглоном)
//   draft: true        — иврит ещё не написан: text_he — временный текст, под ним всегда
//                        показывается русский (и у выборов этой реплики тоже)
// Выбор:   { text_he, text_ru, next, effects }
// next: id следующей реплики или null — конец диалога.
//
// entry: [{ node, if_flag, if_not_flag, if_item, if_missing_item }] — с какой реплики начать.
//   Берётся первая запись, у которой выполнены все указанные условия (флаги — строка или массив).
//   Так повторный разговор не выдаёт эффекты второй раз.
//
// Язык — как выбран в игре (UI.lang): иврит, иврит с русским переводом («оба языка») или
// русский. У черновиков в иврите под заглушкой всегда виден русский.
// Управление: 1–9 или клик — выбор; Пробел/Enter — дальше (если выбор один);
// L / B — сменить язык прямо в диалоге (текущая реплика перерисуется, эффекты не повторятся).
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
    this.dim = this.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.35).setOrigin(0);
    this.layer = this.add.container(0, 0);

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length) this.options[n - 1]();
    });
    kb.on('keydown-SPACE', () => this.options.length === 1 && this.options[0]());
    kb.on('keydown-ENTER', () => this.options.length === 1 && this.options[0]());
    bindLanguageKeys(this, () => this.show(this.currentLineId));

    this.show(this.entryNode());
  }

  entryNode() {
    const all = (v, test) => [].concat(v || []).every(test);
    const entry = (this.dialogue.entry || []).find(
      (e) =>
        all(e.if_flag, (f) => GameState.flags[f]) &&
        all(e.if_not_flag, (f) => !GameState.flags[f]) &&
        all(e.if_item, (id) => GameState.hasItem(id)) &&
        all(e.if_missing_item, (id) => !GameState.hasItem(id))
    );
    return entry ? entry.node : this.dialogue.start;
  }

  show(lineId) {
    if (lineId === null || lineId === undefined) {
      this.close();
      return;
    }
    const line = this.lines[lineId];
    this.currentLineId = lineId;
    this.tweens.killAll();
    this.layer.setAlpha(1);
    this.layer.removeAll(true);
    this.options = [];
    if (line.style === 'narration') this.showNarration(line);
    else this.showLine(line);
  }

  // Кнопки: выборы из данных или одна кнопка «дальше» / «конец»
  choicesOf(line) {
    const label = UI.both(line.next ? 'dialogue_continue' : 'dialogue_end');
    return line.choices || [{ text_he: label.he, text_ru: label.ru, next: line.next, auto: true }];
  }

  addButtons(line, rightX, y, width) {
    const choices = this.choicesOf(line);
    this.options = choices.map((choice) => () => this.choose(choice));
    choices.forEach((choice, i) => {
      const btn = createChoiceButton(this, {
        rightX,
        y,
        width,
        number: i + 1,
        text_he: choice.text_he,
        text_ru: choice.text_ru,
        onSelect: this.options[i],
        draft: line.draft && !choice.auto,
      });
      this.layer.add(btn);
      y += btn.height + 6;
    });
    return y;
  }

  showLine(line) {
    this.dim.setFillStyle(0x000000, 0.35);
    const margin = 20;
    const innerRight = CONFIG.WIDTH - margin - 20;
    const innerWidth = CONFIG.WIDTH - margin * 2 - 40;
    const put = (block) => {
      this.layer.add(block.objects);
      return block.height;
    };

    // Сначала раскладываем содержимое от y=0, затем сдвигаем всё к низу экрана
    let y = 16;
    const speaker = this.dialogue.speakers[line.speaker];
    y += put(addContentText(this, innerRight, y, speaker.name_he, speaker.name_ru, { size: 18, bold: true, color: '#ebcb8b', noHint: true })) + 2;
    y += put(addContentText(this, innerRight, y, line.text_he, line.text_ru, { size: 19, width: innerWidth, lineSpacing: 6, draft: line.draft })) + 12;

    y = this.addButtons(line, innerRight, y, innerWidth) + 4;

    const box = this.add.rectangle(margin, 0, CONFIG.WIDTH - margin * 2, y, 0x2e3440, 0.97).setOrigin(0).setStrokeStyle(2, 0x88c0d0);
    this.layer.addAt(box, 0);
    this.layer.y = CONFIG.HEIGHT - margin - y;
  }

  // Повествование: затемнение и короткая строка текста по центру
  showNarration(line) {
    // Затемнение — только при первом показе; при смене языка текст просто перерисовывается
    const first = this.narrationShown !== line.id;
    this.narrationShown = line.id;
    this.layer.y = 0;
    if (first) {
      this.dim.setFillStyle(0x000000, 0);
      this.tweens.add({ targets: this.dim, fillAlpha: 1, duration: 600 });
      this.layer.setAlpha(0);
      this.tweens.add({ targets: this.layer, alpha: 1, delay: 400, duration: 500 });
    } else {
      this.dim.setFillStyle(0x000000, 1);
    }

    const width = 600;
    const right = CONFIG.WIDTH / 2 + width / 2;
    let y = CONFIG.HEIGHT / 2 - 70;
    const text = addContentText(this, right, y, line.text_he, line.text_ru, { size: 22, width, lineSpacing: 8, draft: line.draft });
    this.layer.add(text.objects);
    y += text.height + 6;
    this.addButtons(line, right, y + 24, width);
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
