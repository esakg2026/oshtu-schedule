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

  let settings = C.store.get(SETTINGS_KEY, {}) || {};
  const state = {
    date: null,
    view: "day",
    data: null,
    sync: "idle",
    lastAttempt: 0,
    autoAdvanced: false,
  };

  const semesterId = () => (settings.semester && settings.semester !== "auto" ? Number(settings.semester) : C.autoSemester());
  const cacheKey = () => `oshtu.sched.${settings.groupId}.${semesterId()}`;
  const saveSettings = () => C.store.set(SETTINGS_KEY, settings);

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

  // Какой день показать при открытии: сегодня, а после окончания пар (или в воскресенье) — следующий учебный день
  function defaultDate() {
    let d = C.startOfDay(new Date());
    state.autoAdvanced = false;
    if (C.weekdayIndex(d) === 7) {
      state.autoAdvanced = true;
      return C.addDays(d, 1);
    }
    const list = state.data ? C.dayLessons(state.data.days, d, settings.weekFlip) : [];
    const st = C.dayStatus(list);
    if ((st.state === "after" || (st.state === "none" && new Date().getHours() >= 17)) && state.data) {
      state.autoAdvanced = true;
      d = C.addDays(d, 1);
      if (C.weekdayIndex(d) === 7) d = C.addDays(d, 1);
    }
    return d;
  }

  // ================= данные =================
  function applyData(r, fromNetwork) {
    const prev = state.data;
    const data = {
      days: C.parseSchedule(r.raw),
      hash: r.hash,
      checked_at: r.checked_at,
      changed_at: r.changed_at,
      source: r.source,
      error: r.error || null,
      group_name: r.group_name,
      savedAt: Date.now(),
      raw: r.raw,
    };
    state.data = data;
    C.store.set(cacheKey(), { ...r, savedAt: data.savedAt });
    if (fromNetwork && prev && prev.hash && prev.hash !== data.hash) {
      toast("Расписание изменилось на сайте ОшТУ — обновлено");
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
    if (!settings.groupId || state.inFlight) return;
    state.inFlight = true;
    state.lastAttempt = Date.now();
    setSync("busy");
    try {
      const r = await C.rpc("oshtu_schedule", {
        p_group: settings.groupId,
        p_semester: semesterId(),
        p_name: settings.groupName || null,
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
      if (!state.data) renderError(e);
      else renderFooter();
      if (force && !silent) toast(navigator.onLine ? "Не удалось обновить — показана сохранённая копия" : "Нет интернета — показана сохранённая копия");
    } finally {
      state.inFlight = false;
    }
  }

  function setSync(s) {
    state.sync = s;
    const dot = $("syncDot");
    dot.className = "dot " + ({ busy: "busy", ok: "ok", stale: "stale", error: "off", off: "off" }[s] || "");
    $("syncText").textContent =
      { busy: "Обновление…", ok: "Онлайн", stale: "ОшТУ недоступен", error: "Ошибка сети", off: "Офлайн" }[s] || "";
    renderFooter();
  }

  // ================= отрисовка =================
  function render() {
    if (!state.date) state.date = defaultDate();
    $("groupName").textContent = settings.groupName || "Группа";
    renderHero();
    renderStrip();
    renderContent();
    renderFooter();
  }

  function renderHero() {
    const d = state.date;
    const isToday = C.sameDay(d, new Date());
    if (state.view === "week") {
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
    $("todayBtn").textContent = state.view === "week" ? "Эта неделя" : isToday ? "Сегодня" : "К сегодня";

    // карточка «сейчас»
    const card = $("nowCard");
    const today = C.startOfDay(new Date());
    const list = state.data ? C.dayLessons(state.data.days, today, settings.weekFlip) : [];
    const st = C.dayStatus(list);
    const showFor = state.view === "day" ? isToday : C.sameDay(C.mondayOf(d), C.mondayOf(today));
    card.hidden = true;
    card.classList.remove("calm");
    $("nowBar").hidden = true;
    if (!state.data) return;

    if (showFor && st.state === "during") {
      const l = st.current.lessons[0];
      card.hidden = false;
      $("nowTitle").textContent = `Сейчас ${st.current.n}-я пара`;
      $("nowTime").textContent = `ещё ${C.fmtDuration(st.minutes)}`;
      $("nowSub").textContent = `${l.subject}${l.room ? " · " + l.room : ""}`;
      $("nowBar").hidden = false;
      $("nowBar").firstElementChild.style.width = `${Math.round(st.progress * 100)}%`;
    } else if (showFor && (st.state === "before" || st.state === "break")) {
      const l = st.next.lessons[0];
      card.hidden = false;
      $("nowTitle").textContent = st.state === "before" ? `Первая пара в ${st.next.start}` : `Перемена · дальше ${st.next.n}-я пара`;
      $("nowTime").textContent = `через ${C.fmtDuration(st.minutes)}`;
      $("nowSub").textContent = `${l.subject}${l.room ? " · " + l.room : ""}`;
    } else if (state.view === "day" && state.autoAdvanced && C.sameDay(d, defaultDate())) {
      card.hidden = false;
      card.classList.add("calm");
      const todayIsSunday = C.weekdayIndex(today) === 7;
      $("nowTitle").textContent = todayIsSunday ? "Сегодня выходной" : "На сегодня пары закончились";
      const next = C.dayLessons(state.data.days, d, settings.weekFlip).filter((p) => p.start);
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
      const cnt = state.data ? C.dayLessons(state.data.days, d, settings.weekFlip).length : 0;
      const cls = ["wd", C.sameDay(d, today) ? "today" : "", state.view === "day" && C.sameDay(d, state.date) ? "sel" : ""].join(" ");
      html += `<button class="${cls}" data-i="${i}"><small>${WD_SHORT[i + 1]}</small><b>${d.getDate()}</b><span class="cnt">${cnt ? cnt + " " + plural(cnt, "пара", "пары", "пар") : "—"}</span></button>`;
    }
    $("weekStrip").innerHTML = html;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function lessonHtml(l) {
    const t = C.TYPES[l.type];
    return `<div class="lesson">
      <div class="lesson-head"><div class="subject">${esc(l.subject)}</div>${t ? `<span class="tag ${t.cls}">${t.label}</span>` : ""}</div>
      <div class="meta">${l.teacher ? `<span>${ICON_USER}${esc(l.teacher)}</span>` : ""}${l.room ? `<span>${ICON_PIN}${esc(l.room)}</span>` : ""}</div>
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
    const list = C.dayLessons(state.data.days, d, settings.weekFlip);
    if (!list.length) {
      return `<div class="empty"><div class="big">🎉</div><h3>Пар нет</h3><p>${esc(relLabel(d))} свободный день</p></div>`;
    }
    const isToday = C.sameDay(d, new Date());
    const t = C.nowMin();
    let html = "";
    let prev = null;
    for (const p of list) {
      if (prev && prev.end && p.start) {
        const gap = C.toMin(p.start) - C.toMin(prev.end);
        if (p.n - prev.n > 1) html += `<div class="gap">Окно · ${C.fmtDuration(gap)}</div>`;
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
      const list = C.dayLessons(state.data.days, d, settings.weekFlip);
      const today = C.sameDay(d, new Date());
      html += `<section class="wk-day${today ? " today" : ""}">
        <div class="wk-head" data-day="${i}"><b>${cap(d.toLocaleDateString("ru-RU", { weekday: "long" }))}${today ? " · сегодня" : ""}</b><span>${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span></div>
        ${
          list.length
            ? list
                .map((p) =>
                  p.lessons
                    .map(
                      (l, k) => `<div class="wk-row"><span class="n">${k ? "" : p.n}</span><span class="t">${k ? "" : p.start || ""}</span>
                  <span class="s">${esc(l.subject)}<small>${esc([C.TYPES[l.type]?.label, l.teacher].filter(Boolean).join(" · "))}</small></span><span class="r">${esc(l.room)}</span></div>`,
                    )
                    .join(""),
                )
                .join("")
            : `<div class="wk-free">Пар нет</div>`
        }
      </section>`;
    }
    return html;
  }

  function renderFooter() {
    const el = $("syncInfo");
    if (!state.data) {
      el.textContent = "";
      return;
    }
    const src = { stale: " · сайт ОшТУ сейчас недоступен", local: "" }[state.data.source] || "";
    el.textContent = `Сверено с сайтом ОшТУ ${ago(state.data.checked_at)}${src}`;
  }

  function renderError(e) {
    $("content").innerHTML = `<div class="empty"><div class="big">📡</div><h3>Не удалось загрузить</h3>
      <p>${navigator.onLine ? "Сервер временно недоступен." : "Нет подключения к интернету."} Как только связь появится, расписание загрузится и сохранится на телефоне.</p>
      <button class="btn btn-primary" id="retryBtn">Повторить</button></div>`;
    $("retryBtn").onclick = () => sync({ force: true });
  }

  // ================= навигация =================
  function go(delta) {
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
    document.querySelectorAll(".main > .seg button").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    render();
    renderContent("slide-l");
  }

  // свайпы
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

  // ================= первый запуск =================
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

  async function showSetup(cancelable) {
    $("main").hidden = true;
    $("setup").hidden = false;
    $("setupCancel").hidden = !cancelable;
    $("setupError").hidden = true;
    const fSem = $("fSemester"), fFac = $("fFaculty"), fCourse = $("fCourse"), fGroup = $("fGroup"), save = $("setupSave");

    const autoName = C.autoSemester() === 2 ? "Осенний" : "Весенний";
    fSem.innerHTML = `<option value="auto">Авто (сейчас ${autoName})</option><option value="2">Осенний</option><option value="1">Весенний</option>`;
    fSem.value = settings.semester ? String(settings.semester) : "auto";
    if (settings.course) fCourse.value = String(settings.course);

    const showErr = (msg) => {
      $("setupError").textContent = msg;
      $("setupError").hidden = false;
    };

    const validate = () => (save.disabled = !(fFac.value && fCourse.value && fGroup.value));

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
        groups.sort((a, b) => a.GroupName.localeCompare(b.GroupName, "ru"));
        fGroup.innerHTML =
          `<option value="">Выбери группу</option>` + groups.map((g) => `<option value="${g.ID}">${esc(g.GroupName)}</option>`).join("");
        fGroup.disabled = false;
        if (settings.groupId && groups.some((g) => g.ID === settings.groupId)) fGroup.value = String(settings.groupId);
        $("setupError").hidden = true;
      } catch (e) {
        fGroup.innerHTML = `<option value="">Ошибка загрузки</option>`;
        showErr("Не удалось загрузить список групп. Проверь интернет и попробуй ещё раз.");
      }
      validate();
    }

    fFac.onchange = loadGroups;
    fCourse.onchange = loadGroups;
    fGroup.onchange = validate;

    try {
      const facs = await cachedRpc("oshtu_faculties", {}, "oshtu.meta.faculties");
      fFac.innerHTML =
        `<option value="">Выбери факультет</option>` +
        facs.map((f) => `<option value="${f.ID}">${esc(String(f.DepartmentName).trim())}</option>`).join("");
      if (settings.facultyId) fFac.value = String(settings.facultyId);
    } catch (e) {
      fFac.innerHTML = `<option value="">Ошибка загрузки</option>`;
      showErr("Нет связи с сервером. Подключись к интернету для первой настройки.");
    }
    if (fFac.value && fCourse.value) loadGroups();

    save.onclick = () => {
      const changed = settings.groupId !== +fGroup.value || String(settings.semester || "auto") !== fSem.value;
      settings = {
        ...settings,
        semester: fSem.value,
        facultyId: +fFac.value,
        facultyName: fFac.options[fFac.selectedIndex].text,
        course: +fCourse.value,
        groupId: +fGroup.value,
        groupName: fGroup.options[fGroup.selectedIndex].text,
      };
      saveSettings();
      if (changed) state.data = null;
      startMain();
    };
    $("setupCancel").onclick = startMain;
  }

  // ================= настройки =================
  function openSettings() {
    const dlg = $("settings");
    $("sGroup").textContent = settings.groupName || "—";
    $("sFaculty").textContent = [settings.course ? settings.course + " курс" : "", settings.facultyName].filter(Boolean).join(" · ");
    const curType = C.weekType(new Date(), settings.weekFlip);
    setSeg("sWeek", curType);
    setSeg("sSemester", settings.semester ? String(settings.semester) : "auto");
    setSeg("sTheme", settings.theme || "auto");
    $("widgetUrl").value = widgetUrl();
    $("widgetOpen").href = widgetUrl();
    $("sInstall").hidden = !deferredPrompt;
    $("iosHint").hidden = !(/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone());
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function setSeg(id, v) {
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle("active", b.dataset.v === v));
  }

  function widgetUrl() {
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    const p = new URLSearchParams({ g: settings.groupId, n: settings.groupName || "" });
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
    $("sWeek").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const natural = C.weekType(new Date(), false);
      settings.weekFlip = b.dataset.v !== natural;
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
        toast("Ссылка скопирована");
      } catch {
        $("widgetUrl").select();
        document.execCommand("copy");
        toast("Ссылка скопирована");
      }
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
    if (!C.store.get("oshtu.installDismissed") && !$("main").hidden) $("installBanner").hidden = false;
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
    if (deferredPrompt && !C.store.get("oshtu.installDismissed")) $("installBanner").hidden = false;
    if (!state.data) loadCached();
    state.date = defaultDate();

    const p = new URLSearchParams(location.search);
    if (p.get("view") === "week") state.view = "week";
    if (p.get("d") === "tomorrow") {
      let d = C.addDays(new Date(), 1);
      if (C.weekdayIndex(d) === 7) d = C.addDays(d, 1);
      state.date = d;
      state.autoAdvanced = false;
    }
    document.querySelectorAll(".main > .seg button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
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
    $("installClose").onclick = () => {
      $("installBanner").hidden = true;
      C.store.set("oshtu.installDismissed", true);
    };
    document.querySelectorAll(".main > .seg button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
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

    // актуальность: при возвращении в приложение, при появлении сети и каждые 2 минуты
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
      if (document.visibilityState !== "visible" || $("main").hidden) return;
      renderHero();
      if (state.view === "day") renderContent();
      renderFooter();
      if (Date.now() - state.lastAttempt > 120e3) sync();
    }, 30e3);
  }

  function init() {
    applyTheme();
    bind();
    if (settings.groupId) startMain();
    else showSetup(false);

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  init();
})();
