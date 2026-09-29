// Экран «Суд» в конце карты. Данные — src/data/trials/<id>.json.
//   1) профиль по четырём величинам Мерила — сколько в каждой «света» и «тени» (не оценка);
//   2) вопросы (обычно три), у каждого два аргумента: «за» (for) и «против» (against);
//      if_flag у вопроса — показать, только если флаг стоит (жёсткий ответ Эфраиму в Суде карты 2);
//      if_flag_is: { флаг: ['значение', ...] } — только если у флага одно из значений;
//      unless_flag_is — наоборот (вариант «по умолчанию»). Варианты одного вопроса — с общим
//      group (Суд карты 3: условие Йифтаха, тон ответа Эфраиму); в ответах — «сторона:id».
//   3) итог и переход на следующую карту; после последней — Суд эпохи (EPOCH_TRIALS в world.js)
//      или, если его у кампании нет, начало заново.
// Суд эпохи (epoch: true) — вместо вопросов: 1) общий профиль (Мерило копится с начала кампании,
// так что это сумма за все карты); 2) сводка выборов — choices: [{ id, variants: [{ if_flag |
// if_flag_is, text_he, text_ru }] }], строка — первый подходящий вариант, без него строки нет;
// 3) открытый вопрос reflection_he/ru без кнопок «за» и «против» и «Начать заново».
// Аргументы могут иметь effects — как выборы в диалогах.
// draft: true (у суда — для вступления и итога, у вопроса — для него и его аргументов): иврита
// ещё нет, под заглушкой всегда виден русский — как у реплик-черновиков.
class TrialScene extends Phaser.Scene {
  constructor() {
    super('TrialScene');
  }

  init(data) {
    // trial: null у карты — Суд ещё не написан: показываем только профиль Мерила
    this.trial = (data.trialId && Content.trial(data.trialId)) || this.stubTrial();
    // вопросы с if_flag — только если флаг стоит; нумерация «1 из N» — по тем, что показываются
    this.questions = (this.trial.questions || []).filter((q) => TrialScene.shown(q));
    this.answers = [];
  }

  // Условие показа вопроса или строки сводки: if_flag, if_flag_is, unless_flag_is
  static shown(item) {
    const is = (cond) => Object.entries(cond).every(([flag, values]) => [].concat(values).includes(GameState.flags[flag]));
    return (!item.if_flag || GameState.flags[item.if_flag]) && (!item.if_flag_is || is(item.if_flag_is)) && (!item.unless_flag_is || !is(item.unless_flag_is));
  }

  stubTrial() {
    const title = UI.both('trial_stub_title');
    const intro = UI.both('trial_stub_intro');
    return { id: null, title_he: title.he, title_ru: title.ru, intro_he: intro.he, intro_ru: intro.ru, questions: [], stub: true };
  }

