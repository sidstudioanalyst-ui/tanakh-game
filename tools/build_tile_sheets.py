#!/usr/bin/env python3
"""Готовит листы тайлов окружения к игровой клетке 32×32 (README «Тайлы окружения»).

Kenney «RPG pack: base set» (assets/tiles/rpg_base_sheet.png) нарисован не пиксель-артом, а
гладко, с тайлом 64×64. Уменьшать его в игре вдвое «через пиксель» (pixelArt: true) — значит
терять тонкие линии, а сглаживание при отрисовке тянет соседние тайлы (лист без зазоров).
Поэтому уменьшаем заранее, каждый тайл отдельно (LANCZOS) — без «подтекания» соседей:
  assets/tiles/rpg_base_sheet.png (20×13 по 64) → assets/tiles/rpg_base_sheet_32.png (20×13 по 32)

Пиксельные наборы (Tiny Town, Roguelike Indoor) так не готовятся: их увеличивает сама игра (×2).
Запуск из корня репозитория: python3 tools/build_tile_sheets.py  (нужен Pillow)
"""
from PIL import Image

SRC = 'assets/tiles/rpg_base_sheet.png'
OUT = 'assets/tiles/rpg_base_sheet_32.png'
TILE, NEW = 64, 32

src = Image.open(SRC).convert('RGBA')
cols, rows = src.width // TILE, src.height // TILE
assert cols * TILE == src.width and rows * TILE == src.height, src.size
out = Image.new('RGBA', (cols * NEW, rows * NEW), (0, 0, 0, 0))
for r in range(rows):
    for c in range(cols):
        tile = src.crop((c * TILE, r * TILE, (c + 1) * TILE, (r + 1) * TILE))
        out.paste(tile.resize((NEW, NEW), Image.LANCZOS), (c * NEW, r * NEW))
out.save(OUT, optimize=True)
print(OUT, out.size)
