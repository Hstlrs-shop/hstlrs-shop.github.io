# Reel "Viernes rojo en la IA" (20 nov 2026): fotos reales de Commons con crédito + datos intradía.
import json, os, subprocess, sys, time
import motor_video as V
from motor_video import F, A, eo, vis, glass, T_, pop, pill, ticker, header, credit, pct, count, W, H, X, FPS, CAF, CRE, MUT, RED, GRN, INK
from PIL import Image, ImageDraw
D = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(D + "/btc.json")); BTC = float(B["last"]); BCH = float(B["percent_change_24"]); BH = time.strftime("%H:%M", time.localtime(int(B["timestamp"])))

def s0(im, d, t, T):
    header(d, 0, t, T)
    pill(d, W / 2, 330, "ACTUALIZACIÓN · VIERNES 20 NOV", t, 0.2, bgc=RED, fg=CRE, sz=34, anchor="c")
    pop(im, W / 2, 560, "Viernes rojo", 150, "ExtraBold", CRE, t, 0.4); pop(im, W / 2, 720, "en la IA", 140, "ExtraBold", RED, t, 1.0)
    for k, (s, v, t0) in enumerate([("ANT", -10.6, 2.6), ("NVDA", -5.7, 3.2), ("AMD", -10.0, 3.9)]):
        x = X - 10 + k * 320; o = glass(im, (x, 900, x + 300, 1130), t, t0, r=36, tint=(110, 35, 28), alpha=0.75)
        if o is not None:
            d = ImageDraw.Draw(im, "RGBA"); f = F(36, "ExtraBold"); w = f.getlength(s) + 40
            d.rounded_rectangle([x + 30, 930 + o, x + 30 + w, 992 + o], 14, fill=CRE); d.text((x + 50, 961 + o), s, font=f, fill=INK, anchor="lm")
            d.text((x + 30, 1015 + o), pct(v * eo((t - t0) / 0.7)), font=F(70, "ExtraBold"), fill=RED)
    T_(d, (W / 2, 1220), "Cifras de media mañana · pueden cambiar al cierre", 34, "Medium", MUT, t, 4.5, anchor="ma")
    credit(d, "hook")

def s1(im, d, t, T):
    header(d, 1, t, T)
    T_(d, (X, 270), "Anthropic se", 100, "ExtraBold", CRE, t, 0.4); T_(d, (X, 380), "desinfla", 100, "ExtraBold", RED, t, 0.6)
    ticker(d, X, 510, "ANT", "Anthropic · Nasdaq · día 2", t, 0.9)
    o = glass(im, (X - 10, 630, W - X + 10, 1250), t, 1.2)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 665 + o), "Precio por acción (dólares)", font=F(34, "SemiBold"), fill=MUT)
        steps = [("Salida", 83.00, 5.6, MUT), ("Abrió jue.", 111.50, 6.3, CAF), ("Cerró jue.", 97.17, 7.0, GRN), ("Hoy 11:20 ET", 86.90, 2.0, RED)]
        y1 = 1170 + o; bw = 190; gap = 40; x0 = X + 40
        for k, (lab, v, t0, col) in enumerate(steps):
            a = vis(t, t0)
            if a < 0.01: continue
            h = int(v / 111.5 * 300 * eo((t - t0) / 0.7)); xx = x0 + k * (bw + gap)
            d.rounded_rectangle([xx, y1 - h, xx + bw, y1], 16, fill=A(col, a))
            d.text((xx + bw / 2, y1 - h - 12), f"${v:.2f}", font=F(44, "ExtraBold"), fill=A(CRE, a), anchor="md")
            d.text((xx + bw / 2, y1 + 14), lab, font=F(26, "SemiBold"), fill=A(MUT, a), anchor="ma")
    o2 = glass(im, (X - 10, 1300, W - X + 10, 1500), t, 2.4, tint=(110, 35, 28), alpha=0.78)
    if o2 is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 1330 + o2), "Segundo día en bolsa", font=F(34, "Medium"), fill=MUT)
        d.text((X + 40, 1380 + o2), pct(-10.6 * eo((t - 2.6) / 0.8)), font=F(90, "ExtraBold"), fill=CRE)
    pill(d, X, 1540, "Aún +4.7% sobre su precio de salida", t, 6.0, bgc=(30, 90, 55), fg=CRE, sz=36)
    credit(d, "ant", "Fuente: Motley Fool (precio a las 11:20 a. m. ET) · Forbes")

