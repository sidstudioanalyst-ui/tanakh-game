// dev.html: подключить те же скрипты, что и index.html, в том же порядке — список берётся
// из самого index.html, чтобы dev-страницу не приходилось обновлять при новых зонах.
// Phaser уже подключён в dev.html; после движка — меню выбора старта (devStart.js).
fetch('index.html')
  .then((r) => r.text())
  .then((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // пропускаем только сам движок (он уже в dev.html). Не src.includes('phaser'): под такой
    // фильтр попадал и src/utils/phaserFixes.js — dev.html работал без исправлений Phaser
    // (русский текст обрезался после смены языка, см. README «Иврит и RTL»)
    const isEngine = (src) => /(^|\/)phaser(\.min)?\.js(\?|$)/.test(src);
    const srcs = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter((src) => !isEngine(src));
    [...srcs, 'src/dev/devStart.js'].forEach((src) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // выполнять строго по порядку
      document.body.appendChild(s);
    });
  })
  .catch((e) => {
    document.getElementById('dev-maps').textContent = 'Не удалось загрузить index.html: ' + e;
  });
