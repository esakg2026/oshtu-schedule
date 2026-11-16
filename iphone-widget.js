// Расписание ОшТУ — виджет для iPhone (приложение Scriptable).
// Установка: https://oshtu-schedule.onrender.com/iphone.html
// Поддерживает виджеты: маленький, средний, большой и на экране блокировки.

const KIND = "__KIND__";            // "group", "teacher" или "room"
const GROUP = __GROUP__;            // ID группы / преподавателя / аудитории на портале ОшТУ
const GROUP_NAME = "__GROUP_NAME__";
const NOTIFY = __NOTIFY__;          // напоминание за N минут до пары (0 — выключено)
const STYLE = "__STYLE__";          // "simple" — стандартный звук, иначе — мелодия Scriptable
const SEMESTER = "__SEMESTER__";    // "auto", "1" (весенний) или "2" (осенний)
const FLIP = __FLIP__;              // true — если верхняя/нижняя неделя показываются наоборот
const LANG_RAW = "__LANG__";        // язык: "ru", "ky" или "en"
const LANG = ["ru", "ky", "en"].includes(LANG_RAW) ? LANG_RAW : "ru";
const TR = {
  ru: { today: "Сегодня", tomorrow: "Завтра", h: "ч", min: "мин", first: "Первая пара", next: "Дальше {n}-я", in: "через {d}",
        now: "Сейчас {n}-я · ещё {d}", none: "Пар нет", noneLow: "пар нет", pairs: "пар(ы)", dayOff: "Выходной", more: "ещё {n}…",
        top: "верхняя", bottom: "нижняя", offline: "нет сети, копия", upd: "обновлено", room: "ауд.", rem: "Через {m} мин — {n}-я пара ({t})",
        err: "Нет связи и нет сохранённого расписания. Открой виджет, когда появится интернет.",
        wd: ["", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"], wds: ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"],
        mons: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
        type: { лк: "лк.", пр: "пр.", лб: "лаб.", ла: "лаб.", се: "сем." } },
  ky: { today: "Бүгүн", tomorrow: "Эртең", h: "саат", min: "мүн", first: "Биринчи пара", next: "Андан кийин {n}-пара", in: "{d} кийин",
        now: "Азыр {n}-пара · дагы {d}", none: "Сабак жок", noneLow: "сабак жок", pairs: "пара", dayOff: "Дем алыш", more: "дагы {n}…",
        top: "үстүңкү", bottom: "астыңкы", offline: "тармак жок, көчүрмө", upd: "жаңыланды", room: "ауд.", rem: "{m} мүнөттөн кийин — {n}-пара ({t})",
        err: "Байланыш жок жана сакталган жадыбал жок. Интернет пайда болгондо виджетти ачыңыз.",
        wd: ["", "дүйшөмбү", "шейшемби", "шаршемби", "бейшемби", "жума", "ишемби", "жекшемби"], wds: ["", "дш", "шш", "шр", "бш", "жм", "иш", "жк"],
        mons: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
        type: { лк: "лк.", пр: "пр.", лб: "лаб.", ла: "лаб.", се: "сем." } },
  en: { today: "Today", tomorrow: "Tomorrow", h: "h", min: "min", first: "First class", next: "Next: period {n}", in: "in {d}",
        now: "Period {n} now · {d} left", none: "No classes", noneLow: "no classes", pairs: "classes", dayOff: "Day off", more: "{n} more…",
        top: "top", bottom: "bottom", offline: "offline copy", upd: "updated", room: "room", rem: "In {m} min — period {n} ({t})",
        err: "No connection and no saved schedule. Open the widget when you're online.",
        wd: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], wds: ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        mons: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        type: { лк: "lec.", пр: "pr.", лб: "lab", ла: "lab", се: "sem." } },
};
const L = TR[LANG];
const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const subDate = (d) => `${L.wds[((d.getDay() + 6) % 7) + 1]}, ${LANG === "ky" ? d.getDate() + "-" : d.getDate() + " "}${L.mons[d.getMonth()]}`;

const SITE = "https://oshtu-schedule.onrender.com";
const API = [SITE + "/sb", "https://pzdraaxgzphxennadrlu.supabase.co"];
const KEY = "sb_publishable_DjYWqTHsA02JavCvE3y5Eg_xVNezrf1";
const TIMES = { 1: ["08:00", "09:20"], 2: ["09:30", "10:50"], 3: ["11:20", "12:40"], 4: ["12:50", "14:10"], 5: ["14:20", "15:40"], 6: ["15:50", "17:10"] };
const WEEK_ANCHOR = new Date(2026, 10, 9); // неделя 9–14 ноября 2026 — «верхняя»
const C = {
  bg1: new Color("#161927"), bg2: new Color("#1E2240"),
  text: new Color("#EEF0FA"), muted: new Color("#8D92AB"), accent: new Color("#9D9DFF"),
  past: new Color("#5A5F78"), now1: new Color("#5B5BF6"), status: new Color("#2A2C5A"),
};