def s2(im, d, t, T):
    header(d, 2, t, T)
    T_(d, (X, 270), "Nvidia no", 100, "ExtraBold", CRE, t, 0.4); T_(d, (X, 380), "encuentra piso", 100, "ExtraBold", RED, t, 0.6)
    ticker(d, X, 510, "NVDA", "Nvidia · Nasdaq", t, 0.8)
    o = glass(im, (X - 10, 630, W - X + 10, 920), t, 1.0)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 665 + o), "Precio · 11:13 a. m. de Nueva York", font=F(34, "SemiBold"), fill=MUT)
        d.text((X + 30, 705 + o), f"${count(145.98, 137.68, t, 1.3, 1.2):.2f}", font=F(140, "ExtraBold"), fill=CRE)
        d.text((W - X - 40, 770 + o), "−5.7%", font=F(76, "ExtraBold"), fill=RED, anchor="ra")
    facts = [("7", "sesiones seguidas a la baja", 3.6), ("−39%", "desde el 6 de octubre", 5.0), ("4.º", "en valor: ya quedó debajo de Alphabet", 6.0)]
    for k, (a, b, t0) in enumerate(facts):
        y = 970 + k * 165; oo = glass(im, (X - 10, y, W - X + 10, y + 145), t, t0, r=36)
        if oo is not None:
            d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, y + 72 + oo), a, font=F(66, "ExtraBold"), fill=CAF, anchor="lm")
            d.text((X + 250, y + 72 + oo), b, font=F(36, "Bold"), fill=CRE, anchor="lm")
    credit(d, "nvda", "Fuente: IBTimes (datos de Trefis) · Reuters vía MarketScreener")

def s3(im, d, t, T):
    header(d, 3, t, T)
    T_(d, (X, 270), "Los chips,", 100, "ExtraBold", CRE, t, 0.4); T_(d, (X, 380), "en caída libre", 100, "ExtraBold", RED, t, 0.6)
    o = glass(im, (X - 10, 540, W - X + 10, 1150), t, 0.9)
    if o is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 575 + o), "Cambio hoy · 11:02 a. m. de Nueva York", font=F(34, "SemiBold"), fill=MUT)
        rows = [("Micron", -11.3, 1.2), ("AMD", -10.0, 2.2), ("Broadcom", -9.4, 2.9), ("TSMC", -7.3, 3.6)]
        for k, (nm, v, t0) in enumerate(rows):
            a = vis(t, t0)
            if a < 0.01: continue
            y = 650 + k * 120 + o; L = int(abs(v) / 11.3 * 360 * eo((t - t0) / 0.7))
            d.text((X + 40, y + 10), nm, font=F(46, "ExtraBold"), fill=A(CRE, a))
            if L > 0: d.rounded_rectangle([X + 300, y + 14, X + 300 + L, y + 66], 14, fill=RED)
            d.text((W - X - 40, y + 10), pct(v * eo((t - t0) / 0.7)), font=F(52, "ExtraBold"), fill=A(RED, a), anchor="ra")
    o2 = glass(im, (X - 10, 1200, W - X + 10, 1520), t, 4.6, tint=(150, 96, 50), alpha=0.85)
    if o2 is not None:
        d = ImageDraw.Draw(im, "RGBA"); d.text((X + 40, 1235 + o2), "¿Por qué?", font=F(40, "ExtraBold"), fill=CRE)
        for k, ln in enumerate(["El mercado duda de que la enorme", "inversión en inteligencia artificial", "deje suficiente ganancia."]):
            d.text((X + 40, 1300 + o2 + k * 62), ln, font=F(44, "Bold"), fill=CRE)
    credit(d, "chip", "Fuente: StockTitan (cobertura en vivo, datos de CNBC)")

