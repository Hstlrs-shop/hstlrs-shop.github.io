# Carrusel "Fondo de emergencia" (7 láminas) + meme del dólar. 1080x1350, paleta café.
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); O = D + "/out"
W, H, X = 1080, 1350, 80
BG = (43, 29, 22); CRE = (250, 243, 232); CAF = (214, 152, 90); RED = (232, 84, 70); GRN = (90, 215, 140); MUT = (205, 185, 165); INK = (43, 29, 22)
_c = {}
def F(sz, wt="Bold"):
    k = (sz, wt)
    if k not in _c:
        f = ImageFont.truetype(D + "/font/bg.ttf", sz); f.set_variation_by_name(wt); _c[k] = f
    return _c[k]
def canvas(n=None, total=7):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im, "RGBA")
    for r, a in [(620, 18), (420, 22)]:
        d.ellipse([W - r // 2 - 120, -r // 2, W + r // 2 - 120, r // 2], fill=(214, 152, 90, a))
    d.text((X, 70), "LANA CON CAFÉ", font=F(30, "Bold"), fill=CAF)
    if n: d.text((W - X, 70), f"{n}/{total}", font=F(30, "SemiBold"), fill=MUT, anchor="ra")
    return im, d
def wrap(d, xy, s, f, fill, maxw, lh):
    x, y = xy; line = ""
    for w in s.split():
        t = (line + " " + w).strip()
        if d.textlength(t, font=f) > maxw and line: d.text((x, y), line, font=f, fill=fill); y += lh; line = w
        else: line = t
    d.text((x, y), line, font=f, fill=fill); return y + lh
def card(d, box, fill=(250, 243, 232, 18), r=36, outline=(255, 235, 210, 50)):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=2)
def src(d, s): wrap(d, (X, H - 120), s, F(26, "Medium"), MUT, W - 2 * X, 34)
def swipe(d): d.text((W - X, H - 70), "Desliza →", font=F(30, "Bold"), fill=CAF, anchor="ra")

def c1():
    im, d = canvas()
    d.rounded_rectangle([X, 190, X + 420, 250], 30, fill=CAF); d.text((X + 210, 220), "CONSEJO DE INVERSIÓN", font=F(28, "ExtraBold"), fill=INK, anchor="mm")
    d.text((X, 300), "Fondo de", font=F(130, "ExtraBold"), fill=CRE); d.text((X, 440), "emergencia", font=F(130, "ExtraBold"), fill=CAF)
    wrap(d, (X, 620), "Tu colchón cuando el mercado (y el peso) se mueven", F(54, "Bold"), CRE, W - 2 * X, 68)
    card(d, [X, 830, W - X, 1080], fill=(232, 84, 70, 40), outline=(232, 84, 70, 120))
    d.text((X + 40, 865), "ESTA SEMANA", font=F(28, "Bold"), fill=RED)
    wrap(d, (X + 40, 910), "El Dow cayó 1,101 puntos en un día y el peso cerró en $19.08 por dólar, su peor nivel desde junio de 2025.", F(36, "SemiBold"), CRE, W - 2 * X - 80, 48)
    src(d, "Fuentes: Yahoo Finance (19 nov) · Infobae con datos de Banxico"); swipe(d); return im
def c2():
    im, d = canvas(2)
    d.text((X, 190), "¿Qué es?", font=F(100, "ExtraBold"), fill=CRE)
    y = wrap(d, (X, 340), "Dinero apartado SOLO para imprevistos reales: perder el empleo, una enfermedad, una reparación urgente.", F(46, "SemiBold"), CRE, W - 2 * X, 60)
    card(d, [X, y + 40, W - X, y + 420])
    d.text((X + 40, y + 80), "NO es para…", font=F(40, "ExtraBold"), fill=RED)
    for k, s in enumerate(["Vacaciones", "Compras impulsivas", "Entretenimiento"]):
        yy = y + 160 + k * 76; d.line([X + 48, yy + 16, X + 82, yy + 50], fill=RED, width=9); d.line([X + 82, yy + 16, X + 48, yy + 50], fill=RED, width=9); d.text((X + 110, yy), s, font=F(44, "Bold"), fill=CRE)
    src(d, "Fuente: recomendaciones de CONDUSEF (El Imparcial, 11 jun 2026)"); swipe(d); return im
def c3():
    im, d = canvas(3)
    d.text((X, 190), "¿Cuánto?", font=F(100, "ExtraBold"), fill=CRE)
    d.text((X, 340), "Mínimo", font=F(50, "SemiBold"), fill=MUT)
    d.text((X - 6, 390), "3 meses", font=F(190, "ExtraBold"), fill=CAF)
    d.text((X, 610), "de gastos esenciales", font=F(56, "Bold"), fill=CRE)
    card(d, [X, 730, W - X, 1110])
    d.text((X + 40, 765), "EJEMPLO", font=F(28, "Bold"), fill=CAF)
    d.text((X + 40, 815), "Gastos esenciales al mes", font=F(38, "SemiBold"), fill=MUT); d.text((W - X - 40, 815), "$12,000", font=F(38, "ExtraBold"), fill=CRE, anchor="ra")
    d.text((X + 40, 880), "× 3 meses", font=F(38, "SemiBold"), fill=MUT)
    d.line([X + 40, 950, W - X - 40, 950], fill=(255, 255, 255, 60), width=3)
    d.text((X + 40, 980), "Tu meta", font=F(52, "ExtraBold"), fill=CRE); d.text((W - X - 40, 975), "$36,000", font=F(70, "ExtraBold"), fill=GRN, anchor="ra")
    wrap(d, (X, 1140), "Más si tienes dependientes o un empleo inestable.", F(34, "SemiBold"), MUT, W - 2 * X, 44)
    src(d, "Fuente: CONDUSEF vía El Imparcial (11 jun 2026). Ejemplo ilustrativo."); swipe(d); return im
def c4():
    im, d = canvas(4)
    d.text((X, 190), "¿Qué cuenta", font=F(96, "ExtraBold"), fill=CRE); d.text((X, 300), "como esencial?", font=F(96, "ExtraBold"), fill=CAF)
    items = ["Comida", "Renta o hipoteca", "Luz, agua y gas", "Transporte", "Gastos médicos", "Escuela"]
    for k, s in enumerate(items):
        x = X + (k % 2) * 470; y = 470 + (k // 2) * 200
        card(d, [x, y, x + 450, y + 170]); d.ellipse([x + 34, y + 63, x + 78, y + 107], fill=GRN); d.line([(x + 44, y + 86), (x + 53, y + 96), (x + 69, y + 74)], fill=INK, width=6)
        wrap(d, (x + 100, y + 60), s, F(40, "Bold"), CRE, 320, 46)
    wrap(d, (X, 1110), "Tip: si tienes seguro médico, aparta también para el deducible.", F(34, "SemiBold"), MUT, W - 2 * X, 44)
    src(d, "Fuente: CONDUSEF vía El Imparcial (11 jun 2026)"); swipe(d); return im
def c5():
    im, d = canvas(5)
    d.text((X, 190), "¿Dónde", font=F(96, "ExtraBold"), fill=CRE); d.text((X, 300), "guardarlo?", font=F(96, "ExtraBold"), fill=CAF)
    wrap(d, (X, 430), "En una institución regulada, donde esté protegido, genere rendimiento y lo puedas sacar rápido.", F(38, "SemiBold"), CRE, W - 2 * X, 50)
    card(d, [X, 590, W - X, 1120])
    d.text((X + 40, 620), "Tasas de Cetes · subasta del 17 nov 2026 (anual)", font=F(30, "SemiBold"), fill=MUT)
    rows = [("28 días", 6.19), ("91 días", 6.49), ("175 días", 6.67), ("679 días", 7.87)]
    for k, (nm, v) in enumerate(rows):
        y = 680 + k * 92; L = int(v / 7.87 * 470)
        d.text((X + 40, y + 10), nm, font=F(36, "Bold"), fill=CRE)
        d.rounded_rectangle([X + 240, y + 8, X + 240 + L, y + 58], 14, fill=CAF if k == 0 else (214, 152, 90, 120))
        d.text((W - X - 40, y + 10), f"{v:.2f}%", font=F(40, "ExtraBold"), fill=CRE, anchor="ra")
    d.text((X + 40, 1095), "Para emergencias, lo más líquido: plazos cortos.", font=F(30, "SemiBold"), fill=GRN, anchor="ls")
    wrap(d, (X, 1150), "IPAB protege depósitos bancarios hasta 400 mil UDIS (más de 3.4 millones de pesos) por persona y por banco. Acciones y fondos de inversión NO están cubiertos.", F(28, "SemiBold"), MUT, W - 2 * X, 36)
    d.text((X, H - 70), "Fuentes: Imagen Radio (subasta 17 nov) · El Imparcial (IPAB)", font=F(24, "Medium"), fill=MUT)
    return im
def c6():
    im, d = canvas(6)
    d.text((X, 190), "Cómo empezar", font=F(96, "ExtraBold"), fill=CRE); d.text((X, 300), "en 3 pasos", font=F(96, "ExtraBold"), fill=CAF)
    steps = [("1", "Revisa tu presupuesto", "Suma tus gastos esenciales del mes."), ("2", "Recorta temporalmente", "Lo que reduzcas, va directo al fondo."),
             ("3", "Poco, pero constante", "Aportaciones pequeñas cada quincena. No necesitas juntarlo de golpe.")]
    for k, (n, a, b) in enumerate(steps):
        y = 450 + k * 250; card(d, [X, y, W - X, y + 220])
        d.ellipse([X + 36, y + 40, X + 136, y + 140], fill=CAF); d.text((X + 86, y + 90), n, font=F(60, "ExtraBold"), fill=INK, anchor="mm")
        d.text((X + 170, y + 40), a, font=F(46, "ExtraBold"), fill=CRE); wrap(d, (X + 170, y + 105), b, F(32, "SemiBold"), MUT, W - 2 * X - 210, 42)
    src(d, "Fuente: CONDUSEF vía El Imparcial (11 jun 2026)"); swipe(d); return im
def c7():
    im, d = canvas(7)
    d.text((W / 2, 260), "¿Te sirvió?", font=F(100, "ExtraBold"), fill=CRE, anchor="ma")
    d.text((W / 2, 390), "Guárdalo y compártelo", font=F(52, "Bold"), fill=CAF, anchor="ma")
    d.rounded_rectangle([X, 520, W - X, 1080], 44, fill=CRE)
    q = Image.open(D + "/qr.png").convert("RGB").resize((300, 300), Image.NEAREST); im.paste(q, (W // 2 - 150, 560))
    d.text((W / 2, 900), "Únete gratis a Telegram", font=F(42, "SemiBold"), fill=(110, 85, 65), anchor="mm")
    d.text((W / 2, 990), "@lanaconcafe", font=F(96, "ExtraBold"), fill=INK, anchor="mm")
    d.text((W / 2, 1160), "Información, no asesoría financiera.", font=F(36, "SemiBold"), fill=MUT, anchor="mm")
    d.text((W / 2, 1210), "Las tasas cambian cada semana; verifica antes de invertir.", font=F(28, "Medium"), fill=MUT, anchor="mm")
    return im

def meme():
    im = Image.new("RGB", (W, H), CRE); d = ImageDraw.Draw(im, "RGBA")
    d.text((X, 90), "Nadie:", font=F(78, "ExtraBold"), fill=INK)
    d.text((X, 190), "Absolutamente nadie:", font=F(78, "ExtraBold"), fill=INK)
    d.text((X, 320), "El dólar el jueves:", font=F(78, "ExtraBold"), fill=(180, 50, 40))
    # tarjeta oscura con la "frase" del dólar y gráfica subiendo
    d.rounded_rectangle([X, 450, W - X, 1110], 48, fill=BG)
    d.text((W / 2, 510), "“Ya llegué", font=F(90, "ExtraBold"), fill=CRE, anchor="ma")
    d.text((W / 2, 615), "a $19.08”", font=F(130, "ExtraBold"), fill=CAF, anchor="ma")
    pts = [(170, 1040), (290, 1010), (380, 1025), (470, 975), (560, 990), (650, 930), (740, 945), (820, 870), (900, 800)]
    d.line(pts, fill=GRN, width=12, joint="curve"); d.polygon([(900, 760), (940, 830), (870, 822)], fill=GRN)
    d.text((W / 2, 1180), "Mi quincena en pesos:", font=F(50, "Bold"), fill=INK, anchor="mm")
    d.text((W / 2, 1245), "*se hace chiquita*", font=F(50, "ExtraBold"), fill=(180, 50, 40), anchor="mm")
    d.rectangle([0, H - 64, W, H], fill=BG)
    d.text((W / 2, H - 32), "Dato real: cierre del 19 nov, peor nivel desde junio 2025 · Infobae/Banxico · @lanaconcafe", font=F(24, "SemiBold"), fill=CRE, anchor="mm")
    return im

if __name__ == "__main__":
    os.makedirs(O, exist_ok=True)
    for k, fn in enumerate([c1, c2, c3, c4, c5, c6, c7], 1): fn().save(f"{O}/consejo_fondo-emergencia_20nov_{k}.png")
    meme().save(f"{O}/meme_dolar19_20nov.png")
    from PIL import Image as I
    fs = [f"{O}/consejo_fondo-emergencia_20nov_{k}.png" for k in range(1, 8)] + [f"{O}/meme_dolar19_20nov.png"]
    S = 360; c = I.new("RGB", (S * 4, 450 * 2))
    for k, f in enumerate(fs): c.paste(I.open(f).resize((S, 450)), ((k % 4) * S, (k // 4) * 450))
    c.save(D + "/posts_sheet.png")
