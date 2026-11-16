// Вариант 2: лента пар дня; нажатие на пару открывает карточку со всей информацией и темой занятия.
// Использует общие config.js, i18n.js и core.js (их не меняет). Выбор группы — тот же, что в первом варианте.
(function () {
  "use strict";
  const C = window.Core;
  const I = window.I18N;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------- тексты варианта 2 ----------
  const V = {
    ru: {
      group: "Группа", teacher: "Преподаватель", room: "Аудитория", classic: "Классика", noSel: "Расписание не выбрано",
      noSelText: "Выбери группу, преподавателя или аудиторию — это займёт полминуты.", choose: "Выбрать",
      pairsN: "{n} {w} · с {s} до {e}", noPairs: "Пар нет", dayOff: "Выходной", sunday: "Воскресенье — отдыхай!",
      free: "Свободно", window: "Окно", brk: "Перемена {d}", bigBrk: "Большая перемена {d}",
      details: "Подробнее", nPair: "{n}-я пара", now: "Идёт сейчас · осталось {d}", soon: "Начнётся через {d}",
      past: "Уже прошла", later: "{rel}", dur: "{d}",
      teacherK: "Преподаватель", roomK: "Аудитория", groupK: "Группа", subK: "Подгруппа", weekK: "Неделя", typeK: "Вид занятия",
      otherK: "На другой неделе", dateK: "День", every: "Каждую неделю", onlyTop: "Только по верхним неделям", onlyBottom: "Только по нижним неделям",
      bld: "корпус {b}, аудитория {r}", subN: "{n}-я подгруппа", allGroup: "Вся группа", noOther: "пары нет",
      topic: "Тема занятия", topicPh: "Запиши тему, задание или что взять с собой…",
      topicHint: "В открытом расписании ОшТУ тем нет — они есть только в «Рабочем плане» на портале после входа студента. Запиши тему здесь — она сохранится на этом телефоне.",
      portal: "Открыть портал ОшТУ ↗", prevTopics: "Прошлые записи по этому предмету", copyIt: "Вставить",
      notesTitle: "Мои записи", notesEmpty: "Записей пока нет. Нажми на пару и запиши тему — она появится здесь.",
      ahead: "Впереди", earlier: "Прошедшие", share: "Поделиться", cal: "В календарь", copied: "Скопировано ✓",
      calSaved: "Файл календаря скачан — открой его", topicLbl: "Тема",
      saved: "Сохранено ✓", week: "Этот предмет на неделе", exams: "Зачёт / экзамен по предмету", consult: "Консультация",
      prev: "‹ Предыдущая", next: "Следующая ›", close: "Закрыть", synced: "Сверено с сайтом ОшТУ {ago}",
      upd: "Обновление…", ok: "Онлайн", off: "Офлайн", stale: "ОшТУ недоступен", fresh: "Расписание актуально",
      loading: "Загружаю расписание…", err: "Нет связи — показана сохранённая копия", tapHint: "Нажми на пару — откроется полная информация",
      noteMark: "📝 {t}",
    },
    ky: {
      group: "Топ", teacher: "Окутуучу", room: "Аудитория", classic: "Классика", noSel: "Жадыбал тандалган жок",
      noSelText: "Топту, окутуучуну же аудиторияны тандаңыз — жарым мүнөт гана кетет.", choose: "Тандоо",
      pairsN: "{n} {w} · {s} – {e}", noPairs: "Сабак жок", dayOff: "Дем алыш", sunday: "Жекшемби — эс алыңыз!",
      free: "Бош", window: "Бош убакыт", brk: "Тыныгуу {d}", bigBrk: "Чоң тыныгуу {d}",
      details: "Толугураак", nPair: "{n}-пара", now: "Азыр жүрүп жатат · {d} калды", soon: "{d} кийин башталат",
      past: "Өтүп кетти", later: "{rel}", dur: "{d}",
      teacherK: "Окутуучу", roomK: "Аудитория", groupK: "Топ", subK: "Топчо", weekK: "Апта", typeK: "Сабактын түрү",
      otherK: "Башка аптада", dateK: "Күн", every: "Ар апта", onlyTop: "Үстүңкү апталарда гана", onlyBottom: "Астыңкы апталарда гана",
      bld: "{b}-корпус, {r}-аудитория", subN: "{n}-топчо", allGroup: "Бүт топ", noOther: "сабак жок",
      topic: "Сабактын темасы", topicPh: "Теманы, тапшырманы же эмне алып келүү керектигин жазыңыз…",
      topicHint: "ОшТУнун ачык жадыбалында темалар жок — алар порталдагы «Иш планында» студент киргенден кийин гана көрүнөт. Теманы ушул жерге жазыңыз — ал ушул телефондо сакталат.",
      portal: "ОшТУ порталын ачуу ↗", prevTopics: "Бул сабак боюнча мурунку жазуулар", copyIt: "Коюу",
      notesTitle: "Менин жазууларым", notesEmpty: "Азырынча жазуу жок. Параны басып, теманы жазыңыз — ал ушул жерде чыгат.",
      ahead: "Алдыда", earlier: "Өткөндөр", share: "Бөлүшүү", cal: "Календарга", copied: "Көчүрүлдү ✓",
      calSaved: "Календарь файлы жүктөлдү — аны ачыңыз", topicLbl: "Тема",
      saved: "Сакталды ✓", week: "Бул сабак аптада", exams: "Бул сабак боюнча зачёт / экзамен", consult: "Консультация",
      prev: "‹ Мурунку", next: "Кийинки ›", close: "Жабуу", synced: "ОшТУнун сайты менен салыштырылды: {ago}",
      upd: "Жаңылоодо…", ok: "Онлайн", off: "Офлайн", stale: "ОшТУ иштебейт", fresh: "Жадыбал актуалдуу",
      loading: "Жадыбал жүктөлүүдө…", err: "Байланыш жок — сакталган көчүрмө көрсөтүлдү", tapHint: "Параны басыңыз — толук маалымат ачылат",
      noteMark: "📝 {t}",
    },
    en: {
      group: "Group", teacher: "Teacher", room: "Room", classic: "Classic", noSel: "No schedule chosen",
      noSelText: "Choose a group, teacher or room — it takes half a minute.", choose: "Choose",
      pairsN: "{n} {w} · {s} – {e}", noPairs: "No classes", dayOff: "Day off", sunday: "Sunday — have a rest!",
      free: "Free", window: "Gap", brk: "Break {d}", bigBrk: "Long break {d}",
      details: "Details", nPair: "Period {n}", now: "In progress · {d} left", soon: "Starts in {d}",
      past: "Already over", later: "{rel}", dur: "{d}",
      teacherK: "Teacher", roomK: "Room", groupK: "Group", subK: "Subgroup", weekK: "Week", typeK: "Class type",
      otherK: "On the other week", dateK: "Day", every: "Every week", onlyTop: "Top weeks only", onlyBottom: "Bottom weeks only",
      bld: "building {b}, room {r}", subN: "subgroup {n}", allGroup: "Whole group", noOther: "no class",
      topic: "Class topic", topicPh: "Write the topic, homework or what to bring…",
      topicHint: "The public OshTU schedule has no topics — they are only in the “Work plan” on the portal after a student signs in. Write the topic here — it's saved on this phone.",
      portal: "Open the OshTU portal ↗", prevTopics: "Earlier notes for this subject", copyIt: "Paste",
      notesTitle: "My notes", notesEmpty: "No notes yet. Tap a class and write its topic — it will show up here.",
      ahead: "Upcoming", earlier: "Past", share: "Share", cal: "Add to calendar", copied: "Copied ✓",
      calSaved: "Calendar file downloaded — open it", topicLbl: "Topic",
      saved: "Saved ✓", week: "This subject this week", exams: "Credit / exam for this subject", consult: "Consultation",
      prev: "‹ Previous", next: "Next ›", close: "Close", synced: "Checked with the OshTU site {ago}",
      upd: "Updating…", ok: "Online", off: "Offline", stale: "OshTU down", fresh: "Schedule is up to date",
      loading: "Loading schedule…", err: "No connection — showing the saved copy", tapHint: "Tap a class to see full details",
      noteMark: "📝 {t}",
    },
  };
  const v = (k, vars) => {
    let s = (V[I.lang] || V.ru)[k] ?? V.ru[k] ?? k;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, x) => (vars[x] != null ? String(vars[x]) : m));
    return s;
  };

  // ---------- настройки и данные ----------
  const settings = C.store.get("oshtu.settings", {}) || {};
  if (settings.groupId && !settings.targetId) {
    settings.mode = "group";
    settings.targetId = settings.groupId;
    settings.targetName = settings.groupName;
  }
  if (I.LANGS.includes(settings.lang)) I.setLang(settings.lang);
  const mode = () => settings.mode || "group";
  const sem = () => (settings.semester && settings.semester !== "auto" ? Number(settings.semester) : C.autoSemester());
  const cacheKey = () => `oshtu.tt.${mode()}.${settings.targetId}.${sem()}`;
  const NOTES_KEY = "oshtu.v2.notes";
  let notes = C.store.get(NOTES_KEY, {}) || {};

  const state = { date: null, data: null, exams: null, sync: "idle", busy: false, last: 0, open: null };

  const lessonsOn = (d) => (state.data ? C.dayLessons(C.daysFor(state.data, d), d, settings.weekFlip) : []);
  const pad = (n) => String(n).padStart(2, "0");
  const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const noteKey = (d, p, l) => `${mode()}:${settings.targetId}:${dkey(d)}:${p.n}:${l.subject}`;
  const typeCls = (t) => (C.TYPES[t] ? C.TYPES[t].cls : "lec");

  function toast(msg, ms = 2200) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), ms);
  }

  function relLabel(d) {
    const diff = Math.round((C.startOfDay(d) - C.startOfDay(new Date())) / 864e5);
    if (diff === 0) return I.t("today");
    if (diff === 1) return I.t("tomorrow");
    if (diff === -1) return I.t("yesterday");
    return diff > 0 ? I.t("inDays", { n: diff }) : I.t("daysAgo", { n: -diff });
  }

  function ago(ts) {
    if (!ts) return "—";
    const m = (Date.now() - new Date(ts).getTime()) / 60000;
    if (m < 1) return I.t("ago.just");
    if (m < 60) return I.t("ago.min", { n: Math.round(m) });
    if (m < 1440) return I.t("ago.h", { n: Math.round(m / 60) });
    return I.dayMonth(new Date(ts), true);
  }

  function defaultDate() {
    let d = C.startOfDay(new Date());
    if (C.weekdayIndex(d) === 7) return C.addDays(d, 1);
    if (state.data) {
      const st = C.dayStatus(lessonsOn(d));
      if (st.state === "after" || (st.state === "none" && new Date().getHours() >= 17)) {
        d = C.addDays(d, 1);
        if (C.weekdayIndex(d) === 7) d = C.addDays(d, 1);
      }
    }
    return d;
  }

  function roomText(room) {
    const m = String(room || "").match(/^\s*([^/]+)\/(.+)$/);
    return m ? v("bld", { b: m[1].trim(), r: m[2].trim() }) : room;
  }

  // ---------- загрузка ----------
  function loadCached() {
    const c = C.store.get(cacheKey());
    if (c && c.raw) state.data = { ...c, kind: mode() };
  }

  function setSync(s) {
    state.sync = s;
    $("dot").className = "dot " + ({ busy: "busy", ok: "ok", stale: "busy", off: "off" }[s] || "");
    $("syncText").textContent = { busy: v("upd"), ok: v("ok"), stale: v("stale"), off: v("off") }[s] || "";
  }

  async function sync(force) {
    if (!settings.targetId || state.busy) return;
    state.busy = true;
    state.last = Date.now();
    setSync("busy");
    try {
      const r = await C.rpc("oshtu_timetable", {
        p_kind: mode(), p_id: settings.targetId, p_semester: sem(), p_name: settings.targetName || null, p_max_age_sec: force ? 30 : 60,
      });
      const had = !!state.data;
      state.data = { ...r, kind: mode(), savedAt: Date.now() };
      C.store.set(cacheKey(), { ...r, savedAt: Date.now() });
      setSync(r.source === "stale" ? "stale" : "ok");
      if (!had) state.date = defaultDate();
      render();
      if (force) toast(v("fresh"));
    } catch {
      setSync("off");
      if (force || !state.data) toast(v("err"));
      render();
    } finally {
      state.busy = false;
    }
  }

  async function loadExams() {
    const key = `oshtu.ex.0.${mode()}.${settings.targetId}.${sem()}`;
    const cached = C.store.get(key);
    if (cached) state.exams = cached.list || [];
    try {
      const r = await C.rpc("oshtu_exams", { p_kind: mode(), p_id: settings.targetId, p_semester: sem(), p_type: 0 });
      state.exams = r.data || [];
      C.store.set(key, { list: state.exams, at: r.updated_at, source: r.source });
      // не перерисовываем карточку, пока в ней набирают тему
      if (state.open && document.activeElement?.id !== "noteBox") renderSheet();
    } catch {}
  }

  // ---------- отрисовка ----------
  function renderTop() {
    const kindName = v(mode());
    $("whoKind").textContent = kindName;
    $("whoName").textContent = settings.targetFull || settings.targetName || "—";
    $("langBtn").textContent = { ru: "RU", ky: "KG", en: "EN" }[I.lang];
    $("classicText").textContent = v("classic");
    const cnt = settings.targetId ? myNotes().filter((o) => o.date >= C.startOfDay(new Date())).length : 0;
    $("notesCount").textContent = cnt;
    $("notesCount").hidden = !cnt;
    $("notesBtn").setAttribute("aria-label", v("notesTitle"));
    $("notesBtn").title = v("notesTitle");
    $("notesBtn").hidden = !settings.targetId;
    document.title = `${I.t("app.title")} · v2`;
    setSync(state.sync);
  }

  function renderDays() {
    const today = new Date();
    let mon = C.mondayOf(C.startOfDay(today));
    // если выбранный день вне этих двух недель — полоска переезжает на его неделю
    if (state.date && (state.date < mon || state.date >= C.addDays(mon, 14))) mon = C.mondayOf(state.date);
    let html = "";
    for (let w = 0; w < 2; w++) {
      for (let i = 0; i < 6; i++) {
        const d = C.addDays(mon, w * 7 + i);
        const cls = ["day", C.sameDay(d, today) ? "today" : "", C.sameDay(d, state.date) ? "sel" : "", w === 1 && i === 0 ? "gap" : ""].join(" ");
        html += `<button class="${cls}" data-d="${d.getTime()}"><small>${esc(I.weekdayShort(d))}</small><b>${d.getDate()}</b><i class="${lessonsOn(d).length ? "has" : ""}"></i></button>`;
      }
    }
    $("days").innerHTML = html;
    const sel = $("days").querySelector(".sel");
    if (sel) sel.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function renderHead() {
    const d = state.date;
    $("relDay").textContent = relLabel(d);
    const tb = $("todayBtn");
    tb.textContent = I.t("today") + " ↩";
    tb.hidden = C.sameDay(d, defaultDate()) || C.sameDay(d, new Date());
    $("dayTitle").textContent = I.dateLong(d);
    $("weekTag").textContent = C.weekType(d, settings.weekFlip) === "top" ? I.t("weekTop") : I.t("weekBottom");
    const list = lessonsOn(d).filter((p) => p.start);
    $("daySummary").textContent = !state.data ? "" : list.length
      ? v("pairsN", { n: list.length, w: I.plural(list.length, I.PAIRS), s: list[0].start, e: list[list.length - 1].end }) + " · " + v("tapHint")
      : C.weekdayIndex(d) === 7 ? v("dayOff") : v("noPairs");
  }

  function lessonMeta(l) {
    const parts = [];
    if (l.teacher && mode() !== "teacher") parts.push(`👤 ${esc(l.teacher)}`);
    if (l.group && mode() !== "group") parts.push(`👥 ${esc(l.group)}`);
    if (l.room && mode() !== "room") parts.push(`📍 ${esc(l.room)}`);
    if (l.sub) parts.push(`◐ ${esc(I.t("sub", { n: l.sub }))}`);
    return parts.map((x) => `<span>${x}</span>`).join("");
  }

  function renderTimeline(anim) {
    const el = $("timeline");
    const d = state.date;
    if (!settings.targetId) {
      el.innerHTML = `<div class="empty"><div class="big">🎓</div><h3>${esc(v("noSel"))}</h3><p>${esc(v("noSelText"))}</p><a href="./">${esc(v("choose"))} →</a></div>`;
      return;
    }
    if (!state.data) {
      el.innerHTML = `<div class="empty"><div class="big">⏳</div><h3>${esc(v("loading"))}</h3></div>`;
      return;
    }
    if (C.weekdayIndex(d) === 7) {
      el.innerHTML = `<div class="empty"><div class="big">🌤️</div><h3>${esc(v("sunday"))}</h3></div>`;
      return;
    }
    const list = lessonsOn(d);
    if (!list.length) {
      el.innerHTML = `<div class="empty"><div class="big">🎉</div><h3>${esc(v("noPairs"))}</h3><p>${esc(relLabel(d))}</p></div>`;
      return;
    }
    const isToday = C.sameDay(d, new Date());
    const now = C.nowMin();
    const first = list[0].n, last = list[list.length - 1].n;
    let html = "";
    for (let n = first; n <= last; n++) {
      const t = C.PAIR_TIMES[n];
      const p = list.find((x) => x.n === n);
      if (!p) {
        html += `<div class="slot free"><div class="rail"><div class="num">${n}</div><div class="tm">${t ? t[0] : ""}</div></div>
          <div class="free-box">${esc(mode() === "room" ? v("free") : v("window"))} · ${t ? `${t[0]}–${t[1]}` : ""}</div></div>`;
        continue;
      }
      let cls = "slot", bar = "";
      if (isToday && p.start) {
        const s = C.toMin(p.start), e = C.toMin(p.end);
        if (now >= e) cls += " past";
        else if (now >= s) { cls += " now"; bar = `<i class="bar" style="width:${Math.round(((now - s) / (e - s)) * 100)}%"></i>`; }
      }
      const cards = p.lessons.map((l, i) => {
        const ty = C.TYPES[l.type];
        const note = notes[noteKey(d, p, l)];
        return `<button class="card ${typeCls(l.type)}" data-n="${p.n}" data-i="${i}">
          <div class="row1"><div class="subj">${esc(l.subject)}</div>${ty ? `<span class="chip">${esc(ty.label)}</span>` : ""}</div>
          <div class="meta">${lessonMeta(l)}</div>
          <div class="more"><span class="note-mark">${note ? esc(v("noteMark", { t: note.split("\n")[0] })) : ""}</span><span>${esc(v("details"))} ›</span></div>
          ${bar}
        </button>`;
      }).join("");
      html += `<div class="${cls}"><div class="rail"><div class="num">${p.n}</div><div class="tm">${p.start || ""}<br>${p.end || ""}</div></div><div>${cards}</div></div>`;
      const nx = list.find((x) => x.n === n + 1);
      if (nx && p.end && nx.start) {
        const gap = C.toMin(nx.start) - C.toMin(p.end);
        if (gap >= 20) html += `<div class="break">☕ ${esc(v("bigBrk", { d: C.fmtDuration(gap) }))}</div>`;
      }
    }
    el.innerHTML = html;
    if (anim) {
      el.classList.remove("slide-l", "slide-r");
      void el.offsetWidth;
      el.classList.add(anim);
    }
  }

  function renderFoot() {
    $("foot").textContent = state.data && state.data.checked_at ? v("synced", { ago: ago(state.data.checked_at) }) : "";
  }

  function render(anim) {
    if (!state.date) state.date = defaultDate();
    renderTop();
    renderDays();
    renderHead();
    renderTimeline(anim);
    renderFoot();
  }

  // ---------- полная информация о паре ----------
  function openSheet(date, n, i) {
    flushNote();
    state.open = { date: C.startOfDay(date), n, i };
    renderSheet();
    const dlg = $("sheet");
    if (!dlg.open) dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  }

  // отложенное сохранение темы: при закрытии карточки / уходе со страницы сохраняем сразу
  let pendingSave = null;
  function flushNote() {
    if (pendingSave) { const f = pendingSave; pendingSave = null; f(); }
  }

  function closeSheet() {
    flushNote();
    state.open = null;
    $("sheet").close();
    renderTop();
    renderTimeline();
  }

  // ---------- мои записи ----------
  function parseNoteKey(k) {
    const a = k.split(":");
    if (a.length < 5) return null;
    const [md, id, ds, n] = a;
    const [y, m, dd] = ds.split("-").map(Number);
    return { mode: md, id, date: new Date(y, m - 1, dd), n: Number(n), subject: a.slice(4).join(":") };
  }

  function myNotes() {
    const out = [];
    for (const [k, text] of Object.entries(notes)) {
      const p = parseNoteKey(k);
      if (p && p.mode === mode() && String(p.id) === String(settings.targetId)) out.push({ ...p, text, key: k });
    }
    return out.sort((a, b) => a.date - b.date || a.n - b.n);
  }

  function noteItem(o) {
    const t = C.PAIR_TIMES[o.n];
    return `<button class="nitem" data-d="${o.date.getTime()}" data-n="${o.n}" data-s="${esc(o.subject)}">
      <span class="nh"><b>${esc(o.subject)}</b><small>${esc(I.weekdayShort(o.date))}, ${esc(I.dayMonth(o.date, true))} · ${esc(v("nPair", { n: o.n }))}${t ? " · " + t[0] : ""}</small></span>
      <span class="nt">${esc(o.text)}</span></button>`;
  }

  function openNotes() {
    flushNote();
    state.open = { notes: true };
    const all = myNotes();
    const today = C.startOfDay(new Date());
    const ahead = all.filter((o) => o.date >= today);
    const past = all.filter((o) => o.date < today).reverse();
    $("sheetBody").innerHTML = `
      <div class="sh-top"><span class="label">📝 ${esc(v("notesTitle"))} · ${esc(settings.targetName || "")}</span><button class="sh-close" data-close aria-label="${esc(v("close"))}">✕</button></div>
      ${all.length ? "" : `<div class="empty"><div class="big">📝</div><p>${esc(v("notesEmpty"))}</p></div>`}
      ${ahead.length ? `<div class="sec-t">${esc(v("ahead"))}</div><div class="nlist">${ahead.map(noteItem).join("")}</div>` : ""}
      ${past.length ? `<div class="sec-t">${esc(v("earlier"))}</div><div class="nlist">${past.map(noteItem).join("")}</div>` : ""}`;
    const dlg = $("sheet");
    if (!dlg.open) dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
    dlg.scrollTop = 0;
  }

  // открыть пару по дате/номеру/предмету (из записей)
  function openBySubject(date, n, subject) {
    const p = lessonsOn(date).find((x) => x.n === n);
    const i = p ? Math.max(0, p.lessons.findIndex((l) => l.subject === subject)) : 0;
    if (!p) { toast(v("noPairs")); return; }
    state.date = C.startOfDay(date);
    renderDays(); renderHead(); renderTimeline();
    openSheet(date, n, i);
    $("sheet").scrollTop = 0;
  }

  // ---------- поделиться / календарь ----------
  function pairText(date, p, l, note) {
    const ty = C.TYPES[l.type];
    return [
      `${l.subject}${ty ? ` (${ty.label.toLowerCase()})` : ""}`,
      `📅 ${I.dateLong(date)}, ${v("nPair", { n: p.n })} · ${p.start || ""}–${p.end || ""}`,
      l.room ? `📍 ${roomText(l.room)}` : "",
      l.teacher ? `👤 ${l.teacher}` : "",
      l.group ? `👥 ${l.group}` : (mode() === "group" && settings.targetName ? `👥 ${settings.targetName}` : ""),
      l.sub ? `◐ ${v("subN", { n: l.sub })}` : "",
      note ? `📝 ${v("topicLbl")}: ${note}` : "",
    ].filter(Boolean).join("\n");
  }

  async function sharePair(date, p, l, note) {
    const text = pairText(date, p, l, note);
    try {
      if (navigator.share) { await navigator.share({ title: l.subject, text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); toast(v("copied")); }
    catch { toast(text, 5000); }
  }

  function icsPair(date, p, l, note) {
    const f = (hm) => { const [h, m] = hm.split(":").map(Number); return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`; };
    const e = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const ty = C.TYPES[l.type];
    const desc = [ty ? ty.label : "", l.teacher, l.group || (mode() === "group" ? settings.targetName : ""), note ? `${v("topicLbl")}: ${note}` : ""].filter(Boolean).join("\n");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ESA//OshTU schedule//RU", "CALSCALE:GREGORIAN",
      "BEGIN:VTIMEZONE", "TZID:Asia/Bishkek", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0600", "TZOFFSETTO:+0600", "TZNAME:+06", "END:STANDARD", "END:VTIMEZONE",
      "BEGIN:VEVENT",
      `UID:${dkey(date)}-${p.n}-${[...l.subject].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}@oshtu-schedule`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
      `DTSTART;TZID=Asia/Bishkek:${f(p.start)}`, `DTEND;TZID=Asia/Bishkek:${f(p.end)}`,
      `SUMMARY:${e(l.subject + (ty ? ` (${ty.short || ty.label})` : ""))}`,
      l.room ? `LOCATION:${e(roomText(l.room))}` : "",
      desc ? `DESCRIPTION:${e(desc)}` : "",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT10M", `DESCRIPTION:${e(l.subject)}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    a.download = `oshtu-${dkey(date)}-${p.n}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(v("calSaved"));
  }

  function occurrences(subject) {
    const mon = C.mondayOf(state.open.date);
    const out = [];
    for (let k = 0; k < 6; k++) {
      const d = C.addDays(mon, k);
      for (const p of lessonsOn(d)) {
        p.lessons.forEach((l, i) => {
          if (l.subject === subject) out.push({ d, p, l, i });
        });
      }
    }
    return out;
  }

  function examsFor(subject) {
    const s = subject.toLowerCase().replace(/\s+/g, " ").trim();
    return (state.exams || []).filter((e) => {
      const x = String(e.SubjectName || "").toLowerCase().replace(/\s+/g, " ").trim();
      return x && (x === s || x.startsWith(s) || s.startsWith(x));
    });
  }

  function renderSheet() {
    if (!state.open) return;
    if (state.open.notes) return openNotes();
    const { date, n } = state.open;
    const list = lessonsOn(date);
    const pi = list.findIndex((x) => x.n === n);
    const p = list[pi];
    if (!p) return closeSheet();
    const i = Math.min(state.open.i, p.lessons.length - 1);
    const l = p.lessons[i];
    const ty = C.TYPES[l.type];

    // состояние относительно текущего времени
    let stateTxt = "", prog = null;
    const startAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), ...(p.start || "0:0").split(":").map(Number));
    const endAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), ...(p.end || "0:0").split(":").map(Number));
    const nowMs = Date.now();
    if (p.start) {
      if (nowMs >= endAt) stateTxt = C.sameDay(date, new Date()) ? v("past") : relLabel(date);
      else if (nowMs >= startAt) { stateTxt = v("now", { d: C.fmtDuration((endAt - nowMs) / 60000) }); prog = (nowMs - startAt) / (endAt - startAt); }
      else stateTxt = (startAt - nowMs) < 864e5 ? v("soon", { d: C.fmtDuration((startAt - nowMs) / 60000) }) : relLabel(date);
    }
    const length = p.start && p.end ? C.fmtDuration(C.toMin(p.end) - C.toMin(p.start)) : "";

    // неделя: каждую / только верхняя / только нижняя
    const days = C.daysFor(state.data, date);
    const raw = (days[C.weekdayIndex(date)] || []).find((x) => x.n === n);
    const wt = C.weekType(date, settings.weekFlip);
    let weekTxt = v("every"), otherTxt = null;
    if (raw && raw.split && JSON.stringify(raw.top) !== JSON.stringify(raw.bottom)) {
      const other = wt === "top" ? raw.bottom : raw.top;
      const same = other.some((o) => o.subject === l.subject);
      weekTxt = same ? v("every") : wt === "top" ? v("onlyTop") : v("onlyBottom");
      otherTxt = other.length ? other.map((o) => `${o.subject}${C.TYPES[o.type] ? " (" + C.TYPES[o.type].label.toLowerCase() + ")" : ""}`).join(", ") : v("noOther");
    }

    const rows = [];
    const row = (ic, k, val, small) => rows.push(`<div class="r"><div class="ic">${ic}</div><div><div class="k">${esc(k)}</div><div class="v">${esc(val)}${small ? `<small>${esc(small)}</small>` : ""}</div></div></div>`);
    row("📅", v("dateK"), I.dateLong(date), relLabel(date));
    if (ty) row("🏷️", v("typeK"), ty.label);
    if (l.teacher) row("👤", v("teacherK"), l.teacher);
    if (l.room) row("📍", v("roomK"), roomText(l.room), l.room);
    if (l.group || mode() === "group") row("👥", v("groupK"), l.group || settings.targetName || "", mode() === "group" && !l.sub ? v("allGroup") : "");
    if (l.sub) row("◐", v("subK"), v("subN", { n: l.sub }));
    row("🔁", v("weekK"), weekTxt, wt === "top" ? I.t("weekTop") : I.t("weekBottom"));
    if (otherTxt) row("↔️", v("otherK"), otherTxt);
    if (p.lessons.length > 1) {
      p.lessons.forEach((x, k) => { if (k !== i) row("➕", v("nPair", { n: p.n }), x.subject, [x.teacher, x.room, x.sub ? v("subN", { n: x.sub }) : ""].filter(Boolean).join(" · ")); });
    }

    const nk = noteKey(date, p, l);
    const occ = occurrences(l.subject);
    const ex = examsFor(l.subject);
    const prevNotes = myNotes().filter((o) => o.subject === l.subject && o.key !== nk).reverse().slice(0, 6);

    $("sheetBody").innerHTML = `
      <div class="sh-top"><span class="label">${esc(v("nPair", { n: p.n }))} · ${esc(I.weekdayLong(date))}</span><button class="sh-close" data-close aria-label="${esc(v("close"))}">✕</button></div>
      <div class="sh-hero ${typeCls(l.type)}">
        <div class="n">${esc(v("nPair", { n: p.n }))}</div>
        <h2>${esc(l.subject)}</h2>
        ${ty ? `<span class="tp">${esc(ty.label)}</span>` : ""}
        <div class="time">${p.start || ""} – ${p.end || ""}${length ? ` · ${esc(length)}` : ""}</div>
        <div class="state">${esc(stateTxt)}</div>
        ${prog != null ? `<div class="pbar"><i style="width:${Math.round(prog * 100)}%"></i></div>` : ""}
      </div>
      <div class="acts">
        <button id="shShare">📤 ${esc(v("share"))}</button>
        ${p.start && p.end ? `<button id="shCal">📅 ${esc(v("cal"))}</button>` : ""}
      </div>
      <div class="info">${rows.join("")}</div>

      <div class="sec-t">📝 ${esc(v("topic"))}</div>
      <textarea id="noteBox" class="note" placeholder="${esc(v("topicPh"))}">${esc(notes[nk] || "")}</textarea>
      <p class="hint">${esc(v("topicHint"))} <a href="https://portal.oshtu.kg/" target="_blank" rel="noopener">${esc(v("portal"))}</a></p>

      ${prevNotes.length ? `<div class="sec-t">${esc(v("prevTopics"))}</div><div class="nlist">${prevNotes.map(noteItem).join("")}</div>` : ""}

      ${occ.length > 1 ? `<div class="sec-t">${esc(v("week"))}</div><div class="occ">${occ.map((o) => `
        <button class="${C.sameDay(o.d, date) && o.p.n === p.n ? "cur" : ""}" data-d="${o.d.getTime()}" data-n="${o.p.n}" data-i="${o.i}">
          <span>${esc(I.weekdayLong(o.d))}, ${esc(v("nPair", { n: o.p.n }))}${C.TYPES[o.l.type] ? " · " + esc(C.TYPES[o.l.type].label) : ""}</span>
          <span>${esc(I.dayMonth(o.d, true))} · ${o.p.start || ""}</span>
        </button>`).join("")}</div>` : ""}

      ${ex.length ? `<div class="sec-t">${esc(v("exams"))}</div>${ex.map((e) => {
        const ed = C.parseAnyDate(e.ExamDate), cd = C.parseAnyDate(e.ConsultDate);
        return `<div class="exam-box"><b>${esc(e.ExamTypeName || "")} · ${esc(ed ? I.dateLong(ed) : e.ExamDate || "")}${e.ExamTime ? ", " + esc(e.ExamTime) : ""}</b>
          <span>${e.AuditoryName ? "📍 " + esc(e.AuditoryName) : ""}${e.ShortFIO ? " · 👤 " + esc(e.ShortFIO) : ""}${cd ? ` · ${esc(v("consult"))}: ${esc(I.dayMonth(cd, true))}${e.ConsultTime ? " " + esc(e.ConsultTime) : ""}` : ""}</span></div>`;
      }).join("")}` : ""}

      <div class="sh-nav">
        <button id="shPrev" ${pi > 0 ? "" : "disabled"}>${esc(v("prev"))}</button>
        <button id="shNext" ${pi < list.length - 1 ? "" : "disabled"}>${esc(v("next"))}</button>
      </div>`;

    const box = $("noteBox");
    let timer = null;
    const save = () => {
      clearTimeout(timer);
      pendingSave = null;
      const val = box.value.trim();
      if ((notes[nk] || "") === val) return;
      if (val) notes[nk] = val; else delete notes[nk];
      C.store.set(NOTES_KEY, notes);
      toast(v("saved"), 1200);
    };
    box.oninput = () => {
      clearTimeout(timer);
      pendingSave = save;
      timer = setTimeout(save, 600);
    };
    box.onblur = () => flushNote();
    $("shShare").onclick = () => { flushNote(); sharePair(date, p, l, notes[nk]); };
    if ($("shCal")) $("shCal").onclick = () => { flushNote(); icsPair(date, p, l, notes[nk]); };
    $("shPrev").onclick = () => { flushNote(); state.open = { date, n: list[pi - 1].n, i: 0 }; renderSheet(); $("sheet").scrollTop = 0; };
    $("shNext").onclick = () => { flushNote(); state.open = { date, n: list[pi + 1].n, i: 0 }; renderSheet(); $("sheet").scrollTop = 0; };
  }

  // ---------- навигация ----------
  function go(delta) {
    let d = C.addDays(state.date, delta);
    if (C.weekdayIndex(d) === 7) d = C.addDays(d, delta);
    state.date = d;
    renderDays();
    renderHead();
    renderTimeline(delta > 0 ? "slide-l" : "slide-r");
  }

  function bind() {
    $("days").addEventListener("click", (e) => {
      const b = e.target.closest(".day");
      if (!b) return;
      const d = new Date(+b.dataset.d);
      const dir = d > state.date ? "slide-l" : "slide-r";
      state.date = d;
      renderDays();
      renderHead();
      renderTimeline(dir);
    });
    $("timeline").addEventListener("click", (e) => {
      const c = e.target.closest(".card");
      if (c) openSheet(state.date, +c.dataset.n, +c.dataset.i);
    });
    const dlg = $("sheet");
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest("[data-close]")) return closeSheet();
      const o = e.target.closest(".occ button");
      if (o) { openSheet(new Date(+o.dataset.d), +o.dataset.n, +o.dataset.i); dlg.scrollTop = 0; return; }
      const ni = e.target.closest(".nitem");
      if (ni) openBySubject(new Date(+ni.dataset.d), +ni.dataset.n, ni.dataset.s);
    });
    dlg.addEventListener("close", () => { flushNote(); if (state.open) { state.open = null; renderTop(); renderTimeline(); } });
    $("notesBtn").onclick = () => openNotes();
    $("todayBtn").onclick = () => {
      const d = defaultDate();
      const dir = d > state.date ? "slide-l" : "slide-r";
      state.date = d;
      renderDays(); renderHead(); renderTimeline(dir);
    };
    window.addEventListener("pagehide", flushNote);
    $("syncBtn").onclick = () => sync(true);
    $("langBtn").onclick = () => {
      const next = { ru: "ky", ky: "en", en: "ru" }[I.lang];
      I.setLang(next);
      const s = C.store.get("oshtu.settings", {}) || {};
      s.lang = next;
      settings.lang = next;
      C.store.set("oshtu.settings", s);
      render();
      if (state.open) renderSheet();
    };
    // свайп по ленте — другой день
    let x0 = null, y0 = 0, t0 = 0;
    const tl = $("timeline");
    tl.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
    tl.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 800) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener("keydown", (e) => {
      if ($("sheet").open) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") { flushNote(); return; }
      render();
      if (Date.now() - state.last > 60e3) sync(false);
    });
    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!$("sheet").open) renderTimeline(); // открытую карточку не трогаем — там может набираться тема
      renderFoot();
      if (Date.now() - state.last > 120e3) sync(false);
    }, 30e3);
  }

  function init() {
    I.apply();
    bind();
    if (settings.targetId) loadCached();
    state.date = defaultDate();
    render();
    if (settings.targetId) {
      sync(false);
      loadExams();
    }
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  init();
})();
