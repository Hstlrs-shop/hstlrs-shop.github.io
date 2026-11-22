# Descarga clips reales de Mixkit (licencia libre, uso comercial, sin atribución obligatoria) para el motor de video.
#   python3 -I clips_mixkit.py <carpeta> '{"clave": "búsqueda en inglés"}' [n_por_clave]
# Guarda <carpeta>/clips/<clave>.mp4 (12 s, 1080p máx., sin audio) y lo agrega a credits.json con src "mixkit".
# Si n_por_clave > 1 guarda <clave>_0, <clave>_1… para montar al ritmo (SC acepta una lista de claves).
# Revisa siempre una hoja de contacto: sin logotipos, sin figuras públicas, sin personas reconocibles en inicio o cierre.
import json, os, re, subprocess, sys, urllib.parse, urllib.request
OUT = sys.argv[1]; jobs = json.loads(sys.argv[2]); N = int(sys.argv[3]) if len(sys.argv) > 3 else 1
UA = {"User-Agent": "Mozilla/5.0 (LanaConCafe estudio)"}
os.makedirs(OUT + "/clips", exist_ok=True)
cf = OUT + "/credits.json"; CRED = json.load(open(cf)) if os.path.exists(cf) else {}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
def ok(u):
    try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA, method="HEAD"), timeout=30).status == 200
    except Exception: return False
for key, q in jobs.items():
    h = get("https://mixkit.co/free-stock-video/discover/" + urllib.parse.quote(q.replace(" ", "-")) + "/").decode("utf8", "ignore")
    ids = list(dict.fromkeys(re.findall(r'href="/free-stock-video/([a-z0-9-]+)-(\d+)/"', h)))
    got = 0
    for slug, vid in ids:
        if got >= N: break
        k = key if N == 1 else f"{key}_{got}"
        if os.path.exists(f"{OUT}/clips/{k}.mp4"): got += 1; continue
        url = next((f"https://assets.mixkit.co/videos/{vid}/{vid}-{r}.mp4" for r in (1080, 720) if ok(f"https://assets.mixkit.co/videos/{vid}/{vid}-{r}.mp4")), None)
        if not url: continue
        tmp = f"{OUT}/clips/{k}.src.mp4"; open(tmp, "wb").write(get(url))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1", "-t", "12", "-i", tmp, "-an", "-vf", "scale='min(1080,iw)':-2", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", f"{OUT}/clips/{k}.mp4"], check=True)
        os.remove(tmp)
        CRED[k] = {"artist": "Mixkit", "license": "Licencia libre Mixkit", "title": slug.replace("-", " "), "page": f"https://mixkit.co/free-stock-video/{slug}-{vid}/", "src": "mixkit"}
        print(k, "←", slug); got += 1
    if not got: print("sin resultados:", key, q, file=sys.stderr)
json.dump(CRED, open(cf, "w"), ensure_ascii=False, indent=1)
