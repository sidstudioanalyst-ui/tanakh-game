// Диспут — спор словами (Й2: послы к царю Аммона). Данные — DISPUTES в src/data/disputes.js.
// Окно поверх GameScene (та стоит на паузе). Открывается эффектом open_dispute.
//
// Ход: возражение противника → игрок выбирает одну из оставшихся карточек-аргументов →
// слова героя и реакция противника (по fit карточки) → следующее возражение. После
// возражений — последняя реплика оставшейся карточкой, затем итог: шкала и Мерило по сумме
// fit. Исход спора по тексту один; выхода по Esc нет (спор нужно довести до конца).
// Использованные карточки остаются в списке серыми — видно, что уже сказано.
// Управление: 1–4 или клик/касание; Пробел/Enter — «дальше»; L / B — язык.
class DisputeScene extends Phaser.Scene {
  constructor() {
    super('DisputeScene');
  }

  init(data) {
    this.disputeId = data.disputeId;
    this.dispute = DISPUTES[data.disputeId];
    this.used = [];
    this.picks = []; // [{ card, fit }]
    this.score = 0;
    // сцена одна на всю игру: после «Начать заново» итог спора снова начисляется
    this.applied = false;
    this.notes = null;
  }

  create() {
    this.bg = this.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 0x1d2129, 0.97).setOrigin(0);
    this.layer = this.add.container(0, 0);
    this.measure();

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length && this.options[n - 1]) this.options[n - 1]();
    });
    const single = () => this.options.filter(Boolean).length === 1 && this.options.find(Boolean)();
    kb.on('keydown-SPACE', single);
    kb.on('keydown-ENTER', single);
    bindLanguageKeys(this, () => this.render());

    this.show(() => this.showObjection(0));
  }

  // Поля и ширина текста — от текущего размера экрана; на широком экране строки не тянутся
  measure() {
    const margin = CONFIG.PORTRAIT ? 18 : 40;
    this.contentWidth = Math.min(CONFIG.WIDTH - margin * 2, 900);
    this.right = CONFIG.WIDTH / 2 + this.contentWidth / 2;
    this.margin = CONFIG.WIDTH / 2 - this.contentWidth / 2;
  }

  // Поворот телефона (src/ui/Layout.js): тот же шаг спора в новом размере
  relayout() {
    this.bg.setSize(CONFIG.WIDTH, CONFIG.HEIGHT);
    this.measure();
    this.render();
  }

  get draft() {
    return !!this.dispute.draft;
  }

  // --- раскладка (как на экране Суда: координаты «по-ивритски», в русском отражаются) --------

  show(render) {
    this.render = render;
    render();
  }

  clear() {
    this.layer.removeAll(true);
    this.options = [];
  }

  putText(block) {
    this.layer.add(block.objects);
    return block.height;
  }

  heading(y, sub) {
    const d = this.dispute;
    y += this.putText(addContentText(this, this.right, y, d.title_he, d.title_ru, { size: 24, bold: true, color: '#ebcb8b', noHint: true })) + 4;
    if (sub) {
      const label = addUiLabel(this, UI.rx(this.right), y, sub, { size: 14, color: '#a0a8b8', originX: UI.rtl ? 1 : 0 });
      this.layer.add(label);
      y += label.height + 8;
    }
    return y;
  }

  speech(y, speakerKey, he, ru, draft = this.draft, color = '#88c0d0') {
    const sp = this.dispute.speakers[speakerKey];
    y += this.putText(addContentText(this, this.right, y, sp.name_he, sp.name_ru, { size: 16, bold: true, color, noHint: true })) + 2;
    return y + this.putText(addContentText(this, this.right, y, he, ru, { size: 19, width: this.contentWidth, lineSpacing: 6, draft })) + 12;
  }

  paragraph(y, he, ru, opts = {}) {
    return y + this.putText(addContentText(this, this.right, y, he, ru, { size: 17, width: this.contentWidth, lineSpacing: 5, draft: this.draft, ...opts })) + 10;
  }

  button(y, number, he, ru, onSelect, draft = this.draft) {
    const btn = createChoiceButton(this, { rightX: this.right, y, width: this.contentWidth, number, text_he: he, text_ru: ru, onSelect, draft });
    this.layer.add(btn);
    return btn;
  }

  continueButton(y, onSelect) {
    const label = UI.both('dialogue_continue');
    this.options.push(onSelect);
    this.button(y, 1, label.he, label.ru, onSelect, false);
  }

  // Карточки: все четыре; использованные — серые, без номера-действия
  cardList(y, onPick) {
    const cap = addUiLabel(this, UI.rx(this.right), y, UI.t('dispute_cards'), { size: 14, color: '#a0a8b8', originX: UI.rtl ? 1 : 0 });
    this.layer.add(cap);
    y += cap.height + 6;
    this.dispute.cards.forEach((card, i) => {
      const used = this.used.includes(card.id);
      const pick = used ? null : () => onPick(card);
      this.options.push(pick);
      const btn = this.button(y, i + 1, card.title_he, card.title_ru, pick || (() => {}));
      if (used) {
        btn.setAlpha(0.35);
        btn.list[0].disableInteractive();
        const mark = addUiLabel(this, UI.rx(this.margin + 8), y + 4, UI.t('dispute_used'), { size: 12, color: '#ebcb8b', originX: UI.rtl ? 0 : 1 });
        this.layer.add(mark);
      }
      y += btn.height + 6;
    });
    return y;
  }

  // --- ход спора -------------------------------------------------------------

  showObjection(index) {
    const objections = this.dispute.objections;
    const obj = objections[index];
    if (!obj) {
      this.show(() => this.showFinale());
      return;
    }
    this.clear();
    let y = this.heading(20, UI.t('dispute_objection', { n: index + 1, total: objections.length }));
    y = this.speech(y, 'king', obj.text_he, obj.text_ru, this.draft, '#d08770');
    this.cardList(y + 4, (card) => this.answer(card, obj.fit, () => this.show(() => this.showObjection(index + 1))));
  }

  showFinale() {
    const fin = this.dispute.finale;
    this.clear();
    let y = this.heading(20, UI.t('dispute_last_word'));
    y = this.paragraph(y, fin.text_he, fin.text_ru, { color: '#d8dee9' });
    this.cardList(y + 4, (card) => this.answer(card, fin.fit, () => this.show(() => this.showResult()), 1));
  }

  // Выбрана карточка: слова героя и реакция противника
  answer(card, fitMap, next, fallback = 0) {
    const fit = fitMap[card.id] !== undefined ? fitMap[card.id] : fallback;
    this.used.push(card.id);
    this.picks.push({ card: card.id, fit });
    this.score += fit;
    this.show(() => {
      this.clear();
      let y = this.heading(20);
      y = this.speech(y, 'yiftach', card.text_he, card.text_ru);
      const r = this.dispute.reactions[fit];
      y = this.paragraph(y + 4, r.text_he, r.text_ru, { color: fit === 2 ? '#a3be8c' : fit === 1 ? '#ebcb8b' : '#bf616a' });
      this.continueButton(y + 10, next);
    });
  }

  // Итог: шкала и Мерило по сумме; запись в журнал (для Суда карты)
  showResult() {
    const res = this.dispute.result;
    if (!this.applied) {
      this.applied = true;
      const effects = { ...(res.measure.find(([min]) => this.score >= min) || [0, {}])[1] };
      if (res.gauge) effects.gauge = { [res.gauge]: res.base + this.score * res.perPoint };
      this.notes = GameState.applyEffects(effects);
      GameState.logEntry({ type: 'dispute', dispute: this.disputeId, picks: this.picks, score: this.score });
    }
    this.clear();
    let y = this.heading(20);
    y = this.paragraph(y, res.text_he, res.text_ru, { size: 18 });
    (this.notes || []).forEach((note) => {
      const t = addUiLabel(this, UI.rx(this.right), y, note, { size: 16, color: '#a3be8c', originX: UI.rtl ? 1 : 0 });
      this.layer.add(t);
      y += t.height + 4;
    });
    this.continueButton(y + 14, () => this.finish());
  }

  finish() {
    const done = this.dispute.onDone || {};
    if (done.set_flag) GameState.applyEffects({ set_flag: done.set_flag });
    if (done.dialogue) GameState.pendingOverlay = { scene: 'DialogueScene', data: { dialogueId: done.dialogue } };
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
