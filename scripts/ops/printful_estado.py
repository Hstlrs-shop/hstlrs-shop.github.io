#!/usr/bin/env python3
"""Estado de HSTLRS en Printful: productos conectados, variantes ignoradas y pedidos.

Uso:
  python3 scripts/ops/printful_estado.py            # productos y variantes ignoradas
  python3 scripts/ops/printful_estado.py --pedidos  # además, los últimos 20 pedidos
  python3 scripts/ops/printful_estado.py --json     # todo en JSON (lo usa la tarea diaria)

El token de Printful no va en el código: en el entorno de la nube lo añade el proxy.
En otra computadora, exporta PRINTFUL_TOKEN antes de correrlo.
Sale con código 1 si hay variantes ignoradas, productos a medio conectar o pedidos atorados.
"""
import datetime
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.printful.com"
STORE = os.environ.get("PRINTFUL_STORE_ID", "19046954")  # la tienda de Shopify "HSTLRS" dentro de Printful
ATORADOS = {"draft", "failed", "onhold"}  # con aprobación automática, un borrador también es un problema


def get(path):
    req = urllib.request.Request(API + path, headers={"X-PF-Store-Id": STORE, "User-Agent": "hstlrs-ops"})
    if os.environ.get("PRINTFUL_TOKEN"):
        req.add_header("Authorization", "Bearer " + os.environ["PRINTFUL_TOKEN"])
    for intento in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and intento < 4:  # límite de peticiones: espera y reintenta
                time.sleep(int(e.headers.get("Retry-After") or 10) + 1)
                continue
            sys.exit(f"Printful respondió {e.code} en {path}: {e.read()[:300]!r}")


def productos():
    out, off = [], 0
    while True:
        d = get(f"/sync/products?status=all&limit=100&offset={off}")
        out += d["result"]
        off += 100
        if off >= d["paging"]["total"]:
            return out


def main():
    rep = {"productos": 0, "variantes": 0, "ignoradas": [], "a_medio_conectar": [], "pedidos": []}
    for p in productos():
        if p.get("is_ignored"):
            continue  # productos viejos, archivados en Shopify
        rep["productos"] += 1
        if p["synced"] < p["variants"]:
            rep["a_medio_conectar"].append(f'{p["name"]} ({p["synced"]}/{p["variants"]})')
        for v in get(f'/sync/products/{p["id"]}')["result"]["sync_variants"]:
            rep["variantes"] += 1
            if v.get("is_ignored"):
                rep["ignoradas"].append({"producto": p["name"], "color": v.get("color"), "talla": v.get("size"),
                                         "sync_variant_id": v["id"], "shopify_variant_id": v["external_id"]})
        time.sleep(0.3)

    if "--pedidos" in sys.argv or "--json" in sys.argv:
        for o in get("/orders?limit=20")["result"]:
            creado = datetime.datetime.fromtimestamp(o.get("created") or 0, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            rep["pedidos"].append({"printful": o["id"], "shopify": o.get("external_id"), "estado": o["status"], "creado": creado,
                                   "guias": [s.get("tracking_number") for s in o.get("shipments") or []]})

    rep["atorados"] = [o for o in rep["pedidos"] if o["estado"] in ATORADOS]
    problemas = bool(rep["ignoradas"] or rep["a_medio_conectar"] or rep["atorados"])

    if "--json" in sys.argv:
        print(json.dumps(rep, ensure_ascii=False, indent=1))
    else:
        print(f'Printful: {rep["productos"]} productos, {rep["variantes"]} variantes, {len(rep["ignoradas"])} ignoradas')
        grupos = {}
        for v in rep["ignoradas"]:
            grupos.setdefault((v["producto"], v["color"]), []).append(v["talla"])
        for (prod, color), tallas in sorted(grupos.items()):
            print(f"  ignorada: {prod} · {color} · {', '.join(tallas)}")
        for p in rep["a_medio_conectar"]:
            print(f"  a medio conectar: {p}")
        if rep["pedidos"] or "--pedidos" in sys.argv:
            print(f'Pedidos recientes: {len(rep["pedidos"])}')
            for o in rep["pedidos"]:
                print(f'  {o["creado"]} · Printful {o["printful"]} · Shopify {o["shopify"]} · {o["estado"]} · guías: {", ".join(filter(None, o["guias"])) or "—"}')
        print("Todo en orden" if not problemas else "HAY PROBLEMAS: revisa lo de arriba")
    sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
