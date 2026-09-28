// dev.html: меню выбора старта. Список карт, частей и зон строится из CAMPAIGNS.saviors и ZONES —
// новые зоны появятся в меню сами. Нажатие на пункт запускает игру сразу с этой зоны или Суда,
// без пролога и заставок.
//
// Чтобы середина карты не ломалась, подставляется состояние «как после обычного прохождения»:
// DEV_AFTER[зона] — что игрок обычно получает, пройдя эту зону (флаги, вещи, шкалы). Для старта
// с зоны складывается всё, что даёт путь до неё — включая предыдущие карты (как в игре: флаги
// и вещи переходят с карты на карту). Мерило — пустое.
// DEV_VARIANTS[зона | 'trial:<id карты>'] — если на зону влияет выбор раньше, каждый вариант —
// отдельная кнопка (например, жёсткий или мягкий ответ Эфраиму для Суда карты 2).
//
// Глубокая ссылка для проверок: dev.html?start=a5 · ?start=a5:1 (вариант 2) · ?start=trial:power_a:1
const DEV_AFTER = {
  a1: { flags: ['tribute_taken', 'jediael_done', 'dagger_hidden', 'dagger_right'], items: ['ehud_garment', 'tribute_bag', 'ehud_dagger'] },
  a2: { flags: ['gate_open', 'eglon_done'] },
  a4: { flags: ['young_done', 'farmers_done', 'veteran_done'], items: ['shofar'], gauges: { warriors: 280 } },
  a5: { flags: ['fords_held'] },
  barak_1: { flags: ['barak_task', 'deborah_with'] },
  barak_2: { flags: ['naphtali_done', 'zebulun_done', 'deborah_spoke'], items: ['barak_spear'], gauges: { barak_warriors: 10000 } },
  barak_3: { flags: ['descent_signal', 'sisera_fled'] },
  barak_4: { flags: ['pursuit_seen', 'sisera_found'] },
  g1: { flags: ['angel_done', 'night', 'sortie_alone', 'altar_done', 'morning_done', 'jerubbaal'] },
  g2: { flags: ['laid_1', 'checked_1', 'prayed', 'laid_2', 'fleece_done'] },
  g3: { flags: ['fearful_left', 'army_300'] },
  g4: { flags: ['heard_dream', 'jars_broken', 'signal_full', 'camp_routed'] },
  g5: { flags: ['crossings_held', 'ephraim_done', 'ephraim_soft'] },
  g6: { flags: ['kingship_done', 'kingship_refused', 'ephod_done'] },
  b1: { flags: ['parable_done'] },
  b2: { flags: ['abimelech_done'] },
};

const DEV_VARIANTS = {
  a2: [
    { label: 'кинжал на правом бедре — досмотр у ворот' },
    { label: 'на левом бедре — служебный коридор', removeFlags: ['dagger_right'] },
  ],
  a5: [
    { label: '280 воинов (пропустить можно 3)' },
    { label: 'без воинов (пропустить можно 1)', gauges: { warriors: 0 } },
  ],
  // Барак: пошла ли с ним Двора (в Бр1). Без неё воинов меньше и её реплик нет.
  barak_2: [
    { label: 'Двора идёт с Бараком' },
    { label: 'Барак без Деворы', removeFlags: ['deborah_with'], addFlags: ['barak_alone'] },
  ],
  barak_3: [
    { label: 'с Деворой, 10 000 воинов' },
    { label: 'без Деворы, 7000 воинов', removeFlags: ['deborah_with', 'deborah_spoke'], addFlags: ['barak_alone'], gauges: { barak_warriors: 7000 } },
  ],
  'trial:power_a': [
    { label: 'мягкий ответ Эфраиму — 3 вопроса' },
    { label: 'жёсткий ответ Эфраиму — 4 вопроса', addFlags: ['ephraim_harsh'], removeFlags: ['ephraim_soft'] },
  ],
};

const DEV_CAMPAIGN = 'saviors';
const DEV_LETTERS = { a: 'А', g: 'Г', b: 'Б' };

// «А1», «Г4», «Б2» — из id зоны; если у зоны задан code_ru (Бр1 у barak_1) — он
function devZoneCode(id) {
  if (ZONES[id] && ZONES[id].code_ru) return ZONES[id].code_ru;
  const m = /^([a-z]+)(\d+)$/.exec(id);
  return m ? (DEV_LETTERS[m[1]] || m[1].toUpperCase()) + m[2] : id;
}

// Состояние для старта: всё, что дают зоны до этой точки (и все предыдущие карты), + вариант
function devStateFor(mapIndex, zoneIndex, variant) {
  const flags = new Set();
  const items = [];
  const gauges = {};
  const add = (after) => {
    if (!after) return;
    (after.flags || []).forEach((f) => flags.add(f));
    (after.items || []).forEach((i) => items.push(i));
    Object.assign(gauges, after.gauges || {});
  };
  // часть карты с freshEquipment (Барак): вещи прежнего героя не переходят — как в игре
  const enterPart = (map, zone) => {
    const key = ZONES[zone].part;
    const part = key && map.parts && map.parts[key];
    const flag = `${map.id}_${key}_started`;
    if (!part || !part.freshEquipment || flags.has(flag)) return;
    flags.add(flag);
    items.length = 0;
  };
  CAMPAIGNS[DEV_CAMPAIGN].forEach((map, mi) => {
    if (mi > mapIndex) return;
    const upto = mi < mapIndex ? map.zones.length : zoneIndex;
    map.zones.slice(0, upto).forEach((z) => {
      enterPart(map, z);
      add(DEV_AFTER[z]);
    });
    if (mi === mapIndex && map.zones[zoneIndex]) enterPart(map, map.zones[zoneIndex]);
  });
  if (variant) {
    (variant.addFlags || []).forEach((f) => flags.add(f));
    (variant.removeFlags || []).forEach((f) => flags.delete(f));
    Object.assign(gauges, variant.gauges || {});
  }
  return { flags: [...flags], items, gauges };
}

