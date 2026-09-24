// Исправления для Phaser 3.80, подключаются сразу после phaser.min.js.

// 1. RTL-текст «заражает» пул canvas.
//    Text с rtl: true ставит своему canvas dir="rtl" и context.direction = 'rtl'. При уничтожении
//    Phaser возвращает этот canvas в общий CanvasPool, не сбрасывая направление. Следующий обычный
//    (русский/латинский) текст получает canvas из пула и рисуется справа налево — то есть за левым
//    краем: подписи пропадают или обрезаются. Сбрасываем направление перед возвратом в пул.
(function patchRtlCanvasPool() {
  const proto = Phaser.GameObjects.Text.prototype;
  const originalPreDestroy = proto.preDestroy;
  proto.preDestroy = function () {
    if (this.canvas) {
      this.canvas.dir = 'ltr';
      if (this.context) this.context.direction = 'ltr';
    }
    originalPreDestroy.call(this);
  };
})();
