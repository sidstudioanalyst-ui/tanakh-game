// Точка входа. Сначала дожидаемся шрифта с ивритом: Phaser рисует текст на canvas
// один раз, и если шрифт ещё не загружен, иврит нарисуется запасным шрифтом.
function startGame() {
  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
    backgroundColor: CONFIG.BACKGROUND,
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }, // вид сверху — гравитации нет
        debug: CONFIG.DEBUG,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene, InventoryScene, DialogueScene, TrialScene, MenuScene],
  });
}

// Образец содержит и иврит, и знаки препинания — так грузятся оба подмножества шрифта
const FONT_SAMPLE = 'אבג ה׳ ,.!?"()';
const fontsReady = Promise.all([
  document.fonts.load(`18px ${CONFIG.HEBREW_FONT}`, FONT_SAMPLE),
  document.fonts.load(`bold 18px ${CONFIG.HEBREW_FONT}`, FONT_SAMPLE),
]);
const fontTimeout = new Promise((resolve) => setTimeout(resolve, 3000)); // не ждём вечно

Promise.race([fontsReady, fontTimeout])
  .catch((err) => console.warn('Шрифт с ивритом не загрузился:', err))
  .then(startGame);
