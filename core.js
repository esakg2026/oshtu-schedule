// Общая логика: разбор расписания ОшТУ, недели, время пар, хранилище, запросы к Supabase.
(function () {
  "use strict";

  const PAIR_TIMES = {
    1: ["08:00", "09:20"],
    2: ["09:30", "10:50"],
    3: ["11:20", "12:40"],
    4: ["12:50", "14:10"],
    5: ["14:20", "15:40"],
    6: ["15:50", "17:10"],
  };

  // Понедельник недели, которая на сайте ОшТУ «верхняя» (неделя 9–14 ноября 2026).
  const WEEK_ANCHOR = new Date(2026, 10, 9);

  const TYPES = {
    лк: { label: "Лекция", cls: "lec" },
    пр: { label: "Практика", cls: "prac" },
    лб: { label: "Лабораторная", cls: "lab" },
    ла: { label: "Лабораторная", cls: "lab" },
    се: { label: "Семинар", cls: "prac" },
  };

  // ---------- хранилище ----------
  const store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
    del(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };

  // ---------- Supabase RPC ----------
  // Сначала через прокси на своём домене (/sb → Supabase, правило Rewrite в Render):
  // так работает, даже если провайдер не пропускает *.supabase.co. При сетевой ошибке — напрямую.
  function apiBases() {
    const { SUPABASE_URL } = window.APP_CONFIG;
    const local = !/^https?:$/.test(location.protocol) || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const bases = local ? [SUPABASE_URL] : [`${location.origin}/sb`, SUPABASE_URL];
    const pref = rpc.preferred;
    return pref && bases.includes(pref) ? [pref, ...bases.filter((b) => b !== pref)] : bases;
  }

  class HttpError extends Error {}

  async function rpcVia(base, name, body, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(`${base}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { apikey: window.APP_CONFIG.SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        // 5xx от прокси — пробуем другой путь; 4xx — ошибка запроса, повторять бессмысленно
        if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
        throw new HttpError((data && (data.message || data.error)) || `HTTP ${r.status}`);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpc(name, body = {}, timeout = 12000) {
    let lastErr;
    for (const base of apiBases()) {
      try {
        const data = await rpcVia(base, name, body, timeout);
        rpc.preferred = base;
        return data;
      } catch (e) {
        if (e instanceof HttpError) throw e;
        lastErr = e;
      }
    }
    throw lastErr;
  }

  // ---------- разбор HTML ячейки ----------
  const TYPE_RE = /\((лк|пр|лб|лаб|сем)[^)]*\)/i;
  const decode = (s) =>
    s.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

  function parseBlock(html) {
    const lines = html
      .split(/<br\s*\/?>/i)
      .map((s) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(.*?)\s*\((лк|пр|лб|лаб|сем)[^)]*\)\s*$/i);
      if (m) {
        const lesson = { subject: m[1].trim(), type: m[2].toLowerCase().slice(0, 2), teacher: "", room: "" };
        const next = lines[i + 1];
        if (next && !TYPE_RE.test(next)) {
          const r = next.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
          lesson.teacher = r ? r[1].trim() : next;
          lesson.room = r ? r[2].trim() : "";
          i++;
        }
        out.push(lesson);
      } else {
        const r = line.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
        const last = out[out.length - 1];
        if (r && last && !last.teacher) {
          last.teacher = r[1].trim();
          last.room = r[2].trim();
        } else out.push({ subject: line, type: "", teacher: "", room: "" });
      }
    }
    return out;
  }

  function parseCell(html) {
    if (!html || !html.replace(/<[^>]+>|\s|&nbsp;/g, "")) return null;
    const parts = html.split(/<hr[^>]*>/i);
    if (parts.length === 1) {
      const l = parseBlock(parts[0]);
      return l.length ? { top: l, bottom: l, split: false } : null;
    }
    const top = parseBlock(parts[0]);
    const bottom = parseBlock(parts.slice(1).join(""));
    return top.length || bottom.length ? { top, bottom, split: true } : null;
  }

  // raw = ArrayData с сайта ОшТУ → { 1: [{n, top, bottom, split}], ... 6: [...] }
  function parseSchedule(raw) {
    const days = {};
    for (let d = 1; d <= 6; d++) days[d] = [];
    for (const row of raw || []) {
      for (let d = 1; d <= 6; d++) {
        const cell = parseCell(row[`WeekDay${d}`] || "");
        if (cell) days[d].push({ n: Number(row.PairNumber), ...cell });
      }
    }
    for (let d = 1; d <= 6; d++) days[d].sort((a, b) => a.n - b.n);
    return days;
  }

  // ---------- даты и недели ----------
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => {
    const x = startOfDay(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const weekdayIndex = (d) => ((d.getDay() + 6) % 7) + 1; // Пн=1 … Вс=7

  function weekType(date, flip) {
    const m = mondayOf(date);
    const weeks = Math.round(
      (Date.UTC(m.getFullYear(), m.getMonth(), m.getDate()) -
        Date.UTC(WEEK_ANCHOR.getFullYear(), WEEK_ANCHOR.getMonth(), WEEK_ANCHOR.getDate())) / (7 * 864e5),
    );
    let top = ((weeks % 2) + 2) % 2 === 0;
    if (flip) top = !top;
    return top ? "top" : "bottom";
  }

  const autoSemester = (d = new Date()) => (d.getMonth() >= 1 && d.getMonth() <= 6 ? 1 : 2);

  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

  function fmtDuration(min) {
    min = Math.max(0, Math.round(min));
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h && m) return `${h} ч ${m} мин`;
    if (h) return `${h} ч`;
    return `${m} мин`;
  }

  const sameLessons = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // Пары конкретного дня с учётом верхней/нижней недели
  function dayLessons(days, date, flip) {
    const wd = weekdayIndex(date);
    if (!days || wd > 6) return [];
    const wt = weekType(date, flip);
    const other = wt === "top" ? "bottom" : "top";
    return (days[wd] || [])
      .map((p) => {
        const t = PAIR_TIMES[p.n];
        return {
          n: p.n,
          start: t ? t[0] : null,
          end: t ? t[1] : null,
          lessons: p[wt],
          other: p.split && !sameLessons(p[wt], p[other]) ? p[other] : null,
        };
      })
      .filter((p) => p.lessons && p.lessons.length);
  }

  // Состояние дня относительно текущего времени
  function dayStatus(list, now = new Date()) {
    const timed = list.filter((p) => p.start);
    if (!timed.length) return { state: "none" };
    const t = nowMin(now);
    for (let i = 0; i < timed.length; i++) {
      const p = timed[i];
      const s = toMin(p.start);
      const e = toMin(p.end);
      if (t < s) {
        return i === 0
          ? { state: "before", next: p, minutes: s - t }
          : { state: "break", next: p, minutes: s - t };
      }
      if (t >= s && t < e) {
        return { state: "during", current: p, next: timed[i + 1] || null, minutes: e - t, progress: (t - s) / (e - s) };
      }
    }
    return { state: "after" };
  }

  // ---------- версии по неделям ----------
  // ОшТУ каждую субботу выкладывает расписание следующей недели, база хранит версию каждой недели.
  const pad = (n) => String(n).padStart(2, "0");
  const weekKey = (d) => {
    const m = mondayOf(d);
    return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(m.getDate())}`;
  };

  // Расписание (уже разобранное) для недели, в которую входит date.
  // data = ответ oshtu_schedule: { raw, weeks: [{week_start, raw}] }
  function daysFor(data, date) {
    if (!data) return null;
    const cache = data._parsed || (Object.defineProperty(data, "_parsed", { value: {}, enumerable: false }), data._parsed);
    const key = weekKey(date);
    if (cache[key]) return cache[key];
    const weeks = (data.weeks || []).slice().sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
    let pick = weeks.find((w) => w.week_start === key);
    if (!pick) pick = weeks.filter((w) => w.week_start < key).pop(); // будущие недели — последняя известная версия
    if (!pick) pick = weeks[0]; // давние прошлые — самая ранняя сохранённая
    cache[key] = parseSchedule(pick ? pick.raw : data.raw);
    return cache[key];
  }

  window.Core = {
    weekKey, daysFor,
    PAIR_TIMES, TYPES, store, rpc, parseSchedule, weekType, autoSemester,
    startOfDay, addDays, mondayOf, sameDay, weekdayIndex, toMin, nowMin, fmtDuration,
    dayLessons, dayStatus,
  };
})();