// ---------- данные ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), `oshtu-${KIND}-${GROUP}.json`);

function semesterId() {
  if (SEMESTER === "1" || SEMESTER === "2") return Number(SEMESTER);
  const m = new Date().getMonth();
  return m >= 1 && m <= 6 ? 1 : 2;
}

async function load() {
  let lastErr;
  for (const base of API) {
    try {
      const req = new Request(`${base}/rest/v1/rpc/oshtu_timetable`);
      req.method = "POST";
      req.timeoutInterval = 15;
      req.headers = { apikey: KEY, "Content-Type": "application/json" };
      req.body = JSON.stringify({ p_kind: KIND, p_id: GROUP, p_semester: semesterId(), p_name: GROUP_NAME || null, p_max_age_sec: 300 });
      const data = await req.loadJSON();
      if (!data || !data.raw) throw new Error((data && data.message) || "bad response");
      data._savedAt = Date.now();
      fm.writeString(cachePath, JSON.stringify(data));
      return { data, offline: false };
    } catch (e) {
      lastErr = e;
    }
  }
  if (fm.fileExists(cachePath)) return { data: JSON.parse(fm.readString(cachePath)), offline: true };
  throw lastErr;
}

// ---------- разбор (как в веб-версии) ----------
const TYPE_RE = /\((лк|пр|лб|лаб|сем)[^)]*\)/i;
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// формат ячейки: group «Предмет (лк.)/Преподаватель [ауд]», teacher «Группа (лк.) [ауд]/Предмет», room «Предмет (лк.)/Группа Преподаватель»
function parseBlock(html) {
  const lines = html.split(/<br\s*\/?>/i).map((s) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(.*?)\s*\((лк|пр|лб|лаб|сем)[^)]*\)\s*(?:\[([^\]]+)\])?\s*$/i);
    if (m) {
      const sm = m[1].trim().match(/^\((\d+)\)\s*(.*)$/);
      const head = sm ? sm[2].trim() : m[1].trim();
      const l = { subject: "", type: m[2].toLowerCase().slice(0, 2), teacher: "", room: (m[3] || "").trim(), group: "", sub: sm ? sm[1] : "" };
      const next = lines[i + 1] && !TYPE_RE.test(lines[i + 1]) ? lines[i + 1] : null;
      if (KIND === "teacher") {
        l.group = head;
        if (next) { l.subject = next; i++; }
      } else if (KIND === "room") {
        l.subject = head;
        if (next) { const g = next.match(/^(\S*\d\S*)\s+(.+)$/); if (g) { l.group = g[1]; l.teacher = g[2]; } else l.teacher = next; i++; }
      } else {
        l.subject = head;
        if (next) { const r = next.match(/^(.*?)\s*\[([^\]]+)\]\s*$/); l.teacher = r ? r[1].trim() : next; l.room = r ? r[2].trim() : ""; i++; }
      }
      if (!l.subject) l.subject = l.group || "Занятие";
      out.push(l);
    } else {
      const r = lines[i].match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
      const last = out[out.length - 1];
      if (r && last && !last.teacher) { last.teacher = r[1].trim(); last.room = r[2].trim(); }
      else out.push({ subject: lines[i], type: "", teacher: "", room: "" });
    }
  }
  return out;
}

function parseCell(html) {
  if (!html || !html.replace(/<[^>]+>|\s|&nbsp;/g, "")) return null;
  const parts = html.split(/<hr[^>]*>/i);
  if (parts.length === 1) { const l = parseBlock(parts[0]); return l.length ? { top: l, bottom: l } : null; }
  const top = parseBlock(parts[0]), bottom = parseBlock(parts.slice(1).join(""));
  return top.length || bottom.length ? { top, bottom } : null;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; };
