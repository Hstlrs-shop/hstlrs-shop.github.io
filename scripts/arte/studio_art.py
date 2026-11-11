"""Arte original HSTLRS — STUDIO 01/02/03. Archivos de impresión DTG espalda 12x16 in a 300 dpi (3600x4800, fondo transparente)."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

F = "/tmp/claude-0/-home-user/59e60ba7-ae74-5c90-9f57-88be62d1463b/scratchpad/fonts/"
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
W, H = 3600, 4800
CREAM = (233, 223, 202)
RED = (178, 40, 32)
INK = (38, 36, 33)
rng = np.random.default_rng(7)
random.seed(7)


def font(w, size):
    return ImageFont.truetype(F + f"montserrat-latin-{w}-normal.ttf", size)


def spaced(draw, xy, text, fnt, fill, track, anchor="center"):
    """Texto con interletrado amplio; anchor center/left/right respecto a x."""
    widths = [draw.textlength(c, font=fnt) for c in text]
    total = sum(widths) + track * (len(text) - 1)
    x, y = xy
    if anchor == "center":
        x -= total / 2
    elif anchor == "right":
        x -= total
    for c, w in zip(text, widths):
        draw.text((x, y), c, font=fnt, fill=fill, anchor="ls")
        x += w + track
    return total


def distress(img, amount=0.16, seed=1):
    """Textura gastada: quita tinta en motas finas y manchas suaves (look vintage, menos tinta)."""
    r = np.random.default_rng(seed)
    a = np.asarray(img.split()[3]).astype(np.float32) / 255
    small = r.random((H // 40, W // 40)).astype(np.float32)
    blot = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
    speck = r.random((H, W)).astype(np.float32)
    keep = (speck > amount * 0.55) & (blot < 1 - amount * 0.9 + 0.35)
    a = a * keep
    out = img.copy()
    out.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    return out


# ---------------------------------------------------------------- STUDIO 01
def acueducto():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    lw = 6

    # Sol rojo
    cx, cy, r = 2480, 1080, 640
    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sun).ellipse((cx - r, cy - r, cx + r, cy + r), fill=RED + (255,))
    sun = distress(sun, 0.28, seed=3)
    img.alpha_composite(sun)

    # Alzado plano de la arquería (luego se pone en perspectiva)
    EW, EH = 6400, 2600
    el = Image.new("RGBA", (EW, EH), (0, 0, 0, 0))
    e = ImageDraw.Draw(el)
    e.rectangle((0, 0, EW, EH), fill=CREAM + (255,))
    pier, span = 300, 760
    spring = 1350  # altura donde arranca el arco (desde arriba)
    x = 260
    arches = []
    while x + span < EW:
        arches.append(x)
        x += span + pier
    # sillares: hiladas horizontales y juntas alternas
    course = 130
    for i, yy in enumerate(range(0, EH, course)):
        e.line((0, yy, EW, yy), fill=(0, 0, 0, 0), width=7)
        off = (i % 2) * 130
        for xx in range(-off, EW, 260):
            e.line((xx, yy, xx, yy + course), fill=(0, 0, 0, 0), width=6)
    # cornisa superior
    e.rectangle((0, 330, EW, 380), fill=(0, 0, 0, 0))
    e.rectangle((0, 0, EW, 40), fill=(0, 0, 0, 0))
    # vanos con dovelas
    for ax in arches:
        rr = span / 2
        mx = ax + rr
        e.rectangle((ax, spring, ax + span, EH), fill=(0, 0, 0, 0))
        e.pieslice((ax, spring - rr, ax + span, spring + rr), 180, 360, fill=(0, 0, 0, 0))
        ring = rr + 120
        e.arc((mx - ring, spring - ring, mx + ring, spring + ring), 180, 360, fill=(0, 0, 0, 0), width=8)
        for k in range(13):
            t = math.pi + math.pi * k / 12
            e.line((mx + rr * math.cos(t), spring + rr * math.sin(t), mx + ring * math.cos(t), spring + ring * math.sin(t)), fill=(0, 0, 0, 0), width=7)
        # imposta
        e.rectangle((ax - 40, spring - 20, ax + 20, spring + 20), fill=CREAM + (255,))
        e.rectangle((ax + span - 20, spring - 20, ax + span + 40, spring + 20), fill=CREAM + (255,))
    # sombra interior del pilar (rayado diagonal) para volumen
    for ax in arches:
        for k in range(0, 1200, 46):
            e.line((ax + span, spring + 200 + k, ax + span + 120, spring + 80 + k), fill=(0, 0, 0, 0), width=5)

    # Perspectiva: el borde izquierdo alto y cercano, el derecho fuga hacia abajo-derecha
    dst = [(260, 1650), (3420, 3520), (3420, 4420), (260, 4420)]  # TL, TR, BR, BL
    src = [(0, 0), (EW, 0), (EW, EH), (0, EH)]
    A = []
    for (xd, yd), (xs, ys) in zip(dst, src):
        A.append([xd, yd, 1, 0, 0, 0, -xs * xd, -xs * yd])
        A.append([0, 0, 0, xd, yd, 1, -ys * xd, -ys * yd])
    coeffs = np.linalg.solve(np.array(A, float), np.array([c for p in src for c in p], float))
    warped = el.transform((W, H), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)
    # fundido hacia el horizonte (los vanos lejanos se desvanecen)
    fade = Image.linear_gradient("L").rotate(90, expand=True).resize((W, H))
    fade = ImageChops.invert(fade).point(lambda v: min(255, int(v * 1.35 + 40)))
    wa = ImageChops.multiply(warped.split()[3], fade)
    warped.putalpha(wa)

    # Torre de agua a la izquierda (más alta que la arquería)
    tw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    t = ImageDraw.Draw(tw)
    tx0, tx1, ty0 = 560, 1180, 520
    t.rectangle((tx0, ty0, tx1, 2300), fill=CREAM + (255,))
    t.rectangle((tx0 - 50, ty0 - 60, tx1 + 50, ty0), fill=CREAM + (255,))
    for yy in range(ty0, 2400, 120):
        t.line((tx0, yy, tx1, yy), fill=(0, 0, 0, 0), width=7)
        off = ((yy - ty0) // 120 % 2) * 105
        for xx in range(tx0 - off, tx1, 210):
            t.line((xx, yy, xx, yy + 120), fill=(0, 0, 0, 0), width=6)
    # ventana arqueada
    wx0, wx1, wy = 770, 970, 900
    t.rectangle((wx0, wy, wx1, 1350), fill=(0, 0, 0, 0))
    t.pieslice((wx0, wy - 100, wx1, wy + 100), 180, 360, fill=(0, 0, 0, 0))
    # sombra lateral derecha de la torre
    for k in range(ty0, 2400, 40):
        t.line((tx1 - 150, k + 150, tx1, k), fill=(0, 0, 0, 0), width=5)

    clip = Image.new("L", (W, H), 0)
    ImageDraw.Draw(clip).polygon([(0, 0), (W, 0), (W, 1650 + (W - 260) * 1870 / 3160), (0, 1650 - 260 * 1870 / 3160)], fill=255)
    tw.putalpha(ImageChops.multiply(tw.split()[3], clip))
    stone = Image.alpha_composite(warped, tw)
    stone = distress(stone, 0.22, seed=5)
    img.alpha_composite(stone)

    # Trazos de plano (líneas de construcción)
    c = CREAM + (255,)
    for x0, y0, x1, y1 in [
        (420, 120, 420, 4650), (1480, 300, 1480, 3100), (2480, 300, 2480, 3600), (3200, 1700, 3200, 4600),
        (120, 1650, 3500, 1650), (1600, 2470, 3500, 2470), (120, 4420, 3520, 4420), (1950, 3050, 3500, 3050),
    ]:
        d.line((x0, y0, x1, y1), fill=c, width=lw)
    # líneas de fuga (punteadas)
    for p0, p1 in [((260, 1650), (3420, 3520)), ((260, 4420), (3500, 4420)), ((1180, 520), (3500, 2300))]:
        n = 70
        for k in range(0, n, 2):
            a0, a1 = k / n, (k + 1) / n
            d.line((p0[0] + (p1[0] - p0[0]) * a0, p0[1] + (p1[1] - p0[1]) * a0,
                    p0[0] + (p1[0] - p0[0]) * a1, p0[1] + (p1[1] - p0[1]) * a1), fill=c, width=lw)
    # arco de compás punteado
    R = 2650
    for k in range(0, 60, 2):
        a0 = math.radians(-80 + k * 1.4)
        a1 = math.radians(-80 + (k + 1) * 1.4)
        d.line((420 + R * math.cos(a0), 4420 + R * math.sin(a0), 420 + R * math.cos(a1), 4420 + R * math.sin(a1)), fill=c, width=lw)
    # cruces de registro
    for x0, y0 in [(1480, 2470), (2480, 1650), (3200, 3050), (420, 4420), (3200, 2470), (2480, 3050)]:
        d.line((x0 - 45, y0, x0 + 45, y0), fill=c, width=lw)
        d.line((x0, y0 - 45, x0, y0 + 45), fill=c, width=lw)
    # cotas
    d.line((1950, 3140, 3200, 3140), fill=c, width=lw)
    for xx in (1950, 3200):
        d.line((xx, 3100, xx, 3180), fill=c, width=lw)
    spaced(d, (2575, 3240), "1:200", font(500, 58), c, 14)

    # Marca
    spaced(d, (2000, 2380), "HSTLRS", font(600, 250), c, 46, anchor="left")
    d.line((1760, 2290, 1880, 2290), fill=c, width=lw)
    d.line((1820, 2230, 1820, 2350), fill=c, width=lw)
    spaced(d, (2010, 2610), "STUDIO 01 — ACUEDUCTO", font(500, 62), c, 20, anchor="left")
    spaced(d, (2010, 2700), "CONSTRUIDO A PULSO", font(500, 62), c, 20, anchor="left")
    spaced(d, (420, 4700), "N 20°35'  O 100°23'", font(500, 58), c, 18, anchor="left")
    spaced(d, (3500, 4700), "HSTLRS.STUDIO", font(500, 58), c, 18, anchor="right")
    return img


# ---------------------------------------------------------------- STUDIO 02
def globo():
    import geopandas as gpd
    from shapely.geometry import Polygon, MultiPolygon
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = CREAM + (255,)
    cx, cy, R = W / 2, 2350, 1500
    lam0, phi0 = math.radians(-50), math.radians(28)

    def proj(lon, lat):
        lam, phi = math.radians(lon), math.radians(lat)
        cosc = math.sin(phi0) * math.sin(phi) + math.cos(phi0) * math.cos(phi) * math.cos(lam - lam0)
        x = math.cos(phi) * math.sin(lam - lam0)
        y = math.cos(phi0) * math.sin(phi) - math.sin(phi0) * math.cos(phi) * math.cos(lam - lam0)
        return cx + R * x, cy - R * y, cosc

    def polyline(pts, width, fill):
        seg = []
        for lon, lat in pts:
            x, y, v = proj(lon, lat)
            if v > 0:
                seg.append((x, y))
            else:
                if len(seg) > 1:
                    d.line(seg, fill=fill, width=width, joint="curve")
                seg = []
        if len(seg) > 1:
            d.line(seg, fill=fill, width=width, joint="curve")

    # retícula
    for lon in range(-180, 180, 15):
        polyline([(lon, la / 2) for la in range(-180, 181)], 4, CREAM + (150,))
    for lat in range(-75, 90, 15):
        polyline([(lo / 2, lat) for lo in range(-360, 361)], 4, CREAM + (150,))
    # continentes
    world = gpd.read_file(gpd.datasets.get_path("naturalearth_lowres"))
    for geom in world.geometry:
        polys = geom.geoms if isinstance(geom, MultiPolygon) else [geom]
        for p in polys:
            p = p.segmentize(0.5)
            polyline(list(p.exterior.coords), 7, c)
    # contorno del globo
    d.ellipse((cx - R, cy - R, cx + R, cy + R), outline=c, width=9)

    # ruta México → España (arco elevado de círculo máximo)
    def vec(lon, lat):
        lam, phi = math.radians(lon), math.radians(lat)
        return np.array([math.cos(phi) * math.cos(lam), math.cos(phi) * math.sin(lam), math.sin(phi)])
    a, b = vec(-99.13, 19.43), vec(-3.70, 40.42)
    om = math.acos(np.clip(a @ b, -1, 1))
    pts = []
    for i in range(201):
        t = i / 200
        v = (math.sin((1 - t) * om) * a + math.sin(t * om) * b) / math.sin(om)
        lat = math.degrees(math.asin(v[2])); lon = math.degrees(math.atan2(v[1], v[0]))
        x, y, _ = proj(lon, lat)
        lift = 1 + 0.10 * math.sin(math.pi * t)
        pts.append((cx + (x - cx) * lift, cy + (y - cy) * lift))
    for k in range(0, 200, 4):  # trazo punteado largo
        d.line(pts[k:k + 3], fill=RED + (255,), width=13)
    for (lon, lat), label, side in [((-99.13, 19.43), "MÉXICO", "left"), ((-3.70, 40.42), "ESPAÑA", "right")]:
        x, y, _ = proj(lon, lat)
        d.ellipse((x - 30, y - 30, x + 30, y + 30), fill=RED + (255,))
        d.ellipse((x - 58, y - 58, x + 58, y + 58), outline=RED + (255,), width=7)
        if side == "left":
            spaced(d, (x - 90, y + 140), label, font(600, 88), c, 18, anchor="right")
        else:
            spaced(d, (x - 40, y - 110), label, font(600, 88), c, 18, anchor="right")

    spaced(d, (W / 2, 560), "HSTLRS", font(500, 150), c, 70)
    spaced(d, (W / 2, 4250), "BEYOND BORDERS", font(500, 120), c, 60)
    spaced(d, (W / 2, 4430), "19.43° N  99.13° O   —   40.42° N  3.70° O", font(500, 56), CREAM + (190,), 14)
    return distress(img, 0.10, seed=9)


# ---------------------------------------------------------------- STUDIO 03
def ridge(n, amp, rough, seed):
    r = np.random.default_rng(seed)
    pts = np.zeros(n)
    step = n - 1
    scale = amp
    pts[0] = r.normal() * amp * 0.2
    pts[-1] = r.normal() * amp * 0.2
    while step > 1:
        half = step // 2
        for i in range(half, n - 1, step):
            pts[i] = (pts[i - half] + pts[i + half]) / 2 + r.normal() * scale
        scale *= rough
        step = half
    return pts


def montanas():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ink = INK + (255,)
    n = 1025
    xs = np.linspace(180, W - 180, n)
    layers = [  # (pico x, base y, altura, ancho, semilla, nº de estratos)
        (0.56, 3250, 2050, 0.42, 11, 34),
        (0.30, 3350, 1300, 0.34, 12, 26),
        (0.80, 3400, 1250, 0.32, 13, 26),
        (0.45, 3650, 950, 0.40, 14, 22),
        (0.18, 3750, 700, 0.30, 15, 18),
        (0.75, 3800, 650, 0.35, 16, 18),
    ]
    for px, base, h, wid, seed, strata in layers:
        u = (xs - 180) / (W - 360)
        shape = np.exp(-np.abs(u - px) / (wid * 0.55)) ** 1.25
        top = base - h * shape + ridge(n, 70, 0.62, seed) * (0.35 + shape)
        top = np.minimum(top, base + 200)
        # tapa lo que queda detrás (de atrás hacia adelante)
        mask = Image.new("L", (W, H), 0)
        md = ImageDraw.Draw(mask)
        md.polygon(list(zip(xs, top)) + [(W - 180, H), (180, H)], fill=255)
        hole = ImageChops.invert(mask)
        img.putalpha(ImageChops.multiply(img.split()[3], hole))
        d = ImageDraw.Draw(img)
        d.line(list(zip(xs, top)), fill=ink, width=9, joint="curve")
        # estratos: curvas paralelas que siguen el relieve y se cierran hacia el pie
        rr = np.random.default_rng(seed + 100)
        depth = h * 0.85
        for k in range(1, strata):
            f = k / strata
            off = depth * f ** 1.35
            wob = ridge(n, 18, 0.6, seed * 31 + k)
            y = top + off * (0.35 + 0.65 * shape) + wob
            y = np.maximum(y, top + 6)
            peak = xs[int(np.argmin(top))]
            start = peak - (rr.random() ** 0.7) * (W * wid * 0.9)
            vis = xs >= start
            seg = []
            for i in range(n):
                if vis[i] and y[i] < base + 260:
                    seg.append((xs[i], y[i]))
                else:
                    if len(seg) > 6:
                        d.line(seg, fill=ink, width=5, joint="curve")
                    seg = []
            if len(seg) > 6:
                d.line(seg, fill=ink, width=5, joint="curve")
    # desvanecer la base
    g = Image.linear_gradient("L").resize((W, H))
    g = g.point(lambda v: 255 if v < 160 else max(0, int(255 - (v - 160) * 4.2)))
    img.putalpha(ImageChops.multiply(img.split()[3], g))
    d = ImageDraw.Draw(img)
    spaced(d, (W / 2, 560), "HSTLRS", font(500, 150), ink, 70)
    spaced(d, (W / 2, 4250), "THE CLIMB IS YOURS", font(500, 112), ink, 56)
    spaced(d, (W / 2, 4420), "NADIE SUBE POR TI", font(500, 56), INK + (200,), 22)
    return distress(img, 0.06, seed=17)


if __name__ == "__main__":
    which = sys.argv[2] if len(sys.argv) > 2 else "all"
    for name, fn in [("studio01-acueducto", acueducto), ("studio02-beyond-borders", globo), ("studio03-the-climb", montanas)]:
        if which in ("all", name):
            im = fn()
            im.save(f"{OUT}/{name}-espalda.png", optimize=True)
            print("ok", name)
