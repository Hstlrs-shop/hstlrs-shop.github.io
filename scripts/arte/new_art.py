"""Diseños nuevos HSTLRS (solo gráficos, sin letras). Espalda 12x16 in a 300 dpi, fondo transparente."""
import math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageChops
from skimage import measure
from scipy import ndimage

W, H = 3600, 4800
CREAM = (233, 223, 202)
RED = (178, 40, 32)
INK = (38, 36, 33)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."


def distress(img, amount, seed):
    r = np.random.default_rng(seed)
    a = np.asarray(img.split()[3]).astype(np.float32) / 255
    small = r.random((H // 40, W // 40)).astype(np.float32)
    blot = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
    keep = (r.random((H, W)) > amount * 0.55) & (blot < 1 - amount * 0.9 + 0.35)
    out = img.copy()
    out.putalpha(Image.fromarray((a * keep * 255).astype(np.uint8)))
    return out


def dashed(d, pts, fill, width, on=3, off=2):
    for k in range(0, len(pts) - 1, on + off):
        seg = pts[k:k + on + 1]
        if len(seg) > 1:
            d.line(seg, fill=fill, width=width, joint="curve")


# ------------------------------------------------ TOPOGRAFÍA (Follow the Unknown)
def topografia(ink=CREAM):
    r = np.random.default_rng(21)
    n = 480  # rejilla del relieve
    z = np.zeros((n, int(n * 0.75)))
    for octave, amp in [(4, 0.8), (8, 0.3), (16, 0.06)]:
        g = r.normal(size=(octave, int(octave * 0.75) + 1))
        z += amp * np.asarray(Image.fromarray(g.astype(np.float32), mode="F").resize(z.shape[::-1], Image.BICUBIC))
    yy, xx = np.mgrid[0:z.shape[0], 0:z.shape[1]]
    # dos cumbres y una costa (el mar a la izquierda abajo)
    for cy, cx, hh, s in [(0.38, 0.62, 2.6, 0.16), (0.62, 0.35, 1.7, 0.12), (0.2, 0.28, 1.1, 0.1)]:
        z += hh * np.exp(-(((yy / z.shape[0]) - cy) ** 2 + ((xx / z.shape[1]) - cx) ** 2) / (2 * s * s))
    z = ndimage.gaussian_filter(z, 4)
    sx, sy = (W - 400) / (z.shape[1] - 1), (H - 600) / (z.shape[0] - 1)
    ox, oy = 200, 300
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    levels = np.linspace(z.min() + 0.15, z.max() - 0.02, 32)
    sea = levels[3]
    for i, lv in enumerate(levels):
        for c in measure.find_contours(z, lv):
            if len(c) < 12:
                continue
            pts = [(ox + p[1] * sx, oy + p[0] * sy) for p in c]
            if i < 3:   # línea de costa y bajos: discontinuas
                dashed(d, pts, ink + (255,), 6)
            else:
                d.line(pts, fill=ink + (255,), width=13 if i % 5 == 0 else 6, joint="curve")
    # ruta en rojo hacia la cumbre más alta
    peak = np.unravel_index(np.argmax(z), z.shape)
    px, py = ox + peak[1] * sx, oy + peak[0] * sy
    path = []
    x, y = ox + 0.12 * (W - 400), oy + 0.93 * (H - 600)
    for t in np.linspace(0, 1, 160):
        path.append((x + (px - x) * t + 260 * math.sin(t * 9) * (1 - t), y + (py - y) * t + 120 * math.cos(t * 7) * (1 - t)))
    dashed(d, path, RED + (255,), 16, 2, 2)
    d.ellipse((px - 34, py - 34, px + 34, py + 34), fill=RED + (255,))
    d.ellipse((px - 70, py - 70, px + 70, py + 70), outline=RED + (255,), width=10)
    # marco recortado: desvanece en los bordes
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((200, 300, W - 200, H - 300), radius=40, fill=255)
    img.putalpha(ImageChops.multiply(img.split()[3], m))
    # marcas de esquina
    for cx, cy, sxn, syn in [(200, 300, 1, 1), (W - 200, 300, -1, 1), (200, H - 300, 1, -1), (W - 200, H - 300, -1, -1)]:
        d.line((cx - 60 * sxn, cy, cx + 120 * sxn, cy), fill=ink + (255,), width=7)
        d.line((cx, cy - 60 * syn, cx, cy + 120 * syn), fill=ink + (255,), width=7)
    return distress(img, 0.08, 22)


# ------------------------------------------------ ESCALERA AL SOL (Tu ritmo, tu camino)
def escalera(ink=CREAM):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = ink + (255,)
    # arco monumental
    ax0, ax1, top, base = 600, 3000, 700, 4300
    R = (ax1 - ax0) / 2
    mx, spring = (ax0 + ax1) / 2, top + R
    # sol rojo dentro del arco, recortado por él
    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sun).ellipse((mx - 560, 1050, mx + 560, 2170), fill=RED + (255,))
    clip = Image.new("L", (W, H), 0)
    cd = ImageDraw.Draw(clip)
    cd.pieslice((ax0 + 70, top + 70, ax1 - 70, top + 2 * R - 70), 180, 360, fill=255)
    cd.rectangle((ax0 + 70, spring, ax1 - 70, base), fill=255)
    sun.putalpha(ImageChops.multiply(sun.split()[3], clip))
    img.alpha_composite(distress(sun, 0.25, 31))
    d = ImageDraw.Draw(img)
    # dovelas del arco (doble línea con juntas radiales)
    for rr, wdt in [(R, 12), (R + 160, 12)]:
        d.arc((mx - rr, spring - rr, mx + rr, spring + rr), 180, 360, fill=c, width=wdt)
    for k in range(17):
        t = math.pi + math.pi * k / 16
        d.line((mx + R * math.cos(t), spring + R * math.sin(t), mx + (R + 160) * math.cos(t), spring + (R + 160) * math.sin(t)), fill=c, width=9)
    # jambas con sillares
    for x0, x1 in [(ax0 - 160, ax0), (ax1, ax1 + 160)]:
        d.rectangle((x0, spring, x1, base), outline=c, width=12)
        for yy in range(int(spring), base, 150):
            d.line((x0, yy, x1, yy), fill=c, width=9)
    # escalera que sube hacia el sol, en perspectiva central
    steps = 16
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        y0 = base - (base - 2250) * (1 - (1 - t0) ** 1.6)
        y1 = base - (base - 2250) * (1 - (1 - t1) ** 1.6)
        half0 = 1050 * (1 - 0.82 * t0)
        half1 = 1050 * (1 - 0.82 * t1)
        rise = (y0 - y1) * 0.55
        # huella (relleno sólido) y tabica (rayada)
        d.polygon([(mx - half0, y0 - rise), (mx + half0, y0 - rise), (mx + half1, y1), (mx - half1, y1)], fill=c)
        for k in range(0, int(rise), 18):
            d.line((mx - half0, y0 - k, mx + half0, y0 - k), fill=c, width=6)
        d.line((mx - half0, y0, mx + half0, y0), fill=c, width=8)
    # suelo y sombra
    d.line((300, base, W - 300, base), fill=c, width=12)
    for k, x in enumerate(range(320, W - 300, 70)):
        d.line((x, base + 40, x - 60, base + 120), fill=c, width=6)
    # figura caminando en el primer tercio de la escalera
    fx, fy = mx + 40, 3380
    d.ellipse((fx - 34, fy - 300, fx + 34, fy - 232), fill=RED + (255,))
    d.polygon([(fx - 40, fy - 225), (fx + 40, fy - 225), (fx + 30, fy - 90), (fx - 30, fy - 90)], fill=RED + (255,))
    d.line((fx - 18, fy - 95, fx - 55, fy), fill=RED + (255,), width=26)
    d.line((fx + 18, fy - 95, fx + 40, fy - 20), fill=RED + (255,), width=26)
    return distress(img, 0.12, 32)


# ------------------------------------------------ CIUDAD A PULSO (Hecho a pulso) — plano fondo/figura
def ciudad(ink=INK):
    r = np.random.default_rng(41)
    cx, cy, R = W / 2, 2350, 1500
    base = Image.new("L", (W, H), 0)
    b = ImageDraw.Draw(base)
    b.ellipse((cx - R, cy - R, cx + R, cy + R), fill=255)
    # retícula urbana girada (calles), con trazo fundacional en el centro
    ang = math.radians(14)
    ca, sa = math.cos(ang), math.sin(ang)

    def rot(x, y):
        return cx + x * ca - y * sa, cy + x * sa + y * ca
    blk = 230
    for k in range(-9, 10):
        wdt = 30 if k % 4 else 58
        b.line([rot(k * blk + r.normal() * 4, -R * 1.3), rot(k * blk + r.normal() * 4, R * 1.3)], fill=0, width=wdt)
        b.line([rot(-R * 1.3, k * blk * 1.2), rot(R * 1.3, k * blk * 1.2)], fill=0, width=wdt)
    # avenidas diagonales y periférico
    b.line([rot(-R * 1.3, -R * 1.0), rot(R * 1.3, R * 1.1)], fill=0, width=80)
    b.line([rot(-R * 1.2, R * 0.9), rot(R * 0.9, -R * 1.3)], fill=0, width=64)
    b.ellipse((cx - R * 0.72, cy - R * 0.72, cx + R * 0.72, cy + R * 0.72), outline=0, width=56)
    # río con meandro
    for t in np.linspace(0, 1, 1600):
        x, y = cx - R * 1.1 + t * 2.2 * R, cy + 520 + 260 * math.sin(t * 7.5) + 60 * math.sin(t * 13)
        b.ellipse((x - 75, y - 75, x + 75, y + 75), fill=0)
    # plaza central y parques (vacíos)
    b.ellipse((cx - 230, cy - 230, cx + 230, cy + 230), fill=0)
    for _ in range(9):
        px, py = r.uniform(-1, 1) * R * 0.75, r.uniform(-1, 1) * R * 0.75
        if px * px + py * py < (R * 0.8) ** 2:
            s = r.uniform(90, 170)
            b.rectangle(tuple(np.add(rot(px, py) * 2, (-s, -s, s, s))), fill=0)
    a = np.asarray(base).astype(np.float32) / 255
    # algunas manzanas con patio (rayado) para textura
    yy, xx = np.mgrid[0:H, 0:W]
    hatch = ((xx + yy) // 14) % 3 == 0
    zone = (np.asarray(Image.fromarray((r.random((40, 30)) * 255).astype(np.uint8)).resize((W, H), Image.NEAREST)) > 150)
    a = np.where(zone & (a > 0), a * hatch, a)
    img = Image.new("RGBA", (W, H), ink + (255,))
    img.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    d = ImageDraw.Draw(img)
    # anillos exteriores y retícula de coordenadas
    d.ellipse((cx - R - 90, cy - R - 90, cx + R + 90, cy + R + 90), outline=ink + (255,), width=12)
    d.ellipse((cx - R - 140, cy - R - 140, cx + R + 140, cy + R + 140), outline=ink + (255,), width=6)
    for k in range(72):
        t = 2 * math.pi * k / 72
        l = 60 if k % 6 == 0 else 30
        d.line((cx + (R + 140) * math.cos(t), cy + (R + 140) * math.sin(t), cx + (R + 140 + l) * math.cos(t), cy + (R + 140 + l) * math.sin(t)), fill=ink + (255,), width=7)
    # punto rojo "aquí empezó todo"
    hx, hy = rot(-blk * 2.5, -blk * 1.8)
    d.ellipse((hx - 46, hy - 46, hx + 46, hy + 46), fill=RED + (255,))
    d.ellipse((hx - 95, hy - 95, hx + 95, hy + 95), outline=RED + (255,), width=12)
    # rosa de los vientos mínima abajo
    sx, sy = cx, cy + R + 520
    d.polygon([(sx, sy - 170), (sx + 40, sy), (sx, sy + 170), (sx - 40, sy)], fill=ink + (255,))
    d.polygon([(sx - 170, sy), (sx, sy - 40), (sx + 170, sy), (sx, sy + 40)], outline=ink + (255,), width=7)
    return distress(img, 0.07, 42)


DESIGNS = {
    "topografia": (topografia, CREAM),
    "escalera": (escalera, CREAM),
    "ciudad": (ciudad, INK),
}
if __name__ == "__main__":
    which = sys.argv[2] if len(sys.argv) > 2 else "all"
    for name, (fn, ink) in DESIGNS.items():
        if which in ("all", name):
            fn().save(f"{OUT}/{name}-espalda.png", optimize=True)
            print("ok", name, flush=True)