  create() {
    this.cameras.main.setBackgroundColor('#1d2129');
    this.cameras.main.fadeIn(250);
    this.layer = this.add.container(0, 0);

    this.measure();

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length) this.options[n - 1]();
    });
    kb.on('keydown-SPACE', () => this.options.length === 1 && this.options[0]());
    kb.on('keydown-ENTER', () => this.options.length === 1 && this.options[0]());
    // Смена языка — перерисовать текущую страницу (ответы уже выбранных вопросов не меняются)
    bindLanguageKeys(this, () => this.render());

    this.show(() => this.showProfile());
  }

  // --- раскладка ------------------------------------------------------------

  // Поля и ширина текста — от текущего размера экрана (на тач он меняется при повороте)
  measure() {
    this.margin = CONFIG.PORTRAIT ? 20 : 40; // узкий экран — поля меньше
    this.right = CONFIG.WIDTH - this.margin;
    this.contentWidth = Math.min(CONFIG.WIDTH - this.margin * 2, 900); // на широком экране строки не тянутся
    this.right = CONFIG.WIDTH / 2 + this.contentWidth / 2;
    this.margin = CONFIG.WIDTH / 2 - this.contentWidth / 2;
  }

  // Поворот телефона (src/ui/Layout.js): та же страница Суда в новом размере
  relayout() {
    this.measure();
    this.render();
  }
  // Координаты задаются «по-ивритски» (справа налево); в русском всё отражается.

  show(render) {
    this.render = () => {
      render();
      this.fit();
    };
    this.render();
  }

  // Страница выше экрана (профиль в режиме «оба языка» на телефоне в альбомной ориентации) —
  // уменьшить её целиком, чтобы кнопка осталась на экране. Прокрутки нет: кнопки выбора
  // срабатывают по касанию, и перетаскивание пальцем выбирало бы ответ.
  fit() {
    this.layer.setScale(1).setPosition(0, 0);
    const room = CONFIG.HEIGHT - 12;
    const bottom = this.layer.getBounds().bottom;
    if (bottom <= room) return;
    const k = room / bottom;
    this.layer.setScale(k).setPosition((CONFIG.WIDTH * (1 - k)) / 2, 0);
  }

  clear() {
    this.layer.removeAll(true);
    this.options = [];
  }

  put(obj) {
    if (obj) this.layer.add(obj);
    return obj;
  }

  putText(block) {
    this.layer.add(block.objects);
    return block.height;
  }

  // Прямоугольник (левый край и ширина — для иврита) на своём месте в текущем языке
  rect(left, y, w, h, color, alpha = 1) {
    const x = UI.rtl ? left : CONFIG.WIDTH - left - w;
    return this.put(this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0));
  }

  // Мелкий русский перевод в той же строке, у противоположного края (для плотного профиля)
  inlineHint(y, text) {
    if (!UI.showHint || !text) return;
    this.put(this.add.text(this.margin, y + 4, text, { fontFamily: 'sans-serif', fontSize: '11px', color: '#8f9bb3' }));
  }

  heading(y) {
    const t = this.trial;
    return y + this.putText(addContentText(this, this.right, y, t.title_he, t.title_ru, { size: 26, bold: true, color: '#ebcb8b', noHint: true })) + 6;
  }

  paragraph(y, he, ru, size = 18, draft = false) {
    return y + this.putText(addContentText(this, this.right, y, he, ru, { size, width: this.contentWidth, lineSpacing: 6, draft })) + 8;
  }

  // Подпись интерфейса (ui-strings) у одного из краёв: 'start' — начало строки, 'end' — конец
  label(y, text, edge, opts = {}) {
    const atStart = edge === 'start';
    const obj = addUiLabel(this, UI.rx(atStart ? this.right : this.margin), y, text, {
      ...opts,
      originX: UI.rtl === atStart ? 1 : 0,
    });
    return this.put(obj);
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
    y = this.paragraph(y, this.trial.intro_he, this.trial.intro_ru, 17, !!this.trial.draft);
    y += 4;

    Object.entries(MEASURES).forEach(([key, m]) => {
      y = this.measureRow(y, m, GameState.measures[key]);
    });

    if (this.trial.epoch) {
      const next = UI.both('dialogue_continue');
      this.buttons(y + 4, [{ text_he: next.he, text_ru: next.ru, onSelect: () => this.show(() => this.showChoices()) }]);
      return;
    }
    if (this.trial.stub) {
      // Вопросов нет — сразу дальше (следующая карта, Суд эпохи или начало заново)
      this.endButton(y + 4);
      return;
    }
    const label = UI.both('trial_to_questions');
    this.buttons(y + 4, [{ text_he: label.he, text_ru: label.ru, onSelect: () => this.show(() => this.showQuestion(0)) }]);
  }

  measureRow(y, m, value) {
    const total = value.light + value.shadow;
    const lightShare = total ? value.light / total : 0.5;
    const band = !total ? 'untested' : lightShare >= 0.65 ? 'light' : lightShare <= 0.35 ? 'shadow' : 'balance';

    const nameH = this.putText(addContentText(this, this.right, y, m.name_he, m.name_ru, { size: 17, bold: true, noHint: true }));
    // в конце строки — наклон; в режиме «оба» рядом с ним — русское название величины
    const bandText = UI.showHint ? `${UI.t(`band_${band}`)}  ·  ${m.name_ru}` : UI.t(`band_${band}`);
    this.label(y + 2, bandText, 'end', { size: 14, color: '#a0a8b8' });
    y += nameH;

    // Полоса: у начала строки — свет, у конца — тень. Без чисел.
    const barH = 10;
    this.rect(this.margin, y, this.contentWidth, barH, 0x3b4252);
    if (total) {
      const lightW = Math.round(this.contentWidth * lightShare);
      this.rect(this.right - lightW, y, lightW, barH, CONFIG.COLORS.light);
      this.rect(this.margin, y, this.contentWidth - lightW, barH, CONFIG.COLORS.shadow);
    }
    y += barH + 4;

    // Обе стороны показываются всегда; ярче та, которой больше
    const dim = 0.35;
    const lightAlpha = total ? dim + (1 - dim) * lightShare : dim;
    const shadowAlpha = total ? dim + (1 - dim) * (1 - lightShare) : dim;
    const side = (he, ru, color, swatch, alpha) => {
      const block = addContentText(this, this.right - 18, y, he, ru, { size: 14, color, noHint: true });
      block.objects.forEach((o) => o.setAlpha(alpha));
      const h = this.putText(block);
      this.rect(this.right - 12, y + h / 2 - 4, 8, 8, swatch).setAlpha(alpha);
      this.inlineHint(y, ru);
      y += h - 4;
    };
    side(m.light_he, m.light_ru, '#ebcb8b', CONFIG.COLORS.light, lightAlpha);
    side(m.shadow_he, m.shadow_ru, '#b4a7e0', CONFIG.COLORS.shadow, shadowAlpha);
    return y + 10;
  }

  // --- 2. вопросы ------------------------------------------------------------

  showQuestion(index) {
    const q = this.questions[index];
    if (!q) {
      this.showOutro();
      return;
    }
    this.clear();
    let y = this.heading(24);
    const counter = this.label(y, UI.t('trial_question_counter', { n: index + 1, total: this.questions.length }), 'start', {
      size: 15,
      color: '#a0a8b8',
    });
    y += counter.height + 6;
    y = this.paragraph(y, q.text_he, q.text_ru, 20, !!q.draft) + 10;

    const pick = (side) => () => {
      GameState.applyEffects(q[side].effects);
      // условный вопрос — с флагом; вариант (group) — с id варианта
      this.answers.push(q.group ? `${side}:${q.id || q.group}` : q.if_flag ? `${side}:${q.if_flag}` : side);
      this.show(() => this.showQuestion(index + 1));
    };
    this.buttons(y, [
      { text_he: q.for.text_he, text_ru: q.for.text_ru, onSelect: pick('for'), draft: !!q.draft },
      { text_he: q.against.text_he, text_ru: q.against.text_ru, onSelect: pick('against'), draft: !!q.draft },
    ]);
  }

  // --- 3. итог ---------------------------------------------------------------

  showOutro() {
    GameState.trialAnswers[GameState.map.id] = [...this.answers];
    this.clear();
    let y = this.heading(24);
    y = this.paragraph(y, this.trial.outro_he, this.trial.outro_ru, 19, !!this.trial.draft);

    this.endButton(y + 10);
  }

  // Кнопка в конце Суда карты: следующая карта; после последней — Суд эпохи, если он есть у
  // кампании, иначе начало заново
  endButton(y) {
    const last = !GameState.hasNextMap();
    const epoch = last && EPOCH_TRIALS[GameState.campaign];
    const label = UI.both(epoch ? 'trial_to_epoch' : last ? 'trial_restart' : 'trial_next_map');
    const onSelect = epoch ? () => this.scene.restart({ trialId: epoch }) : () => this.finish(last);
    this.buttons(y, [{ text_he: label.he, text_ru: label.ru, onSelect }]);
  }

  // --- Суд эпохи -------------------------------------------------------------

  // Сводка выборов: по строке на развилку, которая в этой игре была (без оценки)
  showChoices() {
    const lines = (this.trial.choices || []).map((c) => (c.variants || []).find((v) => TrialScene.shown(v))).filter(Boolean);
    if (!lines.length) {
      this.show(() => this.showReflection());
      return;
    }
    this.clear();
    let y = this.heading(24);
    y += this.label(y, UI.t('epoch_choices_title'), 'start', { size: 15, color: '#a0a8b8' }).height + 8;
    lines.forEach((line) => {
      y = this.paragraph(y, line.text_he, line.text_ru, 17, !!this.trial.draft);
    });
    const next = UI.both('dialogue_continue');
    this.buttons(y + 6, [{ text_he: next.he, text_ru: next.ru, onSelect: () => this.show(() => this.showReflection()) }]);
  }

  // Открытый вопрос — только текст для размышления, без «за» и «против»
  showReflection() {
    this.clear();
    let y = this.heading(24);
    y += this.label(y, UI.t('epoch_reflection_title'), 'start', { size: 15, color: '#a0a8b8' }).height + 8;
    y = this.paragraph(y, this.trial.reflection_he, this.trial.reflection_ru, 19, !!this.trial.draft);
    const label = UI.both('trial_restart');
    this.buttons(y + 10, [{ text_he: label.he, text_ru: label.ru, onSelect: () => this.finish(true) }]);
  }

  finish(last) {
    if (last) GameState.newGame(GameState.campaign);
    else GameState.startMap(GameState.mapIndex + 1); // Мерило и вещи остаются
    this.scene.start('GameScene', { zoneId: GameState.currentZone });
  }
}
