#!/usr/bin/env python3
"""Cola de aprobación de los videos diarios (tabla `approvals` en D1).

  python3 aprobaciones.py add '<json>'   # registra un video listo: el Worker se lo manda al admin con ✅/❌
  python3 aprobaciones.py approved       # aprobados pendientes de publicar (JSON)
  python3 aprobaciones.py done <id>      # marcar publicado (programado en vidIQ)
  python3 aprobaciones.py fail <id> <nota>
  python3 aprobaciones.py today          # estado de los de hoy

JSON de `add`: {"id": "2026-11-21-0830", "slot": "08:30", "publish_at": "2026-11-21T14:30:00Z",
  "kind": "curioso|educativo|noticia|cierre", "title": "...", "caption": "...",
  "video_url": "https://... (URL directa .mp4 para la vista previa)", "drive_url": "...",
  "post_id": "<postId de vidIQ>", "revision": "<revision de vidIQ>"}

Usa wrangler con la credencial que inyecta el proxy (CLOUDFLARE_API_TOKEN=proxy-injected).
Si wrangler falla, haz la misma consulta con la herramienta d1_database_query del conector de Cloudflare
(base de datos 9ad26b78-509b-403f-b0ba-b72d06b20360).
"""
import datetime as dt
import json
import os
import subprocess
import sys

DB = "lanaconcafe-news-db"
WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "worker")


def q(sql, params=()):
    def lit(v):
        if v is None:
            return "NULL"
        if isinstance(v, (int, float)):
            return str(v)
        return "'" + str(v).replace("'", "''") + "'"
    for p in params:
        sql = sql.replace("?", lit(p), 1)
    env = dict(os.environ, CLOUDFLARE_API_TOKEN=os.environ.get("CLOUDFLARE_API_TOKEN", "proxy-injected"))
    r = subprocess.run(["npx", "--yes", "wrangler@4", "d1", "execute", DB, "--remote", "--json", "--command", sql],
                       cwd=WORKER, env=env, capture_output=True, text=True, timeout=180)
    if r.returncode:
        sys.exit("wrangler falló:\n" + r.stderr[-1500:] + r.stdout[-1500:])
    out = r.stdout[r.stdout.index("["):]
    return json.loads(out)[0].get("results", [])


def ms(iso):
    return int(dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "today"
    now = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
    if cmd == "add":
        a = json.loads(sys.argv[2])
        for k in ("id", "slot", "publish_at", "kind", "title", "caption", "post_id", "revision"):
            assert a.get(k), f"falta {k}"
        q("INSERT INTO approvals (id, slot, publish_at, kind, title, caption, video_url, drive_url, post_id, revision, status, created_at) "
          "VALUES (?,?,?,?,?,?,?,?,?,?,'new',?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, caption=excluded.caption, "
          "video_url=excluded.video_url, drive_url=excluded.drive_url, post_id=excluded.post_id, revision=excluded.revision, "
          "publish_at=excluded.publish_at, status='new', sent_at=NULL, decided_at=NULL",
          (a["id"], a["slot"], ms(a["publish_at"]), a["kind"], a["title"], a["caption"], a.get("video_url"), a.get("drive_url"),
           a["post_id"], a["revision"], now))
        print("ok: en un minuto le llega al admin por Telegram con ✅/❌")
    elif cmd == "approved":
        rows = q("SELECT id, slot, publish_at, title, post_id, revision FROM approvals WHERE status = 'approved' ORDER BY publish_at")
        for r in rows:
            r["publish_at_iso"] = dt.datetime.fromtimestamp(r["publish_at"] / 1000, dt.timezone.utc).isoformat()
            r["ya_paso"] = r["publish_at"] < now
        print(json.dumps(rows, ensure_ascii=False, indent=1))
    elif cmd == "done":
        q("UPDATE approvals SET status = 'published', published_at = ? WHERE id = ?", (now, sys.argv[2]))
        print("ok")
    elif cmd == "fail":
        q("UPDATE approvals SET status = 'failed', note = ? WHERE id = ?", (" ".join(sys.argv[3:])[:300], sys.argv[2]))
        print("ok")
    else:
        rows = q("SELECT id, slot, kind, title, status FROM approvals WHERE created_at > ? ORDER BY publish_at", (now - 36 * 3600_000,))
        print(json.dumps(rows, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
