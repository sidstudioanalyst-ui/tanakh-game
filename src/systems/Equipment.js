// Экипировка и сумка игрока. Хранит только id предметов из ITEMS (src/data/items.js).
// onChange вызывается после любого изменения — через него обновляются HUD и здоровье.
class Equipment {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.bag = []; // id предметов, которые не надеты
    this.slots = {};
    Object.keys(EQUIPMENT_SLOTS).forEach((slot) => {
      this.slots[slot] = null;
    });
  }

  // Подобрать предмет: если слот пуст — сразу надеть, иначе положить в сумку.
  // Возвращает true, если предмет надет.
  pickUp(id) {
    const item = ITEMS[id];
    if (!item) {
      console.warn(`Предмет "${id}" не найден в ITEMS`);
      return false;
    }
    if (this.slots[item.slot] === null) {
      this.slots[item.slot] = id;
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
    const { slot } = ITEMS[id];
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

  // Сумма бонуса (damage / defense / maxHp) по всем надетым предметам.
  bonus(stat) {
    return Object.values(this.slots).reduce((sum, id) => sum + ((id && ITEMS[id][stat]) || 0), 0);
  }

  toJSON() {
    return { slots: { ...this.slots }, bag: [...this.bag] };
  }

  load(data) {
    Object.keys(this.slots).forEach((slot) => {
      this.slots[slot] = (data.slots && data.slots[slot]) || null;
    });
    this.bag = [...(data.bag || [])];
    this.onChange();
  }
}

// Короткое описание бонусов предмета: «Посох (+1 урон)».
function describeItem(id) {
  const item = ITEMS[id];
  const parts = [];
  if (item.damage) parts.push(`+${item.damage} урон`);
  if (item.defense) parts.push(`+${item.defense} защита`);
  if (item.maxHp) parts.push(`+${item.maxHp} здоровье`);
  return parts.length ? `${item.name_ru} (${parts.join(', ')})` : item.name_ru;
}
