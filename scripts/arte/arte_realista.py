"""Arte realista HSTLRS: prepara archivos de impresión 3600x4800 (12x16 in, 300 dpi) con fondo transparente."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops
from scipy import ndimage

S = "/tmp/claude-0/-home-user/59e60ba7-ae74-5c90-9f57-88be62d1463b/scratchpad/ai/src/"
O = "/tmp/claude-0/-home-user/59e60ba7-ae74-5c90-9f57-88be62d1463b/scratchpad/ai/out/"
W, H = 3600, 4800
CREAM = (233, 223, 202)
INK = (30, 28, 26)
RED = (178, 40, 32)


def canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def place(c, im, cx, cy, w):
    h = int(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    c.alpha_composite(im, (int(cx - w / 2), int(cy - h / 2)))
    return c


def cut_white(path, thr=232):
    """Quita el fondo blanco conectado a los bordes y suaviza el contorno."""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    white = (a.min(axis=2) >= thr)
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # huecos blancos encerrados (entre flores, etc.) también son fondo si son grandes
    white2 = a.min(axis=2) >= 244
    lab2, n2 = ndimage.label(white2)
    sizes = ndimage.sum(white2, lab2, range(1, n2 + 1))
    big = [i + 1 for i, sz in enumerate(sizes) if sz > 1500]
    bg |= np.isin(lab2, big)
    bg = ndimage.binary_dilation(bg, iterations=2)
    alpha = Image.fromarray(((~bg) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def engraving(path, crop=None, ink=CREAM, gamma=1.0, erase=(), upscale=1, thresh=None):
    """Convierte un grabado sobre papel en tinta sobre transparente."""
    im = Image.open(path).convert("L")
    if crop:
        im = im.crop(crop)
    d = ImageDraw.Draw(im)
    for box in erase:  # borra textos del grabado original
        d.rectangle(box, fill=255)
    if upscale != 1:
        im = im.resize((int(im.width * upscale), int(im.height * upscale)), Image.LANCZOS)
    g = np.asarray(im).astype(np.float32)
    paper = ndimage.uniform_filter(ndimage.maximum_filter(g, 41), 81)  # normaliza el tono del papel
    g = np.clip(g / np.maximum(paper, 1), 0, 1)
    dark = 1 - g
    if thresh is not None:
        dark = np.clip((dark - thresh) / 0.12, 0, 1)
    else:
        dark = np.clip((dark - 0.08) / 0.6, 0, 1) ** gamma
    out = Image.new("RGBA", im.size, ink + (255,))
    out.putalpha(Image.fromarray((dark * 255).astype(np.uint8)))
    return out


def sun(c, cx, cy, r, color=RED, seed=3):
    s = canvas()
    ImageDraw.Draw(s).ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (255,))
    rng = np.random.default_rng(seed)
    a = np.asarray(s.split()[3]).astype(np.float32)
    noise = ndimage.gaussian_filter(rng.random((H, W)).astype(np.float32), 1.2)
    a = a * (noise > 0.47)
    s.putalpha(Image.fromarray(a.astype(np.uint8)))
    c.alpha_composite(s)


def save(c, name):
    c.save(O + name + ".png", optimize=True)
    print("ok", name, flush=True)


if __name__ == "__main__":
    import os, sys
    os.makedirs(O, exist_ok=True)
    which = sys.argv[1] if len(sys.argv) > 1 else "all"

    if which in ("all", "ajolote"):
        c = canvas(); place(c, cut_white(S + "ajolote.png"), W / 2, H / 2, 3300); save(c, "ajolote")
    if which in ("all", "jaguar"):
        c = canvas(); place(c, cut_white(S + "jaguar.png"), W / 2, H / 2, 3200); save(c, "jaguar")

    if which in ("all", "rinoceronte"):
        # Durero 1515: sin el texto superior ni el título; sol rojo detrás; trazo crema para prenda negra
        r = engraving(S + "DT241450.jpg", crop=(60, 420, 3780, 3000), erase=[(2250, 0, 3720, 360)], gamma=0.9)
        c = canvas(); sun(c, 2350, 1500, 1050)
        place(c, r, W / 2, 2650, 3500); save(c, "rinoceronte")
    if which in ("all", "ola"):
        # Hokusai: la ola dentro de un círculo con sol rojo en lugar del cielo
        im = Image.open(S + "DP130155.jpg").convert("RGB")
        box = (150, 150, 2650, 2550)  # cuadrado sobre la ola grande
        sq = im.crop(box).resize((3000, 3000), Image.LANCZOS)
        a = np.asarray(sq).astype(np.int16)
        # cielo/papel (tonos beige claros) a transparente para dejar ver el sol
        paperish = (a[..., 0] > 175) & (a[..., 2] < a[..., 0] - 12) & (a[..., 1] > 150)
        lab, _ = ndimage.label(paperish)
        top = set(np.unique(lab[:40])) - {0}
        sky = ndimage.binary_dilation(np.isin(lab, list(top)), iterations=1)
        alpha = Image.fromarray(((~sky) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
        sq = sq.convert("RGBA"); sq.putalpha(alpha)
        disc = Image.new("L", sq.size, 0); ImageDraw.Draw(disc).ellipse((0, 0, 2999, 2999), fill=255)
        sq.putalpha(ImageChops.multiply(sq.split()[3], disc))
        c = canvas()
        # fondo crema dentro del círculo + sol rojo
        bgc = canvas(); ImageDraw.Draw(bgc).ellipse((300, 900, 3300, 3900), fill=(233, 223, 202, 255)); c.alpha_composite(bgc)
        sun(c, 2350, 1750, 520)
        c.alpha_composite(sq, (300, 900))
        ImageDraw.Draw(c).ellipse((260, 860, 3340, 3940), outline=INK + (255,), width=18)
        save(c, "ola")
    if which in ("all", "calavera"):
        # Posada: grabado en madera, ampliado y umbralizado para trazo limpio; halo rojo detrás del cráneo
        r = engraving(S + "DP869215-1.jpg", crop=(70, 60, 660, 900), ink=INK, upscale=5.2, thresh=0.32)
        r = r.filter(ImageFilter.GaussianBlur(1.0))
        c = canvas(); sun(c, 2250, 1500, 900)
        place(c, r, W / 2, 2500, 3300); save(c, "calavera")
    if which in ("all", "caballero"):
        # Durero 1513: grabado completo en arco, tinta oscura para prenda clara
        r = engraving(S + "DP102226.jpg", crop=(40, 40, 1526, 1966), ink=INK, gamma=0.8, upscale=2.2)
        c = canvas()
        mask = Image.new("L", r.size, 0)
        md = ImageDraw.Draw(mask)
        rw, rh = r.size
        md.rectangle((0, rw // 2, rw, rh), fill=255); md.ellipse((0, 0, rw, rw), fill=255)
        r.putalpha(ImageChops.multiply(r.split()[3], mask))
        sun(c, 2700, 1250, 520)
        place(c, r, W / 2, H / 2, 3200)
        save(c, "caballero")
