# -*- coding: utf-8 -*-
"""joint-stress-diff.png 產圖腳本。

輸入是釘了 SHA-256 的原始壓力圖（docs/evidence/character_3d2d/joint-stress-sheet.png，
6 個可動件 x 3 個角度 = 18 格，每格 180x180，上緣 24px 是烙在圖裡的標籤帶）。
輸出一張位移對照圖：欄序照原圖 -10 / 0 / +10，兩側欄把「相對 0 度真正動到的像素」
塗紅，中欄保持原樣當基準。原始收據一個位元不動。

判法：逐像素取 |dR|+|dG|+|dB|（上限 765），大於 THRESH 算有位移。比對前先裁掉
標籤帶，否則標籤文字的差異會被誤標成位移。放大用 NEAREST 整數倍，不做內插，
免得平滑把位移邊緣抹掉。

執行：repo 根目錄下
    .venv/Scripts/python.exe docs/playbook/assets/joint_stress_diff.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SRC = HERE.parent.parent / "evidence" / "character_3d2d" / "joint-stress-sheet.png"
OUT = HERE / "joint-stress-diff.png"

CELL = 180          # 原圖每格邊長
STRIP = 24          # 每格上緣標籤帶高度（裁掉不比）
SCALE = 2           # NEAREST 整數倍放大
THRESH = 24         # |dR|+|dG|+|dB| 門檻（上限 765）
ROWS = ["leg_boot_l", "leg_boot_r", "arm_l", "arm_r", "hand_l", "hand_r"]
ANGLES = ["-10 deg", "0 deg", "+10 deg"]  # 欄序照原圖

BG = (24, 24, 26)
FG = (232, 232, 230)
ROWFG = (255, 200, 80)
RED = (255, 60, 60)


def font(size):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/consola.ttf", size)
    except OSError:
        return ImageFont.load_default()


def main():
    im = Image.open(SRC).convert("RGB")
    if im.size != (CELL * 3, CELL * 6):
        raise SystemExit("unexpected sheet size: %r" % (im.size,))

    def content(r, c):
        return im.crop((c * CELL, r * CELL + STRIP, (c + 1) * CELL, (r + 1) * CELL))

    ch = CELL - STRIP
    cw2, ch2 = CELL * SCALE, ch * SCALE
    header, rowbar = 40, 26
    W = cw2 * 3
    H = header + 6 * (rowbar + ch2)
    sheet = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(sheet)
    f16, f14 = font(17), font(15)

    draw.text((8, 6), "red = pixels moved vs 0 deg   (threshold |dR|+|dG|+|dB| > %d)" % THRESH,
              fill=FG, font=f16)
    for c, label in enumerate(ANGLES):
        draw.text((c * cw2 + 8, 24), label, fill=(150, 150, 150), font=f14)

    counts = {}
    for r, name in enumerate(ROWS):
        base = np.asarray(content(r, 1)).astype(int)
        y = header + r * (rowbar + ch2)
        for c in range(3):
            cell_img = content(r, c)
            if c != 1:
                arr = np.asarray(cell_img).astype(int)
                mask = np.abs(arr - base).sum(axis=2) > THRESH
                counts[(name, c)] = int(mask.sum())
                out = np.asarray(cell_img).copy()
                out[mask] = RED
                cell_img = Image.fromarray(out)
            sheet.paste(cell_img.resize((cw2, ch2), Image.NEAREST), (c * cw2, y + rowbar))
        draw.text((8, y + 5),
                  "%s   moved px  -10 deg: %d   +10 deg: %d" % (
                      name, counts[(name, 0)], counts[(name, 2)]),
                  fill=ROWFG, font=f14)

    sheet.save(OUT)
    lo = min(counts.values())
    hi = max(counts.values())
    area = CELL * ch
    print("saved %s  (%dx%d)" % (OUT, W, H))
    print("moved px per cell: %d..%d of %d (%.1f%%..%.1f%%)" % (
        lo, hi, area, lo * 100.0 / area, hi * 100.0 / area))


if __name__ == "__main__":
    main()
