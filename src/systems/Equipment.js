// Экипировка и сумка игрока. Хранит только id предметов из CONFIG.ITEMS.
// onChange вызывается после любого изменения — через него обновляется HUD.
class Equipment {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.bag = []; // id предметов, которые не надеты
    this.slots = {};
    Object.keys(CONFIG.EQUIPMENT_SLOTS).forEach((slot) => {
      this.slots[slot] = null;
    });
  }

  static item(id) {
    return CONFIG.ITEMS[id];
  }

  // Подобрать предмет: если слот пуст — сразу надеть, иначе положить в сумку.
  // Возвращает true, если предмет надет.
  pickUp(id) {
    const { slot } = Equipment.item(id);
    if (this.slots[slot] === null) {
      this.slots[slot] = id;
      this.onChange();
      return true;
    }
    this.bag.push(id);
    this.onChange();
    return false;
  }

  // Надеть предмет из сумки; то, что было надето, уходит в сумку.
  equipFromBag(index) {
    const id = this.bag[index];
    if (!id) return;
    const { slot } = Equipment.item(id);
    const prev = this.slots[slot];
    this.bag.splice(index, 1);
    if (prev) this.bag.push(prev);
    this.slots[slot] = id;
    this.onChange();
  }

  // Снять предмет из слота в сумку.
  unequip(slot) {
    const id = this.slots[slot];
    if (!id) return;
    this.slots[slot] = null;
    this.bag.push(id);
    this.onChange();
  }

  // Сумма бонуса (damage / defense) по всем надетым предметам.
  bonus(stat) {
    return Object.values(this.slots).reduce((sum, id) => sum + ((id && Equipment.item(id)[stat]) || 0), 0);
  }
}

// Короткое описание бонусов предмета: «+1 урон», «+5 защита».
function describeItem(id) {
  const item = CONFIG.ITEMS[id];
  const parts = [];
  if (item.damage) parts.push(`+${item.damage} урон`);
  if (item.defense) parts.push(`+${item.defense} защита`);
  return `${item.name} (${parts.join(', ')})`;
}
