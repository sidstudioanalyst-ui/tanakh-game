// Исправления для Phaser 3.80, подключаются сразу после phaser.min.js.

// 1. RTL-текст «заражает» пул canvas.
//    Text с rtl: true ставит своему canvas dir="rtl" и context.direction = 'rtl'. При уничтожении
//    Phaser возвращает этот canvas в общий CanvasPool, не сбрасывая направление, а обычный
//    (русский/латинский) текст своё направление не задаёт вовсе (initRTL выходит сразу, если не
//    rtl). Следующий такой текст получает canvas из пула и рисуется справа налево — то есть за левым
//    краем: от подписи остаётся кусочек одного символа на пустой плашке (имена NPC, окно диалога —
//    всё, что пересоздаётся при смене языка и на каждой реплике).
//    Сброса направления при уничтожении (как было раньше) мало: браузер может не применить новое
//    dir к canvas, уже снятому со страницы. Поэтому защита в три слоя, независимая от браузера:
//    а) обычный текст сам задаёт направление слева направо перед каждой перерисовкой;
//    б) canvas ивритского текста после уничтожения в пул не возвращается совсем — его больше не
//       получит никакой другой объект (canvas уходит в сборщик мусора);
//    в) в самый момент отрисовки (TextStyle.syncStyle — его Phaser вызывает прямо перед fillText,
//       уже после возможного сброса контекста при смене размера canvas) обычный текст получает
//       direction 'ltr' и textAlign 'left': строка рисуется от левого края при любом направлении,
//       доставшемся canvas, — даже если браузер не применил dir. Ивритскому тексту — 'rtl' и 'right'.
// Версия исправлений — проверить в консоли браузера, что загружен новый код, а не старый из кэша:
//   window.PHASER_FIXES  →  'rtl-canvas-3'
window.PHASER_FIXES = 'rtl-canvas-3';

(function patchRtlCanvasPool() {
  const proto = Phaser.GameObjects.Text.prototype;
  const pool = Phaser.Display.Canvas.CanvasPool.pool;

  const originalUpdateText = proto.updateText;
  proto.updateText = function () {
    if (this.canvas && !(this.style && this.style.rtl)) {
      if (this.canvas.dir !== 'ltr') this.canvas.dir = 'ltr';
      if (this.context && this.context.direction !== 'ltr') this.context.direction = 'ltr';
    }
    return originalUpdateText.apply(this, arguments);
  };

  const styleProto = Phaser.GameObjects.TextStyle.prototype;
  const originalSyncStyle = styleProto.syncStyle;
  styleProto.syncStyle = function (canvas, context) {
    originalSyncStyle.call(this, canvas, context);
    if (this.rtl) {
      // Phaser рисует ивритскую строку от правого края (x = ширина) и ждёт textAlign 'start',
      // то есть правый край при rtl. Явно 'right' — то же самое, но не зависит от состояния,
      // оставленного в контексте прежним (обычным) текстом из пула
      context.direction = 'rtl';
      context.textAlign = 'right';
    } else {
      context.direction = 'ltr';
      context.textAlign = 'left';
    }
  };

  const originalPreDestroy = proto.preDestroy;
  proto.preDestroy = function () {
    const canvas = this.canvas;
    const rtl = !!(this.style && this.style.rtl);
    if (canvas) {
      canvas.dir = 'ltr';
      if (this.context) this.context.direction = 'ltr';
    }
    originalPreDestroy.call(this);
    if (rtl && canvas) {
      const i = pool.findIndex((c) => c.canvas === canvas);
      if (i >= 0) pool.splice(i, 1);
    }
  };
})();
