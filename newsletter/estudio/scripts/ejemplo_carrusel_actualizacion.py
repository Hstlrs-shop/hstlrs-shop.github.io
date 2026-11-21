# Carrusel "Viernes rojo en la IA" (6 láminas, 1080x1350) con cifras intradía del 20 nov 2026.
import json, time
from carrusel_y_meme import *
B = json.load(open(D + "/btc2.json")); BTC = float(B["last"]); BCH = float(B["percent_change_24"]); BH = time.strftime("%H:%M", time.localtime(int(B["timestamp"])))
T6 = 6
def hbars(d, rows, top, maxv, step=100, lab_w=300):
    for k, (nm, v) in enumerate(rows):
        y = top + k * step; L = int(abs(v) / maxv * (W - 2 * X - lab_w - 210))
        d.text((X + 40, y + 6), nm, font=F(38, "Bold"), fill=CRE)
        d.rounded_rectangle([X + lab_w, y + 8, X + lab_w + max(L, 14), y + 58], 14, fill=RED)
        d.text((W - X - 40, y + 6), ("−" if v < 0 else "+") + f"{abs(v):.1f}%", font=F(42, "ExtraBold"), fill=RED if v < 0 else GRN, anchor="ra")

def v1():
    im, d = canvas()
    d.rounded_rectangle([X, 190, X + 470, 250], 30, fill=RED); d.text((X + 235, 220), "ACTUALIZACIÓN · VIERNES", font=F(28, "ExtraBold"), fill=CRE, anchor="mm")
    d.text((X, 300), "Viernes rojo", font=F(124, "ExtraBold"), fill=CRE); d.text((X, 435), "en la IA", font=F(124, "ExtraBold"), fill=RED)
    wrap(d, (X, 610), "Anthropic se desinfla en su segundo día, Nvidia suma 7 sesiones a la baja y los chips se desploman.", F(46, "SemiBold"), CRE, W - 2 * X, 60)
    for k, (s, v) in enumerate([("ANT", "−10.6%"), ("NVDA", "−5.7%"), ("AMD", "−10.0%")]):
        x = X + k * 315; card(d, [x, 900, x + 290, 1100], fill=(232, 84, 70, 40), outline=(232, 84, 70, 120))
        d.rounded_rectangle([x + 30, 930, x + 30 + F(34, "ExtraBold").getlength(s) + 36, 990], 14, fill=CRE)
        d.text((x + 48, 960), s, font=F(34, "ExtraBold"), fill=INK, anchor="lm"); d.text((x + 30, 1010), v, font=F(62, "ExtraBold"), fill=RED)
    src(d, "Cifras intradía, entre 11:00 y 11:20 a. m. de Nueva York (10:00–10:20 en el centro de México). Pueden cambiar al cierre."); swipe(d); return im

def v2():
    im, d = canvas(2, T6)
    d.rounded_rectangle([X, 190, X + 130, 252], 16, fill=CRE); d.text((X + 65, 221), "ANT", font=F(36, "ExtraBold"), fill=INK, anchor="mm")
    d.text((X + 150, 221), "Anthropic · Nasdaq", font=F(34, "SemiBold"), fill=MUT, anchor="lm")
    d.text((X, 290), "Anthropic se", font=F(96, "ExtraBold"), fill=CRE); d.text((X, 400), "desinfla", font=F(96, "ExtraBold"), fill=RED)
    card(d, [X, 550, W - X, 1050])
    d.text((X + 40, 580), "Precio por acción (dólares)", font=F(30, "SemiBold"), fill=MUT)
    steps = [("Salida\n(IPO)", 83.00, MUT), ("Apertura\njueves", 111.50, CAF), ("Cierre\njueves", 97.17, GRN), ("Hoy\n11:20 ET", 86.90, RED)]
    y1 = 930; bw = 170; gap = 52; x0 = X + 50
    for k, (lab, v, col) in enumerate(steps):
        h = int(v / 111.5 * 250); xx = x0 + k * (bw + gap)
        d.rounded_rectangle([xx, y1 - h, xx + bw, y1], 16, fill=col)
        d.text((xx + bw / 2, y1 - h - 12), f"${v:.2f}", font=F(40, "ExtraBold"), fill=CRE, anchor="md")
        d.multiline_text((xx + bw / 2, y1 + 14), lab, font=F(26, "SemiBold"), fill=MUT, anchor="ma", align="center", spacing=4)
    d.text((X, 1090), "−10.6% en su segundo día", font=F(56, "ExtraBold"), fill=RED)
    wrap(d, (X, 1165), "Aún +4.7% sobre su precio de salida de $83. Motivo: se enfría la emoción del debut y se venden las acciones de IA en general.", F(30, "SemiBold"), MUT, W - 2 * X, 40)
    d.text((X, H - 70), "Fuente: Motley Fool (precio a las 11:20 a. m. ET) · Forbes", font=F(24, "Medium"), fill=MUT)
    return im

