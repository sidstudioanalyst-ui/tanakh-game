// Доступ к загруженным JSON-данным (диалоги и суды). Заполняется в BootScene.
const Content = {
  cache: null,
  dialogueIds: [],
  trialIds: [],
  dialogue(id) {
    return this.cache.get(`dialogue:${id}`);
  },
  trial(id) {
    return this.cache.get(`trial:${id}`);
  },
  allDialogues() {
    return this.dialogueIds.map((id) => this.dialogue(id)).filter(Boolean);
  },
  allTrials() {
    return this.trialIds.map((id) => this.trial(id)).filter(Boolean);
  },
};

// Загрузка: собирает, какие диалоги и суды нужны зонам и картам, грузит их JSON,
// проверяет данные и запускает игру.
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const status = this.add
      // Строки интерфейса ещё не загружены — поэтому экран загрузки двуязычный прямо в коде
      .text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'טוֹעֵן… / Загрузка…', { fontFamily: CONFIG.HEBREW_FONT, fontSize: '18px', color: '#d8dee9' })
      .setOrigin(0.5);

    // Все диалоги, на которые ссылаются зоны: у NPC, триггеров, onEnter, onDone механик…
    const dialogueIds = new Set();
    Object.values(ZONES).forEach((zone) => zoneDialogueIds(zone).forEach((id) => dialogueIds.add(id)));
    introDialogueIds().forEach((id) => dialogueIds.add(id)); // пролог и заставки карт
    // диалог после диспута (onDone.dialogue)
    Object.values(DISPUTES).forEach((d) => d.onDone && d.onDone.dialogue && dialogueIds.add(d.onDone.dialogue));
    Content.dialogueIds = [...dialogueIds];
    Content.trialIds = [...new Set([...ALL_MAPS.map((m) => m.trial), ...Object.values(EPOCH_TRIALS)].filter(Boolean))];

    this.load.json('ui-strings', 'src/data/ui-strings.json');
    // Иконки тач-интерфейса (SVG): меч на кнопке атаки, ладонь — действие, сумка, меню
    if (CONFIG.TOUCH) {
      ['sword', 'hand', 'bag', 'menu', 'dodge', 'shield', 'fullscreen'].forEach((name) => this.load.svg(`icon-${name}`, `assets/ui/${name}.svg`, { width: 96, height: 96 }));
    }
    // Спрайт-листы героев (CONFIG.CHARACTER_SPRITES): ключ текстуры — hero-<id>
    Object.entries(CONFIG.CHARACTER_SPRITES).forEach(([id, sp]) =>
      this.load.spritesheet(`hero-${id}`, sp.file, { frameWidth: sp.frame, frameHeight: sp.frame })
    );
    Content.dialogueIds.forEach((id) => this.load.json(`dialogue:${id}`, `src/data/dialogues/${id}.json`));
    Content.trialIds.forEach((id) => this.load.json(`trial:${id}`, `src/data/trials/${id}.json`));

    this.loadFailed = [];
    this.load.on('loaderror', (file) => {
      // без спрайта героя игра идёт дальше — с цветным квадратом
      if (file.type === 'spritesheet') console.warn('Спрайт не загружен, будет квадрат:', file.src);
      else this.loadFailed.push(file.src);
    });
    this.load.on('complete', () => {
      if (this.loadFailed.length) {
        status.setText(
          'לֹא נִתָּן לִטְעֹן אֶת נְתוּנֵי הַמִּשְׂחָק.\n' +
            'Не удалось загрузить данные:\n' +
            this.loadFailed.join('\n') +
            '\n\nJSON не грузится при открытии файла напрямую (file://).\n' +
            'Запустите через веб-сервер — см. README.'
        );
        status.setFontSize(14).setAlign('center');
      }
    });
  }

  create() {
    if (this.loadFailed.length) return;
    Content.cache = this.cache.json;
    UI.load(this.cache.json.get('ui-strings'));
    validateContent(Content, UI.strings);

    // dev.html: старт с выбранной в меню зоны или Суда, с подставленными флагами и вещами
    if (window.DEV_MODE && window.devApplyStart) {
      window.devApplyStart(this);
      return;
    }

    GameState.newGame(CONFIG.CAMPAIGN);

    // ?zone=<id> — начать с конкретной зоны (удобно для отладки). Кампания и карта
    // определяются по зоне, так что ?zone=field сам переключит на демо.
    if (CONFIG.START_ZONE && ZONES[CONFIG.START_ZONE]) {
      Object.entries(CAMPAIGNS).some(([campaign, maps]) => {
        const index = maps.findIndex((m) => m.zones.includes(CONFIG.START_ZONE));
        if (index < 0) return false;
        GameState.newGame(campaign);
        GameState.startMap(index);
        GameState.currentZone = CONFIG.START_ZONE;
        // пролог — только при обычном старте; заставка — если зона стартовая для карты
        GameState.introQueue = CONFIG.START_ZONE === GameState.map.startZone ? GameState.introQueue.filter((i) => !i.prologue) : [];
        return true;
      });
    }

    this.scene.start('GameScene');
  }
}
