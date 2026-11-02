#!/usr/bin/env python3
"""Собирает спрайты декора (assets/props/*.png), которыми заменены цветные заглушки на картах
Йифтаха (Й1–Й3), Шмуэля (Ш1, Ш2), Бр4 и Г6.

Исходники — то, что уже лежит в репозитории: тайлы assets/tiles/tiny_town_packed.png (дома,
забор, указатель, каменная площадка), стойки персонажей assets/characters/<имя>/idle/south.png
(толпы людей, жители деревни), колесница assets/characters/chariot/idle/east.png. Остальное
(поля, виноградник, оливы, овцы, щит, дорога) нарисовано здесь же по пикселям.

Запуск из корня репозитория: python3 tools/build_prop_sprites.py  (нужен Pillow)
Подключение — поле icon у props зоны (GameScene.buildProps) и у members деревни (Village.js).
"""
import os
from PIL import Image, ImageDraw

OUT = 'assets/props/'
TT = Image.open('assets/tiles/tiny_town_packed.png').convert('RGBA')  # 12 колонок × 11 рядов по 16 px


def tile(i):
    r, c = divmod(i, 12)
    return TT.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))


def compose(rows, scale=2):
    """rows — список рядов из индексов тайлов tiny_town (None — пусто)."""
    img = Image.new('RGBA', (16 * len(rows[0]), 16 * len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, i in enumerate(row):
            if i is not None:
                img.alpha_composite(tile(i), (x * 16, y * 16))
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


def save(img, name):
    img.save(OUT + name)
    print(name, img.size)


def figure(name, scale):
    """Стойка персонажа (вид спереди), обрезана по контуру и уменьшена."""
    im = Image.open(f'assets/characters/{name}/idle/south.png').convert('RGBA')
    im = im.crop(im.getbbox())
    w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    return im.resize((w, h), Image.BOX)


def crowd(names, scale, step, rows=1, row_dy=14, row_dx=0):
    figs = [figure(n, scale) for n in names]
    per = -(-len(figs) // rows)
    h = max(f.height for f in figs)
    W = step * (per - 1) + max(f.width for f in figs) + row_dx * (rows - 1)
    H = h + row_dy * (rows - 1)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i, f in enumerate(figs):
        r, c = divmod(i, per)
        # задний ряд (r=0) рисуется первым — передний его перекрывает
        x = c * step + row_dx * r
        y = row_dy * r + (h - f.height)
        img.alpha_composite(f, (x, y))
    return img


# --- дома, забор, указатель, площадка (tiny_town) ---
save(compose([[60, 61, 62], [72, 73, 74]]), 'house_blue_s.png')  # 3×2 тайла (Мицпе)
save(compose([[48, 49, 50], [60, 61, 62], [72, 73, 74]]), 'house_blue.png')  # 3×3 (дом Шмуэля)
save(compose([[52, 53, 54], [64, 65, 66], [76, 77, 78]]), 'house_red.png')  # 3×3 (царский дом)
save(compose([[83]]), 'sign.png')
save(compose([[96, 97, 98], [120, 121, 122]]), 'court_stone.png')  # место суда
# царский загон: два ряда горизонтального забора и доска-калитка
save(compose([[80, 81, 82], [None, None, None], [80, 81, 82]]), 'pen.png')

# --- колесницы царя: две колесницы друг за другом (вид сбоку) ---
ch = Image.open('assets/characters/chariot/idle/east.png').convert('RGBA')
ch = ch.crop(ch.getbbox())
ch = ch.resize((round(ch.width * 0.75), round(ch.height * 0.75)), Image.BOX)
cw = Image.new('RGBA', (ch.width * 2 - 6, ch.height + 10), (0, 0, 0, 0))
cw.alpha_composite(ch, (0, 0))
cw.alpha_composite(ch, (ch.width - 6, 10))
save(cw, 'chariots_royal.png')

# --- толпы ---
save(crowd(['guard_spear', 'worker', 'servant_young', 'shepherd', 'ephraim_young'], 0.7, 28), 'crowd_yiftach.png')
save(crowd(['elder', 'widow', 'worker', 'shepherd', 'servant_young', 'scribe', 'ephraim_young', 'envoy'], 0.72, 30, rows=2, row_dy=16, row_dx=14), 'crowd_israel.png')

# --- жители деревни Ш2 (по одному, ~30 px) ---
for out, src in [('villager_youth', 'ephraim_young'), ('villager_maiden', 'widow'), ('villager_farmer', 'worker'),
                 ('villager_servant', 'servant_young'), ('villager_herder', 'shepherd')]:
    save(figure(src, 0.5), out + '.png')

# --- нарисованное по пикселям (рисуем вдвое мельче и увеличиваем ×2 — под стиль пиксель-арта) ---
OUTLINE = (59, 40, 42, 255)


def px(draw, pts, color):
    for p in pts:
        draw.point(p, fill=color)


def up(img, k=2):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


# поле: борозды с ростками
f = Image.new('RGBA', (64, 26), (0, 0, 0, 0))
d = ImageDraw.Draw(f)
d.rectangle([0, 0, 63, 25], fill=(142, 98, 62, 255), outline=OUTLINE)
for y in (5, 11, 17, 23):
    d.line([(2, y), (61, y)], fill=(108, 72, 46, 255))
for y in (3, 9, 15, 21):
    for x in range(4, 62, 5):
        px(d, [(x, y), (x, y + 1), (x - 1, y - 1), (x + 1, y - 1)], (122, 176, 70, 255))
save(up(f), 'field.png')

# виноградник: ряды кольев с лозой и тёмными гроздьями
v = Image.new('RGBA', (64, 26), (0, 0, 0, 0))
d = ImageDraw.Draw(v)
d.rectangle([0, 0, 63, 25], fill=(150, 126, 76, 255), outline=OUTLINE)
for y in (6, 17):
    d.line([(2, y), (61, y)], fill=(86, 62, 40, 255))
    for x in range(4, 62, 8):
        d.rectangle([x, y - 4, x + 1, y + 3], fill=(96, 66, 42, 255))
        d.rectangle([x + 2, y - 3, x + 6, y + 1], fill=(88, 140, 60, 255))
        px(d, [(x + 3, y + 2), (x + 4, y + 2), (x + 5, y + 2), (x + 4, y + 3)], (118, 60, 120, 255))
save(up(v), 'vineyard.png')

# масличный сад: три дерева с серо-зелёной кроной
o = Image.new('RGBA', (48, 26), (0, 0, 0, 0))
d = ImageDraw.Draw(o)
d.rectangle([0, 0, 47, 25], fill=(132, 150, 84, 255), outline=OUTLINE)
for cx in (9, 24, 39):
    d.rectangle([cx - 1, 14, cx, 21], fill=(104, 72, 48, 255))
    d.ellipse([cx - 7, 3, cx + 6, 15], fill=(120, 142, 108, 255), outline=OUTLINE)
    px(d, [(cx - 3, 7), (cx - 2, 7), (cx + 2, 9), (cx + 3, 9), (cx, 5)], (166, 186, 150, 255))
    px(d, [(cx - 1, 11), (cx + 3, 6)], (58, 66, 50, 255))  # маслины
save(up(o), 'olive.png')

# овца
s = Image.new('RGBA', (8, 6), (0, 0, 0, 0))
d = ImageDraw.Draw(s)
d.ellipse([0, 0, 5, 4], fill=(236, 239, 244, 255), outline=OUTLINE)
d.rectangle([5, 1, 7, 3], fill=(76, 70, 70, 255))
px(d, [(1, 5), (4, 5)], OUTLINE)
save(up(s), 'sheep.png')

# оружие/снаряжение для колесниц (слуги): круглый щит с умбоном
w = Image.new('RGBA', (10, 8), (0, 0, 0, 0))
d = ImageDraw.Draw(w)
d.ellipse([1, 0, 8, 7], fill=(150, 156, 168, 255), outline=OUTLINE)
d.ellipse([4, 3, 5, 4], fill=(220, 224, 232, 255))
save(up(w), 'shield.png')

# дорога к сынам Аммона: вытоптанная полоса с колеями
r = Image.new('RGBA', (96, 8), (0, 0, 0, 0))
d = ImageDraw.Draw(r)
d.rectangle([0, 0, 95, 7], fill=(150, 112, 76, 255))
d.line([(0, 2), (95, 2)], fill=(122, 88, 58, 255))
d.line([(0, 5), (95, 5)], fill=(122, 88, 58, 255))
for x in range(3, 94, 11):
    px(d, [(x, 1), (x + 3, 4), (x + 6, 6)], (184, 150, 108, 255))
d.line([(0, 0), (95, 0)], fill=(112, 80, 54, 255))
d.line([(0, 7), (95, 7)], fill=(112, 80, 54, 255))
save(up(r), 'road.png')

# --- Г1: жертвенники и бык (задачи ночной механики NightTasks) ---
STONE = (150, 150, 158, 255)
STONE_D = (108, 108, 118, 255)
STONE_L = (190, 190, 198, 255)
WOOD = (122, 84, 52, 255)
WOOD_D = (86, 58, 38, 255)

# жертвенник Баала + Ашера (шест): тёмный камень с «рогами» и резной шест рядом
a = Image.new('RGBA', (22, 22), (0, 0, 0, 0))
d = ImageDraw.Draw(a)
d.rectangle([9, 1, 11, 20], fill=WOOD, outline=OUTLINE)  # Ашера
d.rectangle([7, 4, 13, 5], fill=WOOD_D)
d.rectangle([7, 9, 13, 10], fill=WOOD_D)
d.rectangle([1, 12, 20, 20], fill=STONE_D, outline=OUTLINE)
d.rectangle([3, 9, 18, 12], fill=STONE, outline=OUTLINE)
px(d, [(3, 8), (3, 7), (18, 8), (18, 7)], OUTLINE)  # рога алтаря
px(d, [(5, 14), (6, 14), (13, 17), (14, 17), (9, 15)], STONE)
d.rectangle([8, 10, 13, 11], fill=(70, 50, 44, 255))  # копоть
save(up(a, 3), 'altar_baal.png')

# он же разрушен: груда камней и сломанный шест
r2 = Image.new('RGBA', (22, 22), (0, 0, 0, 0))
d = ImageDraw.Draw(r2)
for (x0, y0, x1, y1, c) in [(2, 15, 8, 20, STONE_D), (7, 16, 14, 20, STONE), (13, 14, 19, 20, STONE_D), (5, 12, 10, 16, STONE), (11, 12, 15, 16, STONE_L)]:
    d.rectangle([x0, y0, x1, y1], fill=c, outline=OUTLINE)
d.line([(16, 12), (20, 8)], fill=WOOD, width=2)
d.line([(3, 18), (1, 20)], fill=WOOD_D, width=1)
save(up(r2, 3), 'altar_baal_ruined.png')

# новый жертвенник на вершине: светлые аккуратные плиты + дрова
n = Image.new('RGBA', (22, 22), (0, 0, 0, 0))
d = ImageDraw.Draw(n)
d.rectangle([2, 14, 19, 20], fill=STONE_L, outline=OUTLINE)
d.rectangle([4, 9, 17, 14], fill=STONE, outline=OUTLINE)
d.line([(11, 14), (11, 20)], fill=STONE_D)
d.line([(7, 9), (7, 14)], fill=STONE_D)
d.rectangle([6, 5, 15, 8], fill=WOOD, outline=OUTLINE)  # дрова
d.line([(6, 7), (15, 7)], fill=WOOD_D)
save(up(n, 3), 'altar_new.png')

# он же после жертвы: на дровах огонь
f2 = n.copy()
d = ImageDraw.Draw(f2)
d.polygon([(7, 5), (9, 1), (10, 4), (12, 0), (14, 5)], fill=(236, 150, 60, 255), outline=(190, 70, 40, 255))
px(d, [(10, 3), (11, 3), (10, 4)], (250, 220, 110, 255))
save(up(f2, 3), 'altar_new_fire.png')

# бык (вид сбоку)
b = Image.new('RGBA', (24, 16), (0, 0, 0, 0))
d = ImageDraw.Draw(b)
BULL = (130, 86, 58, 255)
d.rectangle([4, 4, 17, 11], fill=BULL, outline=OUTLINE)  # туловище
d.rectangle([0, 3, 5, 8], fill=(110, 72, 48, 255), outline=OUTLINE)  # голова
px(d, [(0, 2), (1, 1), (4, 2), (5, 1)], (232, 226, 206, 255))  # рога
px(d, [(2, 5)], OUTLINE)
for x in (5, 8, 14, 16):
    d.rectangle([x, 12, x + 1, 15], fill=(96, 62, 42, 255), outline=OUTLINE)
d.line([(18, 5), (21, 9)], fill=(96, 62, 42, 255))  # хвост
d.rectangle([6, 4, 10, 6], fill=(150, 104, 72, 255))
save(up(b, 3), 'bull.png')

# спящий горожанин: свёрток-плащ с головой (вид сверху-сбоку)
sl = Image.new('RGBA', (14, 8), (0, 0, 0, 0))
d = ImageDraw.Draw(sl)
d.rectangle([4, 1, 13, 6], fill=(150, 130, 180, 255), outline=OUTLINE)
d.rectangle([0, 2, 3, 5], fill=(226, 190, 150, 255), outline=OUTLINE)
d.line([(6, 3), (11, 3)], fill=(120, 100, 150, 255))
save(up(sl, 3), 'sleeper_town.png')
