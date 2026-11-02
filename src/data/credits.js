// Титры: список блоков. Каждый блок — заголовок (head_he/head_ru) и строки (text_he/text_ru).
// Показывает CreditsScene (из меню «Титры» и после Суда эпохи). Полная атрибуция графики LPC — CREDITS.md.
const CREDITS = [
  {
    head_he: 'הַמּוֹשִׁיעִים',
    head_ru: 'Спасители',
    big: true,
    lines: [{ text_he: 'תְּקוּפַת הַשּׁוֹפְטִים', text_ru: 'Эпоха Судей' }],
  },
  {
    head_he: 'בְּסִיס הַסִּפּוּר',
    head_ru: 'Основа сюжета',
    lines: [
      { text_he: 'תנ״ך: ספר שופטים וספר שמואל א׳', text_ru: 'Танах: Книга Шофтим и Первая книга Шмуэля' },
      { text_he: 'ספר ישעיהו, ספר דברים', text_ru: 'Книга Йешаяху, Книга Дварим' },
    ],
  },
  {
    head_he: 'יְצִירָה',
    head_ru: 'Создание игры',
    lines: [
      { text_he: 'רַעְיוֹן, עֲלִילָה וְעִצּוּב — SID Studio', text_ru: 'Идея, сюжет и дизайн — SID Studio' },
      { text_he: 'פִּתּוּחַ בְּשִׁתּוּף Claude (Anthropic)', text_ru: 'Разработка совместно с Claude (Anthropic)' },
    ],
  },
  {
    head_he: 'גְּרָפִיקָה',
    head_ru: 'Графика',
    lines: [
      { text_he: 'אֲרִיחֵי הַסְּבִיבָה — Kenney (kenney.nl), CC0', text_ru: 'Тайлы окружения — Kenney (kenney.nl), CC0' },
      { text_he: 'דְּמוּיוֹת — Universal LPC Spritesheet Generator וּמִשְׁתַּתְּפֵי Liberated Pixel Cup', text_ru: 'Персонажи — Universal LPC Spritesheet Generator и участники Liberated Pixel Cup' },
      { text_he: 'דְּמוּיוֹת נוֹסָפוֹת — PixelLab', text_ru: 'Часть персонажей — PixelLab' },
      { text_he: 'הָרְשִׁימָה הַמְּלֵאָה שֶׁל הַיּוֹצְרִים — בַּקּוֹבֶץ CREDITS.md', text_ru: 'Полный список авторов — в файле CREDITS.md' },
    ],
  },
  {
    head_he: 'כְּלִים',
    head_ru: 'Технологии',
    lines: [
      { text_he: 'Phaser 3 — מָנוֹעַ הַמִּשְׂחָק', text_ru: 'Phaser 3 — игровой движок' },
      { text_he: 'Noto Sans Hebrew — SIL Open Font License', text_ru: 'Шрифт Noto Sans Hebrew — SIL Open Font License' },
    ],
  },
  {
    head_he: 'תּוֹדָה',
    head_ru: 'Спасибо',
    lines: [{ text_he: 'שֶׁעֲבַרְתֶּם אֶת הַדֶּרֶךְ עִם הַמּוֹשִׁיעִים', text_ru: 'что прошли этот путь вместе со спасителями' }],
  },
];
