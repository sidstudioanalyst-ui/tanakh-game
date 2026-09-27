// Окно диалога поверх игры. Данные — src/data/dialogues/<id>.json.
//
// Реплика: { id, speaker, text_he, text_ru, next } или { ..., choices: [...] }
//   style: 'narration' — повествование: чёрный экран и строка текста по центру, без говорящего
//                        (так показываются развязки — например, сцена с Эглоном)
//   no_escape: true    — из этой реплики нельзя выйти по Esc (например, когда выбор
//                        проваливает сцену — иначе Esc позволил бы обойти последствия)
//   draft: true        — иврит ещё не написан: text_he — временный текст, под ним всегда
//                        показывается русский (и у выборов этой реплики тоже)
// Выбор:   { text_he, text_ru, next, effects }
// next: id следующей реплики или null — конец диалога.
// title_he / title_ru (у всего диалога) — заголовок над narration-репликами («Мерило»);
//   у реплики — свой заголовок вместо общего (например, «Что, если…» в Г6).
// vision: 'burning_tower' — у narration-реплики: над текстом одна картинка-силуэт
//   (флэшфорвард «что, если» в Г6). Рисуется процедурно, без деталей.
// Говорящий (speaker) передаётся в GameScene: декор зоны с тем же speaker «оживает»
//   (деревья в притче Йотама).
//
// Пролог и заставки карт (data.intro, см. PROLOGUES и поле карты intro в world.js):
// экран сразу чёрный, а после последней реплики сцена сама открывает следующую из
// GameState.introQueue — игра между ними не показывается. Esc на прологе пропускает
// весь пролог (заставку карты — нет: у её реплик no_escape).
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
    this.intro = data.intro || null; // { id, prologue? } — сцена из очереди пролога/заставок
    this.closing = false;
    this.narrationShown = null; // сцена перезапускается для следующей заставки — начать с затемнения
    this.dialogue = Content.dialogue(data.dialogueId);
    this.lines = {};
    this.dialogue.lines.forEach((line) => {
      this.lines[line.id] = line;
    });
  }

  create() {
    this.dim = this.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, this.intro ? 1 : 0.35).setOrigin(0);
    this.layer = this.add.container(0, 0);

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      if (this.closing) return;
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length) this.options[n - 1]();
    });
    kb.on('keydown-SPACE', () => !this.closing && this.options.length === 1 && this.options[0]());
    kb.on('keydown-ENTER', () => !this.closing && this.options.length === 1 && this.options[0]());
    // Esc — выйти из разговора. Уже выбранные эффекты остаются; следующий разговор начнётся
    // по entry (как обычно). Реплики с no_escape так не закрываются.
    kb.on('keydown-ESC', () => this.escape());
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
    const game = this.scene.get('GameScene');
    if (game && game.highlightSpeaker) game.highlightSpeaker(line.speaker || null);
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
    // на узком экране — меньше полей, чтобы тексту и кнопкам хватало ширины
    const margin = CONFIG.PORTRAIT ? 10 : 20;
    const pad = CONFIG.PORTRAIT ? 14 : 20;
    const innerRight = CONFIG.WIDTH - margin - pad;
    const innerWidth = CONFIG.WIDTH - (margin + pad) * 2;
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
    // на тач подсказка-кнопка «Выйти ✕» крупная — над окном, чтобы не закрывать текст
    this.addEscHint(line, CONFIG.TOUCH ? -44 : 12);
    this.layer.y = CONFIG.HEIGHT - margin - y;
  }

  // Повествование: затемнение и короткая строка текста по центру
  showNarration(line) {
    // Затемнение — только при первом показе; при смене языка текст просто перерисовывается
    const first = this.narrationShown !== line.id;
    this.narrationShown = line.id;
    this.layer.y = 0;
    if (first && !this.intro) {
      this.dim.setFillStyle(0x000000, 0);
      this.tweens.add({ targets: this.dim, fillAlpha: 1, duration: 600 });
    } else {
      this.dim.setFillStyle(0x000000, 1); // пролог и заставки — сразу на чёрном
    }
    if (first) {
      this.layer.setAlpha(0);
      this.tweens.add({ targets: this.layer, alpha: 1, delay: this.intro ? 150 : 400, duration: this.intro ? 350 : 500 });
    }

    // Раскладка от y = 0, затем блок целиком встаёт по центру экрана по вертикали
    const width = Math.min(600, CONFIG.WIDTH - 48); // на узком экране — почти во всю ширину
    const right = CONFIG.WIDTH / 2 + width / 2;
    let y = 0;
    if (line.vision) y += this.drawVision(line.vision, y, width) + 18;
    const head = line.title_he || line.title_ru ? line : this.dialogue;
    if (head.title_he || head.title_ru) {
      const title = addContentText(this, right, y, head.title_he, head.title_ru, { size: 28, bold: true, width, color: '#ebcb8b', noHint: true });
      this.layer.add(title.objects);
      y += title.height + 18;
    }
    const text = addContentText(this, right, y, line.text_he, line.text_ru, { size: 22, width, lineSpacing: 8, draft: line.draft });
    this.layer.add(text.objects);
    y += text.height + 6;
    y = this.addButtons(line, right, y + 24, width);
    const offset = Math.max(40, Math.round((CONFIG.HEIGHT - y) / 2 - 20));
    this.layer.each((obj) => (obj.y += offset));
    this.addEscHint(line, 20, this.intro && this.intro.prologue ? 'dialogue_skip_prologue' : 'dialogue_esc_hint');
  }

  // Картинка-видение над текстом narration. Возвращает высоту.
  // burning_tower — силуэт башни на фоне зарева: только тень, без деталей; зарево
  // медленно «дышит». Короткий и почти беззвучный кадр «что, если».
  drawVision(kind, y, width) {
    const h = 190;
    const cx = CONFIG.WIDTH / 2;
    if (kind !== 'burning_tower') return 0;
    const g = this.add.graphics();
    // зарево: несколько тёмно-красных кругов
    const glow = this.add.graphics();
    [[92, 0x3a0d06, 1], [70, 0x5c1a0a, 0.9], [48, 0x8a3412, 0.8], [28, 0xb5541a, 0.6]].forEach(([r, c, a]) => glow.fillStyle(c, a).fillCircle(cx, y + h - 92, r));
    this.tweens.add({ targets: glow, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // земля и башня — сплошная тень
    g.fillStyle(0x050505, 1);
    g.fillRect(cx - width / 2, y + h - 18, width, 18);
    g.fillRect(cx - 26, y + 40, 52, h - 58); // ствол башни
    g.fillRect(cx - 34, y + 30, 68, 14); // верхняя площадка
    for (let i = 0; i < 4; i++) g.fillRect(cx - 34 + i * 19, y + 18, 11, 14); // зубцы
    g.fillStyle(0x3a0d06, 1).fillRect(cx - 6, y + 70, 12, 20); // тёмное окно-бойница
    // языки огня над башней — тоже силуэты, чуть колышутся
    const flames = this.add.graphics({ x: cx, y: y + 20 }); // основание огня — верх башни
    flames.fillStyle(0x0b0b0b, 1);
    flames.fillTriangle(-30, 0, -18, -36, -8, 0);
    flames.fillTriangle(-10, 0, 2, -50, 14, 0);
    flames.fillTriangle(10, 0, 22, -30, 32, 0);
    this.tweens.add({ targets: flames, scaleY: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.layer.add([glow, g, flames]);
    return h;
  }

  // Esc (на тач — касание подсказки «Выйти ✕»): выйти из разговора, на прологе — пропустить его
  escape() {
    const line = this.lines[this.currentLineId];
    if (this.closing || !line || line.no_escape) return;
    if (this.intro && this.intro.prologue) this.skipPrologue();
    else this.close();
  }

  // «Esc — выйти» мелко в верхнем углу со стороны конца строки (слева в иврите, справа в русском)
  addEscHint(line, y, key = 'dialogue_esc_hint') {
    if (line.no_escape) return;
    const x = UI.rtl ? 32 : CONFIG.WIDTH - 32;
    // на тач подсказка крупнее и нажимается пальцем (область нажатия шире текста)
    const hint = addUiText(this, x, y, UI.t(key), { size: CONFIG.TOUCH ? 15 : 11, color: '#8f9bb3' });
    hint.setPosition(x, y).setOrigin(UI.rtl ? 0 : 1, 0);
    if (CONFIG.TOUCH) {
      hint.setPadding(8, 6, 8, 6).setBackgroundColor('#3b4252');
      hint.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-12, -12, hint.width + 24, hint.height + 24), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      hint.on('pointerdown', () => this.escape());
    }
    this.layer.add(hint);
  }

  choose(choice) {
    const notes = GameState.applyEffects(choice.effects);
    if (notes.length) this.scene.get('GameScene').events.emit('toast', notes.join('\n'));
    this.show(choice.next);
  }

  close() {
    if (this.closing) return;
    if (this.intro) {
      if (this.intro.prologue && !(GameState.introQueue[0] || {}).prologue) GameState.markPrologueSeen();
      const next = GameState.introQueue.shift();
      if (next) {
        this.scene.restart({ dialogueId: next.id, intro: next }); // следующая сцена, экран остаётся чёрным
        return;
      }
      // последняя заставка: чёрный экран плавно открывает игру
      this.closing = true;
      this.tweens.killAll();
      this.tweens.add({ targets: [this.layer, this.dim], alpha: 0, duration: 400, onComplete: () => this.finishClose() });
      return;
    }
    this.finishClose();
  }

  // Esc на прологе — пропустить его целиком; заставка карты всё равно покажется
  skipPrologue() {
    GameState.introQueue = GameState.introQueue.filter((i) => !i.prologue);
    GameState.markPrologueSeen();
    this.close();
  }

  finishClose() {
    const game = this.scene.get('GameScene');
    if (game && game.highlightSpeaker && game.sys.settings.status !== Phaser.Scenes.SHUTDOWN) game.highlightSpeaker(null);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
