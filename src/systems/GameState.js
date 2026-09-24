// Состояние прохождения, которое живёт дольше одной сцены:
// Мерило, экипировка, здоровье, флаги диалогов, изменения в зонах, ответы на Суде.
// Переходит из зоны в зону и с карты на карту. При смерти восстанавливается снимок,
// сделанный в начале текущей карты.
//
// События (GameState.events): 'equipment-changed', 'measures-changed'.
const GameState = {
  events: new Phaser.Events.EventEmitter(),

  newGame() {
    this.mapIndex = 0;
    this.measures = {};
    Object.keys(MEASURES).forEach((key) => {
      this.measures[key] = { light: 0, shadow: 0 };
    });
    this.equipment = new Equipment(() => this.events.emit('equipment-changed'));
    this.flags = {};
    this.zones = {}; // zoneId → { removed: ['enemy:0', 'item:1', ...] }
    this.trialAnswers = {}; // mapId → ['for' | 'against', ...]
    this.hp = null; // null — полное здоровье
    this.currentZone = null;
    this.startMap(0);
  },

  get map() {
    return MAPS[this.mapIndex];
  },

  startMap(index) {
    this.mapIndex = index;
    this.currentZone = this.map.startZone;
    this.hp = null;
    this.mapSnapshot = this.serialize();
  },

  hasNextMap() {
    return this.mapIndex + 1 < MAPS.length;
  },

  // --- Мерило ---------------------------------------------------------------

  addMeasure(key, amount) {
    const m = this.measures[key];
    if (amount > 0) m.light += amount;
    else m.shadow += -amount;
    this.events.emit('measures-changed', key);
  },

  // Применить effects из диалога или Суда. Возвращает строки для всплывающего сообщения.
  //   { wisdom: 1, justice: -1 } — величины Мерила
  //   give_item: 'id' | ['id', ...] — выдать предмет
  //   set_flag: 'name' | ['name', ...] — поставить флаг (используется в entry диалогов)
  applyEffects(effects) {
    const notes = [];
    if (!effects) return notes;
    Object.entries(effects).forEach(([key, value]) => {
      if (MEASURES[key]) {
        this.addMeasure(key, value);
      } else if (key === 'give_item') {
        [].concat(value).forEach((id) => {
          const equipped = this.equipment.pickUp(id);
          notes.push(`${equipped ? 'Надето' : 'В сумку'}: ${describeItem(id)}`);
        });
      } else if (key === 'set_flag') {
        [].concat(value).forEach((flag) => {
          this.flags[flag] = true;
        });
      } else {
        console.warn(`Неизвестный эффект "${key}"`);
      }
    });
    return notes;
  },

  // --- Зоны -----------------------------------------------------------------

  isRemoved(zoneId, key) {
    const z = this.zones[zoneId];
    return !!z && z.removed.includes(key);
  },

  markRemoved(zoneId, key) {
    if (!this.zones[zoneId]) this.zones[zoneId] = { removed: [] };
    if (!this.zones[zoneId].removed.includes(key)) this.zones[zoneId].removed.push(key);
  },

  // --- Снимок (для рестарта карты после смерти) -----------------------------

  serialize() {
    return JSON.stringify({
      mapIndex: this.mapIndex,
      measures: this.measures,
      equipment: this.equipment.toJSON(),
      flags: this.flags,
      zones: this.zones,
      trialAnswers: this.trialAnswers,
    });
  },

  restore(json) {
    const data = JSON.parse(json);
    this.mapIndex = data.mapIndex;
    this.measures = data.measures;
    this.equipment.load(data.equipment);
    this.flags = data.flags;
    this.zones = data.zones;
    this.trialAnswers = data.trialAnswers;
    this.currentZone = this.map.startZone;
    this.hp = null;
    this.events.emit('measures-changed');
  },

  restartMap() {
    this.restore(this.mapSnapshot);
  },
};
