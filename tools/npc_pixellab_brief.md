# Бриф для PixelLab: NPC-спрайты (вместо квадратов)

Цель — заменить цветные квадраты у 11 именных NPC на спрайты, в том же стиле, что уже
использован для Барака и стражи А2 (`assets/characters/barak/`, `guard_spear/`, `guard_sword/`,
`servant_jar/`). Повторите те же настройки стиля/модели в PixelLab, что использовались для них —
по возможности тот же пресет, чтобы персонажи не выбивались визуально.

## Важное отличие от Барака/стражи: эти NPC НЕ ходят и не бьют

В движке (`src/entities/Npc.js`) обычный NPC всегда стоит на месте в одной позе (`showStand`) —
анимация ходьбы ему не нужна вообще, удар тем более. Значит на каждого персонажа нужно
**всего 4 кадра — по одному на направление (север/запад/юг/восток), никаких GIF с ходьбой или
ударом не нужно.**

## Формат файлов

Канвас **64×64**, прозрачный фон (как у `idle/*.png` уже готовых персонажей — см. там же для
сверки масштаба/пропорций персонажа в кадре).

Для каждого персонажа — папка `assets/characters/<id>/idle/` с 4 файлами:

```
assets/characters/<id>/idle/north.png
assets/characters/<id>/idle/west.png
assets/characters/<id>/idle/south.png
assets/characters/<id>/idle/east.png
```

(`south` = лицом к игроку/вниз — это самый важный ракурс, он виден чаще всего; `north` — спиной,
нужен реже, но для полноты желателен).

## Список персонажей — 7 дизайнов на 11 слотов

Несколько NPC — это разные делегации старейшин с одной и той же ролью в сюжете: чтобы не
плодить 6 почти одинаковых дизайнов, одна и та же арт-основа «старец/старейшина» переиспользуется
для всех шести — игра и так подписывает имя над головой, так что визуальное сходство разных
делегаций старейшин не путает игрока.

| id (папка) | Кому идёт | Промпт для PixelLab |
|---|---|---|
| `elder` | `elder_avidan`, `elder_jediael` (А1), `naphtali`, `zebulun` (Бр2), `gilead_elders` (Й1), `israel_elders` (Ш1) | Elderly Israelite tribal elder, long grey beard, simple earth-tone robe (undyed wool/linen), wooden walking staff, sandals. Bronze Age / early Iron Age Levant clothing — no armor, no royal regalia. Dignified, calm stance. |
| `eglon` | `eglon` (А2) — царь Моава | Obese Moabite king, Bronze Age royal robe (rich purple/red dyed cloth), gold arm bands, seated or standing heavily, double chin, imposing but soft-bodied figure (Judges 3:17 — "a very fat man"). No crown spikes — ancient Near Eastern royal headcloth instead. |
| `deborah` | `deborah` (Бр1, Бр2) | Israelite prophetess and judge, woman, modest long robe, head covering/scarf, confident upright posture, no weapon — she is a spiritual/legal authority, not a warrior. |
| `yael` | `yael` (Бр4) | Kenite nomadic woman, practical tent-dweller's clothing (plain wool dress, headscarf), sturdy build — she lives among tent-herding Kenites, not a city dweller. No weapon visible by default (the tent peg/mallet from her story is a dialogue prop, not needed in the standing sprite). |
| `angel` | `angel` (Г1) | IMPORTANT: in the text (Shoftim 6:11-22) Gideon does NOT recognize him as divine at first — he looks like an ordinary traveler/man sitting under a tree, not glowing or winged. Plain but slightly finer robe than a farmer, walking staff, calm/still posture. Subtle dignity, not overt divinity — avoid halos, wings, glowing effects. |
| `servant_young` | `father_servants` (Г1) — слуги Иоаша | Young Israelite farmhand/servant, simple short tunic, rolled-up sleeves, practical worker's build — a farmer's household servant, not a soldier. |
| `envoy` | `yiftach_envoys` (Й2) — послы аммонитян | Ammonite diplomatic envoy/messenger, foreign (non-Israelite) tribal dress — distinguish from Israelite elders with different robe trim/color and a travel cloak, conveys "messenger from a rival kingdom," no weapon (he's here to negotiate/threaten with words, not fight). |

## Что делать с результатом

Скачанные PNG положите в папки как в таблице выше (`assets/characters/<id>/idle/<dir>.png`), 4
файла на персонажа — 28 файлов всего. Когда пришлёте — я:
1. раскомментирую соответствующие записи в `tools/build_character_sheets.py` (уже подготовлены,
   помечены `stand_only: True`) и соберу итоговые листы;
2. добавлю записи в `CONFIG.CHARACTER_SPRITES` (src/config.js);
3. пропишу `sprite: '<id>'` каждому NPC в соответствующих файлах `src/data/maps/*.js`;
4. дополню `CREDITS.md`, если потребуется (для PixelLab-арта атрибуция не нужна, в отличие от
   LPC-слоёв героев).

Можно присылать не всё сразу — по мере готовности, я буду подключать partиями.
