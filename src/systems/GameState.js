// Состояние прохождения, которое живёт дольше одной сцены:
// Мерило, экипировка, здоровье, флаги диалогов, шкалы, изменения в зонах, ответы на Суде.
// Переходит из зоны в зону и с карты на карту внутри кампании.
//
// Снимки: в начале карты (для рестарта карты) и при входе в зону (для провала сцены —
// заметила стража, вышло время — и для смерти, если у карты restartOnDeath: 'zone').
//
// События (GameState.events): 'equipment-changed', 'measures-changed', 'gauge-changed'.
const GameState = {
  events: new Phaser.Events.EventEmitter(),

  newGame(campaign = CONFIG.CAMPAIGN) {
    this.campaign = campaign;
    this.mapIndex = 0;
    this.measures = {};
    Object.keys(MEASURES).forEach((key) => {
      this.measures[key] = { light: 0, shadow: 0 };
    });
    this.equipment = new Equipment(() => this.events.emit('equipment-changed'));
    this.flags = {};
    this.gauges = {}; // id шкалы → число (например, warriors — собранные воины)
    this.zones = {}; // zoneId → { removed: ['enemy:0', 'item:1', ...], openDoors: ['gate'] }
    this.trialAnswers = {}; // mapId → ['for' | 'against', ...]
    this.hp = null; // null — полное здоровье
    this.currentZone = null;
    this.pendingZone = null; // переход, заказанный диалогом (goto_zone)
    this.pendingFail = null; // провал сцены, заказанный диалогом (fail_zone)
    this.startMap(0);
  },

  get maps() {
    return CAMPAIGNS[this.campaign];
  },

  get map() {
    return this.maps[this.mapIndex];
  },

  startMap(index) {
    this.mapIndex = index;
    this.currentZone = this.map.startZone;
    this.hp = null;
    Object.keys(this.map.gauges || {}).forEach((id) => {
      if (this.gauges[id] === undefined) this.gauges[id] = 0;
    });
    this.mapSnapshot = this.serialize();
  },

  hasNextMap() {
    return this.mapIndex + 1 < this.maps.length;
  },

  // --- Мерило и шкалы ---------------------------------------------------------

  addMeasure(key, amount) {
    const m = this.measures[key];
    if (amount > 0) m.light += amount;
    else m.shadow += -amount;
    this.events.emit('measures-changed', key);
  },

  addGauge(id, amount) {
    const def = (this.map.gauges || {})[id];
    const max = def ? def.max : Infinity;
    this.gauges[id] = Phaser.Math.Clamp((this.gauges[id] || 0) + amount, 0, max);
    this.events.emit('gauge-changed', id);
  },

  // Применить effects из диалога или Суда. Возвращает строки для всплывающего сообщения.
  //   { wisdom: 1, justice: -1 } — величины Мерила (+ свет, − тень)
  //   give_item: 'id' | ['id', ...]   — выдать предмет
  //   set_flag:  'name' | ['name', …]  — поставить флаг
  //   gauge:     { warriors: 100 }     — изменить шкалу карты
  //   open_door: 'id' | ['id', …]      — открыть дверь в текущей зоне
  //   goto_zone: 'a3' | { to, at }     — перейти в зону, когда диалог закроется
  //   fail_zone: 'fail_searched'       — провалить сцену (ключ строки причины), когда диалог закроется
  applyEffects(effects) {
    const notes = [];
    if (!effects) return notes;
    Object.entries(effects).forEach(([key, value]) => {
      if (MEASURES[key]) {
        this.addMeasure(key, value);
      } else if (key === 'give_item') {
        [].concat(value).forEach((id) => {
          const equipped = this.equipment.pickUp(id);
          notes.push(UI.t(equipped ? 'toast_equipped' : 'toast_to_bag', { item: describeItem(id) }));
        });
      } else if (key === 'set_flag') {
        [].concat(value).forEach((flag) => {
          this.flags[flag] = true;
        });
      } else if (key === 'gauge') {
        Object.entries(value).forEach(([id, amount]) => {
          this.addGauge(id, amount);
          const def = (this.map.gauges || {})[id];
          if (def && amount) notes.push(UI.t('toast_gauge', { label: UI.t(def.label), value: `+${amount}` }));
        });
      } else if (key === 'open_door') {
        [].concat(value).forEach((door) => this.openDoor(this.currentZone, door));
      } else if (key === 'goto_zone') {
        this.pendingZone = typeof value === 'string' ? { to: value } : value;
      } else if (key === 'fail_zone') {
        this.pendingFail = value; // ключ строки с причиной; зона начнётся заново после диалога
      } else {
        console.warn(`Неизвестный эффект "${key}"`);
      }
    });
    return notes;
  },

  // Есть ли при себе оружие — надетое или в сумке (для проверки стражей)
  isArmed() {
    const eq = this.equipment;
    return !!eq.slots.weapon || eq.bag.some((id) => ITEMS[id].slot === 'weapon');
  },

  hasItem(id) {
    const eq = this.equipment;
    return Object.values(eq.slots).includes(id) || eq.bag.includes(id);
  },

  // --- Зоны -----------------------------------------------------------------

  zoneState(zoneId) {
    if (!this.zones[zoneId]) this.zones[zoneId] = { removed: [], openDoors: [] };
    if (!this.zones[zoneId].openDoors) this.zones[zoneId].openDoors = [];
    return this.zones[zoneId];
  },

  isRemoved(zoneId, key) {
    const z = this.zones[zoneId];
    return !!z && z.removed.includes(key);
  },

  markRemoved(zoneId, key) {
    const z = this.zoneState(zoneId);
    if (!z.removed.includes(key)) z.removed.push(key);
  },

  isDoorOpen(zoneId, doorId) {
    const z = this.zones[zoneId];
    return !!z && !!z.openDoors && z.openDoors.includes(doorId);
  },

  openDoor(zoneId, doorId) {
    const z = this.zoneState(zoneId);
    if (!z.openDoors.includes(doorId)) z.openDoors.push(doorId);
    this.events.emit('door-opened', doorId);
  },

  // Вход в зону: запоминаем, откуда вошли, и снимок — чтобы при провале начать зону заново
  enterZone(zoneId, at) {
    this.currentZone = zoneId;
    this.zoneEntry = { zoneId, at: at || null };
    this.zoneSnapshot = this.serialize();
  },

  // --- Снимки ---------------------------------------------------------------

  serialize() {
    return JSON.stringify({
      campaign: this.campaign,
      mapIndex: this.mapIndex,
      measures: this.measures,
      equipment: this.equipment.toJSON(),
      flags: this.flags,
      gauges: this.gauges,
      zones: this.zones,
      trialAnswers: this.trialAnswers,
      hp: this.hp,
    });
  },

  restore(json) {
    const data = JSON.parse(json);
    this.campaign = data.campaign;
    this.mapIndex = data.mapIndex;
    this.measures = data.measures;
    this.equipment.load(data.equipment);
    this.flags = data.flags;
    this.gauges = data.gauges || {};
    this.zones = data.zones;
    this.trialAnswers = data.trialAnswers;
    this.hp = data.hp === undefined ? null : data.hp;
    this.pendingZone = null;
    this.pendingFail = null;
    this.events.emit('measures-changed');
  },

  // Начать карту заново (всё — как было на её начало). Возвращает зону старта.
  restartMap() {
    this.restore(this.mapSnapshot);
    this.hp = null;
    this.currentZone = this.map.startZone;
    return { zoneId: this.currentZone, at: null };
  },

  // Начать текущую зону заново — как было в момент входа в неё
  restartZone() {
    const entry = this.zoneEntry;
    this.restore(this.zoneSnapshot);
    if (this.hp !== null && this.hp <= 0) this.hp = null;
    this.currentZone = entry.zoneId;
    return entry;
  },
};
