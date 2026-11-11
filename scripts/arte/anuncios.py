"""Anuncios de Instagram HSTLRS: feed 4:5 (1080x1350), historias 9:16 (1080x1920) y reel MP4.
Uso: python3 scripts/arte/anuncios.py <carpeta de fuentes .ttf>"""
import os, subprocess, sys, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage

FONTS = sys.argv[1] if len(sys.argv) > 1 else "fonts/"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "assets/img/printful/")
OUT = os.path.join(ROOT, "docs/anuncios/")
os.makedirs(OUT, exist_ok=True)

DARK, CREAM, RED, INK, MUTED = (20, 18, 16), (236, 228, 212), (178, 40, 32), (24, 22, 20), (150, 140, 128)
anton = lambda s: ImageFont.truetype(FONTS + "/anton-latin-400-normal.ttf", s)
mont = lambda w, s: ImageFont.truetype(FONTS + f"/montserrat-latin-{w}-normal.ttf", s)

ADS = [  # (foto, fondo oscuro?, titular, producto, precio)
    ("hoodie-jaguar-back", True, "EL JAGUAR\nNO PIDE PERMISO", "Hoodie Jaguar", "$1,299"),
    ("studio07-back", True, "LEJOS DE\nXOCHIMILCO", "Playera Ajolote astronauta", "$849"),
    ("studio10-back", False, "LA OLA,\nCON SOL ROJO", "Playera La ola", "$849"),
    ("crew-calavera-back", False, "TODOS SOMOS\nCALAVERAS", "Crewneck Calavera · Posada", "$1,199"),
    ("studio09-back", True, "1515.\nARTE QUE SE USA", "Playera Rinoceronte · Durero", "$849"),
    ("hoodie-ajolote-back", True, "ARTE A TODO\nCOLOR", "Hoodie Ajolote astronauta", "$1,299"),
]


def cutout(name, size):
    im = Image.open(SRC + name + ".jpg").convert("RGB").resize((size, size), Image.LANCZOS)
    a = np.asarray(im).min(axis=2) < 246
    a = ndimage.binary_fill_holes(ndimage.binary_closing(a, iterations=3))
    m = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA"); out.putalpha(m)
    return out


def spaced(d, xy, text, font, fill, track, anchor="center"):
    ws = [d.textlength(c, font=font) for c in text]
    total = sum(ws) + track * (len(text) - 1)
    x, y = xy
    x = x - total / 2 if anchor == "center" else x
    for c, w in zip(text, ws):
        d.text((x, y), c, font=font, fill=fill, anchor="ls"); x += w + track


def glow(c, cx, cy, r, color):
    g = Image.new("RGBA", c.size, (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (255,))
    c.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.45)))


