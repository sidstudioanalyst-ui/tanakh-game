// Переправа «шибболет» (зона: shibboleth) — Й6, броды Иордана (Шофтим 12:5–6).
//
//   shibboleth: {
//     activeFlag: 'ephraim_war',   // после разговора с Эфраимом (часть 1) — начинается переправа
//     at: [x, y],                  // где стоит Йифтах (игрок не ходит, пока идёт переправа)
//     from: [x, y],                // откуда подходят беглецы
//     stop: [x, y],                // где беглец останавливается и говорит слово
//     pass: [x, y],                // куда уходит пропущенный (на другой берег)
//     away: [x, y],                // куда уводят задержанного (за край кадра)
//     list: [{ word: 'sibbolet' | 'shibbolet' | 'stammer' }, ...],  // по порядку
//     decideMs: 3500,              // мягкий срок: не решил — беглец проходит
//     doneFlag, onDone: { dialogue },
//   }
//
// По одному подходят беглецы и произносят слово — оно видно в речевом пузыре: «שִׁבֹּלֶת» или
// «סִבֹּלֶת» (в русском — подпись «шибболет» / «сибболет»). Среди них есть и свои, гилидяне:
// от страха они запинаются («שׁ… שִׁבֹּלֶת»), но слово говорят верно — ошибка возможна в обе
// стороны. Игрок решает: пропустить (1) или задержать (2); на тач — две кнопки.
//   задержан сказавший «сибболет»  — верно (счётчик);
//   задержан сказавший верно      — ошибка: тень «справедливости к слабым»;
//   пропущен сказавший «сибболет» — ошибка в другую сторону, сознательно ни на что не влияет.
// Насилия нет: задержанного уводят за край кадра, экран на миг темнеет, на HUD — счётчик.
class ShibbolethMechanic {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.done = !!GameState.flags[cfg.doneFlag];
    this.active = false;
    this.index = 0;
    this.detained = 0;
    this.detainedWrong = 0; // задержан сказавший верно
    this.passed = 0;
    this.passedWrong = 0; // пропущен сказавший «сибболет» — ни на что не влияет
    this.current = null;
    this.px = ([x, y]) => scene.tileCenter(x, y);
    scene.makeRectTexture('fugitive', 20, 20, 0xa08a6c, 0x2e3440);
  }

  update(time) {
    if (this.done) return;
    if (!this.active) {
      if (GameState.flags[this.cfg.activeFlag]) this.activate(time);
      return;
    }
    const c = this.current;
    // сменили язык или раскладку (поворот телефона): кнопки и пузырь — заново
    if (this.langKey !== `${UI.lang}${UI.bilingual}${CONFIG.WIDTH}x${CONFIG.HEIGHT}`) {
      this.buttons.forEach((o) => o.destroy());
      this.buildButtons();
      this.setButtons(!!(c && c.waiting));
      if (c && c.waiting) {
        c.bubble.forEach((o) => o.destroy());
        this.showBubble(c);
      }
    }
    if (c && c.waiting) {
      const left = Math.max(0, c.deadline - time);
      c.bar.setScale(left / this.cfg.decideMs, 1);
      if (!left) this.decide('pass', true);
    }
  }

  activate(time) {
    const { scene, cfg } = this;
    this.active = true;
    scene.cutscene = true; // стоим у брода: ходьбы нет, только решение
    const p = this.px(cfg.at);
    scene.player.body.reset(p.x, p.y);
    this.buildButtons();
    scene.showToast(UI.t(CONFIG.TOUCH ? 'shibboleth_hint_touch' : 'shibboleth_hint'));
    this.dim = scene.add.rectangle(0, 0, CONFIG.FULLSCREEN_RECT, CONFIG.FULLSCREEN_RECT, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(90);
    const kb = scene.input.keyboard;
    kb.on('keydown-ONE', () => this.decide('pass'));
    kb.on('keydown-TWO', () => this.decide('detain'));
    scene.time.delayedCall(1500, () => this.next());
  }

  // Две кнопки внизу по центру: «Пропустить» и «Задержать» (и мышью, и пальцем)
  buildButtons() {
    const { scene } = this;
    const W = CONFIG.WIDTH;
    const y = CONFIG.HEIGHT - (CONFIG.TOUCH ? 170 : 60);
    const w = Math.min(170, (W - 60) / 2);
    const make = (dx, key, n, color, action) => {
      const x = W / 2 + dx;
      const bg = scene.add.rectangle(x, y, w, 46, 0x2e3440, 0.92).setStrokeStyle(2, color, 0.9).setScrollFactor(0).setDepth(160);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', action);
      bg.isTouchUi = true;
      const label = addUiText(scene, x, y - 10, `${n} · ${UI.t(key)}`, { center: true, size: 15, color: '#eceff4' }).setScrollFactor(0).setDepth(161);
      return [bg, label];
    };
    // в иврите «пропустить» — справа (начало строки), в русском — слева
    const s = UI.rtl ? 1 : -1;
    this.buttons = [
      ...make(s * (w / 2 + 8), 'shibboleth_pass', 1, 0xa3be8c, () => this.decide('pass')),
      ...make(-s * (w / 2 + 8), 'shibboleth_detain', 2, 0xd08770, () => this.decide('detain')),
    ];
    this.setButtons(false);
    this.langKey = `${UI.lang}${UI.bilingual}${CONFIG.WIDTH}x${CONFIG.HEIGHT}`;
  }

  setButtons(on) {
    this.buttons.forEach((o) => o.setVisible(on));
  }

  // Следующий беглец: подходит к броду, останавливается, говорит слово
  next() {
    const { scene, cfg } = this;
    if (this.index >= cfg.list.length) {
      this.finish();
      return;
    }
    const entry = cfg.list[this.index++];
    const from = this.px(cfg.from);
    const stop = this.px(cfg.stop);
    const sprite = scene.add.image(from.x, from.y, 'fugitive').setDepth(6);
    const c = (this.current = { entry, sprite, waiting: false });
    scene.tweens.add({
      targets: sprite,
      x: stop.x,
      y: stop.y,
      duration: 1100,
      onComplete: () => {
        if (this.current !== c) return;
        this.showBubble(c);
        c.waiting = true;
        c.deadline = scene.time.now + cfg.decideMs;
        this.setButtons(true);
      },
    });
  }

  // Речевой пузырь: слово на иврите крупно; в русском и «оба» — подпись под ним
  showBubble(c) {
    const { scene } = this;
    const word = c.entry.word;
    const he = { shibbolet: 'שִׁבֹּלֶת', sibbolet: 'סִבֹּלֶת', stammer: 'שׁ… שִׁבֹּלֶת' }[word];
    const x = c.sprite.x;
    const y = c.sprite.y - 70;
    const parts = [];
    const bubble = scene.add.rectangle(x, y, 150, UI.lang === 'he' && !UI.bilingual ? 44 : 62, 0xeceff4, 0.95).setStrokeStyle(2, 0x2e3440).setDepth(30);
    const tail = scene.add.triangle(x, y + bubble.height / 2 + 6, -8, -6, 8, -6, 0, 6, 0xeceff4, 0.95).setDepth(30);
    const text = addHebrewText(scene, x, y - bubble.height / 2 + 6, he, { size: 24, bold: true, color: '#2e3440' }).setOrigin(0.5, 0).setDepth(31);
    parts.push(bubble, tail, text);
    if (!(UI.lang === 'he' && !UI.bilingual)) {
      const ru = scene.add.text(x, y + bubble.height / 2 - 20, UI.t(`shibboleth_word_${word}`), { fontFamily: 'sans-serif', fontSize: '13px', color: '#4c566a' }).setOrigin(0.5, 0).setDepth(31);
      parts.push(ru);
    }
    // мягкий срок — полоска под пузырём
    const bw = 120;
    parts.push(scene.add.rectangle(x - bw / 2, y + bubble.height / 2 + 16, bw, 5, 0x4c566a, 0.8).setOrigin(0, 0.5).setDepth(30));
    c.bar = scene.add.rectangle(x - bw / 2, y + bubble.height / 2 + 16, bw, 5, 0xebcb8b, 1).setOrigin(0, 0.5).setDepth(31);
    parts.push(c.bar);
    c.bubble = parts;
  }

  decide(choice, timeout = false) {
    const c = this.current;
    if (!c || !c.waiting || this.done) return;
    const { scene, cfg } = this;
    c.waiting = false;
    this.setButtons(false);
    c.bubble.forEach((o) => o.destroy());
    const correctWord = c.entry.word !== 'sibbolet';
    if (choice === 'detain') {
      this.detained += 1;
      if (correctWord) {
        this.detainedWrong += 1;
        GameState.addMeasure('justice', -1);
        scene.showToast(UI.t('shibboleth_wrong'));
      }
      // уводят за край кадра; экран на миг темнеет
      const away = this.px(cfg.away);
      scene.tweens.add({ targets: c.sprite, x: away.x, y: away.y, alpha: 0, duration: 900, onComplete: () => c.sprite.destroy() });
      scene.tweens.add({ targets: this.dim, fillAlpha: 0.55, duration: 350, yoyo: true, hold: 250 });
    } else {
      this.passed += 1;
      if (!correctWord) this.passedWrong += 1;
      const pass = this.px(cfg.pass);
      scene.tweens.add({ targets: c.sprite, x: pass.x, y: pass.y, alpha: 0.2, duration: 1200, onComplete: () => c.sprite.destroy() });
    }
    GameState.logEntry({ type: 'shibboleth', word: c.entry.word, choice, timeout });
    this.current = null;
    scene.time.delayedCall(1300, () => this.next());
  }

  finish() {
    const { scene, cfg } = this;
    this.done = true;
    scene.cutscene = false;
    this.setButtons(false);
    GameState.flags[cfg.doneFlag] = true;
    GameState.logEntry({ type: 'shibboleth_done', detained: this.detained, detainedWrong: this.detainedWrong, passed: this.passed, passedWrong: this.passedWrong });
    scene.refreshExits();
    if (cfg.onDone && cfg.onDone.dialogue) scene.time.delayedCall(900, () => !scene.gameOver && scene.openDialogue(cfg.onDone.dialogue));
  }

  hudLine() {
    if (!this.active || this.done) return null;
    return UI.t('hud_shibboleth', { detained: this.detained, passed: this.passed, left: this.cfg.list.length - this.index + (this.current ? 1 : 0) });
  }
}