def s4(im, d, t, T):
    header(d, 4, t, T)
    T_(d, (X, 270), "El resto", 100, "ExtraBold", CRE, t, 0.4); T_(d, (X, 380), "del mercado", 100, "ExtraBold", CAF, t, 0.6)
    tiles = [("Nasdaq", "−2%", "11:00 a. m. ET", RED, 0.9), ("S&P 500", "−1%", "11:00 a. m. ET", RED, 1.7), ("Peso mexicano", "$19.04", "apertura de hoy", GRN, 3.6),
             ("Bitcoin", f"${BTC:,.0f}", f"{pct(BCH)} en 24 h · {BH} Qro.", RED, 5.6), ("Índice del miedo", "30.99", "VIX, máximo desde marzo", CAF, 7.4), ("Dow Jones", "−6.2%", "peor semana desde abr. 2025", RED, 7.9)]
    for k, (a, v, b, col, t0) in enumerate(tiles):
        x = X - 10 + (k % 2) * 480; y = 540 + (k // 2) * 300
        oo = glass(im, (x, y, x + 460, y + 270), t, t0, r=38)
        if oo is not None:
            d = ImageDraw.Draw(im, "RGBA"); d.text((x + 34, y + 32 + oo), a, font=F(34, "SemiBold"), fill=MUT)
            d.text((x + 34, y + 82 + oo), v, font=F(86, "ExtraBold"), fill=col); d.text((x + 34, y + 205 + oo), b, font=F(28, "SemiBold"), fill=MUT)
    credit(d, "wall", "Fuente: StockTitan/CNBC · Excélsior · Bitstamp")

def s5(im, d, t, T):
    header(d, 0, t, T)
    T_(d, (W / 2, 250), "En días así,", 84, "ExtraBold", CRE, t, 0.3, anchor="ma"); T_(d, (W / 2, 350), "no decidas con miedo", 76, "ExtraBold", CAF, t, 0.6, anchor="ma")
    o = glass(im, (X - 10, 520, W - X + 10, 1500), t, 1.6, tint=(250, 243, 232), alpha=0.97)
    if o is not None:
        if t > 1.8: im.alpha_composite(V.QR, (int(W / 2 - 240), 590 + o))
        d = ImageDraw.Draw(im, "RGBA")
        d.text((W / 2, 1160 + o), "Sigue el cierre gratis en Telegram", font=F(44, "SemiBold"), fill=(110, 85, 65), anchor="mm")
        d.text((W / 2, 1275 + o), "@lanaconcafe", font=F(112, "ExtraBold"), fill=INK, anchor="mm")
        d.text((W / 2, 1395 + o), "Escanea el código", font=F(48, "Bold"), fill=CAF, anchor="mm")
    T_(d, (W / 2, 1600), "Información, no asesoría financiera", 44, "SemiBold", MUT, t, 5.5, anchor="ma")
    credit(d, "cta")

V.SC = [(s0, "hook", (0.5, 0.4)), (s1, "ant", (0.42, 0.5)), (s2, "nvda", (0.5, 0.5)), (s3, "chip", (0.45, 0.5)),
        (s4, "wall", (0.6, 0.35)), (s5, "cta", (0.5, 0.5))]
V.CRED = json.load(open(D + "/credits.json"))
if __name__ == "__main__":
    Ds = V.durs()
    if sys.argv[1] == "stills":
        picks = [tuple(map(float, x.split(":"))) for x in sys.argv[2:]]
        S = 360; c = Image.new("RGB", (S * min(6, len(picks)), 640 * ((len(picks) + 5) // 6)))
        for k, (si, t) in enumerate(picks): c.paste(V.frame(int(si), t, Ds).resize((S, 640)), ((k % 6) * S, (k // 6) * 640))
        c.save(D + "/stills.png"); print(Ds, sum(Ds))
    elif sys.argv[1] == "scene": V.render(int(sys.argv[2]), Ds)
    elif sys.argv[1] == "join":
        n = len(V.SC)
        open(D + "/list.txt", "w").write("".join(f"file '{D}/scene{i}.mp4'\n" for i in range(n)))
        open(D + "/alist.txt", "w").write("".join(f"file '{D}/a{i}.wav'\n" for i in range(n)))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", D + "/list.txt", "-c", "copy", D + "/v.mp4"], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", D + "/alist.txt", "-c:a", "pcm_s16le", D + "/voice_full.wav"], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", D + "/v.mp4", "-i", D + "/voice_full.wav", "-map", "0:v", "-map", "1:a", "-vf", "scale=720:1280:flags=lanczos",
                        "-c:v", "libx264", "-crf", "34", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-af", "loudnorm=I=-14:TP=-1.5",
                        "-movflags", "+faststart", "-shortest", D + "/final.mp4"], check=True)
        print(Ds, sum(Ds), os.path.getsize(D + "/final.mp4") / 1e6, "MB")