def ad(photo, dark, headline, product, price, W, H, story=False):
    bg, fg, sub = (DARK, CREAM, MUTED) if dark else (CREAM, INK, (110, 100, 90))
    c = Image.new("RGBA", (W, H), bg + (255,))
    # posiciones fijas (en historias se respetan las zonas seguras de arriba y abajo)
    L = dict(logo=290, h1=430, lh=112, prod=(570, 800), name=1395, price=1450, offer=1497, btn=1525) if story else \
        dict(logo=78, h1=200, lh=100, prod=(300, 760), name=1110, price=1162, offer=1205, btn=1230)
    py, size = L["prod"]
    glow(c, W // 2, py + size // 2, 320, RED if dark else (220, 200, 175))
    d = ImageDraw.Draw(c)
    spaced(d, (W / 2, L["logo"]), "HSTLRS", mont(600, 32), fg, 16)
    hf = anton(L["lh"] - 6)
    for i, line in enumerate(headline.split("\n")):
        d.text((W / 2, L["h1"] + i * L["lh"]), line, font=hf, fill=fg, anchor="ms")
    prod = cutout(photo, size)
    sm = Image.new("L", (W, H), 0); sm.paste(prod.split()[3], ((W - size) // 2 + 18, py + 26))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow.putalpha(sm.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * (0.55 if dark else 0.25))))
    c.alpha_composite(shadow)
    c.alpha_composite(prod, ((W - size) // 2, py))
    d = ImageDraw.Draw(c)
    d.text((W / 2, L["name"]), product, font=mont(600, 38), fill=fg, anchor="ms")
    d.text((W / 2, L["price"]), price + " MXN", font=mont(700, 44), fill=CREAM if dark else RED, anchor="ms")
    d.text((W / 2, L["offer"]), "10% en tu primera compra con HSTLR10", font=mont(500, 27), fill=sub, anchor="ms")
    bw, bh = 500, 84
    bx, by = (W - bw) // 2, L["btn"]
    d.rounded_rectangle((bx, by, bx + bw, by + bh), radius=6, fill=RED)
    spaced(d, (W / 2, by + 55), "COMPRA AHORA", mont(700, 30), CREAM, 6)
    return c.convert("RGB")


def collection(W, H, story=False):
    c = Image.new("RGBA", (W, H), DARK + (255,))
    d = ImageDraw.Draw(c)
    top = 250 if story else 70
    spaced(d, (W / 2, top + 40), "HSTLRS", mont(600, 32), CREAM, 16)
    d.text((W / 2, top + 160), "NUEVA COLECCIÓN", font=anton(110), fill=CREAM, anchor="ms")
    d.text((W / 2, top + 220), "Arte realista en playeras y sudaderas", font=mont(500, 34), fill=MUTED, anchor="ms")
    picks = ["hoodie-jaguar-back", "studio07-back", "studio10-back", "crew-calavera-back"]
    cell = 450 if story else 380
    gx, gy = (W - 2 * cell - 20) // 2, top + (300 if story else 260)
    for i, p in enumerate(picks):
        tile = Image.new("RGBA", (cell, cell), (34, 31, 28, 255))
        prod = cutout(p, cell - 30)
        tile.alpha_composite(prod, (15, 15))
        c.alpha_composite(tile, (gx + (i % 2) * (cell + 20), gy + (i // 2) * (cell + 20)))
    d = ImageDraw.Draw(c)
    by = gy + 2 * cell + 20 + 60
    d.text((W / 2, by), "Desde $849 · Envío a todo México", font=mont(600, 38), fill=CREAM, anchor="ms")
    bw, bh = 520, 92
    d.rounded_rectangle(((W - bw) // 2, by + 40, (W + bw) // 2, by + 40 + bh), radius=6, fill=RED)
    spaced(d, (W / 2, by + 100), "VER COLECCIÓN", mont(700, 32), CREAM, 6)
    return c.convert("RGB")


def reel(path, fps=30):
    """Reel 9:16 de ~16 s: intro, 6 prendas con zoom lento, cierre con oferta. Sin audio (agrega música en Instagram)."""
    W, H = 1080, 1920
    tmp = OUT + "_frames/"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    scenes = []
    intro = Image.new("RGB", (W, H), DARK); d = ImageDraw.Draw(intro)
    d.text((W / 2, 860), "ARTE", font=anton(260), fill=CREAM, anchor="ms")
    d.text((W / 2, 1110), "QUE SE USA", font=anton(150), fill=RED, anchor="ms")
    spaced(d, (W / 2, 1300), "HSTLRS", mont(600, 40), MUTED, 18)
    scenes.append((intro, 1.6))
    for photo, dark, headline, product, price in ADS:
        scenes.append((ad(photo, dark, headline, product, price, W, H, story=True), 2.1))
    outro = collection(W, H, story=True)
    scenes.append((outro, 2.4))
    n = 0
    for img, secs in scenes:
        frames = int(secs * fps)
        for f in range(frames):
            z = 1 + 0.06 * f / frames                       # zoom lento
            w, h = int(W * z), int(H * z)
            fr = img.resize((w, h), Image.BILINEAR).crop(((w - W) // 2, (h - H) // 2, (w - W) // 2 + W, (h - H) // 2 + H))
            if f < 6:                                        # fundido desde negro
                fr = Image.blend(Image.new("RGB", (W, H), DARK), fr, f / 6)
            fr.save(f"{tmp}{n:05d}.jpg", quality=88); n += 1
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", tmp + "%05d.jpg",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", path], check=True)
    shutil.rmtree(tmp)


if __name__ == "__main__":
    for i, a in enumerate(ADS, 1):
        name = a[0].replace("-back", "")
        ad(*a, 1080, 1350).save(f"{OUT}feed-{i:02d}-{name}.jpg", quality=92)
        ad(*a, 1080, 1920, story=True).save(f"{OUT}historia-{i:02d}-{name}.jpg", quality=92)
    collection(1080, 1350).save(f"{OUT}feed-00-coleccion.jpg", quality=92)
    collection(1080, 1920, story=True).save(f"{OUT}historia-00-coleccion.jpg", quality=92)
    print("imágenes ok", flush=True)
    reel(OUT + "reel-coleccion.mp4")
    print("reel ok")