def v3():
    im, d = canvas(3, T6)
    d.rounded_rectangle([X, 190, X + 160, 252], 16, fill=CRE); d.text((X + 80, 221), "NVDA", font=F(36, "ExtraBold"), fill=INK, anchor="mm")
    d.text((X + 180, 221), "Nvidia · Nasdaq", font=F(34, "SemiBold"), fill=MUT, anchor="lm")
    d.text((X, 290), "Nvidia no", font=F(96, "ExtraBold"), fill=CRE); d.text((X, 400), "encuentra piso", font=F(96, "ExtraBold"), fill=RED)
    card(d, [X, 550, W - X, 800])
    d.text((X + 40, 580), "Precio · 11:13 a. m. de Nueva York", font=F(30, "SemiBold"), fill=MUT)
    d.text((X + 40, 625), "$137.68", font=F(130, "ExtraBold"), fill=CRE); d.text((W - X - 40, 680), "−5.7%", font=F(76, "ExtraBold"), fill=RED, anchor="ra")
    facts = [("7", "sesiones seguidas a la baja"), ("−39%", "desde el 6 de octubre"), ("4.º", "lugar en valor de EE.UU.: ya quedó debajo de Alphabet")]
    for k, (a, b) in enumerate(facts):
        y = 840 + k * 135; card(d, [X, y, W - X, y + 115])
        d.text((X + 40, y + 57), a, font=F(58, "ExtraBold"), fill=CAF, anchor="lm"); wrap(d, (X + 250, y + 22), b, F(34, "Bold"), CRE, W - 2 * X - 290, 40)
    d.text((X, H - 105), "Además: el jueves cerró en $145.98, su mínimo de 52 semanas.", font=F(26, "SemiBold"), fill=MUT)
    d.text((X, H - 70), "Fuentes: IBTimes (con datos de Trefis) · Reuters vía MarketScreener (LSEG)", font=F(24, "Medium"), fill=MUT)
    return im

def v4():
    im, d = canvas(4, T6)
    d.text((X, 190), "Los chips,", font=F(100, "ExtraBold"), fill=CRE); d.text((X, 300), "en caída libre", font=F(100, "ExtraBold"), fill=RED)
    card(d, [X, 460, W - X, 1000])
    d.text((X + 40, 490), "Cambio hoy · 11:02 a. m. de Nueva York", font=F(30, "SemiBold"), fill=MUT)
    hbars(d, [("Micron", -11.3), ("AMD", -10.0), ("Broadcom", -9.4), ("TSMC", -7.3), ("Intuit*", -9.0)], 560, 11.3, step=86)
    wrap(d, (X, 1040), "¿Por qué? El mercado duda de que la enorme inversión en inteligencia artificial deje suficiente ganancia.", F(34, "SemiBold"), CRE, W - 2 * X, 46)
    d.text((X, 1180), "*Intuit cae tras sus resultados y la venta de Mailchimp.", font=F(26, "Medium"), fill=MUT)
    d.text((X, H - 70), "Fuente: StockTitan (cobertura en vivo, con datos de CNBC)", font=F(24, "Medium"), fill=MUT)
    return im

