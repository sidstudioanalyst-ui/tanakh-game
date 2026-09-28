// Раскладка на тач-устройствах: игра на весь экран и перестройка при повороте — на лету.
//
// Логический размер (CONFIG.WIDTH × CONFIG.HEIGHT) выбирается по пропорциям области #game
// (touchLayout в config.js), так что Phaser.Scale.FIT заполняет экран без полос. При повороте
// телефона или изменении окна:
//   1) новый размер → game.scale.setGameSize;
//   2) каждая запущенная сцена (идёт или стоит на паузе под окном) перестраивает свою
//      раскладку: метод relayout(), а если его нет — сцена перезапускается с теми же данными.
// Игровое состояние (GameState: зона, здоровье, вещи, Мерило, флаги) не трогается: GameScene
// не перезапускается, только камера и HUD (GameScene.relayout).
// На компьютере ничего этого нет: 800×600, как всегда.
//
// «На весь экран» (Fullscreen API): иконка в HUD на тач, если браузер это умеет. В Safari на
// iPhone API нет — иконки нет; см. README (добавить на главный экран).
const Layout = {
  get canFullscreen() {
    const el = document.documentElement;
    return !!(CONFIG.TOUCH && document.fullscreenEnabled && el.requestFullscreen);
  },

  get isFullscreen() {
    return !!document.fullscreenElement;
  },

  toggleFullscreen() {
    if (!this.canFullscreen) return;
    if (this.isFullscreen) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  },

  // Следить за размером экрана (вызывается из main.js после создания игры)
  watch(game) {
    this.game = game;
    if (!CONFIG.TOUCH) return;
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.apply(), 120); // поворот присылает несколько resize подряд
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
    document.addEventListener('fullscreenchange', schedule);
    schedule(); // на dev.html экран мог повернуться, пока открыто меню выбора зоны
  },

  // Пересчитать размер и, если он изменился, перестроить сцены
  apply() {
    const game = this.game;
    if (!game || !CONFIG.TOUCH) return false;
    const { w, h } = gameAreaSize();
    const next = touchLayout(w, h);
    if (next.width === CONFIG.WIDTH && next.height === CONFIG.HEIGHT) {
      game.scale.refresh();
      return false;
    }
    CONFIG.WIDTH = next.width;
    CONFIG.HEIGHT = next.height;
    CONFIG.PORTRAIT = next.portrait;
    game.scale.setGameSize(next.width, next.height);
    // сначала игра (под окнами), потом окна поверх неё
    const running = game.scene.getScenes(false).filter((s) => s.sys.isActive() || s.sys.isPaused());
    running.sort((a, b) => (a.scene.key === 'GameScene' ? -1 : b.scene.key === 'GameScene' ? 1 : 0));
    running.forEach((s) => {
      if (s.scene.key === 'BootScene') return;
      if (typeof s.relayout === 'function') s.relayout();
      else s.scene.restart(s.sys.settings.data);
    });
    UI.events.emit('layout-changed');
    return true;
  },
};
