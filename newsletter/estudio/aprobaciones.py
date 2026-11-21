#!/usr/bin/env python3
"""Cola de aprobación de los videos diarios (tabla `approvals` del Worker lanaconcafe-news).

  python3 aprobaciones.py add '<json>'   # registra un video listo: el Worker se lo manda al admin con ✅/❌
  python3 aprobaciones.py approved       # aprobados pendientes de publicar (JSON)
  python3 aprobaciones.py done <id>      # marcar publicado (programado en vidIQ)
  python3 aprobaciones.py fail <id> <nota>
  python3 aprobaciones.py today          # estado de los de las últimas 36 h

Necesita la variable de entorno STUDIO_TOKEN (la llave de la tarea programada; viene en su prompt,
nunca en el repositorio). Habla con https://lanaconcafe.com/studio/approvals,
así que no necesita credenciales de Cloudflare.

JSON de `add`: {"id": "2026-11-21-0830", "slot": "08:30", "publish_at": "2026-11-21T08:30:00-06:00",
  "kind": "curioso|educativo|noticia|cierre", "title": "...", "caption": "...",
  "video_url": "https://... (URL directa .mp4 para la vista previa)", "drive_url": "...",
  "post_id": "<postId de vidIQ>", "revision": "<revision de vidIQ>"}
"""
import datetime as dt
import json
import os
import sys
import urllib.request

API = "https://lanaconcafe.com/studio/approvals"


def call(method, query="", body=None):
    tok = os.environ.get("STUDIO_TOKEN")
    if not tok:
        sys.exit("Falta STUDIO_TOKEN (está en el prompt de la tarea programada): export STUDIO_TOKEN=...")
    req = urllib.request.Request(API + query, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"authorization": f"Bearer {tok}", "content-type": "application/json", "user-agent": "lanaconcafe-estudio"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:500]}")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "today"
    now = dt.datetime.now(dt.timezone.utc).timestamp() * 1000
    if cmd == "add":
        a = json.loads(sys.argv[2])
        print(call("POST", body={"op": "add", **a}))
        print("En un minuto le llega al admin por Telegram con ✅/❌")
    elif cmd == "approved":
        rows = call("GET", "?q=approved")
        for r in rows:
            r["publish_at_iso"] = dt.datetime.fromtimestamp(r["publish_at"] / 1000, dt.timezone.utc).isoformat()
            r["ya_paso"] = r["publish_at"] < now
        print(json.dumps(rows, ensure_ascii=False, indent=1))
    elif cmd == "done":
        print(call("POST", body={"op": "done", "id": sys.argv[2]}))
    elif cmd == "fail":
        print(call("POST", body={"op": "fail", "id": sys.argv[2], "note": " ".join(sys.argv[3:])}))
    else:
        print(json.dumps(call("GET", "?q=today"), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
