# Noticias viernes 20 nov 2026 (v5): fotos reales Commons + gráficas con datos reales. Sin 3D. Transición zoom a través 0.4 s.
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
D = os.path.dirname(os.path.abspath(__file__))
NN = int(os.environ.get("NOTICIAS", "5"))  # número de noticias del reel (5 diario, 4 en actualizaciones)
W, H, FPS, X, TR = 1080, 1920, 30, 70, 0.4
INK = (43, 29, 22); CAF = (214, 152, 90); CRE = (250, 243, 232); MUT = (205, 185, 165); RED = (232, 84, 70); GRN = (90, 215, 140)
CRED = json.load(open(D + "/credits.json")); PX = json.load(open(D + "/px.json"))
_c = {}
def F(sz, wt="Bold"):
    k = (int(sz), wt)
    if k not in _c:
        f = ImageFont.truetype(D + "/font/bg.ttf", int(sz))
        try: f.set_variation_by_name(wt)
        except Exception: pass
        _c[k] = f
    return _c[k]
def cl(x): return max(0.0, min(1.0, x))
def eo(x): x = cl(x); return 1 - (1 - x) ** 3
def back(x):
    x = cl(x); c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
def A(c, a): return (c[0], c[1], c[2], int(255 * cl(a)))
def vis(t, t0, t1=None, fi=0.35, fo=0.3):
    a = eo((t - t0) / fi)
    if t1 is not None: a *= 1 - cl((t - t1) / fo)
    return a
_ph = {}
def photo(key):
    if key not in _ph:
        im = Image.open(f"{D}/img/{key}.jpg").convert("RGB")
        s = max(W * 1.22 / im.width, H * 1.22 / im.height)
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
        im = ImageEnhance.Brightness(im).enhance(0.72); im = ImageEnhance.Color(im).enhance(0.85)
        im = Image.blend(im, Image.new("RGB", im.size, (60, 34, 18)), 0.18); _ph[key] = im
    return _ph[key]
def bg(key, t, T, focus):
    im = photo(key); z = 1.0 + 0.12 * (t / T) + 0.10 * (1 - eo(t / 0.5))
    cw, ch = W * 1.2 / z, H * 1.2 / z; cx = focus[0] * im.width; cy = focus[1] * im.height
    x0 = min(max(cx - cw / 2, 0), im.width - cw); y0 = min(max(cy - ch / 2, 0), im.height - ch)
    return im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.BILINEAR).convert("RGBA")
y_ = np.arange(H, dtype=np.float32)
a_ = np.clip(1 - y_ / 820, 0, 1) ** 1.4 * 200 + np.clip((y_ - 900) / 1020, 0, 1) ** 1.3 * 235
g_ = np.zeros((H, W, 4), np.uint8); g_[..., 0] = 18; g_[..., 1] = 11; g_[..., 2] = 7; g_[..., 3] = np.clip(a_, 0, 255)[:, None]
GRAD = Image.fromarray(g_, "RGBA")
def glass(im, box, t, t0, r=44, tint=(24, 15, 10), alpha=0.62, t1=None):
    p = (t - t0) / 0.5
    if p <= 0: return None
    a = cl(p * 2.2) * (1 - (cl((t - t1) / 0.3) if t1 else 0))
    if a <= 0.01: return None
    off = int(220 * (1 - back(p))); x0, y0, x1, y1 = [int(v) for v in box]; y0 += off; y1 += off
    reg = im.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(20))
    reg = Image.alpha_composite(reg, Image.new("RGBA", reg.size, tint + (int(255 * alpha),)))
    m = Image.new("L", reg.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, reg.width - 1, reg.height - 1], r, fill=int(255 * a))
    im.paste(reg, (x0, y0), m)
    ImageDraw.Draw(im, "RGBA").rounded_rectangle([x0, y0, x1, y1], r, outline=(255, 235, 210, int(60 * a)), width=2)
    return off
def T_(d, xy, s, sz, wt, col, t, t0, t1=None, anchor="la", dy=44):
    a = vis(t, t0, t1, 0.4)
    if a < 0.01: return
    y = xy[1] + dy * (1 - eo((t - t0) / 0.4))
    d.text((xy[0] + 3, y + 4), s, font=F(sz, wt), fill=(0, 0, 0, int(140 * a)), anchor=anchor)
    d.text((xy[0], y), s, font=F(sz, wt), fill=A(col, a), anchor=anchor)
