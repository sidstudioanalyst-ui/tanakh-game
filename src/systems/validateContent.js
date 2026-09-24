// Проверка игровых данных при запуске. Ошибки выводятся в консоль (console.warn)
// и сохраняются в window.CONTENT_PROBLEMS — так опечатку в зоне или диалоге видно сразу.
// Число реплик-черновиков (draft: true) — в window.CONTENT_DRAFTS и в console.info.
function validateContent(cache, uiStrings) {
  const problems = [];
  const warn = (msg) => problems.push(msg);
  const HEBREW = /[א-ת]/;

  const isFloor = (zone, x, y) => {
    const row = zone.tiles[y];
    return !!row && x >= 0 && x < row.length && row[x] === CONFIG.TILES.FLOOR;
  };
  const allGauges = new Set(ALL_MAPS.flatMap((m) => Object.keys(m.gauges || {})));
  const allDoors = new Set(Object.values(ZONES).flatMap((z) => (z.doors || []).map((d) => d.id)));

  ALL_MAPS.forEach((map) => {
    map.zones.forEach((id) => ZONES[id] || warn(`Карта ${map.id}: нет зоны "${id}" (файл src/data/maps/${id}.js подключён?)`));
    if (!map.zones.includes(map.startZone)) warn(`Карта ${map.id}: startZone "${map.startZone}" не входит в zones`);
    if (map.trial && !cache.trial(map.trial)) warn(`Карта ${map.id}: не загружен суд "${map.trial}"`);
    Object.values(map.gauges || {}).forEach((g) => uiStrings && !uiStrings[g.label] && warn(`Карта ${map.id}: нет строки шкалы "${g.label}"`));
  });

  Object.values(ZONES).forEach((zone) => {
    const where = `Зона ${zone.id}`;
    const floor = (x, y, what) => isFloor(zone, x, y) || warn(`${where}: ${what} (${x},${y}) не на полу`);
    const widths = new Set(zone.tiles.map((r) => r.length));
    if (widths.size !== 1) warn(`${where}: строки tiles разной длины`);
    if (!zone.start) warn(`${where}: нет start`);
    else floor(zone.start[0], zone.start[1], 'start');

    (zone.enemies || []).forEach((e) => {
      if (!CONFIG.ENEMY_TYPES[e.type]) warn(`${where}: неизвестный тип врага "${e.type}"`);
      floor(e.x, e.y, `враг ${e.type}`);
    });
    (zone.items || []).forEach((it) => {
      if (!ITEMS[it.id]) warn(`${where}: неизвестный предмет "${it.id}"`);
      floor(it.x, it.y, `предмет ${it.id}`);
    });
    (zone.npcs || []).forEach((n) => {
      if (!cache.dialogue(n.dialogue)) warn(`${where}: не загружен диалог "${n.dialogue}"`);
      floor(n.x, n.y, `NPC ${n.id}`);
    });
    (zone.triggers || []).forEach((t) => {
      if (t.dialogue && !cache.dialogue(t.dialogue)) warn(`${where}: триггер — не загружен диалог "${t.dialogue}"`);
    });
    (zone.doors || []).forEach((d) => d.tiles.forEach(([x, y]) => floor(x, y, `дверь ${d.id}`)));
    (zone.guards || []).forEach((g, i) => {
      floor(g.x, g.y, `страж ${i + 1}`);
      (g.patrol || []).forEach(([x, y]) => floor(x, y, `маршрут стража ${i + 1}`));
    });
    (zone.hazards || []).forEach((h, i) => h.path.forEach(([x, y]) => floor(x, y, `маршрут препятствия ${i + 1}`)));
    if (zone.waves) {
      zone.waves.spawns.forEach(([x, y]) => floor(x, y, 'точка появления волны'));
      zone.waves.list.forEach((w) => CONFIG.ENEMY_TYPES[w.type] || warn(`${where}: волна — неизвестный тип "${w.type}"`));
    }
    (zone.exits || []).forEach((ex) => {
      if (!ex.trial) {
        const target = ZONES[ex.to];
        if (!target) warn(`${where}: выход ведёт в несуществующую зону "${ex.to}"`);
        else if (ex.at && !isFloor(target, ex.at[0], ex.at[1])) warn(`${where}: выход в ${ex.to} — точка at не на полу`);
      }
      [].concat(ex.requires_item || []).forEach((id) => ITEMS[id] || warn(`${where}: выход требует неизвестный предмет "${id}"`));
      if (ex.locked && uiStrings && !uiStrings[ex.locked]) warn(`${where}: нет строки "${ex.locked}" для закрытого выхода`);
      for (let dy = 0; dy < (ex.h || 1); dy++) {
        for (let dx = 0; dx < (ex.w || 1); dx++) floor(ex.x + dx, ex.y + dy, 'тайл выхода');
      }
    });
  });

  const checkEffects = (effects, where) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      if (MEASURES[key] || key === 'set_flag') return;
      if (key === 'give_item') {
        [].concat(value).forEach((id) => ITEMS[id] || warn(`${where}: give_item — нет предмета "${id}"`));
      } else if (key === 'gauge') {
        Object.keys(value).forEach((id) => allGauges.has(id) || warn(`${where}: gauge — нет шкалы "${id}" ни у одной карты`));
      } else if (key === 'open_door') {
        [].concat(value).forEach((id) => allDoors.has(id) || warn(`${where}: open_door — нет двери "${id}"`));
      } else if (key === 'goto_zone') {
        const to = typeof value === 'string' ? value : value.to;
        if (!ZONES[to]) warn(`${where}: goto_zone — нет зоны "${to}"`);
      } else if (key === 'fail_zone') {
        if (uiStrings && !uiStrings[value]) warn(`${where}: fail_zone — нет строки "${value}"`);
      } else {
        warn(`${where}: неизвестный эффект "${key}"`);
      }
    });
  };

  // Иврит обязателен, кроме черновиков (draft: true) — у них обязателен русский
  const checkText = (obj, draft, where) => {
    if (draft) {
      if (!obj.text_ru) warn(`${where}: черновик без text_ru`);
    } else if (!obj.text_he || !HEBREW.test(obj.text_he) || obj.text_he.trim() === CONFIG.DRAFT_TEXT) {
      warn(`${where}: нет иврита в text_he (если текст ещё не готов — поставьте реплике draft: true)`);
    }
  };

  let drafts = 0;
  cache.allDialogues().forEach((dlg) => {
    const ids = new Set(dlg.lines.map((l) => l.id));
    const has = (id) => id === null || id === undefined || ids.has(id);
    if (!ids.has(dlg.start)) warn(`Диалог ${dlg.id}: нет стартовой реплики "${dlg.start}"`);
    (dlg.entry || []).forEach((e) => {
      if (!ids.has(e.node)) warn(`Диалог ${dlg.id}: entry ведёт в несуществующую "${e.node}"`);
      [].concat(e.if_item || [], e.if_missing_item || []).forEach((id) => ITEMS[id] || warn(`Диалог ${dlg.id}: entry — нет предмета "${id}"`));
    });
    dlg.lines.forEach((line) => {
      const where = `Диалог ${dlg.id}/${line.id}`;
      if (line.draft) drafts += 1;
      if (line.style !== 'narration' && !dlg.speakers[line.speaker]) warn(`${where}: неизвестный speaker "${line.speaker}"`);
      checkText(line, line.draft, where);
      if (line.choices) {
        line.choices.forEach((c, i) => {
          if (!has(c.next)) warn(`${where}: выбор ${i + 1} ведёт в несуществующую "${c.next}"`);
          checkText(c, line.draft, `${where}, выбор ${i + 1}`);
          checkEffects(c.effects, `${where}, выбор ${i + 1}`);
        });
      } else if (!has(line.next)) {
        warn(`${where}: next "${line.next}" не найден`);
      }
    });
  });

  cache.allTrials().forEach((trial) => {
    if (!trial.questions || trial.questions.length !== 3) warn(`Суд ${trial.id}: должно быть 3 вопроса`);
    (trial.questions || []).forEach((q, i) => {
      ['for', 'against'].forEach((side) => {
        if (!q[side] || !q[side].text_he) warn(`Суд ${trial.id}, вопрос ${i + 1}: нет аргумента "${side}"`);
        else checkEffects(q[side].effects, `Суд ${trial.id}, вопрос ${i + 1}/${side}`);
      });
    });
  });

  // Строки интерфейса: у каждого ключа есть he и ru с одинаковыми подстановками {имя}
  const params = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  Object.entries(uiStrings || {}).forEach(([key, entry]) => {
    if (key.startsWith('_')) return;
    if (typeof entry.he !== 'string' || typeof entry.ru !== 'string') {
      warn(`Строка ${key}: нужны оба поля he и ru`);
    } else if (params(entry.he) !== params(entry.ru)) {
      warn(`Строка ${key}: подстановки в he и ru не совпадают`);
    }
  });
  Object.values(EQUIPMENT_SLOTS).forEach((k) => uiStrings && !uiStrings[k] && warn(`Слот: нет строки "${k}" в ui-strings.json`));

  problems.forEach((p) => console.warn(`[данные] ${p}`));
  if (drafts) console.info(`[данные] реплик-черновиков без иврита (draft: true): ${drafts}`);
  window.CONTENT_PROBLEMS = problems;
  window.CONTENT_DRAFTS = drafts;
  return problems;
}
