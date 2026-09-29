// Счётчик (зона: tally) — Мерило по числу сделанного: когда поставлено не меньше need флагов из
// списка, один раз применяются effects (как у выбора в диалоге) и ставится флаг flag.
//
//   tally: [{ flags: ['petition_widow_heard', ...], need: 2, effects: { justice: 1 }, flag: 'petitions_counted' }]
//
// Ш1: выслушаны хотя бы двое просителей — +1 свет «справедливости к слабым»;
// Ш2: резче предупредил хотя бы три группы — то же. Игрок ни к чему не обязан: не набрал —
// ничего не происходит, ни тени, ни сообщения.
class TallyMechanic {
  constructor(scene, cfg) {
    this.scene = scene;
    this.list = [].concat(cfg);
  }

  update() {
    this.list.forEach((t) => {
      if (GameState.flags[t.flag]) return;
      const n = t.flags.filter((f) => GameState.flags[f]).length;
      if (n < t.need) return;
      GameState.flags[t.flag] = true;
      GameState.applyEffects(t.effects);
      GameState.logEntry({ type: 'tally', flag: t.flag, count: n });
    });
  }

  hudLine() {
    return null;
  }
}
