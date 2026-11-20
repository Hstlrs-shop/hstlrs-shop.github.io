// Utilidades puras (sin dependencias) para el radar y la agenda.

const CDMX_OFFSET = 6 * 3600_000;

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

export function validTerm(raw: string): string | null {
  const t = normalize(raw.replace(/^[$#]/, ""));
  if (t.length < 2 || t.length > 30) return null;
  if (!/^[a-z0-9][a-z0-9 .&/-]*$/.test(t)) return null;
  return t;
}

export function matchesTerm(textNorm: string, term: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^a-z0-9]|$)`);
  return re.test(textNorm);
}

/** "2026-11-24", "08:30" en hora del centro de México → epoch ms */
export function parseCdmx(date: string, time: string): number | null {
  const dm = date.match(/^(\d{4})-(\d{2})-(\d{2})$/), tm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const ms = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]) + CDMX_OFFSET;
  return Number.isFinite(ms) ? ms : null;
}