def pop(im, cx, cy, s, sz, wt, col, t, t0, t1=None):
    p = (t - t0) / 0.35
    if p <= 0: return
    a = cl(p * 2) * (1 - (cl((t - t1) / 0.25) if t1 else 0))
    if a < 0.01: return
    sc = 1.9 - 0.9 * back(p) if p < 1 else 1.0
    f = F(sz, wt); w = int(f.getlength(s)) + 40; h = int(sz * 1.35)
    L = Image.new("RGBA", (w, h), (0, 0, 0, 0)); dd = ImageDraw.Draw(L)
    dd.text((22, h // 2 + 4), s, font=f, fill=(0, 0, 0, int(150 * a)), anchor="lm"); dd.text((20, h // 2), s, font=f, fill=A(col, a), anchor="lm")
    if sc != 1.0: L = L.resize((max(1, int(w * sc)), max(1, int(h * sc))), Image.BICUBIC)
    im.alpha_composite(L, (int(cx - L.width / 2), int(cy - L.height / 2)))
def pill(d, x, y, s, t, t0, bgc=CAF, fg=INK, sz=36, anchor="l"):
    a = vis(t, t0, None, 0.3)
    if a < 0.01: return
    f = F(sz, "Bold"); w = f.getlength(s) + sz * 1.3; h = sz * 1.9; x0 = x if anchor == "l" else x - w / 2
    d.rounded_rectangle([x0, y, x0 + w, y + h], h / 2, fill=A(bgc, a)); d.text((x0 + w / 2, y + h / 2), s, font=f, fill=A(fg, a), anchor="mm")
def ticker(d, x, y, sym, name, t, t0):  # insignia con símbolo bursátil, no logotipo
    a = vis(t, t0, None, 0.3)
    if a < 0.01: return
    f1 = F(40, "ExtraBold"); w1 = f1.getlength(sym) + 44
    d.rounded_rectangle([x, y, x + w1, y + 72], 18, fill=A(CRE, a)); d.text((x + w1 / 2, y + 36), sym, font=f1, fill=A(INK, a), anchor="mm")
    d.text((x + w1 + 20, y + 36), name, font=F(34, "SemiBold"), fill=A(CRE, a), anchor="lm")
def header(d, n, t, T):
    if n:
        pill(d, X, 150, f"Noticia {n} de {NN}", t, 0.05, sz=34)
        for k in range(NN):
            x0 = W - X - NN * 62 + k * 62 + 12; d.rounded_rectangle([x0, 180, x0 + 50, 192], 6, fill=(255, 255, 255, 60))
            p = 1 if k < n - 1 else (cl(t / T) if k == n - 1 else 0)
            if p > 0: d.rounded_rectangle([x0, 180, x0 + max(12, int(50 * p)), 192], 6, fill=CAF if k == n - 1 else CRE)
    else: d.text((W / 2, 120), "LANA CON CAFÉ", font=F(34, "Bold"), fill=A(CAF, cl(t / 0.5)), anchor="mm")
def credit(d, key, extra=None):
    c = CRED[key]; s = f"Foto: {c['artist'][:38]} · {c['license']} · Wikimedia Commons"
    if extra: d.text((X, 1800), extra, font=F(28, "Medium"), fill=(220, 205, 190, 190))
    d.text((X, 1846), s, font=F(24, "Medium"), fill=(220, 205, 190, 150))
def pct(v, dec=1): return ("+" if v >= 0 else "−") + f"{abs(v):.{dec}f}%"
def count(v0, v1, t, t0, dur=0.9): return v0 + (v1 - v0) * eo((t - t0) / dur)

def s0(im, d, t, T):
    header(d, 0, t, T)
    pop(im, W / 2, 600, "Jueves negro", 130, "ExtraBold", CRE, t, 0.4, t1=3.3); pop(im, W / 2, 760, "en Wall Street", 100, "ExtraBold", RED, t, 1.0, t1=3.3)
    o = glass(im, (X - 10, 470, W - X + 10, 760), t, 3.4, tint=(110, 35, 28), alpha=0.75, t1=6.0)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); a = vis(t, 3.4, 6.0)
        d.text((W / 2, 560 + o), "Dow Jones", font=F(70, "ExtraBold"), fill=A(CRE, a), anchor="mm")
        d.text((W / 2, 670 + o), f"−{int(count(0, 1101, t, 3.6, 1.2)):,} puntos", font=F(96, "ExtraBold"), fill=A(CRE, a), anchor="mm")
    pop(im, W / 2, 600, "Anthropic", 140, "ExtraBold", CRE, t, 6.1, t1=8.4); pop(im, W / 2, 760, "debuta en bolsa", 96, "ExtraBold", GRN, t, 6.5, t1=8.4)
    pop(im, W / 2, 600, "El peso", 140, "ExtraBold", CRE, t, 8.5, t1=11.2); pop(im, W / 2, 760, "en su peor nivel", 96, "ExtraBold", RED, t, 8.9, t1=11.2)
    pop(im, W / 2, 640, "5 noticias", 170, "ExtraBold", CRE, t, 11.3); T_(d, (W / 2, 760), "con café", 80, "Bold", CAF, t, 11.7, anchor="ma")
    T_(d, (W / 2, 880), "viernes 20 nov 2026", 42, "Medium", MUT, t, 12.0, anchor="ma")
    credit(d, "hook")

def s1(im, d, t, T):
    header(d, 1, t, T)
    T_(d, (X, 270), "Caída fuerte", 96, "ExtraBold", CRE, t, 0.5); T_(d, (X, 380), "en Nueva York", 96, "ExtraBold", RED, t, 0.7)
    o = glass(im, (X - 10, 560, W - X + 10, 1290), t, 1.6)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 600 + o), "Cierre del jueves 19 de noviembre", font=F(36, "SemiBold"), fill=MUT)
        rows = [("Dow Jones", -2.2, 2.2, "49,097"), ("S&P 500", -2.0, 4.4, "7,176"), ("Nasdaq", -2.3, 6.4, "23,879")]
        for i, (nm, v, t0, lvl) in enumerate(rows):
            y = 680 + i * 200 + o; a = vis(t, t0)
            if a < 0.01: continue
            d.text((X + 40, y), nm, font=F(58, "ExtraBold"), fill=A(CRE, a)); d.text((X + 40, y + 72), lvl + " puntos", font=F(32, "Medium"), fill=A(MUT, a))
            d.text((W - X - 40, y + 4), pct(v * eo((t - t0) / 0.7)), font=F(84, "ExtraBold"), fill=A(RED, a), anchor="ra")
            d.rounded_rectangle([X + 40, y + 132, W - X - 40, y + 146], 7, fill=(255, 255, 255, int(40 * a)))
            L = int(abs(v) / 2.5 * 400 * eo((t - t0) / 0.7)); d.rounded_rectangle([540 - L, y + 132, 540, y + 146], 7, fill=RED)
    o2 = glass(im, (X - 10, 1340, W - X + 10, 1560), t, 7.4, tint=(120, 40, 30), alpha=0.7)
    if o2 is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 1372 + o2), "El Dow perdió", font=F(36, "Medium"), fill=MUT)
        d.text((X + 40, 1425 + o2), "1,101 puntos en un día", font=F(68, "ExtraBold"), fill=CRE)
    credit(d, "wall", "Fuente: Yahoo Finance · Motley Fool (cierre del 19 nov)")

