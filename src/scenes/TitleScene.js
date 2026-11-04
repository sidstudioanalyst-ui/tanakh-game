// Заставка игры — первый экран после загрузки (src/main.js: BootScene → TitleScene →
// IntroScene (первый раз в браузере) → GameScene). Название игры, лёгкая анимация и
// «нажми, чтобы начать». Без выбора — кампания и язык уже определены в BootScene
// (CONFIG.CAMPAIGN, ?zone= и т. п.), это просто титульный экран.
// На dev.html и при ?zone= (отладочный прямой старт) эта сцена не показывается — см. BootScene.
class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    GameAudio.music('title');
    this.cameras.main.setBackgroundColor('#1b1f27');
    this.cameras.main.fadeIn(400);
    this.started = false;
    this.save = GameState.readSave(); // есть сохранение — «Продолжить» и «Новая игра» вместо «Нажмите, чтобы начать»
    this.layer = this.add.container(0, 0);
    this.draw();

    // золотые кольца, расходящиеся из центра — тот же приём, что у «укрепления духом» (Coordination.js)
    this.ringTimer = this.time.addEvent({ delay: 1400, loop: true, callback: () => this.pulseRing() });
    this.pulseRing();

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      if (['l', 'L', 'b', 'B'].includes(event.key)) return; // язык — своя клавиша, не старт
      if (!this.save) return this.start();
      // со сохранением: Enter/Пробел/C — продолжить, N — новая игра
      if (['Enter', ' ', 'c', 'C'].includes(event.key)) this.start(true);
      else if (['n', 'N'].includes(event.key)) this.start(false);
    });
    this.input.on('pointerdown', () => !this.save && this.start());
    bindLanguageKeys(this, () => this.draw());
  }

  relayout() {
    this.draw();
  }

  draw() {
    this.layer.removeAll(true);
    if (this.pulseTween) this.pulseTween.remove(); // текст пересоздан (смена языка) — старый твин не нужен
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const cy = H / 2;

    const name = addUiText(this, W / 2, cy - 70, UI.t('title_name'), { center: true, size: 34, bold: true, color: '#ebcb8b' });
    this.layer.add(name);

    const sub = addUiText(this, W / 2, cy - 18, UI.t('title_subtitle'), { center: true, size: 15, color: '#88c0d0' });
    this.layer.add(sub);

    if (this.save) {
      this.drawSaveButtons(cy + 62);
    } else {
      this.startText = addUiText(this, W / 2, cy + 90, UI.t('title_start'), { center: true, size: 15, color: '#d8dee9' });
      this.layer.add(this.startText);
      this.pulseTween = this.tweens.add({ targets: this.startText, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    if (!CONFIG.TOUCH) {
      const hint = addUiText(this, W / 2, H - 28, UI.t('title_lang_hint'), { center: true, size: 11, color: '#4c566a' });
      this.layer.add(hint);
    }

    // Логотип студии — внизу, на светлой плашке (чёрный знак на тёмном фоне не виден)
    if (this.textures.exists('logo-sm')) {
      const logoW = Math.min(180, W * 0.45);
      const logo = this.add.image(W / 2, 0, 'logo-sm').setOrigin(0.5, 0);
      logo.setScale(logoW / logo.width);
      const top = Math.max(cy + 135, H - 28 - 22 - logo.displayHeight - 24);
      logo.y = top + 6;
      const plate = this.add.graphics();
      plate.fillStyle(0xffffff, 0.96).fillRoundedRect(W / 2 - logoW / 2 - 8, top, logoW + 16, logo.displayHeight + 12, 8);
      this.layer.add([plate, logo]);
    }
  }

  // «Продолжить» (с названием зоны) и «Новая игра» — две кнопки; тач и мышь — по кнопке, клавиши — C / N
  drawSaveButtons(y) {
    const W = CONFIG.WIDTH;
    const bw = Math.min(300, W - 40);
    const zone = ZONES[this.save.zoneEntry.zoneId];
    const where = zone ? UI.pick(zone, 'name') : '';
    const make = (cy, label, sub, color, onTap) => {
      const bg = this.add.rectangle(W / 2, cy, bw, sub ? 52 : 40, 0x3b4252).setStrokeStyle(2, color);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
      bg.on('pointerover', () => bg.setFillStyle(0x4c566a));
      bg.on('pointerout', () => bg.setFillStyle(0x3b4252));
      // у текста точка привязки — верхний край: ставим по высоте строки, а не по центру кнопки
      const t = addUiText(this, W / 2, cy - (sub ? 21 : 11), label, { center: true, size: 16, bold: true, color: '#eceff4' });
      this.layer.add([bg, t]);
      if (sub) this.layer.add(addUiText(this, W / 2, cy + 3, sub, { center: true, size: 11, color: '#a0a8b8', width: bw - 16 }));
    };
    make(y + 6, UI.t('title_continue'), where, 0xebcb8b, () => this.start(true));
    make(y + 72, UI.t('title_new_game'), '', 0x4c566a, () => this.start(false));
  }

  pulseRing() {
    if (this.started) return;
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const ring = this.add.circle(W / 2, H / 2 - 55, 16).setStrokeStyle(2, 0xebcb8b, 0.5);
    this.layer.add(ring);
    this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 2200, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
  }

  // resume: true — загрузить сохранение (сразу в игру), иначе — новая игра (объяснение один раз на браузер)
  start(resume = false) {
    if (this.started) return;
    this.started = true;
    this.ringTimer.remove();
    this.cameras.main.fadeOut(300);
    if (resume) {
      const entry = GameState.loadSave();
      if (entry) {
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene', { zoneId: entry.zoneId, at: entry.at }));
        return;
      }
    }
    // первый раз в этом браузере — объяснение (IntroScene) перед игрой; дальше сразу игра
    const next = readStorage('tanakh-game.introSeen') === '1' ? 'GameScene' : 'IntroScene';
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
  }
}
