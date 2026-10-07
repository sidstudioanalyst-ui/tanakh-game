#!/usr/bin/env python3
"""Собирает спрайт-листы персонажей из исходников (кадры PNG и GIF) — README «Спрайт Барака».

Исходники одного персонажа: idle/<dir>.png (стойка), walk/*.gif (ходьба), attack/*.gif (удар),
по одному файлу на направление (north, west, south, east; диагональные idle не используются).
Холсты кадров бывают разные (64×64, 84×84, 88×88, 92×92), но окно персонажа 64×64 в каждом
кадре стоит ровно по центру холста. Поэтому каждый кадр кладём в ячейку CELL×CELL так, чтобы
центр холста совпал с центром ячейки: окно 64×64 — в одном и том же месте во всех кадрах.

Вторая поправка — линия земли. Рисунок сам по себе ставит ноги чуть по-разному (вид сбоку и
спереди, стойка и ходьба), поэтому каждый ряд (одна анимация в одну сторону) сдвигаем по
вертикали так, чтобы самая нижняя точка ног во всём ряду была на GROUND: при смене
направления и при остановке ноги не подпрыгивают.

Раскладка листа (как у LPC: в каждой анимации 4 ряда — вверх, влево, вниз, вправо):
  ряды 0–3  — ходьба; ряды 4–7 — удар; ряды 8–11 — стойка (1 кадр).
Число кадров — сколько в GIF (Барак: ходьба 8, удар 9; копейщик: ходьба 6, удар 9), если у
персонажа не задан attack_frames — срез кадров удара (мечник: в лист идут только кадры 5–9 из 9;
кадры 1–4 — брак генерации, бег с опущенным мечом, — в лист не попадают вовсе).

Запуск из корня репозитория: python3 tools/build_character_sheets.py  (нужен Pillow)
"""
from PIL import Image, ImageSequence

CELL = 96
COLS = 9
GROUND = 79  # линия земли: нижний пиксель ног в ячейке
DIRS = ['north', 'west', 'south', 'east']  # порядок LPC: вверх, влево, вниз, вправо

# Персонаж → папка, имена файлов по направлениям ({d} — north…, {D} — North…), итоговый лист
CHARACTERS = {
    'barak': {
        'dir': 'assets/characters/barak/',
        'walk': 'walk/{d}.gif',
        'attack': 'attack/{D}.gif',
        'idle': 'idle/{d}.png',
        'out': 'barak.png',
    },
    # стражник дворца Эглона с копьём (А2)
    'guard_spear': {
        'dir': 'assets/characters/guard_spear/',
        'walk': 'walk/-_walk_{d}.gif',
        'attack': 'attack/-_custom-_thrusting_a_spear_forward_in_{d}.gif',
        'idle': 'idle/{d}.png',
        'out': 'guard_spear.png',
    },
    # стражник дворца Эглона с мечом (А2). Удар: из 9 кадров GIF только 5–9 (боевая стойка,
    # замах над головой, удар по дуге вниз-вперёд); 1–4 — бег с мечом вниз, брак генерации
    'guard_sword': {
        'dir': 'assets/characters/guard_sword/',
        'walk': 'walk/-_v3_walking_{d}.gif',
        'attack': 'attack/-_custom-swinging_a_sword_in_a_horizont_{d}.gif',
        'attack_frames': (4, 9),
        'idle': 'idle/{d}.png',
        'out': 'guard_sword.png',
    },
}


def frames(path):
    return [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(path))]


def build(spec):
    name = lambda kind, d: spec['dir'] + spec[kind].format(d=d, D=d.capitalize())
    rows = [frames(name('walk', d)) for d in DIRS]
    a, b = spec.get('attack_frames', (0, COLS))
    rows += [frames(name('attack', d))[a:b] for d in DIRS]
    rows += [frames(name('idle', d)) for d in DIRS]
    sheet = Image.new('RGBA', (CELL * COLS, CELL * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        assert len(row) <= COLS, (r, len(row))
        for f in row:
            assert f.width == f.height and (CELL - f.width) % 2 == 0, f.size
        off = [(CELL - f.width) // 2 for f in row]  # центр холста кадра → центр ячейки
        feet = max(f.split()[3].getbbox()[3] + o for f, o in zip(row, off))  # нижняя точка ряда
        dy = GROUND - feet
        for c, (f, o) in enumerate(zip(row, off)):
            sheet.alpha_composite(f, (c * CELL + o, r * CELL + o + dy))
    out = spec['dir'] + spec['out']
    sheet.save(out, optimize=True)
    print(out, sheet.size, 'кадров в рядах:', [len(r) for r in rows])


for spec in CHARACTERS.values():
    build(spec)