def s2(im, d, t, T):
    header(d, 2, t, T)
    T_(d, (X, 270), "Nvidia: récord", 96, "ExtraBold", CRE, t, 0.5); T_(d, (X, 380), "pero castigada", 96, "ExtraBold", RED, t, 0.7)
    ticker(d, X, 510, "NVDA", "Nvidia · Nasdaq", t, 1.0)
    o = glass(im, (X - 10, 630, W - X + 10, 1160), t, 1.3)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 665 + o), "Ventas del trimestre (dólares)", font=F(36, "SemiBold"), fill=MUT)
        d.text((X + 30, 710 + o), f"${count(0, 115.8, t, 1.5, 1.4):.1f} mil mill.", font=F(110, "ExtraBold"), fill=CRE)
        pill(d, X + 40, 870 + o, "+103% vs. hace un año", t, 4.4, bgc=(30, 90, 55), fg=CRE, sz=40)
        # barras: año pasado vs ahora
        for k, (lab, v, t0, col) in enumerate([("3T 2025", 57.0, 4.6, MUT), ("3T 2026", 115.8, 5.0, GRN)]):
            y = 990 + k * 70 + o; L = int(v / 115.8 * 640 * eo((t - t0) / 0.8))
            d.text((X + 40, y + 6), lab, font=F(30, "SemiBold"), fill=MUT)
            if L > 0: d.rounded_rectangle([X + 220, y, X + 220 + L, y + 44], 12, fill=col)
    o2 = glass(im, (X - 10, 1210, W - X + 10, 1450), t, 7.3, tint=(120, 40, 30), alpha=0.72)
    if o2 is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 1245 + o2), "Acción de Nvidia · jueves", font=F(36, "Medium"), fill=MUT)
        d.text((X + 40, 1300 + o2), "$145.98", font=F(96, "ExtraBold"), fill=CRE)
        d.text((W - X - 40, 1320 + o2), pct(-3.3 * eo((t - 7.5) / 0.7)), font=F(76, "ExtraBold"), fill=RED, anchor="ra")
    T_(d, (X, 1500), "El consejo dijo que Jensen Huang no regresará como CEO", 34, "SemiBold", MUT, t, 8.6)
    credit(d, "nvda", "Fuente: Nvidia (resultados) · Yahoo Finance · Motley Fool")

