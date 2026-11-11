"""Cuadros iniciales del comercial: cambia el estampado de la espalda por los diseños originales de la tienda.
Uso: python3 scripts/arte/comercial.py"""
import os
import cv2, numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ESC = ROOT + "/docs/comercial/escenas/"
ART = ROOT + "/assets/print/"
OUT = ROOT + "/docs/comercial/"
UP = 3  # se amplía 3x para que la IA de video tenga más detalle

# escena, diseño, caja del estampado viejo (x0,y0,x1,y1), centro y ancho del diseño nuevo, prenda clara?
SHOTS = [
    ("c1-3", "real-ajolote.png", (115, 150, 345, 360), (215, 262, 165), False, "cuadro-1-ajolote"),
    ("c2-4", "real-jaguar.png", (130, 100, 260, 300), (198, 212, 108), False, "cuadro-2-jaguar"),
    ("c1-7", "real-ola.png", (55, 135, 245, 310), (150, 228, 175), True, "cuadro-3-ola"),
]


def composite(scene, art, box, place, light, name):
    im = cv2.imread(ESC + scene + ".jpg")
    im = cv2.resize(im, None, fx=UP, fy=UP, interpolation=cv2.INTER_LANCZOS4)
    x0, y0, x1, y1 = [v * UP for v in box]
    # máscara del estampado viejo: píxeles que contrastan con la tela dentro de la caja
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.int16)
    region = g[y0:y1, x0:x1]
    base = np.median(region)
    m = np.zeros(g.shape, np.uint8)
    m[y0:y1, x0:x1] = (np.abs(region - base) > 22).astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((9, 9), np.uint8), iterations=2)
    clean = cv2.inpaint(im, m, 9, cv2.INPAINT_TELEA)
    clean = cv2.GaussianBlur(clean, (0, 0), 0.6) * (m[..., None] > 0) + clean * (m[..., None] == 0)
    clean = clean.astype(np.uint8)
    # sombreado de la tela (arrugas y luz) para que el diseño se vea impreso, no pegado
    lum = cv2.GaussianBlur(cv2.cvtColor(clean, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 3 * UP)
    ref = np.median(lum[y0:y1, x0:x1])
    shade = np.clip(lum / max(ref, 1), 0.55, 1.35)[..., None]
    a = Image.open(ART + art).convert("RGBA")
    a = a.crop(a.getbbox())
    cx, cy, w = [v * UP for v in place]
    h = int(a.height * w / a.width)
    a = a.resize((w, h), Image.LANCZOS)
    arr = np.asarray(a).astype(np.float32) / 255
    rgb, al = arr[..., :3][..., ::-1], arr[..., 3:] * 0.94
    px, py = int(cx - w / 2), int(cy - h / 2)
    out = clean.astype(np.float32) / 255
    # solo se imprime sobre la tela: el cabello, los brazos y el fondo quedan encima
    gl = cv2.cvtColor(clean, cv2.COLOR_BGR2GRAY)[py:py + h, px:px + w].astype(np.float32)
    cloth = (gl > base * 0.7) if light else (gl < max(base * 1.8, 45))
    cloth = cv2.GaussianBlur(cv2.erode(cloth.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32), (0, 0), 1.5)
    al = al * cloth[..., None]
    tile = out[py:py + h, px:px + w]
    ink = rgb * shade[py:py + h, px:px + w] * (0.93 if not light else 0.97)
    if light:  # tinta sobre tela clara: se mezcla multiplicando
        ink = tile * (1 - al) + (tile * rgb) * al
        out[py:py + h, px:px + w] = ink
    else:
        out[py:py + h, px:px + w] = tile * (1 - al) + ink * al
    out = (np.clip(out, 0, 1) * 255).astype(np.uint8)
    # grano leve para igualar la foto
    noise = np.random.default_rng(1).normal(0, 2.2, out.shape)
    out = np.clip(out + noise, 0, 255).astype(np.uint8)
    pil = Image.fromarray(out[..., ::-1]).filter(ImageFilter.UnsharpMask(2, 60, 2))
    pil.save(OUT + name + ".jpg", quality=94)
    print("ok", name, pil.size)


if __name__ == "__main__":
    for s in SHOTS:
        composite(*s)


# --- formato vertical, cierre y maqueta de 8 s ---------------------------------
import subprocess, shutil, sys
from PIL import ImageDraw, ImageFont

W, H = 1080, 1920
DARK, CREAM, RED, MUTED = (16, 15, 14), (236, 228, 212), (178, 40, 32), (150, 140, 128)


def vertical(name):
    """Recorta al centro en 9:16 y lo lleva a 1080x1920 para usarlo como cuadro inicial."""
    im = Image.open(OUT + name + ".jpg")
    w = int(im.height * 9 / 16)
    x = (im.width - w) // 2
    v = im.crop((x, 0, x + w, im.height)).resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 50, 2))
    v.save(OUT + name + "-9x16.jpg", quality=94)
    return v