def v5():
    im, d = canvas(5, T6)
    d.text((X, 190), "El resto", font=F(100, "ExtraBold"), fill=CRE); d.text((X, 300), "del mercado", font=F(100, "ExtraBold"), fill=CAF)
    tiles = [("Nasdaq", "−2%", "11:00 a. m. ET", RED), ("S&P 500", "−1%", "11:00 a. m. ET", RED), ("Índice del miedo (VIX)", "30.99", "el más alto desde marzo", CAF),
             ("Dow Jones", "−6.2%", "en la semana, la peor desde abril 2025", RED), ("Peso mexicano", "$19.04", "apertura de hoy, respira un poco", GRN), ("Bitcoin", f"${BTC:,.0f}", f"{BCH:+.1f}% en 24 h · {BH} Qro.".replace("-", "−"), RED)]
    for k, (a, v, b, col) in enumerate(tiles):
        x = X + (k % 2) * 470; y = 460 + (k // 2) * 245
        card(d, [x, y, x + 450, y + 225]); d.text((x + 30, y + 26), a, font=F(30, "SemiBold"), fill=MUT)
        d.text((x + 30, y + 70), v, font=F(76, "ExtraBold"), fill=col); wrap(d, (x + 30, y + 165), b, F(24, "SemiBold"), MUT, 400, 30)
    d.text((X, H - 105), "Asia: Nikkei −5.1%, Kospi −5.2%, Taiwán −5.7%.", font=F(28, "SemiBold"), fill=CRE)
    d.text((X, H - 70), "Fuentes: StockTitan/CNBC · Excélsior · Bitstamp", font=F(24, "Medium"), fill=MUT)
    return im

def v6():
    im, d = canvas(6, T6)
    d.text((W / 2, 230), "¿Qué hacer?", font=F(100, "ExtraBold"), fill=CRE, anchor="ma")
    wrap(d, (X, 380), "En días así, lo primero es no decidir con miedo. Revisa tu fondo de emergencia y tu horizonte antes de mover algo.", F(38, "SemiBold"), CAF, W - 2 * X, 50)
    d.rounded_rectangle([X, 560, W - X, 1100], 44, fill=CRE)
    q = Image.open(D + "/qr.png").convert("RGB").resize((300, 300), Image.NEAREST); im.paste(q, (W // 2 - 150, 600))
    d.text((W / 2, 945), "Sigue el cierre gratis en Telegram", font=F(40, "SemiBold"), fill=(110, 85, 65), anchor="mm")
    d.text((W / 2, 1030), "@lanaconcafe", font=F(96, "ExtraBold"), fill=INK, anchor="mm")
    d.text((W / 2, 1170), "Información, no asesoría financiera.", font=F(36, "SemiBold"), fill=MUT, anchor="mm")
    d.text((W / 2, 1220), "Cifras intradía: pueden cambiar al cierre.", font=F(28, "Medium"), fill=MUT, anchor="mm")
    return im

if __name__ == "__main__":
    fs = []
    for k, fn in enumerate([v1, v2, v3, v4, v5, v6], 1):
        p = f"{O}/viernes-rojo-ia_20nov_{k}.png"; fn().save(p); fs.append(p)
        Image.open(p).convert("RGB").save(p[:-4] + ".jpg", quality=94)
    S = 360; c = Image.new("RGB", (S * 3, 450 * 2))
    for k, f in enumerate(fs): c.paste(Image.open(f).resize((S, 450)), ((k % 3) * S, (k // 3) * 450))
    c.save(D + "/viernes_sheet.png")