def s3(im, d, t, T):
    header(d, 3, t, T)
    T_(d, (X, 270), "Anthropic", 110, "ExtraBold", CRE, t, 0.5); T_(d, (X, 390), "debuta en bolsa", 88, "ExtraBold", GRN, t, 0.7)
    ticker(d, X, 520, "ANT", "Anthropic · Nasdaq", t, 1.6)
    o = glass(im, (X - 10, 650, W - X + 10, 1250), t, 2.6)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 685 + o), "Precio por acción · 19 nov (dólares)", font=F(34, "SemiBold"), fill=MUT)
        steps = [("Precio de salida", 83.00, 3.0, MUT), ("Apertura", 111.50, 4.3, CAF), ("Cierre", 97.17, 5.6, GRN)]
        x0, y1 = X + 60, 1180 + o; bw = 230; gap = 60
        for k, (lab, v, t0, col) in enumerate(steps):
            a = vis(t, t0)
            if a < 0.01: continue
            h = int(v / 111.5 * 330 * eo((t - t0) / 0.7)); xx = x0 + k * (bw + gap)
            d.rounded_rectangle([xx, y1 - h, xx + bw, y1], 18, fill=A(col, a))
            d.text((xx + bw / 2, y1 - h - 14), f"${v:.2f}", font=F(50, "ExtraBold"), fill=A(CRE, a), anchor="md")
            d.text((xx + bw / 2, y1 + 18), lab, font=F(28, "SemiBold"), fill=A(MUT, a), anchor="ma")
    pill(d, X, 1330, "+17.1% en su primer día", t, 6.6, bgc=(30, 90, 55), fg=CRE, sz=44)
    T_(d, (X, 1460), "Recaudó 81,300 millones de dólares", 40, "SemiBold", CRE, t, 7.4)
    credit(d, "ant", "Fuente: Forbes · Yahoo Finance")

def s4(im, d, t, T):
    header(d, 4, t, T)
    T_(d, (X, 270), "El peso", 110, "ExtraBold", CRE, t, 0.5); T_(d, (X, 390), "se debilita", 110, "ExtraBold", RED, t, 0.7)
    o = glass(im, (X - 10, 560, W - X + 10, 1010), t, 1.2)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 600 + o), "Pesos por dólar · cierre del jueves", font=F(36, "SemiBold"), fill=MUT)
        d.text((X + 30, 640 + o), f"${count(18.0, 19.08, t, 1.5, 1.4):.2f}", font=F(200, "ExtraBold"), fill=CRE)
        pill(d, X + 40, 880 + o, "Peor nivel desde junio de 2025", t, 4.0, bgc=(250, 222, 214), fg=(180, 50, 40), sz=38)
    for i, (nm, v, t0, col) in enumerate([("Tasa de Banxico", "6.25%", 6.6, CRE), ("FIX de hoy", "$19.03", 8.0, CAF)]):
        x = X - 10 + i * 480; o2 = glass(im, (x, 1060, x + 460, 1300), t, t0, r=38)
        if o2 is not None:
            d = ImageDraw.Draw(im, "RGBA"); d.text((x + 36, 1095 + o2), nm, font=F(34, "Medium"), fill=MUT); d.text((x + 36, 1150 + o2), v, font=F(96, "ExtraBold"), fill=col)
    T_(d, (X, 1350), "Más de 10% de caída desde septiembre (Infobae)", 34, "SemiBold", MUT, t, 8.6)
    credit(d, "peso", "Fuente: Banxico · Infobae · UnoTV")