// Все пункты меню: { key, mapIndex, zone | null (Суд), label, variant }
function devEntries() {
  const list = [];
  CAMPAIGNS[DEV_CAMPAIGN].forEach((map, mapIndex) => {
    map.zones.forEach((zone, zoneIndex) => {
      const variants = DEV_VARIANTS[zone] || [null];
      variants.forEach((v, vi) =>
        list.push({ key: variants.length > 1 ? `${zone}:${vi}` : zone, mapIndex, zone, zoneIndex, variant: v, part: ZONES[zone].part || 'a' })
      );
    });
    const tv = DEV_VARIANTS[`trial:${map.id}`] || [null];
    tv.forEach((v, vi) =>
      list.push({ key: tv.length > 1 ? `trial:${map.id}:${vi}` : `trial:${map.id}`, mapIndex, zone: null, zoneIndex: map.zones.length, variant: v, part: 'trial' })
    );
  });
  return list;
}

// Запуск игры с выбранного пункта
function devStart(entry) {
  window.DEV_START = { ...entry, state: devStateFor(entry.mapIndex, entry.zoneIndex, entry.variant) };
  document.getElementById('dev-menu').style.display = 'none';
  window.gameStartReady.then(startGame);
}

// Вызывается из BootScene вместо обычного начала игры
window.devApplyStart = (boot) => {
  const s = window.DEV_START;
  GameState.newGame(DEV_CAMPAIGN);
  GameState.startMap(s.mapIndex);
  GameState.introQueue = []; // без пролога и заставок
  s.state.flags.forEach((f) => (GameState.flags[f] = true));
  s.state.items.forEach((id) => GameState.equipment.pickUp(id));
  Object.assign(GameState.gauges, s.state.gauges);
  if (!s.zone) {
    boot.scene.start('TrialScene', { trialId: GameState.map.trial });
    return;
  }
  GameState.currentZone = s.zone;
  boot.scene.start('GameScene');
};

// --- меню -------------------------------------------------------------------

function devRenderMenu() {
  const root = document.getElementById('dev-maps');
  root.textContent = '';
  const entries = devEntries();
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  CAMPAIGNS[DEV_CAMPAIGN].forEach((map, mapIndex) => {
    const box = el('div', 'dev-map');
    box.appendChild(el('h2', null, `Карта ${mapIndex + 1}: ${map.name_ru}`));
    let part = null;
    entries
      .filter((e) => e.mapIndex === mapIndex)
      .forEach((e) => {
        if (e.part !== part) {
          part = e.part;
          const partName =
            part === 'trial' ? 'Суд' : part === 'a' ? `Часть А${map.hero ? ` — ${map.hero.name_ru}` : ''}` : (map.parts && map.parts[part] && map.parts[part].name_ru) || `Часть ${part}`;
          box.appendChild(el('h3', null, partName));
        }
        let row = box.lastElementChild;
        const rowKey = e.zone || `trial:${map.id}`;
        if (!row || row.dataset.row !== rowKey) {
          row = el('div', 'dev-entry');
          row.dataset.row = rowKey;
          const name = el('span', 'name');
          if (e.zone) {
            name.textContent = `${devZoneCode(e.zone)} · ${ZONES[e.zone].name_ru}`;
            const he = el('small', null, ZONES[e.zone].name_he);
            he.dir = 'rtl';
            name.appendChild(he);
          } else {
            name.textContent = `Суд карты ${mapIndex + 1}${map.trial ? ` (${map.trial})` : ' — заглушка'}`;
          }
          row.appendChild(name);
          box.appendChild(row);
        }
        const btn = el('button', null, e.variant ? e.variant.label : '▶ старт');
        btn.dataset.start = e.key;
        btn.addEventListener('click', () => devStart(e));
        row.appendChild(btn);
      });
    root.appendChild(box);
  });
}

// Язык — как в игре (иврит / русский / оба), здесь по умолчанию русский; выбор запоминается
function devRenderLang() {
  const root = document.getElementById('dev-lang');
  root.textContent = '';
  [
    ['RU', () => UI.setLanguage('ru'), UI.lang === 'ru'],
    ['עב', () => UI.setLanguage('he', false), UI.lang === 'he' && !UI.bilingual],
    ['עב+RU', () => UI.setLanguage('he', true), UI.lang === 'he' && UI.bilingual],
  ].forEach(([label, fn, on]) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (on) b.className = 'on';
    b.addEventListener('click', () => {
      fn();
      devRenderLang();
    });
    root.appendChild(b);
  });
}

// опечатки в заготовках видны сразу
Object.entries(DEV_AFTER).forEach(([zone, after]) => {
  if (!ZONES[zone]) console.warn(`[dev] DEV_AFTER: нет зоны "${zone}"`);
  (after.items || []).forEach((id) => ITEMS[id] || console.warn(`[dev] DEV_AFTER.${zone}: нет предмета "${id}"`));
});

devRenderLang();
devRenderMenu();

// ?start=<пункт> — сразу начать (для проверок и закладок)
const devAuto = URL_PARAMS.get('start');
if (devAuto) {
  const entry = devEntries().find((e) => e.key === devAuto);
  if (entry) devStart(entry);
  else console.warn(`[dev] нет пункта "${devAuto}"`);
}
