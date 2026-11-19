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

  // Понедельник недели, которая на сайте ОшТУ «нечётная» (на сайте — верхняя) (неделя 9–14 ноября 2026).
  const WEEK_ANCHOR = new Date(2026, 10, 9);

  const L = () => window.I18N;
  const tr = (k, v, fb) => (L() ? L().t(k, v) : fb);
  const langNow = () => (L() ? L().lang : "ru");

  // label — подпись на текущем языке
  const TYPE_DEF = { лк: ["lec", "lec"], пр: ["prac", "prac"], лб: ["lab", "lab"], ла: ["lab", "lab"], се: ["sem", "prac"] };
  const TYPE_RU = { lec: "Лекция", prac: "Практика", lab: "Лабораторная", sem: "Семинар" };
  const TYPES = {};
  for (const [k, [key, cls]] of Object.entries(TYPE_DEF)) {
    Object.defineProperty(TYPES, k, {
      enumerable: true,
      get: () => ({ cls, label: tr(`type.${key}`, null, TYPE_RU[key]), short: tr(`typeShort.${key}`, null, k + ".") }),
    });
  }

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
    const PROXY = "https://oshtu-schedule.onrender.com/sb";
    const bases = local ? [SUPABASE_URL, PROXY] : [`${location.origin}/sb`, SUPABASE_URL];
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

  // Формат ячейки зависит от того, чьё расписание смотрим:
  //   group:   «(1) Предмет (лк.)» / «Преподаватель [корпус/ауд]»
  //   teacher: «(1) ПИ-1-24 (лк.)  [3/303]» / «Предмет»
  //   room:    «(1) Предмет (лк.)» / «ПИ-1-24 Преподаватель»
  const HEAD_RE = /^(.*?)\s*\((лк|пр|лб|лаб|сем)[^)]*\)\s*(?:\[([^\]]+)\])?\s*$/i;
  const ROOM_RE = /^(.*?)\s*\[([^\]]+)\]\s*$/;

  function splitSub(s) {
    const m = s.match(/^\((\d+)\)\s*(.*)$/);
    return m ? [m[1], m[2].trim()] : ["", s.trim()];
  }

  function parseBlock(html, kind = "group") {
    const lines = html
      .split(/<br\s*\/?>/i)
      .map((s) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(HEAD_RE);
      if (m) {
        const [sub, head] = splitSub(m[1]);
        const l = { subject: "", type: m[2].toLowerCase().slice(0, 2), teacher: "", room: (m[3] || "").trim(), group: "", sub };
        const next = lines[i + 1] && !TYPE_RE.test(lines[i + 1]) ? lines[i + 1] : null;
        if (kind === "teacher") {
          l.group = head;
          if (next) { l.subject = next; i++; }
        } else if (kind === "room") {
          l.subject = head;
          if (next) {
            const g = next.match(/^(\S*\d\S*)\s+(.+)$/);
            if (g) { l.group = g[1]; l.teacher = g[2]; } else l.teacher = next;
            i++;
          }
        } else {
          l.subject = head;
          if (next) {
            const r = next.match(ROOM_RE);
            if (r) { l.teacher = r[1].trim(); l.room = r[2].trim(); } else l.teacher = next;
            i++;
          }
        }
        if (!l.subject) l.subject = l.group || "Занятие";
        out.push(l);
      } else {
        const r = line.match(ROOM_RE);
        const last = out[out.length - 1];
        if (r && last && !last.teacher) {
          last.teacher = r[1].trim();
          last.room = r[2].trim();
        } else out.push({ subject: line, type: "", teacher: "", room: "", group: "", sub: "" });
      }
    }
    return out;
  }

  function parseCell(html, kind) {
    if (!html || !html.replace(/<[^>]+>|\s|&nbsp;/g, "")) return null;
    const parts = html.split(/<hr[^>]*>/i);
    if (parts.length === 1) {
      const l = parseBlock(parts[0], kind);
      return l.length ? { top: l, bottom: l, split: false } : null;
    }
    const top = parseBlock(parts[0], kind);
    const bottom = parseBlock(parts.slice(1).join(""), kind);
    return top.length || bottom.length ? { top, bottom, split: true } : null;
  }

  // raw = ArrayData с сайта ОшТУ → { 1: [{n, top, bottom, split}], ... 6: [...] }
  function parseSchedule(raw, kind = "group") {
    const days = {};
    for (let d = 1; d <= 6; d++) days[d] = [];
    for (const row of raw || []) {
      for (let d = 1; d <= 6; d++) {
        const cell = parseCell(row[`WeekDay${d}`] || "", kind);
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
    const H = tr("dur.h", null, "ч"), M = tr("dur.min", null, "мин");
    if (h && m) return `${h} ${H} ${m} ${M}`;
    if (h) return `${h} ${H}`;
    return `${m} ${M}`;
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
    cache[key] = parseSchedule(pick ? pick.raw : data.raw, data.kind || "group");
    return cache[key];
  }

  // ---------- режимы ----------
  const KINDS = {
    group: { label: "Группа", short: "Группа", rpcList: "oshtu_groups" },
    teacher: { label: "Преподаватель", short: "Преподаватель", rpcList: "oshtu_teachers" },
    room: { label: "Аудитория", short: "Аудитория", rpcList: "oshtu_rooms" },
  };

  // ---------- напоминания: ближайшие начала пар ----------
  function upcomingStarts(data, flip, from = new Date(), days = 7) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(from, i);
      for (const p of dayLessons(daysFor(data, d), d, flip)) {
        if (!p.start) continue;
        const [h, m] = p.start.split(":").map(Number);
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
        if (at > from) out.push({ at, pair: p });
      }
    }
    return out;
  }

  // ---------- даты экзаменов: «10.01.2027», «2027-01-10T00:00:00» ----------
  function parseAnyDate(s) {
    s = String(s || "").trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  // ---------- своя мелодия ----------
  let chimeAudio = null;
  function playChime() {
    try {
      if (!chimeAudio) chimeAudio = new Audio("oshtu_chime.wav");
      chimeAudio.currentTime = 0;
      return chimeAudio.play().catch(() => {});
    } catch {}
  }

  // ---------- голосовое напоминание (ru / ky / en) ----------
  // Та же логика продублирована в Schedule.java (Android) и Reminders.swift (iOS).
  const SPEECH = {
    ru: {
      ord: ["", "первая", "вторая", "третья", "четвёртая", "пятая", "шестая", "седьмая"],
      type: { лк: "лекция", пр: "практика", лб: "лабораторная работа", ла: "лабораторная работа", се: "семинар" },
    },
    ky: {
      ord: ["", "биринчи", "экинчи", "үчүнчү", "төртүнчү", "бешинчи", "алтынчы", "жетинчи"],
      type: { лк: "лекция", пр: "практика", лб: "лабораториялык иш", ла: "лабораториялык иш", се: "семинар" },
    },
    en: {
      ord: ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"],
      type: { лк: "lecture", пр: "practical", лб: "lab", ла: "lab", се: "seminar" },
    },
  };

  function minutesWord(n) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "минута";
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "минуты";
    return "минут";
  }

  // «3/303» → корпус и аудитория отдельно — так понятнее на слух
  function splitRoom(room) {
    const m = String(room || "").match(/^\s*([^/]+)\/(.+)$/);
    return m ? [m[1].trim(), m[2].trim()] : [null, String(room || "").trim()];
  }

  /** Текст для озвучивания: время до пары, аудитория, предмет, кто проводит / у кого. */
  function speechText(kind, pair, minutes, lang = langNow()) {
    const l = pair.lessons[0];
    const S = SPEECH[lang] || SPEECH.ru;
    const teacher = (l.teacher || "").replace(/\.+$/, "");
    const tw = S.type[l.type] || "";
    const [b, r] = splitRoom(l.room);
    const parts = [];

    if (lang === "ky") {
      const ord = S.ord[pair.n] ? `${S.ord[pair.n]} пара` : `${pair.n}-пара`;
      if (kind === "room") parts.push(`${minutes} мүнөттөн кийин бул аудиторияда ${ord} башталат.`);
      else parts.push(`Сабакка ${minutes} мүнөт калды. ${ord[0].toUpperCase() + ord.slice(1)} башталат.`);
      parts.push(`${l.subject}${tw ? ", " + tw : ""}.`);
      if (kind !== "room" && l.room) parts.push(`Сабак ${b ? `${b}-корпустун ${r}-аудиториясында` : `${r}-аудиторияда`} өтөт.`);
      if (kind !== "group" && l.group) parts.push(`${l.group} тобу${l.sub ? `, ${l.sub}-топчо` : ""}.`);
      if (kind !== "teacher" && teacher) parts.push(`Сабакты ${teacher} өткөрөт.`);
      if (kind === "group" && l.sub) parts.push(`${l.sub}-топчо үчүн.`);
      return parts.join(" ");
    }

    if (lang === "en") {
      const ord = S.ord[pair.n] ? `the ${S.ord[pair.n]} period` : `period ${pair.n}`;
      const mins = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
      if (kind === "room") parts.push(`In ${mins}, ${ord} starts in this room.`);
      else parts.push(`Your class starts in ${mins}. It's ${ord}.`);
      parts.push(`${l.subject}${tw ? ", " + tw : ""}.`);
      if (kind !== "room" && l.room) parts.push(`Room: ${b ? `building ${b}, room ${r}` : `room ${r}`}.`);
      if (kind !== "group" && l.group) parts.push(`Group ${l.group}${l.sub ? `, subgroup ${l.sub}` : ""}.`);
      if (kind !== "teacher" && teacher) parts.push(`Teacher: ${teacher}.`);
      if (kind === "group" && l.sub) parts.push(`For subgroup ${l.sub}.`);
      return parts.join(" ");
    }

    const ord = S.ord[pair.n] ? `${S.ord[pair.n]} пара` : `${pair.n}-я пара`;
    const mw = minutesWord(minutes);
    const acc = mw === "минута" ? "минуту" : mw; // «через 1 минуту»
    if (kind === "room") parts.push(`Через ${minutes} ${acc} в этой аудитории начнётся ${ord}.`);
    else parts.push(`До занятия ${mw === "минута" ? "осталась" : "осталось"} ${minutes} ${mw}. Начинается ${ord}.`);
    parts.push(`${l.subject}${tw ? ", " + tw : ""}.`);
    if (kind !== "room" && l.room) parts.push(`Занятие пройдёт: ${b ? `корпус ${b}, аудитория ${r}` : `аудитория ${r}`}.`);
    if (kind !== "group" && l.group) parts.push(`У группы ${l.group}${l.sub ? ", " + l.sub + " подгруппа" : ""}.`);
    if (kind !== "teacher" && teacher) parts.push(`Проводит ${teacher}.`);
    if (kind === "group" && l.sub) parts.push(`Для ${l.sub} подгруппы.`);
    return parts.join(" ");
  }

  /**
   * Куски текста для разных голосов. Английский текст содержит русские названия предметов и ФИО —
   * их читает русский голос, остальное — английский. Кыргызский читает кыргызский голос,
   * а если его нет в телефоне — русский (алфавит общий).
   */
  const CYR = /[А-Яа-яЁёӨөҮүҢң]/;
  const LAT = /[A-Za-z]/;
  function speechSegments(text, lang = langNow()) {
    if (lang !== "en") return [{ text, lang }];
    const out = [];
    for (const w of text.split(/(\s+)/)) {
      const k = CYR.test(w) ? "ru" : LAT.test(w) ? "en" : null;
      const last = out[out.length - 1];
      if (!last) out.push({ text: w, lang: k || "en" });
      else if (k && k !== last.lang) out.push({ text: w, lang: k });
      else last.text += w;
    }
    return out.filter((s) => s.text.trim());
  }

  function pickVoice(lang) {
    const voices = speechSynthesis.getVoices();
    const want = lang === "ky" ? [/^ky/i, /^ru/i] : lang === "en" ? [/^en/i] : [/^ru/i];
    for (const re of want) {
      const v = voices.find((x) => re.test(x.lang));
      if (v) return v;
    }
    return null;
  }

  function speak(text, lang = langNow()) {
    try {
      if (!("speechSynthesis" in window)) return false;
      speechSynthesis.cancel();
      for (const seg of speechSegments(text, lang)) {
        const u = new SpeechSynthesisUtterance(seg.text);
        const v = pickVoice(seg.lang);
        u.lang = v ? v.lang : { ru: "ru-RU", ky: "ru-RU", en: "en-US" }[seg.lang];
        if (v) u.voice = v;
        u.rate = 0.95;
        speechSynthesis.speak(u);
      }
      return true;
    } catch {
      return false;
    }
  }

  window.Core = {
    speechText, speak, speechSegments,
    KINDS, upcomingStarts, parseAnyDate, playChime,
    weekKey, daysFor,
    PAIR_TIMES, TYPES, store, rpc, parseSchedule, weekType, autoSemester,
    startOfDay, addDays, mondayOf, sameDay, weekdayIndex, toMin, nowMin, fmtDuration,
    dayLessons, dayStatus,
  };
})();
