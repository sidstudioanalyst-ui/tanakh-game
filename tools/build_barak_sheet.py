#!/usr/bin/env python3
"""Собирает спрайт-лист Барака из исходников в assets/characters/barak/.

Исходники: idle/<dir>.png (64×64), walk/<dir>.gif (8 кадров), attack/<Dir>.gif (9 кадров).
Холсты разные: idle 64×64, north 92×92, остальные 88×88, но окно персонажа 64×64 в каждом
кадре стоит ровно по центру холста. Поэтому каждый кадр кладём в ячейку CELL×CELL так, чтобы
центр холста совпал с центром ячейки: окно 64×64 (а с ним ноги) — в одном и том же месте во
всех кадрах и направлениях.

Вторая поправка — линия земли. Рисунок сам по себе ставит ноги чуть по-разному (вид сбоку —
на 77-м пикселе ячейки, спереди — на 79–80, стойка на север — на 76, а ходьба на север — на 79).
Поэтому каждый ряд (одна анимация в одну сторону) сдвигаем по вертикали так, чтобы самая
нижняя точка ног во всём ряду была на GROUND: при смене направления и при остановке ноги не
подпрыгивают.

Раскладка листа (как у LPC: в каждой анимации 4 ряда — вверх, влево, вниз, вправо):
  ряды 0–3  — ходьба, 8 кадров;
  ряды 4–7  — атака, 9 кадров (0 — стартовая поза, 1–8 — замах и удар);
  ряды 8–11 — стойка (idle), 1 кадр.
Диагональные idle (north-east и т. п.) не используются.

Запуск из корня репозитория: python3 tools/build_barak_sheet.py  (нужен Pillow)
"""
from PIL import Image, ImageSequence

SRC = 'assets/characters/barak/'
OUT = SRC + 'barak.png'
CELL = 96
GROUND = 79  # линия земли: нижний пиксель ног в ячейке
COLS = 9
DIRS = ['north', 'west', 'south', 'east']  # порядок LPC: вверх, влево, вниз, вправо


def frames(path):
    return [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(path))]


def attack_path(d):
    return SRC + 'attack/' + d.capitalize() + '.gif'  # в репозитории East.gif, North.gif…


rows = []
rows += [frames(SRC + 'walk/' + d + '.gif') for d in DIRS]
rows += [frames(attack_path(d)) for d in DIRS]
rows += [frames(SRC + 'idle/' + d + '.png') for d in DIRS]

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
sheet.save(OUT, optimize=True)
print(OUT, sheet.size)