def end_card(fonts):
    anton = lambda s: ImageFont.truetype(fonts + "/anton-latin-400-normal.ttf", s)
    mont = lambda w, s: ImageFont.truetype(fonts + f"/montserrat-latin-{w}-normal.ttf", s)
    c = Image.new("RGB", (W, H), DARK)
    d = ImageDraw.Draw(c)
    d.ellipse((W / 2 - 150, 520, W / 2 + 150, 820), fill=RED)
    d.text((W / 2, 1050), "HSTLRS", font=anton(210), fill=CREAM, anchor="ms")
    d.text((W / 2, 1150), "ARTE QUE SE USA", font=mont(600, 46), fill=CREAM, anchor="ms")
    d.text((W / 2, 1290), "hstlrs-shop.github.io", font=mont(500, 40), fill=MUTED, anchor="ms")
    d.rounded_rectangle((W / 2 - 330, 1360, W / 2 + 330, 1460), radius=8, fill=RED)
    d.text((W / 2, 1426), "10% CON HSTLR10", font=mont(700, 40), fill=CREAM, anchor="ms")
    c.save(OUT + "cierre-9x16.png")
    return c


def clip(frames, fps, path):
    tmp = OUT + "_f/"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    for i, f in enumerate(frames):
        f.save(f"{tmp}{i:04d}.jpg", quality=90)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", tmp + "%04d.jpg",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", path], check=True)
    shutil.rmtree(tmp)


def push(img, t, z0=1.0, z1=1.08):
    z = z0 + (z1 - z0) * t
    w, h = int(W * z), int(H * z)
    return img.resize((w, h), Image.BILINEAR).crop(((w - W) // 2, (h - H) // 2, (w - W) // 2 + W, (h - H) // 2 + H))


def animatic(shots, card, fps=30):
    """Maqueta de 8 s para ver el ritmo antes de generar en ElevenLabs (no es el comercial final)."""
    plan = [(shots[0], 2.5), (shots[1], 2.0), (shots[2], 1.8), (card, 1.7)]
    frames = []
    for img, secs in plan:
        n = int(secs * fps)
        for f in range(n):
            fr = push(img, f / n)
            if f < 4 and frames:  # corte con destello corto
                fr = Image.blend(Image.new("RGB", (W, H), (255, 255, 255)), fr, 0.5 + f / 8)
            frames.append(fr)
    clip(frames, fps, OUT + "maqueta-8s.mp4")
    cf = [push(card, f / 60, 1.0, 1.04) for f in range(60)]
    clip(cf, fps, OUT + "cierre-2s.mp4")


if __name__ == "__main__" and len(sys.argv) > 1:
    v = [vertical(s[-1]) for s in SHOTS]
    card = end_card(sys.argv[1])
    animatic(v, card)
    print("vertical, cierre y maqueta ok")
