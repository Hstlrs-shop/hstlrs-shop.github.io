"""Publicaciones de Instagram: crewnecks nuevos, colores y fotos con modelo.
Uso: python3 scripts/arte/posts_ig.py <carpeta de fuentes .ttf>
Salida: docs/redes/nov/ (feed 1080x1350 e historias 1080x1920)."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anuncios as A  # reutiliza fuentes, recorte y estilos

ROOT = A.ROOT
P = os.path.join(ROOT, "assets/img/printful/")
M = os.path.join(ROOT, "assets/img/modelos/")
OUT = os.path.join(ROOT, "docs/redes/nov/")
os.makedirs(OUT, exist_ok=True)
DARK, CREAM, RED, MUTED = A.DARK, A.CREAM, A.RED, A.MUTED
W, H = 1080, 1350


def base(bg=DARK):
    return Image.new("RGBA", (W, H), bg + (255,))


def header(d, fg, top=78):
    A.spaced(d, (W / 2, top), "HSTLRS", A.mont(600, 30), fg, 16)


def footer(d, text, fg, y=H - 70):
    d.text((W / 2, y), text, font=A.mont(500, 28), fill=fg, anchor="ms")


def product(c, name, size, cx, cy, shadow=True):
    prod = A.cutout(name, size)
    x, y = int(cx - size / 2), int(cy - size / 2)
    if shadow:
        sm = Image.new("L", c.size, 0); sm.paste(prod.split()[3], (x + 16, y + 24))
        sh = Image.new("RGBA", c.size, (0, 0, 0, 0))
        sh.putalpha(sm.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * 0.45)))
        c.alpha_composite(sh)
    c.alpha_composite(prod, (x, y))


def save(c, name):
    c.convert("RGB").save(OUT + name + ".jpg", quality=92)
    print("ok", name, flush=True)


# 1) Carrusel: lanzamiento de crewnecks
def carrusel_crew():
    c = base(); d = ImageDraw.Draw(c); header(d, CREAM)
    A.glow(c, W // 2, 760, 330, RED)
    d = ImageDraw.Draw(c)
    d.text((W / 2, 300), "NUEVOS", font=A.anton(150), fill=CREAM, anchor="ms")
    d.text((W / 2, 440), "CREWNECKS", font=A.anton(150), fill=CREAM, anchor="ms")
    product(c, "crew-jaguar-negro", 620, W / 2, 860)
    d = ImageDraw.Draw(c)
    d.text((W / 2, 1230), "Ajolote · Jaguar · La ola · desliza", font=A.mont(600, 36), fill=CREAM, anchor="ms")
    save(c, "01-crewnecks-1-portada")
    slides = [("crew-ajolote-negro", "AJOLOTE ASTRONAUTA", DARK, CREAM),
              ("crew-jaguar-marino", "JAGUAR", DARK, CREAM),
              ("crew-ola-hueso", "LA OLA", CREAM, A.INK)]
    for i, (ph, title, bg, fg) in enumerate(slides, 2):
        c = base(bg); d = ImageDraw.Draw(c); header(d, fg)
        d.text((W / 2, 220), title, font=A.anton(110), fill=fg, anchor="ms")
        product(c, ph, 900, W / 2, 740)
        d = ImageDraw.Draw(c)
        d.text((W / 2, 1250), "Crewneck · $1,199 · 8 colores", font=A.mont(600, 36), fill=fg, anchor="ms")
        save(c, f"01-crewnecks-{i}-{ph.split('-')[1]}")
    c = base(); d = ImageDraw.Draw(c); header(d, CREAM)
    d.text((W / 2, 560), "ARTE QUE", font=A.anton(150), fill=CREAM, anchor="ms")
    d.text((W / 2, 710), "SE USA", font=A.anton(150), fill=RED, anchor="ms")
    d.text((W / 2, 830), "Hecho bajo pedido en México", font=A.mont(500, 36), fill=MUTED, anchor="ms")
    d.rounded_rectangle((W / 2 - 300, 930, W / 2 + 300, 1030), radius=8, fill=RED)
    d.text((W / 2, 997), "10% CON HSTLR10", font=A.mont(700, 38), fill=CREAM, anchor="ms")
    footer(d, "Enlace en la bio", MUTED, 1200)
    save(c, "01-crewnecks-5-cierre")


# 2) Foto con modelo: Hoodie Jaguar
def modelo_jaguar():
    im = Image.open(M + "hoodie-jaguar-modelo-1.jpg").convert("RGBA").resize((W, H), Image.LANCZOS)
    grad = Image.new("L", (1, H))
    for y in range(H): grad.putpixel((0, y), int(max(0, (y - H * 0.62) / (H * 0.38)) * 235))
    shade = Image.new("RGBA", (W, H), (12, 10, 9, 255)); shade.putalpha(grad.resize((W, H)))
    im.alpha_composite(shade)
    d = ImageDraw.Draw(im)
    d.text((70, 1170), "EL JAGUAR", font=A.anton(120), fill=CREAM, anchor="ls")
    d.text((70, 1265), "NO PIDE PERMISO.", font=A.anton(80), fill=CREAM, anchor="ls")
    A.spaced(d, (W - 250, 1180), "HSTLRS", A.mont(600, 26), CREAM, 12, anchor="left")
    d.text((W - 70, 1265), "Hoodie · $1,299", font=A.mont(600, 32), fill=CREAM, anchor="rs")
    save(im, "02-hoodie-jaguar-modelo")


# 3) Carrusel: 8 colores (crewneck jaguar)
COLS = [("negro", "Negro"), ("carbon", "Carbón"), ("marino", "Marino"), ("gris", "Gris"),
        ("hueso", "Hueso"), ("arena", "Arena"), ("latte", "Latte"), ("blanco", "Blanco")]


def grid(photo, title, cols, name, bg=CREAM, fg=None):
    fg = fg or A.INK
    c = base(bg); d = ImageDraw.Draw(c); header(d, fg)
    d.text((W / 2, 220), title, font=A.anton(100), fill=fg, anchor="ms")
    n = len(cols); per = 4 if n > 6 else 3 if n > 4 else n
    rows = (n + per - 1) // per
    cell = 240 if per == 4 else 300
    gx = (W - per * cell - (per - 1) * 12) / 2; gy = 290
    for i, (sl, label) in enumerate(cols):
        x = gx + (i % per) * (cell + 12); y = gy + (i // per) * (cell + 70)
        tile = Image.new("RGBA", (cell, cell), (255, 255, 255, 255))
        tile.alpha_composite(A.cutout(f"{photo}-{sl}", cell - 10), (5, 5))
        c.alpha_composite(tile, (int(x), int(y)))
        d = ImageDraw.Draw(c)
        d.text((x + cell / 2, y + cell + 42), label, font=A.mont(600, 28), fill=fg, anchor="ms")
    d.text((W / 2, H - 90), "Elige tu color · hstlrs-shop.github.io", font=A.mont(500, 30), fill=fg, anchor="ms")
    save(c, name)


# 4) Calavera en tinta clara sobre negro
def calavera():
    c = base(); d = ImageDraw.Draw(c); header(d, CREAM)
    d.text((W / 2, 250), "AHORA EN NEGRO", font=A.anton(110), fill=CREAM, anchor="ms")
    d.text((W / 2, 320), "La calavera de Posada, en tinta clara", font=A.mont(500, 34), fill=MUTED, anchor="ms")
    A.glow(c, W // 2, 820, 300, RED)
    product(c, "crew-calavera-negro", 820, W / 2, 820)
    d = ImageDraw.Draw(c)
    d.text((W / 2, 1270), "Crewneck Calavera · $1,199", font=A.mont(600, 36), fill=CREAM, anchor="ms")
    save(c, "04-calavera-negro")


# 5) Historia: encuesta de color
def historia_encuesta():
    c = Image.new("RGBA", (1080, 1920), DARK + (255,)); d = ImageDraw.Draw(c)
    A.spaced(d, (540, 290), "HSTLRS", A.mont(600, 32), CREAM, 16)
    d.text((540, 450), "¿CUÁL TE LLEVAS?", font=A.anton(110), fill=CREAM, anchor="ms")
    for i, (ph, label) in enumerate([("crew-ola-negro", "NEGRO"), ("crew-ola-hueso", "HUESO")]):
        tile = Image.new("RGBA", (470, 470), (255, 255, 255, 255))
        tile.alpha_composite(A.cutout(ph, 450), (10, 10))
        c.alpha_composite(tile, (60 + i * 490, 560))
        d = ImageDraw.Draw(c)
        d.text((60 + i * 490 + 235, 1100), label, font=A.anton(70), fill=CREAM, anchor="ms")
    d.text((540, 1240), "Crewneck La ola · $1,199", font=A.mont(500, 32), fill=MUTED, anchor="ms")
    c.convert("RGB").save(OUT + "05-historia-encuesta-ola.jpg", quality=92); print("ok historia", flush=True)


if __name__ == "__main__" and (len(sys.argv) < 3):
    carrusel_crew()
    modelo_jaguar()
    grid("crew-jaguar", "8 COLORES", COLS, "03-colores-crew-jaguar")
    calavera()
    grid("crewneck", "MONOGRAMA HR", [("hueso", "Hueso"), ("carbon", "Carbón"), ("negro", "Negro"), ("marino", "Marino"),
                                       ("arena", "Arena"), ("latte", "Latte"), ("blanco", "Blanco")], "06-monograma-colores")
    historia_encuesta()


# ---------- Publicaciones con modelos (fotos de docs/comercial con los diseños de la tienda) ----------
C = os.path.join(ROOT, "docs/comercial/")
MODELOS = [  # foto, titular (2 líneas), prenda y precio, archivo
    ("cuadro-1-ajolote", ("LEJOS DE", "XOCHIMILCO."), "Playera Ajolote astronauta · $849", "07-lookbook-1-ajolote"),
    ("cuadro-2-jaguar", ("EL JAGUAR", "VA CONTIGO."), "Playera Jaguar · $849", "07-lookbook-2-jaguar"),
    ("cuadro-3-ola", ("LA OLA,", "CON SOL ROJO."), "Playera La ola · $849", "07-lookbook-3-ola"),
    ("modelo-escalera", ("SUBE", "A PULSO."), "Playera Escalera al sol · $849", "07-lookbook-4-escalera"),
    ("modelo-calavera", ("TODOS SOMOS", "CALAVERAS."), "Playera Calavera · $849", "07-lookbook-5-calavera"),
    ("modelo-topografia", ("TU RUTA,", "TU MAPA."), "Playera Topografía · $849", "07-lookbook-6-topografia"),
]


def crop45(im):
    w, h = im.size
    if w / h > 0.8:
        nw = int(h * 0.8); x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / 0.8); return im.crop((0, 0, w, nh))


def modelo_post(src, lines, label, name):
    im = crop45(Image.open(C + src + ".jpg").convert("RGB")).resize((W, H), Image.LANCZOS).convert("RGBA")
    grad = Image.new("L", (1, H))
    for y in range(H): grad.putpixel((0, y), int(max(0, (y - H * 0.66) / (H * 0.34)) * 230))
    shade = Image.new("RGBA", (W, H), (12, 10, 9, 255)); shade.putalpha(grad.resize((W, H)))
    im.alpha_composite(shade)
    d = ImageDraw.Draw(im)
    d.text((64, 1160), lines[0], font=A.anton(96), fill=CREAM, anchor="ls")
    d.text((64, 1262), lines[1], font=A.anton(96), fill=CREAM, anchor="ls")
    A.spaced(d, (W - 230, 1170), "HSTLRS", A.mont(600, 24), CREAM, 11, anchor="left")
    d.text((W - 64, 1262), label.split(" · ")[1], font=A.mont(700, 34), fill=CREAM, anchor="rs")
    save(im, name)


def portada_lookbook():
    """Portada del carrusel con 4 fotos de modelos."""
    c = base(); d = ImageDraw.Draw(c); header(d, CREAM)
    d.text((W / 2, 230), "LOOKBOOK DROP 01", font=A.anton(100), fill=CREAM, anchor="ms")
    srcs = ["cuadro-1-ajolote", "cuadro-2-jaguar", "cuadro-3-ola", "modelo-calavera"]
    cw, ch = 470, 470
    for i, s in enumerate(srcs):
        im = Image.open(C + s + ".jpg").convert("RGB")
        w, h = im.size; side = min(w, h); im = im.crop(((w - side) // 2, 0, (w + side) // 2, side)).resize((cw, ch), Image.LANCZOS)
        c.paste(im, (int(W / 2 - cw - 8 + (i % 2) * (cw + 16)), 290 + (i // 2) * (ch + 16)))
    d = ImageDraw.Draw(c)
    d.text((W / 2, 1300), "Arte que se usa · desliza", font=A.mont(600, 34), fill=CREAM, anchor="ms")
    save(c, "07-lookbook-0-portada")


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "modelos":
    portada_lookbook()
    for m in MODELOS:
        modelo_post(*m)
