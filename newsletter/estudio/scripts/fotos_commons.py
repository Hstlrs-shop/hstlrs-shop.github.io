import json, sys, time, re, urllib.request, urllib.parse, os
UA = {"User-Agent": "LanaConCafeBot/1.0 (educational; contact via telegram LanaconCafe)"}
OUT = sys.argv[1]; jobs = json.loads(sys.argv[2])  # {key: query}
cf = OUT + "/credits.json"; CRED = json.load(open(cf)) if os.path.exists(cf) else {}
def get(url, tries=5):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except Exception as e:
            print("retry", k, e, file=sys.stderr); time.sleep(15 * (k + 1))
    raise SystemExit("fail " + url)
def strip(s): return re.sub(r"<[^>]+>", "", s or "").strip()
for key, q in jobs.items():
    if key in CRED: continue
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrsearch": q + " filetype:bitmap", "gsrlimit": 15,
         "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1600}
    r = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p))); time.sleep(7)
    pages = sorted(r.get("query", {}).get("pages", {}).values(), key=lambda x: x.get("index", 99))
    ok = None
    for pg in pages:
        ii = pg["imageinfo"][0]; m = ii.get("extmetadata", {})
        lic = strip(m.get("LicenseShortName", {}).get("value"))
        if ii.get("mime") != "image/jpeg" or ii["width"] < 1200: continue
        if not re.search(r"CC BY|CC0|Public domain", lic, re.I) or "NC" in lic or "ND" in lic: continue
        ok = (pg["title"], ii, lic, strip(m.get("Artist", {}).get("value")) or "Desconocido"); break
    if not ok: print("NONE", key, q); continue
    title, ii, lic, art = ok
    open(f"{OUT}/img/{key}.jpg", "wb").write(get(ii.get("thumburl") or ii["url"])); time.sleep(7)
    CRED[key] = {"artist": art.replace("\n", " "), "license": lic, "title": title, "page": ii["descriptionurl"]}
    json.dump(CRED, open(cf, "w"), ensure_ascii=False, indent=1); print("OK", key, title, lic, art[:40])
