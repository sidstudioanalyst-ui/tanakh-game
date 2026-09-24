// Проверка игровых данных при запуске. Ошибки выводятся в консоль (console.warn)
// и сохраняются в window.CONTENT_PROBLEMS — так опечатку в зоне или диалоге видно сразу.
function validateContent(cache, uiStrings) {
  const problems = [];
  const warn = (msg) => problems.push(msg);

  const isFloor = (zone, x, y) => {
    const row = zone.tiles[y];
    return !!row && x >= 0 && x < row.length && row[x] !== CONFIG.TILES.WALL;
  };

  MAPS.forEach((map) => {
    map.zones.forEach((id) => ZONES[id] || warn(`Карта ${map.id}: нет зоны "${id}" (файл src/data/maps/${id}.js подключён?)`));
    if (!map.zones.includes(map.startZone)) warn(`Карта ${map.id}: startZone "${map.startZone}" не входит в zones`);
    if (!cache.trial(map.trial)) warn(`Карта ${map.id}: не загружен суд "${map.trial}"`);
  });

  Object.values(ZONES).forEach((zone) => {
    const where = `Зона ${zone.id}`;
    const widths = new Set(zone.tiles.map((r) => r.length));
    if (widths.size !== 1) warn(`${where}: строки tiles разной длины`);
    if (!zone.start || !isFloor(zone, zone.start[0], zone.start[1])) warn(`${where}: start не на полу`);

    (zone.enemies || []).forEach((e) => {
      if (!CONFIG.ENEMY_TYPES[e.type]) warn(`${where}: неизвестный тип врага "${e.type}"`);
      if (!isFloor(zone, e.x, e.y)) warn(`${where}: враг ${e.type} (${e.x},${e.y}) не на полу`);
    });
    (zone.items || []).forEach((it) => {
      if (!ITEMS[it.id]) warn(`${where}: неизвестный предмет "${it.id}"`);
      if (!isFloor(zone, it.x, it.y)) warn(`${where}: предмет ${it.id} (${it.x},${it.y}) не на полу`);
    });
    (zone.npcs || []).forEach((n) => {
      if (!cache.dialogue(n.dialogue)) warn(`${where}: не загружен диалог "${n.dialogue}"`);
      if (!isFloor(zone, n.x, n.y)) warn(`${where}: NPC ${n.id} (${n.x},${n.y}) не на полу`);
    });
    (zone.exits || []).forEach((ex) => {
      if (!ex.trial) {
        const target = ZONES[ex.to];
        if (!target) warn(`${where}: выход ведёт в несуществующую зону "${ex.to}"`);
        else if (!ex.at || !isFloor(target, ex.at[0], ex.at[1])) warn(`${where}: выход в ${ex.to} — точка at не на полу`);
      }
      for (let dy = 0; dy < (ex.h || 1); dy++) {
        for (let dx = 0; dx < (ex.w || 1); dx++) {
          if (!isFloor(zone, ex.x + dx, ex.y + dy)) warn(`${where}: тайл выхода (${ex.x + dx},${ex.y + dy}) — стена`);
        }
      }
    });
  });

  const checkEffects = (effects, where) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      if (MEASURES[key] || key === 'set_flag') return;
      if (key === 'give_item') {
        [].concat(value).forEach((id) => ITEMS[id] || warn(`${where}: give_item — нет предмета "${id}"`));
        return;
      }
      warn(`${where}: неизвестный эффект "${key}"`);
    });
  };

  cache.allDialogues().forEach((dlg) => {
    const ids = new Set(dlg.lines.map((l) => l.id));
    const has = (id) => id === null || id === undefined || ids.has(id);
    if (!ids.has(dlg.start)) warn(`Диалог ${dlg.id}: нет стартовой реплики "${dlg.start}"`);
    (dlg.entry || []).forEach((e) => ids.has(e.node) || warn(`Диалог ${dlg.id}: entry ведёт в несуществующую "${e.node}"`));
    dlg.lines.forEach((line) => {
      const where = `Диалог ${dlg.id}/${line.id}`;
      if (!dlg.speakers[line.speaker]) warn(`${where}: неизвестный speaker "${line.speaker}"`);
      if (!line.text_he) warn(`${where}: нет text_he`);
      if (line.choices) {
        line.choices.forEach((c, i) => {
          if (!has(c.next)) warn(`${where}: выбор ${i + 1} ведёт в несуществующую "${c.next}"`);
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
  window.CONTENT_PROBLEMS = problems;
  return problems;
}
