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
    this.layer = this.add.container(0, 0);
    this.draw();

    // золотые кольца, расходящиеся из центра — тот же приём, что у «укрепления духом» (Coordination.js)
    this.ringTimer = this.time.addEvent({ delay: 1400, loop: true, callback: () => this.pulseRing() });
    this.pulseRing();

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      if (['l', 'L', 'b', 'B'].includes(event.key)) return; // язык — своя клавиша, не старт
      this.start();
    });
    this.input.on('pointerdown', () => this.start());
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

    this.startText = addUiText(this, W / 2, cy + 90, UI.t('title_start'), { center: true, size: 15, color: '#d8dee9' });
    this.layer.add(this.startText);
    this.pulseTween = this.tweens.add({ targets: this.startText, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

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

  pulseRing() {
    if (this.started) return;
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const ring = this.add.circle(W / 2, H / 2 - 55, 16).setStrokeStyle(2, 0xebcb8b, 0.5);
    this.layer.add(ring);
    this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 2200, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.ringTimer.remove();
    this.cameras.main.fadeOut(300);
    // первый раз в этом браузере — объяснение (IntroScene) перед игрой; дальше сразу игра
    const next = readStorage('tanakh-game.introSeen') === '1' ? 'GameScene' : 'IntroScene';
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
  }
}
