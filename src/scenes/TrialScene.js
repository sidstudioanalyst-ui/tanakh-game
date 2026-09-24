// Экран «Суд» в конце карты. Данные — src/data/trials/<id>.json.
//   1) профиль по четырём величинам Мерила — сколько в каждой «света» и «тени» (не оценка);
//   2) три вопроса, у каждого два аргумента: «за» (for) и «против» (against);
//   3) итог и переход на следующую карту (или начало заново, если карта последняя).
// Аргументы могут иметь effects — как выборы в диалогах.
class TrialScene extends Phaser.Scene {
  constructor() {
    super('TrialScene');
  }

  init(data) {
    this.trial = Content.trial(data.trialId);
    this.answers = [];
  }

  create() {
    this.cameras.main.setBackgroundColor('#1d2129');
    this.cameras.main.fadeIn(250);
    this.layer = this.add.container(0, 0);

    this.margin = 40;
    this.right = CONFIG.WIDTH - this.margin;
    this.contentWidth = CONFIG.WIDTH - this.margin * 2;

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length) this.options[n - 1]();
    });
    kb.on('keydown-SPACE', () => this.options.length === 1 && this.options[0]());
    kb.on('keydown-ENTER', () => this.options.length === 1 && this.options[0]());

    this.showProfile();
  }

  // --- раскладка ------------------------------------------------------------

  clear() {
    this.layer.removeAll(true);
    this.options = [];
  }

  put(obj) {
    if (obj) this.layer.add(obj);
    return obj;
  }

  heading(y) {
    const title = this.put(addHebrewText(this, this.right, y, this.trial.title_he, { size: 26, bold: true, color: '#ebcb8b' }));
    return y + title.height + 6;
  }

  paragraph(y, he, ru, size = 18) {
    const t = this.put(addHebrewText(this, this.right, y, he, { size, width: this.contentWidth, lineSpacing: 6 }));
    y += t.height;
    const r = this.put(addRuHint(this, this.right, y, ru, this.contentWidth));
    return y + (r ? r.height : 0) + 8;
  }

  buttons(y, list) {
    list.forEach((b, i) => {
      this.options.push(b.onSelect);
      const btn = this.put(
        createChoiceButton(this, { rightX: this.right, y, width: this.contentWidth, number: i + 1, ...b })
      );
      y += btn.height + 8;
    });
    return y;
  }

  // --- 1. профиль ------------------------------------------------------------

  showProfile() {
    this.clear();
    let y = this.heading(24);
    y = this.paragraph(y, this.trial.intro_he, this.trial.intro_ru, 17);
    y += 4;

    Object.entries(MEASURES).forEach(([key, m]) => {
      y = this.measureRow(y, m, GameState.measures[key]);
    });

    this.buttons(y + 4, [{ text_he: 'אֶל הַשְּׁאֵלוֹת', text_ru: 'К вопросам', onSelect: () => this.showQuestion(0) }]);
  }

  measureRow(y, m, value) {
    const total = value.light + value.shadow;
    const lightShare = total ? value.light / total : 0.5;
    const band = !total ? 'untested' : lightShare >= 0.65 ? 'light' : lightShare <= 0.35 ? 'shadow' : 'balance';

    const name = this.put(addHebrewText(this, this.right, y, m.name_he, { size: 17, bold: true }));
    const bandText = this.put(addHebrewText(this, this.margin, y + 2, MEASURE_BANDS[band].he, { size: 14, color: '#a0a8b8' }));
    bandText.setOrigin(0, 0);
    y += name.height + 2;

    // Полоса: справа (начало строки на иврите) — свет, слева — тень. Без чисел.
    const barH = 10;
    this.put(this.add.rectangle(this.margin, y, this.contentWidth, barH, 0x3b4252).setOrigin(0));
    if (total) {
      const lightW = Math.round(this.contentWidth * lightShare);
      this.put(this.add.rectangle(this.right - lightW, y, lightW, barH, CONFIG.COLORS.light).setOrigin(0));
      this.put(this.add.rectangle(this.margin, y, this.contentWidth - lightW, barH, CONFIG.COLORS.shadow).setOrigin(0));
    }
    y += barH + 4;

    // Обе стороны показываются всегда; ярче та, которой больше
    const dim = 0.35;
    const lightAlpha = total ? dim + (1 - dim) * lightShare : dim;
    const shadowAlpha = total ? dim + (1 - dim) * (1 - lightShare) : dim;
    const side = (text, color, swatch, alpha) => {
      const t = this.put(addHebrewText(this, this.right - 14, y, text, { size: 14, color }).setAlpha(alpha));
      this.put(this.add.rectangle(this.right - 8, y + t.height / 2, 8, 8, swatch).setAlpha(alpha));
      y += t.height - 4;
    };
    side(m.light_he, '#ebcb8b', CONFIG.COLORS.light, lightAlpha);
    side(m.shadow_he, '#b4a7e0', CONFIG.COLORS.shadow, shadowAlpha);
    return y + 10;
  }

  // --- 2. вопросы ------------------------------------------------------------

  showQuestion(index) {
    const q = this.trial.questions[index];
    if (!q) {
      this.showOutro();
      return;
    }
    this.clear();
    let y = this.heading(24);
    const counter = this.put(
      addHebrewText(this, this.right, y, `שְׁאֵלָה ${index + 1} מִתּוֹךְ ${this.trial.questions.length}`, {
        size: 15,
        color: '#a0a8b8',
      })
    );
    y += counter.height + 6;
    y = this.paragraph(y, q.text_he, q.text_ru, 20) + 10;

    const pick = (side) => () => {
      GameState.applyEffects(q[side].effects);
      this.answers.push(side);
      this.showQuestion(index + 1);
    };
    this.buttons(y, [
      { text_he: q.for.text_he, text_ru: q.for.text_ru, onSelect: pick('for') },
      { text_he: q.against.text_he, text_ru: q.against.text_ru, onSelect: pick('against') },
    ]);
  }

  // --- 3. итог ---------------------------------------------------------------

  showOutro() {
    GameState.trialAnswers[GameState.map.id] = [...this.answers];
    this.clear();
    let y = this.heading(24);
    y = this.paragraph(y, this.trial.outro_he, this.trial.outro_ru, 19);

    const last = !GameState.hasNextMap();
    this.buttons(y + 10, [
      {
        text_he: last ? 'לְהַתְחִיל מֵחָדָשׁ' : 'לַדֶּרֶךְ הַבָּאָה',
        text_ru: last ? 'Начать заново' : 'В следующий путь',
        onSelect: () => this.finish(last),
      },
    ]);
  }

  finish(last) {
    if (last) GameState.newGame();
    else GameState.startMap(GameState.mapIndex + 1); // Мерило и вещи остаются
    this.scene.start('GameScene', { zoneId: GameState.currentZone });
  }
}