def s5(im, d, t, T):
    header(d, 5, t, T)
    T_(d, (X, 270), "Bitcoin", 110, "ExtraBold", CRE, t, 0.4); T_(d, (X, 390), "sigue en rojo", 88, "ExtraBold", RED, t, 0.6)
    o = glass(im, (X - 10, 540, W - X + 10, 1200), t, 0.9)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 580 + o), f"Bitcoin · {PX['hora']} hora del centro de México", font=F(34, "SemiBold"), fill=MUT)
        v = count(PX['ini'], PX['btc'], t, 1.1, 1.4); d.text((X + 30, 620 + o), f"${int(round(v)):,}", font=F(170, "ExtraBold"), fill=CRE)
        pill(d, X + 40, 830 + o, f"{pct(PX['ch'])} en 24 h", t, 1.8, bgc=(120, 40, 30), fg=CRE, sz=34)
        cs = PX['closes']; x0, y0, x1, y1 = X + 40, 940 + o, W - X - 40, 1170 + o; lo, hi = min(cs), max(cs); n = len(cs)
        pts = [(x0 + (x1 - x0) * i / (n - 1), y1 - (y1 - y0) * (c - lo) / (hi - lo)) for i, c in enumerate(cs)]
        k = max(1, int(eo((t - 1.1) / 3.0) * (n - 1))); vv = pts[:k + 1]
        d.text((x1, y0 - 4), "últimas 48 h", font=F(26, "Medium"), fill=MUT, anchor="rs")
        if len(vv) > 1:
            d.polygon(vv + [(vv[-1][0], y1), (x0, y1)], fill=(232, 84, 70, 45)); d.line(vv, fill=RED, width=6, joint="curve")
            px, py = vv[-1]; d.ellipse([px - 12, py - 12, px + 12, py + 12], fill=RED)
    o2 = glass(im, (X - 10, 1250, W - X + 10, 1450), t, 4.0, r=38)
    if o2 is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 1280 + o2), "Ethereum", font=F(36, "Medium"), fill=MUT)
        d.text((X + 40, 1330 + o2), f"${PX['eth']:,.0f}", font=F(86, "ExtraBold"), fill=CRE); d.text((W - X - 40, 1345 + o2), pct(PX['ethch']), font=F(64, "ExtraBold"), fill=RED, anchor="ra")
    credit(d, "btc", "Fuente: Bitstamp (precio en vivo)")

def s6(im, d, t, T):
    header(d, 0, t, T)
    T_(d, (X, 300), "En resumen", 60, "SemiBold", MUT, t, 0.3)
    items = [("Wall Street en rojo", 1.0, (110, 35, 28)), ("Nvidia: récord y caída", 2.4, (24, 15, 10)), ("Anthropic +17%", 4.0, (30, 90, 55)), ("Peso débil", 5.3, (110, 35, 28))]
    for k, (nm, t0, tint) in enumerate(items):
        y = 400 + k * 230; oo = glass(im, (X - 10, y, W - X + 10, y + 195), t, t0, tint=tint, alpha=0.8)
        if oo is not None: d = ImageDraw.Draw(im, "RGBA"); d.text((X + 50, y + 98 + oo), nm, font=F(72, "ExtraBold"), fill=CRE, anchor="lm")
    T_(d, (W / 2, 1380), "Información, no asesoría financiera", 40, "Medium", MUT, t, 6.6, anchor="ma")
    credit(d, "res")

QR = Image.open(D + "/qr.png").convert("RGB").resize((480, 480), Image.NEAREST).convert("RGBA")
def s7(im, d, t, T):
    header(d, 0, t, T)
    T_(d, (W / 2, 260), "¿Quieres esto", 88, "ExtraBold", CRE, t, 0.3, anchor="ma"); T_(d, (W / 2, 360), "todos los días?", 88, "ExtraBold", CAF, t, 0.6, anchor="ma")
    o = glass(im, (X - 10, 520, W - X + 10, 1500), t, 1.4, tint=(250, 243, 232), alpha=0.97)
    if o is not None:
        if t > 1.6: im.alpha_composite(QR, (int(W / 2 - 240), 590 + o))
        d = ImageDraw.Draw(im, "RGBA")
        d.text((W / 2, 1160 + o), "Gratis en Telegram", font=F(46, "SemiBold"), fill=(110, 85, 65), anchor="mm")
        d.text((W / 2, 1275 + o), "@lanaconcafe", font=F(112, "ExtraBold"), fill=INK, anchor="mm")
        d.text((W / 2, 1395 + o), "Escanea el código", font=F(48, "Bold"), fill=CAF, anchor="mm")
    T_(d, (W / 2, 1600), "Nos vemos el lunes", 52, "SemiBold", MUT, t, 4.0, anchor="ma")
    credit(d, "cta")