const dow = (d) => ((d.getDay() + 6) % 7) + 1; // Пн=1 … Вс=7
const mondayOf = (d) => addDays(d, -(dow(d) - 1));
const pad = (n) => String(n).padStart(2, "0");
const weekKey = (d) => { const m = mondayOf(d); return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(m.getDate())}`; };
const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

function isTop(d) {
  const m = mondayOf(d);
  const w = Math.round((Date.UTC(m.getFullYear(), m.getMonth(), m.getDate()) - Date.UTC(WEEK_ANCHOR.getFullYear(), WEEK_ANCHOR.getMonth(), WEEK_ANCHOR.getDate())) / 6048e5);
  const top = ((w % 2) + 2) % 2 === 0;
  return FLIP ? !top : top;
}

function rawFor(data, d) {
  const key = weekKey(d);
  const weeks = (data.weeks || []).slice().sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  const pick = weeks.find((w) => w.week_start === key) || weeks.filter((w) => w.week_start < key).pop() || weeks[0];
  return pick ? pick.raw : data.raw;
}

function lessonsOn(data, d) {
  const wd = dow(d);
  if (wd > 6) return [];
  const variant = isTop(d) ? "top" : "bottom";
  const out = [];
  for (const row of rawFor(data, d) || []) {
    const cell = parseCell(row[`WeekDay${wd}`] || "");
    if (!cell || !cell[variant].length) continue;
    const n = Number(row.PairNumber);
    out.push({ n, start: TIMES[n] ? TIMES[n][0] : null, end: TIMES[n] ? TIMES[n][1] : null, lessons: cell[variant] });
  }
  return out.sort((a, b) => a.n - b.n);
}

function pickDay(data) {
  let d = startOfDay(new Date());
  if (dow(d) === 7) return addDays(d, 1);
  const list = lessonsOn(data, d).filter((p) => p.end);
  const over = list.length ? nowMin() >= toMin(list[list.length - 1].end) : new Date().getHours() >= 17;
  if (over) { d = addDays(d, 1); if (dow(d) === 7) d = addDays(d, 1); }
  return d;
}

function dur(min) {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  return h && m ? `${h} ${L.h} ${m} ${L.min}` : h ? `${h} ${L.h}` : `${m} ${L.min}`;
}

const TYPE = L.type;

// ---------- виджет ----------
function status(list, isToday) {
  if (!isToday) return null;
  const t = nowMin();
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p.start) continue;
    const s = toMin(p.start), e = toMin(p.end);
    if (t < s) return { text: `${i === 0 ? L.first : fmt(L.next, { n: p.n })} ${fmt(L.in, { d: dur(s - t) })}`, pair: p };
    if (t < e) return { text: fmt(L.now, { n: p.n, d: dur(e - t) }), pair: p, now: true };
  }
  return null;
}

function nextRefresh(list, isToday) {
  const base = new Date(Date.now() + 15 * 60e3);
  if (!isToday) return base;
  const t = nowMin();
  let next = t + 15;
  for (const p of list) {
    if (!p.start) continue;
    for (const x of [toMin(p.start), toMin(p.end)]) if (x > t) next = Math.min(next, x);
  }
  const d = startOfDay(new Date());
  d.setMinutes(next, 5);
  return d;
}

function build(data, offline) {
  const family = config.widgetFamily || "large";
  const w = new ListWidget();
  w.url = SITE;
  const d = pickDay(data);
  const isToday = startOfDay(d).getTime() === startOfDay(new Date()).getTime();
  const list = lessonsOn(data, d);
  const st = status(list, isToday);
  w.refreshAfterDate = nextRefresh(list, isToday);

  const title = isToday ? L.today : (addDays(new Date(), 1).getTime() === d.getTime() ? L.tomorrow : L.wd[dow(d)]);

  // экран блокировки
  if (family.startsWith("accessory")) {
    if (family === "accessoryInline") {
      const p = st ? st.pair : list[0];
      w.addText(p ? `${p.n} · ${p.start} ${p.lessons[0].subject}` : L.none);
      return w;
    }
    const t = w.addText(st ? st.text : `${title}: ${list.length ? list.length + " " + L.pairs : L.noneLow}`);
    t.font = Font.boldSystemFont(12);
    t.lineLimit = 1;
    const shown = st ? [st.pair] : list.slice(0, 2);
    for (const p of shown) {
      const r = w.addText(`${p.n} · ${p.start || ""} ${p.lessons[0].subject}`);
      r.font = Font.systemFont(12);
      r.lineLimit = 1;
    }
    return w;
  }

  const g = new LinearGradient();
  g.colors = [C.bg1, C.bg2];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  const small = family === "small";
  w.setPadding(small ? 12 : 14, small ? 12 : 16, small ? 12 : 14, small ? 12 : 16);

  const head = w.addStack();
  head.centerAlignContent();
  const ht = head.addText(title.charAt(0).toUpperCase() + title.slice(1));
  ht.font = Font.boldSystemFont(small ? 15 : 18);
  ht.textColor = C.text;
  head.addSpacer();
  if (!small) {
    const sub = head.addText(`${subDate(d)} · ${isTop(d) ? L.top : L.bottom}`);
    sub.font = Font.systemFont(11);
    sub.textColor = C.muted;
  }

  if (st && !small) {
    w.addSpacer(6);
    const sbox = w.addStack();
    sbox.backgroundColor = C.status;
    sbox.cornerRadius = 8;
    sbox.setPadding(4, 8, 4, 8);
    const s = sbox.addText(st.text);
    s.font = Font.mediumSystemFont(11);
    s.textColor = C.text;
    s.lineLimit = 1;
  }
  w.addSpacer(small ? 6 : 8);

  if (!list.length) {
    const e = w.addText(dow(d) === 7 ? L.dayOff : L.none + " 🎉");
    e.font = Font.mediumSystemFont(small ? 13 : 15);
    e.textColor = C.muted;
  }

  const max = small ? 3 : family === "medium" ? 3 : 6;
  const t = nowMin();
  for (const p of list.slice(0, max)) {
    const past = isToday && p.end && t >= toMin(p.end);
    const cur = isToday && p.start && t >= toMin(p.start) && !past;
    const row = w.addStack();
    row.centerAlignContent();
    row.setPadding(3, 6, 3, 6);
    if (cur) { row.backgroundColor = C.now1; row.cornerRadius = 8; }
    const n = row.addText(String(p.n));
    n.font = Font.boldSystemFont(13);
    n.textColor = cur ? C.text : past ? C.past : C.accent;
    row.addSpacer(6);
    if (!small) {
      const tm = row.addText(p.start || "");
      tm.font = Font.systemFont(11);
      tm.textColor = cur ? C.text : past ? C.past : C.muted;
      row.addSpacer(6);
    }
    const l = p.lessons[0];
    const name = small ? l.subject : `${l.subject}${TYPE[l.type] ? ` (${TYPE[l.type]})` : ""}${p.lessons.length > 1 ? ` +${p.lessons.length - 1}` : ""}`;
    const s = row.addText(name);
    s.font = Font.semiboldSystemFont(small ? 12 : 13);
    s.textColor = past ? C.past : C.text;
    s.lineLimit = 1;
    const right = KIND === "group" ? l.room : l.group;
    if (!small && right) {
      row.addSpacer();
      const r = row.addText(right);
      r.font = Font.systemFont(11);
      r.textColor = cur ? C.text : past ? C.past : C.muted;
    }
    w.addSpacer(2);
  }
  if (list.length > max) {
    const more = w.addText(fmt(L.more, { n: list.length - max }));
    more.font = Font.systemFont(11);
    more.textColor = C.muted;
  }

  w.addSpacer();
  const foot = w.addText(`${GROUP_NAME} · ${offline ? L.offline : L.upd} ${hhmm(new Date(data._savedAt || Date.now()))}`);
  foot.font = Font.systemFont(10);
  foot.textColor = C.muted;
  return w;
}

// напоминания: пары на 3 дня вперёд (Scriptable разрешает только встроенные звуки)
async function scheduleReminders(data) {
  if (typeof Notification === "undefined") return;
  try {
    const pending = await Notification.allPending();
    const ours = pending.filter((n) => n.threadIdentifier === "oshtu-lessons").map((n) => n.identifier);
    if (ours.length) Notification.removePending(ours);
    if (!NOTIFY) return;
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const day = addDays(now, i);
      for (const p of lessonsOn(data, day)) {
        if (!p.start) continue;
        const at = new Date(day.getTime() + toMin(p.start) * 60e3);
        const fire = new Date(at.getTime() - NOTIFY * 60e3);
        if (fire <= now) continue;
        const l = p.lessons[0];
        const n = new Notification();
        n.identifier = `oshtu-${at.getTime()}`;
        n.threadIdentifier = "oshtu-lessons";
        n.title = fmt(L.rem, { m: NOTIFY, n: p.n, t: p.start });
        n.body = [l.subject, KIND !== "group" ? l.group : "", KIND !== "teacher" ? l.teacher : "", KIND !== "room" && l.room ? L.room + " " + l.room : ""].filter(Boolean).join(" · ");
        n.sound = STYLE === "simple" ? "default" : "piano_success";
        n.openURL = SITE;
        n.setTriggerDate(fire);
        await n.schedule();
      }
    }
  } catch (e) {}
}

async function main() {
  let widget;
  try {
    const { data, offline } = await load();
    await scheduleReminders(data);
    widget = build(data, offline);
  } catch (e) {
    widget = new ListWidget();
    widget.backgroundColor = C.bg1;
    const t = widget.addText(L.err);
    t.textColor = C.muted;
    t.font = Font.systemFont(12);
    widget.refreshAfterDate = new Date(Date.now() + 10 * 60e3);
  }
  if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(widget);
  else await widget.presentLarge();
  Script.complete();
}

await main();
