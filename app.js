(function () {
  "use strict";
  const C = window.Core;
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const SETTINGS_KEY = "oshtu.settings";
  const WD_SHORT = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const ICON_USER =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>';
  const ICON_PIN =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const ICON_GROUP =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const ICON_CLOCK =
    '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // ---------- настройки (с переходом со старого формата «только группа») ----------
  let settings = C.store.get(SETTINGS_KEY, {}) || {};
  if (settings.groupId && !settings.mode) {
    settings.mode = "group";
    settings.targetId = settings.groupId;
    settings.targetName = settings.groupName;
  }
  if (settings.notify == null) settings.notify = 5;

  const state = {
    date: null,
    view: "day",
    section: "classes",
    data: null,
    exams: { 0: null, 1: null },
    sync: "idle",
    lastAttempt: 0,
    autoAdvanced: false,
  };

  const mode = () => settings.mode || "group";
  const semesterId = () => (settings.semester && settings.semester !== "auto" ? Number(settings.semester) : C.autoSemester());
  const cacheKey = () => `oshtu.tt.${mode()}.${settings.targetId}.${semesterId()}`;
  const examKey = (t) => `oshtu.ex.${t}.${mode()}.${settings.targetId}.${semesterId()}`;

  // мост к нативным приложениям (Android / iOS): выбор + настройки напоминаний
  const iosBridge = () => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.oshtu;
  const androidBridge = () => window.OshtuAndroid && window.OshtuAndroid.saveSettings ? window.OshtuAndroid : null;
  const inApp = () => !!(androidBridge() || iosBridge());
  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function pushToNative() {
    try {
      if (!settings.targetId) return;
      const payload = {
        ...settings,
        // совместимость со старыми версиями приложений (понимали только группы)
        groupId: mode() === "group" ? settings.targetId : 0,
        groupName: mode() === "group" ? settings.targetName : "",
      };
      const json = JSON.stringify(payload);
      if (androidBridge()) androidBridge().saveSettings(json);
      else if (iosBridge()) iosBridge().postMessage(json);
    } catch {}
  }
  const saveSettings = () => {
    C.store.set(SETTINGS_KEY, settings);
    pushToNative();
  };

  // ================= утилиты =================
  function toast(msg, ms = 2600) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }

  function ago(ts) {
    if (!ts) return "—";
    const diff = (Date.now() - new Date(ts).getTime()) / 60000;
    if (diff < 1) return "только что";
    if (diff < 60) return `${Math.round(diff)} мин назад`;
    if (diff < 24 * 60) return `${Math.round(diff / 60)} ч назад`;
    return new Date(ts).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtDate = (d) => cap(d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }));

  function relLabel(d) {
    const diff = Math.round((C.startOfDay(d) - C.startOfDay(new Date())) / 864e5);
    if (diff === 0) return "Сегодня";
    if (diff === 1) return "Завтра";
    if (diff === -1) return "Вчера";
    if (diff === 2) return "Послезавтра";
    return diff > 0 ? `Через ${diff} дн.` : `${-diff} дн. назад`;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // краткая подпись занятия в зависимости от режима (для карточки «сейчас», уведомлений)
  function lessonLine(l) {
    const extra = mode() === "teacher" ? [l.group, l.room] : mode() === "room" ? [l.group, l.teacher] : [l.room];
    return [l.subject, ...extra].filter(Boolean).join(" · ");
  }

  function defaultDate() {
    let d = C.startOfDay(new Date());
    state.autoAdvanced = false;
    if (C.weekdayIndex(d) === 7) {
      state.autoAdvanced = true;
      return C.addDays(d, 1);
    }
    const list = state.data ? lessonsOn(d) : [];
    const st = C.dayStatus(list);
    if ((st.state === "after" || (st.state === "none" && new Date().getHours() >= 17)) && state.data) {
      state.autoAdvanced = true;
      d = C.addDays(d, 1);
      if (C.weekdayIndex(d) === 7) d = C.addDays(d, 1);
    }
    return d;
  }

  function lessonsOn(d) {
    return state.data ? C.dayLessons(C.daysFor(state.data, d), d, settings.weekFlip) : [];
  }

  // ================= данные: занятия =================
  const weekHash = (data, key) => ((data && data.weeks) || []).find((w) => w.week_start === key)?.hash || null;

  function applyData(r, fromNetwork) {
    const prev = state.data;
    const data = {
      kind: mode(),
      hash: r.hash,
      checked_at: r.checked_at,
      changed_at: r.changed_at,
      source: r.source,
      error: r.error || null,
      savedAt: Date.now(),
      raw: r.raw,
      weeks: r.weeks || [],
    };
    state.data = data;
    C.store.set(cacheKey(), { ...r, savedAt: data.savedAt });
    if (fromNetwork && prev && prev.hash && prev.hash !== data.hash) {
      const thisWeek = C.weekKey(new Date());
      const nextWeek = C.weekKey(C.addDays(new Date(), 7));
      if (weekHash(prev, thisWeek) && weekHash(prev, thisWeek) !== weekHash(data, thisWeek)) {
        toast("Расписание этой недели изменилось на сайте ОшТУ");
      } else if (weekHash(prev, nextWeek) !== weekHash(data, nextWeek)) {
        toast("Вышло расписание на следующую неделю");
      } else {
        toast("Расписание обновлено");
      }
    }
  }

  function loadCached() {
    const c = C.store.get(cacheKey());
    if (c && c.raw) {
      applyData(c, false);
      state.data.source = "local";
      return true;
    }
    return false;
  }

  async function sync({ force = false, silent = false } = {}) {
    if (!settings.targetId || state.inFlight) return;
    state.inFlight = true;
    state.lastAttempt = Date.now();
    setSync("busy");
    try {
      const r = await C.rpc("oshtu_timetable", {
        p_kind: mode(),
        p_id: settings.targetId,
        p_semester: semesterId(),
        p_name: settings.targetName || null,
        p_max_age_sec: force ? 30 : 60,
      });
      const hadData = !!state.data;
      applyData(r, true);
      setSync(r.source === "stale" ? "stale" : "ok");
      if (!hadData) state.date = defaultDate();
      render();
      if (force && !silent) toast(r.source === "stale" ? "Сайт ОшТУ недоступен — показана сохранённая копия" : "Расписание актуально");
    } catch (e) {
      setSync(navigator.onLine ? "error" : "off");
      if (!state.data) renderError();
      else renderFooter();
      if (force && !silent) toast(navigator.onLine ? "Не удалось обновить — показана сохранённая копия" : "Нет интернета — показана сохранённая копия");
    } finally {
      state.inFlight = false;
    }
    if (state.section !== "classes") loadExams(state.section === "laz" ? 1 : 0);
  }

  function setSync(s) {
    state.sync = s;
    $("syncDot").className = "dot " + ({ busy: "busy", ok: "ok", stale: "stale", error: "off", off: "off" }[s] || "");
    $("syncText").textContent =
      { busy: "Обновление…", ok: "Онлайн", stale: "ОшТУ недоступен", error: "Ошибка сети", off: "Офлайн" }[s] || "";
    renderFooter();
  }

  // ================= данные: зачёты/экзамены (0) и ЛАЗ (1) =================
  async function loadExams(type) {
    if (!state.exams[type]) state.exams[type] = C.store.get(examKey(type));
    renderExams();
    try {
      const r = await C.rpc("oshtu_exams", { p_kind: mode(), p_id: settings.targetId, p_semester: semesterId(), p_type: type });
      state.exams[type] = { list: r.data || [], at: r.updated_at, source: r.source };
      C.store.set(examKey(type), state.exams[type]);
    } catch {
      if (state.exams[type]) state.exams[type].source = "local";
    }
    renderExams();
  }

  function renderExams() {
    if (state.section === "classes") return;
    const type = state.section === "laz" ? 1 : 0;
    const box = $("examsList");
    const ex = state.exams[type];
    const what = type === 1 ? "ЛАЗ (лабораторно-аудиторных занятий)" : "зачётов и экзаменов";
    if (!ex) {
      box.innerHTML = `<div class="empty"><div class="big">⏳</div><h3>Загружаю…</h3></div>`;
      return;
    }
    if (!ex.list.length) {
      box.innerHTML = `<div class="empty"><div class="big">${type === 1 ? "🧪" : "📝"}</div><h3>Пока не опубликован</h3>
        <p>График ${what} ещё не появился на сайте ОшТУ. Как только его выложат — он будет здесь автоматически.</p></div>`;
      return;
    }
    const today = C.startOfDay(new Date());
    const rows = ex.list
      .map((e) => ({ e, d: C.parseAnyDate(e.ExamDate) }))
      .sort((a, b) => (a.d && b.d ? a.d - b.d : a.d ? -1 : 1));
    box.innerHTML = rows
      .map(({ e, d }) => {
        const days = d ? Math.round((d - today) / 864e5) : null;
        const cls = ["exam", days != null && days < 0 ? "past" : "", days != null && days >= 0 && days <= 3 ? "soon" : ""].join(" ");
        const left = days == null ? "" : days === 0 ? "Сегодня" : days === 1 ? "Завтра" : days > 1 ? `Через ${days} ${plural(days, "день", "дня", "дней")}` : "";
        const cd = C.parseAnyDate(e.ConsultDate);
        const consult = e.ConsultDate || e.ConsultTime
          ? `<div class="consult">Консультация: ${esc(cd ? cd.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : e.ConsultDate || "")}${e.ConsultTime ? " · " + esc(e.ConsultTime) : ""}${e.ConsultAuditoryName ? " · ауд. " + esc(e.ConsultAuditoryName) : ""}</div>`
          : "";
        const teacher = [e.ShortFIO, e.AssistentShortFIO].filter(Boolean).join(", ");
        return `<article class="${cls}">
          <div class="exam-date">${d ? `<b>${d.getDate()}</b><span>${d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}</span><small>${d.toLocaleDateString("ru-RU", { weekday: "short" })}</small>` : `<b>—</b><small>${esc(e.ExamDate || "")}</small>`}</div>
          <div>
            <div class="lesson-head"><div class="subject">${esc(e.SubjectName)}</div>${e.ExamTypeName ? `<span class="tag lec">${esc(e.ExamTypeName)}</span>` : ""}</div>
            <div class="meta">
              ${e.ExamTime ? `<span>${ICON_CLOCK}${esc(e.ExamTime)}</span>` : ""}
              ${e.AuditoryName ? `<span>${ICON_PIN}${esc(e.AuditoryName)}</span>` : ""}
              ${e.GroupName && mode() !== "group" ? `<span>${ICON_GROUP}${esc(e.GroupName)}</span>` : ""}
              ${teacher && mode() !== "teacher" ? `<span>${ICON_USER}${esc(teacher)}</span>` : ""}
            </div>
            ${left ? `<div class="left">${left}</div>` : ""}
            ${consult}
          </div>
        </article>`;
      })
      .join("");
  }

  // ================= отрисовка =================
  function render() {
    if (!state.date) state.date = defaultDate();
    const prefix = { group: "", teacher: "", room: "Ауд. " }[mode()];
    $("groupName").textContent = settings.targetName ? prefix + settings.targetName : "Выбрать";
    $("classesBox").hidden = state.section !== "classes";
    $("examsBox").hidden = state.section === "classes";
    $("bottomBar").hidden = state.section !== "classes";
    document.querySelectorAll("#sectionSeg button").forEach((b) => b.classList.toggle("active", b.dataset.sec === state.section));
    renderHero();
    if (state.section === "classes") {
      renderStrip();
      renderContent();
    } else renderExams();
    renderFooter();
  }

  function renderHero() {
    const d = state.date;
    const isToday = C.sameDay(d, new Date());
    if (state.section !== "classes") {
      $("dayLabel").textContent = state.section === "laz" ? "График ЛАЗ" : "Сессия";
      $("dayTitle").textContent = state.section === "laz" ? "Лабораторные занятия" : "Зачёты и экзамены";
    } else if (state.view === "week") {
      const mon = C.mondayOf(d);
      const sat = C.addDays(mon, 5);
      const thisWeek = C.sameDay(mon, C.mondayOf(new Date()));
      const nextWeek = C.sameDay(mon, C.addDays(C.mondayOf(new Date()), 7));
      $("dayLabel").textContent = thisWeek ? "Эта неделя" : nextWeek ? "Следующая неделя" : "Неделя";
      const satStr = sat.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      $("dayTitle").textContent =
        mon.getMonth() === sat.getMonth()
          ? `${mon.getDate()} – ${satStr}`
          : `${mon.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} – ${satStr}`;
    } else {
      $("dayLabel").textContent = relLabel(d);
      $("dayTitle").textContent = fmtDate(d);
    }
    const wt = C.weekType(d, settings.weekFlip);
    $("weekBadge").textContent = wt === "top" ? "Верхняя неделя" : "Нижняя неделя";
    $("weekBadge").hidden = state.section !== "classes";
    $("todayBtn").textContent = state.view === "week" ? "Эта неделя" : isToday ? "Сегодня" : "К сегодня";

    // карточка «сейчас» — всегда про сегодняшний день
    const card = $("nowCard");
    const today = C.startOfDay(new Date());
    const list = state.data ? lessonsOn(today) : [];
    const st = C.dayStatus(list);
    const showFor = state.section !== "classes" || (state.view === "day" ? isToday : C.sameDay(C.mondayOf(d), C.mondayOf(today)));
    card.hidden = true;
    card.classList.remove("calm");
    $("nowBar").hidden = true;
    if (!state.data) return;

    if (showFor && st.state === "during") {
      card.hidden = false;
      $("nowTitle").textContent = `Сейчас ${st.current.n}-я пара`;
      $("nowTime").textContent = `ещё ${C.fmtDuration(st.minutes)}`;
      $("nowSub").textContent = lessonLine(st.current.lessons[0]);
      $("nowBar").hidden = false;
      $("nowBar").firstElementChild.style.width = `${Math.round(st.progress * 100)}%`;
    } else if (showFor && (st.state === "before" || st.state === "break")) {
      card.hidden = false;
      $("nowTitle").textContent = st.state === "before" ? `Первая пара в ${st.next.start}` : `Перемена · дальше ${st.next.n}-я пара`;
      $("nowTime").textContent = `через ${C.fmtDuration(st.minutes)}`;
      $("nowSub").textContent = lessonLine(st.next.lessons[0]);
    } else if (state.section === "classes" && state.view === "day" && state.autoAdvanced && C.sameDay(d, defaultDate())) {
      card.hidden = false;
      card.classList.add("calm");
      const todayIsSunday = C.weekdayIndex(today) === 7;
      $("nowTitle").textContent = todayIsSunday ? "Сегодня выходной" : "На сегодня пары закончились";
      const next = lessonsOn(d).filter((p) => p.start);
      $("nowTime").textContent = "";
      $("nowSub").textContent = next.length
        ? `${relLabel(d)} первая пара в ${next[0].start} — ${next[0].lessons[0].subject}`
        : `${relLabel(d)} пар нет`;
    }
  }

  function renderStrip() {
    const mon = C.mondayOf(state.date);
    const today = new Date();
    let html = "";
    for (let i = 0; i < 6; i++) {
      const d = C.addDays(mon, i);
      const cnt = state.data ? lessonsOn(d).length : 0;
      const cls = ["wd", C.sameDay(d, today) ? "today" : "", state.view === "day" && C.sameDay(d, state.date) ? "sel" : ""].join(" ");
      html += `<button class="${cls}" data-i="${i}"><small>${WD_SHORT[i + 1]}</small><b>${d.getDate()}</b><span class="cnt">${cnt ? cnt + " " + plural(cnt, "пара", "пары", "пар") : "—"}</span></button>`;
    }
    $("weekStrip").innerHTML = html;
  }

  function lessonHtml(l) {
    const t = C.TYPES[l.type];
    const meta = [];
    if (l.teacher && mode() !== "teacher") meta.push(`<span>${ICON_USER}${esc(l.teacher)}</span>`);
    if (l.group && mode() !== "group") meta.push(`<span>${ICON_GROUP}${esc(l.group)}</span>`);
    if (l.room && mode() !== "room") meta.push(`<span>${ICON_PIN}${esc(l.room)}</span>`);
    return `<div class="lesson">
      <div class="lesson-head"><div class="subject">${esc(l.subject)}${l.sub ? `<span class="sub-tag">${esc(l.sub)} подгр.</span>` : ""}</div>${t ? `<span class="tag ${t.cls}">${t.label}</span>` : ""}</div>
      <div class="meta">${meta.join("")}</div>
    </div>`;
  }

  function renderContent(anim) {
    const el = $("content");
    if (!state.data) {
      el.innerHTML = `<div class="empty"><div class="big">⏳</div><h3>Загружаю расписание…</h3><p>Первая загрузка занимает пару секунд</p></div>`;
      return;
    }
    el.innerHTML = state.view === "week" ? weekHtml() : dayHtml();
    if (anim) {
      el.classList.remove("slide-l", "slide-r");
      void el.offsetWidth;
      el.classList.add(anim);
    }
  }

  function dayHtml() {
    const d = state.date;
    if (C.weekdayIndex(d) === 7) {
      return `<div class="empty"><div class="big">🌤️</div><h3>Воскресенье</h3><p>Выходной — отдыхай!</p></div>`;
    }
    const list = lessonsOn(d);
    if (!list.length) {
      const free = mode() === "room" ? "Аудитория свободна весь день" : `${relLabel(d)} свободный день`;
      return `<div class="empty"><div class="big">🎉</div><h3>Пар нет</h3><p>${esc(free)}</p></div>`;
    }
    const isToday = C.sameDay(d, new Date());
    const t = C.nowMin();
    let html = "";
    let prev = null;
    for (const p of list) {
      if (prev && prev.end && p.start) {
        const gap = C.toMin(p.start) - C.toMin(prev.end);
        if (p.n - prev.n > 1) html += `<div class="gap">${mode() === "room" ? "Свободно" : "Окно"} · ${C.fmtDuration(gap)}</div>`;
        else if (gap >= 20) html += `<div class="gap">Большая перемена · ${gap} мин</div>`;
      }
      let cls = "pair";
      let style = "";
      if (isToday && p.start) {
        const s = C.toMin(p.start), e = C.toMin(p.end);
        if (t >= e) cls += " past";
        else if (t >= s) {
          cls += " now";
          style = ` style="--p:${Math.round(((t - s) / (e - s)) * 100)}%"`;
        }
      }
      html += `<article class="${cls}"${style}>
        <div class="pair-time"><div class="pair-num">${p.n}</div>${p.start ? `<span>${p.start}</span><em>${p.end}</em>` : ""}</div>
        <div>${p.lessons.map(lessonHtml).join("")}
        ${p.other ? `<div class="other">На ${C.weekType(d, settings.weekFlip) === "top" ? "нижней" : "верхней"} неделе: ${p.other.length ? esc(p.other.map((o) => o.subject).join(", ")) : "пары нет"}</div>` : ""}</div>
      </article>`;
      prev = p;
    }
    return html;
  }

  function weekHtml() {
    const mon = C.mondayOf(state.date);
    let html = "";
    for (let i = 0; i < 6; i++) {
      const d = C.addDays(mon, i);
      const list = lessonsOn(d);
      const today = C.sameDay(d, new Date());
      html += `<section class="wk-day${today ? " today" : ""}">
        <div class="wk-head" data-day="${i}"><b>${cap(d.toLocaleDateString("ru-RU", { weekday: "long" }))}${today ? " · сегодня" : ""}</b><span>${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span></div>
        ${
          list.length
            ? list
                .map((p) =>
                  p.lessons
                    .map((l, k) => {
                      const info = mode() === "teacher" ? [C.TYPES[l.type]?.label, l.group] : mode() === "room" ? [C.TYPES[l.type]?.label, l.group, l.teacher] : [C.TYPES[l.type]?.label, l.teacher];
                      return `<div class="wk-row"><span class="n">${k ? "" : p.n}</span><span class="t">${k ? "" : p.start || ""}</span>
                  <span class="s">${esc(l.subject)}${l.sub ? ` <span class="sub-tag">${esc(l.sub)}</span>` : ""}<small>${esc(info.filter(Boolean).join(" · "))}</small></span><span class="r">${esc(mode() === "room" ? "" : l.room)}</span></div>`;
                    })
                    .join(""),
                )
                .join("")
            : `<div class="wk-free">${mode() === "room" ? "Свободна" : "Пар нет"}</div>`
        }
      </section>`;
    }
    return html;
  }

  function renderFooter() {
    const el = $("syncInfo");
    if (state.section !== "classes") {
      const ex = state.exams[state.section === "laz" ? 1 : 0];
      el.textContent = ex && ex.at ? `Сверено с сайтом ОшТУ ${ago(ex.at)}` : "";
      return;
    }
    if (!state.data) {
      el.textContent = "";
      return;
    }
    const src = { stale: " · сайт ОшТУ сейчас недоступен", local: "" }[state.data.source] || "";
    el.textContent = `Сверено с сайтом ОшТУ ${ago(state.data.checked_at)}${src}`;
  }

  function renderError() {
    $("content").innerHTML = `<div class="empty"><div class="big">📡</div><h3>Не удалось загрузить</h3>
      <p>${navigator.onLine ? "Сервер временно недоступен." : "Нет подключения к интернету."} Как только связь появится, расписание загрузится и сохранится на телефоне.</p>
      <button class="btn btn-primary" id="retryBtn">Повторить</button></div>`;
    $("retryBtn").onclick = () => sync({ force: true });
  }

  // ================= напоминания (в браузере — пока сайт открыт; в приложениях — нативно) =================
  const NOTIFIED_KEY = "oshtu.notified";

  async function ensureNotifyPermission() {
    if (inApp()) {
      try { androidBridge() && androidBridge().requestNotifications && androidBridge().requestNotifications(); } catch {}
      return true;
    }
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  }

  async function showReminder(title, body) {
    C.playChime();
    toast(`🔔 ${title}`, 6000);
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const opts = { body, icon: "icon-192.png", badge: "icon-192.png", tag: "oshtu-reminder", renotify: true, vibrate: [120, 60, 120] };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) return reg.showNotification(title, opts);
      new Notification(title, opts);
    } catch {}
  }

  function checkReminders() {
    const min = Number(settings.notify || 0);
    if (!min || !state.data || inApp()) return;
    const now = Date.now();
    const done = C.store.get(NOTIFIED_KEY, {}) || {};
    for (const { at, pair } of C.upcomingStarts(state.data, settings.weekFlip, new Date(now - 60e3), 2)) {
      const fireAt = at.getTime() - min * 60e3;
      const key = `${mode()}:${settings.targetId}:${at.getTime()}`;
      if (now >= fireAt && now < at.getTime() && !done[key]) {
        done[key] = now;
        const l = pair.lessons[0];
        showReminder(`Через ${Math.max(1, Math.round((at.getTime() - now) / 60e3))} мин — ${pair.n}-я пара (${pair.start})`, lessonLine(l));
      }
    }
    for (const k of Object.keys(done)) if (now - done[k] > 2 * 864e5) delete done[k];
    C.store.set(NOTIFIED_KEY, done);
  }

  function notifyHintText() {
    if (androidBridge()) return "Напоминание со своей мелодией придёт, даже если приложение закрыто.";
    if (iosBridge()) return "Напоминание со своей мелодией придёт, даже если приложение закрыто. Разреши уведомления, когда iPhone спросит.";
    if (/android/i.test(navigator.userAgent)) return "В браузере напоминания работают, пока сайт открыт. Чтобы они приходили всегда — установи Android-приложение (ниже).";
    return "В браузере напоминания работают, пока сайт открыт.";
  }

  // ================= навигация =================
  function go(delta) {
    if (state.section !== "classes") return;
    if (state.view === "week") {
      state.date = C.addDays(state.date, delta * 7);
    } else {
      let d = C.addDays(state.date, delta);
      if (C.weekdayIndex(d) === 7) d = C.addDays(d, delta);
      state.date = d;
    }
    renderHero();
    renderStrip();
    renderContent(delta > 0 ? "slide-l" : "slide-r");
  }

  function goToday() {
    const target = defaultDate();
    const dir = target > state.date ? "slide-l" : "slide-r";
    state.date = state.view === "week" ? C.startOfDay(new Date()) : target;
    renderHero();
    renderStrip();
    renderContent(dir);
  }

  function setView(v) {
    state.view = v;
    document.querySelectorAll("#viewSeg button").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    render();
    renderContent("slide-l");
  }

  function setSection(sec) {
    state.section = sec;
    render();
    if (sec !== "classes") loadExams(sec === "laz" ? 1 : 0);
  }

  function bindSwipe(el) {
    let x0 = null, y0 = null, t0 = 0;
    el.addEventListener("touchstart", (e) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 800) go(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  // ================= первый запуск: выбор группы / преподавателя / аудитории =================
  async function cachedRpc(name, body, key) {
    try {
      const r = await C.rpc(name, body);
      C.store.set(key, r.data);
      return r.data;
    } catch (e) {
      const c = C.store.get(key);
      if (c) return c;
      throw e;
    }
  }

  function fillSelect(sel, items, placeholder, selected) {
    sel.innerHTML = `<option value="">${esc(placeholder)}</option>` + items.map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join("");
    sel.disabled = false;
    if (selected && items.some((i) => String(i.id) === String(selected))) sel.value = String(selected);
  }

  async function showSetup(cancelable) {
    $("main").hidden = true;
    $("setup").hidden = false;
    $("setupCancel").hidden = !cancelable;
    $("setupError").hidden = true;
    const save = $("setupSave");
    const fSem = $("fSemester");
    let setupMode = mode();

    const autoName = C.autoSemester() === 2 ? "Осенний" : "Весенний";
    fSem.innerHTML = `<option value="auto">Авто (сейчас ${autoName})</option><option value="2">Осенний</option><option value="1">Весенний</option>`;
    fSem.value = settings.semester ? String(settings.semester) : "auto";

    const showErr = (msg) => {
      $("setupError").textContent = msg;
      $("setupError").hidden = false;
    };
    const hideErr = () => ($("setupError").hidden = true);

    const validate = () => {
      const v = { group: $("fGroup").value, teacher: $("fTeacher").value, room: $("fRoom").value }[setupMode];
      save.disabled = !v;
    };

    // ----- студент -----
    const fFac = $("fFaculty"), fCourse = $("fCourse"), fGroup = $("fGroup");
    if (settings.course) fCourse.value = String(settings.course);
    async function loadGroups() {
      validate();
      if (!fFac.value || !fCourse.value) {
        fGroup.disabled = true;
        fGroup.innerHTML = `<option value="">Сначала факультет и курс</option>`;
        return;
      }
      fGroup.disabled = true;
      fGroup.innerHTML = `<option value="">Загрузка…</option>`;
      try {
        const groups = await cachedRpc("oshtu_groups", { p_faculty: +fFac.value, p_course: +fCourse.value }, `oshtu.meta.groups.${fFac.value}.${fCourse.value}`);
        const items = groups.map((g) => ({ id: g.ID, name: g.GroupName })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
        fillSelect(fGroup, items, "Выбери группу", mode() === "group" ? settings.targetId : null);
        hideErr();
      } catch {
        fGroup.innerHTML = `<option value="">Ошибка загрузки</option>`;
        showErr("Не удалось загрузить список групп. Проверь интернет и попробуй ещё раз.");
      }
      validate();
    }
    fFac.onchange = loadGroups;
    fCourse.onchange = loadGroups;
    fGroup.onchange = validate;

    // ----- преподаватель -----
    const fDept = $("fDept"), fTeacher = $("fTeacher"), fSearch = $("fTeacherSearch");
    let teachers = [];
    function drawTeachers() {
      const q = fSearch.value.trim().toLowerCase();
      const list = q ? teachers.filter((t) => t.name.toLowerCase().includes(q)) : teachers;
      const keep = fTeacher.value || (mode() === "teacher" ? settings.targetId : null);
      fillSelect(fTeacher, list, list.length ? `Выбери преподавателя (${list.length})` : "Никого не найдено", keep);
      if (q && list.length === 1) fTeacher.value = String(list[0].id);
      validate();
    }
    async function loadTeachers() {
      validate();
      teachers = [];
      fTeacher.disabled = true;
      fSearch.disabled = true;
      if (!fDept.value) {
        fTeacher.innerHTML = `<option value="">Сначала подразделение</option>`;
        return;
      }
      fTeacher.innerHTML = `<option value="">Загрузка…</option>`;
      try {
        const list = await cachedRpc("oshtu_teachers", { p_department: +fDept.value }, `oshtu.meta.teachers.${fDept.value}`);
        teachers = list.map((t) => ({ id: t.ID, name: t.EmployeeFIO })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
        fSearch.disabled = false;
        drawTeachers();
        hideErr();
      } catch {
        fTeacher.innerHTML = `<option value="">Ошибка загрузки</option>`;
        showErr("Не удалось загрузить список преподавателей. Проверь интернет.");
      }
    }
    fDept.onchange = () => { fSearch.value = ""; loadTeachers(); };
    fSearch.oninput = drawTeachers;
    fTeacher.onchange = validate;

    // ----- аудитория -----
    const fBuilding = $("fBuilding"), fRoom = $("fRoom");
    async function loadRooms() {
      validate();
      fRoom.disabled = true;
      if (!fBuilding.value) {
        fRoom.innerHTML = `<option value="">Сначала корпус</option>`;
        return;
      }
      fRoom.innerHTML = `<option value="">Загрузка…</option>`;
      try {
        const list = await cachedRpc("oshtu_rooms", { p_building: +fBuilding.value }, `oshtu.meta.rooms.${fBuilding.value}`);
        const items = list.map((r) => ({ id: r.ID, name: r.AuditoryName })).sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }));
        fillSelect(fRoom, items, "Выбери аудиторию", mode() === "room" ? settings.targetId : null);
        hideErr();
      } catch {
        fRoom.innerHTML = `<option value="">Ошибка загрузки</option>`;
        showErr("Не удалось загрузить список аудиторий. Проверь интернет.");
      }
      validate();
    }
    fBuilding.onchange = loadRooms;
    fRoom.onchange = validate;

    // ----- переключение режима -----
    const loaded = {};
    async function switchMode(m) {
      setupMode = m;
      document.querySelectorAll("#modeSeg button").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
      $("paneGroup").hidden = m !== "group";
      $("paneTeacher").hidden = m !== "teacher";
      $("paneRoom").hidden = m !== "room";
      hideErr();
      validate();
      if (loaded[m]) return;
      loaded[m] = true;
      try {
        if (m === "group") {
          const facs = await cachedRpc("oshtu_faculties", {}, "oshtu.meta.faculties");
          fillSelect(fFac, facs.map((f) => ({ id: f.ID, name: String(f.DepartmentName).trim() })), "Выбери факультет", settings.facultyId);
          if (fFac.value && fCourse.value) loadGroups();
        } else if (m === "teacher") {
          const deps = await cachedRpc("oshtu_departments", {}, "oshtu.meta.departments");
          fillSelect(fDept, deps.map((d) => ({ id: d.ID, name: String(d.DepartmentName).trim() })), "Выбери подразделение", settings.departmentId);
          if (fDept.value) loadTeachers();
        } else {
          const b = await cachedRpc("oshtu_buildings", {}, "oshtu.meta.buildings");
          fillSelect(fBuilding, b.map((x) => ({ id: x.ID, name: /^\d+$/.test(x.BuildingName) ? `Корпус ${x.BuildingName}` : x.BuildingName })), "Выбери корпус", settings.buildingId);
          if (fBuilding.value) loadRooms();
        }
      } catch {
        loaded[m] = false;
        showErr("Нет связи с сервером. Подключись к интернету для первой настройки.");
      }
    }
    document.querySelectorAll("#modeSeg button").forEach((b) => (b.onclick = () => switchMode(b.dataset.mode)));
    switchMode(setupMode);

    save.onclick = () => {
      const selText = (sel) => sel.options[sel.selectedIndex].text;
      let target;
      if (setupMode === "group") {
        target = { targetId: +fGroup.value, targetName: selText(fGroup), facultyId: +fFac.value, facultyName: selText(fFac), course: +fCourse.value };
      } else if (setupMode === "teacher") {
        const full = selText(fTeacher);
        const parts = full.split(/\s+/);
        const short = parts.length >= 3 ? `${parts[0]} ${parts[1][0]}.${parts[2][0]}.` : full;
        target = { targetId: +fTeacher.value, targetName: short, targetFull: full, departmentId: +fDept.value, departmentName: selText(fDept) };
      } else {
        const bName = fBuilding.options[fBuilding.selectedIndex].text.replace(/^Корпус\s+/, "");
        target = { targetId: +fRoom.value, targetName: `${bName}/${selText(fRoom)}`, buildingId: +fBuilding.value, buildingName: bName };
      }
      const changed = mode() !== setupMode || settings.targetId !== target.targetId || String(settings.semester || "auto") !== fSem.value;
      settings = { ...settings, ...target, mode: setupMode, semester: fSem.value };
      delete settings.groupId;
      delete settings.groupName;
      saveSettings();
      if (changed) {
        state.data = null;
        state.exams = { 0: null, 1: null };
      }
      startMain();
    };
    $("setupCancel").onclick = startMain;
  }

  // ================= настройки =================
  function openSettings() {
    const dlg = $("settings");
    $("sGroup").textContent = (mode() === "teacher" ? settings.targetFull : mode() === "room" ? `Аудитория ${settings.targetName}` : settings.targetName) || "—";
    $("sFaculty").textContent =
      mode() === "group"
        ? [settings.course ? settings.course + " курс" : "", settings.facultyName].filter(Boolean).join(" · ")
        : mode() === "teacher" ? `Преподаватель · ${settings.departmentName || ""}` : `Корпус ${settings.buildingName || ""}`;
    setSeg("sWeek", C.weekType(new Date(), settings.weekFlip));
    setSeg("sSemester", settings.semester ? String(settings.semester) : "auto");
    setSeg("sTheme", settings.theme || "auto");
    setSeg("sNotify", String(settings.notify || 0));
    $("notifyHint").textContent = notifyHintText();
    $("widgetUrl").value = widgetUrl();
    $("widgetOpen").href = widgetUrl();
    $("sInstall").hidden = !deferredPrompt || inApp();
    $("apkBlock").hidden = inApp() || isIOS();
    $("iosBlock").hidden = !isIOS() || inApp();
    $("appWidgetHint").hidden = !inApp();
    if (iosBridge()) {
      $("appWidgetHint").innerHTML =
        "Долгое нажатие на пустом месте экрана → <b>Править</b> → <b>Добавить виджет</b> → найди «Расписание ОшТУ». На экране блокировки тоже можно. ‹ › в виджете — другой день (iOS 17+).";
    }
    $("iosHint").hidden = !(/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone());
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function setSeg(id, v) {
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle("active", b.dataset.v === v));
  }

  function widgetUrl() {
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    const p = new URLSearchParams({ k: mode(), g: settings.targetId, n: settings.targetName || "" });
    if (settings.semester && settings.semester !== "auto") p.set("s", settings.semester);
    if (settings.weekFlip) p.set("f", "1");
    return `${base}widget.html?${p}`;
  }

  function applyTheme() {
    const t = settings.theme;
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }

  function bindSettings() {
    const dlg = $("settings");
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
    });
    $("sChange").onclick = () => {
      dlg.close();
      showSetup(true);
    };
    $("sNotify").onclick = async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const v = Number(b.dataset.v);
      if (v > 0) {
        const ok = await ensureNotifyPermission();
        if (!ok && !inApp()) toast("Разреши уведомления для сайта в настройках браузера — пока буду напоминать звуком на странице", 4000);
        C.playChime();
      }
      settings.notify = v;
      saveSettings();
      setSeg("sNotify", String(v));
      toast(v ? `Напомню за ${v} мин до начала пары` : "Напоминания выключены");
    };
    $("sTestSound").onclick = () => {
      if (androidBridge() && androidBridge().testReminder) androidBridge().testReminder();
      else if (iosBridge()) iosBridge().postMessage(JSON.stringify({ action: "testReminder" }));
      else C.playChime();
    };
    $("sWeek").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      settings.weekFlip = b.dataset.v !== C.weekType(new Date(), false);
      saveSettings();
      setSeg("sWeek", b.dataset.v);
      $("widgetUrl").value = widgetUrl();
      render();
    };
    $("sSemester").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      settings.semester = b.dataset.v;
      saveSettings();
      setSeg("sSemester", b.dataset.v);
      state.data = null;
      state.exams = { 0: null, 1: null };
      loadCached();
      render();
      sync({ force: true, silent: true });
    };
    $("sTheme").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      settings.theme = b.dataset.v;
      saveSettings();
      setSeg("sTheme", b.dataset.v);
      applyTheme();
    };
    $("widgetCopy").onclick = async () => {
      try {
        await navigator.clipboard.writeText($("widgetUrl").value);
      } catch {
        $("widgetUrl").select();
        document.execCommand("copy");
      }
      toast("Ссылка скопирована");
    };
    $("sRefresh").onclick = () => {
      dlg.close();
      sync({ force: true });
    };
    $("sInstall").onclick = () => {
      dlg.close();
      promptInstall();
    };
  }

  // ================= установка (PWA) =================
  let deferredPrompt = null;
  const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!C.store.get("oshtu.installDismissed") && !$("main").hidden && $("apkBanner").hidden && !inApp()) $("installBanner").hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    $("installBanner").hidden = true;
    toast("Приложение установлено 🎉");
  });

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    $("installBanner").hidden = true;
  }

  // ================= запуск =================
  function startMain() {
    $("setup").hidden = true;
    $("main").hidden = false;
    if (deferredPrompt && !C.store.get("oshtu.installDismissed") && !inApp()) $("installBanner").hidden = false;
    if (!state.data) loadCached();
    pushToNative();
    const wantApk = (/android/i.test(navigator.userAgent) || isIOS()) && !inApp() && !C.store.get("oshtu.apkDismissed");
    $("apkBanner").hidden = !wantApk;
    if (wantApk) $("installBanner").hidden = true;
    if (isIOS()) {
      $("apkBannerText").textContent = "Пары на домашнем экране iPhone";
      $("apkBannerBtn").textContent = "Настроить";
      $("apkBannerBtn").href = "iphone.html";
      $("apkBannerBtn").removeAttribute("download");
    }
    state.date = defaultDate();

    const p = new URLSearchParams(location.search);
    if (p.get("view") === "week") state.view = "week";
    if (p.get("sec") === "exams" || p.get("sec") === "laz") state.section = p.get("sec");
    if (p.get("d") === "tomorrow") {
      let d = C.addDays(new Date(), 1);
      if (C.weekdayIndex(d) === 7) d = C.addDays(d, 1);
      state.date = d;
      state.autoAdvanced = false;
    }
    document.querySelectorAll("#viewSeg button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
    render();
    sync();
  }

  function bind() {
    $("prevBtn").onclick = () => go(-1);
    $("nextBtn").onclick = () => go(1);
    $("todayBtn").onclick = goToday;
    $("settingsBtn").onclick = openSettings;
    $("groupBtn").onclick = () => showSetup(true);
    $("syncBtn").onclick = () => sync({ force: true });
    $("installBtn").onclick = promptInstall;
    $("apkClose").onclick = () => {
      $("apkBanner").hidden = true;
      C.store.set("oshtu.apkDismissed", true);
    };
    $("installClose").onclick = () => {
      $("installBanner").hidden = true;
      C.store.set("oshtu.installDismissed", true);
    };
    document.querySelectorAll("#viewSeg button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
    document.querySelectorAll("#sectionSeg button").forEach((b) => (b.onclick = () => setSection(b.dataset.sec)));
    $("weekStrip").addEventListener("click", (e) => {
      const b = e.target.closest(".wd");
      if (!b) return;
      const d = C.addDays(C.mondayOf(state.date), +b.dataset.i);
      const dir = d > state.date ? "slide-l" : "slide-r";
      state.date = d;
      if (state.view === "week") setView("day");
      renderHero();
      renderStrip();
      renderContent(dir);
    });
    $("content").addEventListener("click", (e) => {
      const h = e.target.closest(".wk-head");
      if (!h) return;
      state.date = C.addDays(C.mondayOf(state.date), +h.dataset.day);
      setView("day");
    });
    bindSwipe($("content"));
    document.addEventListener("keydown", (e) => {
      if ($("main").hidden || $("settings").open) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });
    bindSettings();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || $("main").hidden) return;
      const wasDefault = state.view === "day" && state.date && C.sameDay(state.date, defaultDate());
      if (!wasDefault && Date.now() - state.lastAttempt > 30 * 60e3) state.date = defaultDate();
      render();
      if (Date.now() - state.lastAttempt > 60e3) sync();
    });
    window.addEventListener("online", () => !$("main").hidden && sync());
    window.addEventListener("offline", () => setSync("off"));
    setInterval(() => {
      if ($("main").hidden) return;
      checkReminders();
      if (document.visibilityState !== "visible") return;
      renderHero();
      if (state.section === "classes" && state.view === "day") renderContent();
      renderFooter();
      if (Date.now() - state.lastAttempt > 120e3) sync();
    }, 20e3);
  }

  function init() {
    applyTheme();
    bind();
    if (settings.targetId) startMain();
    else showSetup(false);

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  init();
})();