SC = [(s0, "hook", (0.5, 0.4)), (s1, "wall", (0.6, 0.35)), (s2, "nvda", (0.5, 0.5)), (s3, "ant", (0.42, 0.5)),
      (s4, "peso", (0.3, 0.5)), (s5, "btc", (0.25, 0.5)), (s6, "res", (0.5, 0.5)), (s7, "cta", (0.5, 0.5))]
def durs():
    out = []
    for i in range(len(SC)):
        a = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{D}/v{i}.wav"]))
        out.append(round((a + (1.1 if i == len(SC) - 1 else 0.3) + 0.25) * FPS) / FPS)
    return out
def base(si, t, T):
    fn, key, focus = SC[si]; im = bg(key, t, T, focus); im.alpha_composite(GRAD); fn(im, ImageDraw.Draw(im, "RGBA"), t, T); return im
_nx = {}
def frame(si, t, Ds):
    T = Ds[si]; im = base(si, t, T)
    r = T - t
    if r < TR and si < len(SC) - 1:  # zoom a través: la escena sale acercándose y la siguiente entra desde lejos
        p = eo(1 - r / TR); z = 1 + 0.6 * p
        cw, ch = W / z, H / z; im = im.crop((int((W - cw) / 2), int((H - ch) / 2), int((W + cw) / 2), int((H + ch) / 2))).resize((W, H), Image.BILINEAR)
        if si not in _nx: _nx[si] = base(si + 1, 0.0, Ds[si + 1])
        nz = 0.75 + 0.25 * p; nx = _nx[si].resize((int(W * nz), int(H * nz)), Image.BILINEAR)
        lay = Image.new("RGBA", (W, H), (18, 11, 7, 255)); lay.paste(nx, ((W - nx.width) // 2, (H - nx.height) // 2))
        im = Image.blend(im, lay, cl((p - 0.15) / 0.85))
    return im.convert("RGB")
def render(si, Ds):
    T = Ds[si]; tmp = f"{D}/scene{si}.tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for i in range(int(round(T * FPS))): p.stdin.write(frame(si, i / FPS, Ds).tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, f"{D}/scene{si}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{D}/v{si}.wav", "-af", f"adelay=250|250,apad,atrim=0:{T}", "-ar", "48000", "-ac", "2", f"{D}/a{si}.wav"], check=True)
if __name__ == "__main__":
    Ds = durs()
    if sys.argv[1] == "stills":
        picks = [tuple(map(float, x.split(":"))) for x in sys.argv[2:]]
        S = 360; c = Image.new("RGB", (S * min(6, len(picks)), 640 * ((len(picks) + 5) // 6)))
        for k, (si, t) in enumerate(picks): c.paste(frame(int(si), t, Ds).resize((S, 640)), ((k % 6) * S, (k // 6) * 640))
        c.save(D + "/stills.png"); print(Ds, sum(Ds))
    elif sys.argv[1] == "full": si, t = int(sys.argv[2]), float(sys.argv[3]); frame(si, t, Ds).save(D + f"/full_{si}.png")
    elif sys.argv[1] == "scene": render(int(sys.argv[2]), Ds)
    elif sys.argv[1] == "join":
        open(D + "/list.txt", "w").write("".join(f"file '{D}/scene{i}.mp4'\n" for i in range(len(SC))))
        open(D + "/alist.txt", "w").write("".join(f"file '{D}/a{i}.wav'\n" for i in range(len(SC))))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", D + "/list.txt", "-c", "copy", D + "/v.mp4"], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", D + "/alist.txt", "-c:a", "pcm_s16le", D + "/voice_full.wav"], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", D + "/v.mp4", "-i", D + "/voice_full.wav", "-map", "0:v", "-map", "1:a", "-vf", "scale=720:1280:flags=lanczos",
                        "-c:v", "libx264", "-crf", "34", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-af", "loudnorm=I=-14:TP=-1.5",
                        "-movflags", "+faststart", "-shortest", D + "/final.mp4"], check=True)
        print(Ds, sum(Ds), os.path.getsize(D + "/final.mp4") / 1e6, "MB")
