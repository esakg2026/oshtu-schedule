// Три языка интерфейса: русский (ru), кыргызский (ky), английский (en).
// Названия предметов, групп и преподавателей приходят с сайта ОшТУ и не переводятся.
(function () {
  "use strict";

  const LANGS = ["ru", "ky", "en"];

  const D = {
    ru: {
      "app.title": "Расписание ОшТУ",
      "setup.lead": "Для студентов, преподавателей и всех, кому нужно расписание аудиторий. Выбери один раз — дальше приложение само покажет пары на сегодня.",
      "mode.group": "Студент", "mode.teacher": "Преподаватель", "mode.room": "Аудитория",
      "f.semester": "Семестр", "f.faculty": "Факультет / Институт", "f.course": "Курс", "f.chooseCourse": "Выбери курс",
      "course.n": "{n} курс", "f.group": "Группа", "f.facCourseFirst": "Сначала факультет и курс",
      "f.dept": "Подразделение / Институт", "f.teacher": "Преподаватель", "f.search": "Поиск по фамилии…",
      "f.deptFirst": "Сначала подразделение", "f.building": "Корпус", "f.room": "Аудитория", "f.buildingFirst": "Сначала корпус",
      "loading": "Загрузка…", "loadError": "Ошибка загрузки", "done": "Готово", "cancel": "Отмена",
      "choose.faculty": "Выбери факультет", "choose.group": "Выбери группу", "choose.dept": "Выбери подразделение",
      "choose.teacher": "Выбери преподавателя ({n})", "choose.nobody": "Никого не найдено", "choose.building": "Выбери корпус",
      "choose.room": "Выбери аудиторию", "building.n": "Корпус {n}", "sem.autoNow": "Авто (сейчас {s})",
      "err.groups": "Не удалось загрузить список групп. Проверь интернет и попробуй ещё раз.",
      "err.teachers": "Не удалось загрузить список преподавателей. Проверь интернет.",
      "err.rooms": "Не удалось загрузить список аудиторий. Проверь интернет.",
      "err.noServer": "Нет связи с сервером. Подключись к интернету для первой настройки.",
      "aria.change": "Сменить", "aria.refresh": "Обновить", "aria.settings": "Настройки", "aria.hide": "Скрыть",
      "aria.close": "Закрыть", "aria.back": "Назад", "aria.forward": "Вперёд", "aria.days": "Дни недели",
      "install.title": "Установи приложение", "install.sub": "Иконка на экране и работа без интернета", "install.btn": "Установить",
      "apk.title": "Виджет на рабочий стол", "apk.sub": "Скачай Android-приложение с виджетом", "apk.btn": "Скачать",
      "apk.iosSub": "Пары на домашнем экране iPhone", "apk.iosBtn": "Настроить",
      "today": "Сегодня", "tomorrow": "Завтра", "yesterday": "Вчера", "dayAfter": "Послезавтра",
      "inDays": "Через {n} дн.", "inDaysFull": "Через {n} {w}", "daysAgo": "{n} дн. назад", "toToday": "К сегодня",
      "sec.classes": "Занятия", "sec.exams": "Зачёты и экзамены", "sec.laz": "ЛАЗ",
      "view.day": "День", "view.week": "Неделя",
      "settings": "Настройки", "change": "Сменить",
      "s.notify": "🔔 Напоминание перед парой", "off": "Выкл", "nMin": "{n} мин",
      "s.how": "Как напоминать", "style.simple": "Простой", "style.melody": "Обычный", "style.voice": "Голосовой",
      "s.test": "▶︎ Проверить напоминание", "s.week": "Какая неделя сейчас", "week.top": "Верхняя", "week.bottom": "Нижняя",
      "s.weekHint": "На сайте ОшТУ ячейка делится линией: сверху — верхняя неделя, снизу — нижняя. Недели чередуются автоматически.",
      "s.semester": "Семестр", "auto": "Авто", "sem.autumn": "Осенний", "sem.spring": "Весенний",
      "s.theme": "Тема", "theme.light": "Светлая", "theme.dark": "Тёмная", "s.lang": "Язык",
      "s.widget": "Виджет на главный экран",
      "s.apkHint": "<b>Android:</b> скачай приложение — в нём есть настоящий виджет «Пары сегодня» с кнопками ‹ ›. После установки открой приложение, выбери группу (или преподавателя, аудиторию), затем: долгое нажатие на пустом месте экрана → <b>Виджеты</b> → «Расписание ОшТУ».",
      "s.apkBtn": "Скачать приложение для Android (APK)",
      "s.apkNote": "Телефон спросит разрешение на установку из браузера — разреши для Chrome.",
      "s.iosText": "<b>iPhone:</b> виджет на домашний экран и экран блокировки через бесплатное приложение Scriptable — настройка за 1 минуту.",
      "s.iosBtn": "Настроить виджет для iPhone",
      "s.appWidget": "Долгое нажатие на пустом месте рабочего стола → <b>Виджеты</b> → найди «Расписание ОшТУ» → перетащи на экран. В виджете: ‹ › — другой день, нажатие на заголовок — вернуться к сегодня, на строку «обновлено» — обновить.",
      "s.appWidgetIos": "Долгое нажатие на пустом месте экрана → <b>Править</b> → <b>Добавить виджет</b> → найди «Расписание ОшТУ». На экране блокировки тоже можно. ‹ › в виджете — другой день (iOS 17+).",
      "s.webWidget": "Веб-виджет (для iPhone и других приложений)", "copy": "Копировать", "s.openWidget": "Открыть веб-виджет →",
      "s.installApp": "Установить приложение", "s.iosHint": "<b>iPhone:</b> Safari → «Поделиться» → «На экран Домой».",
      "s.refreshNow": "Обновить расписание сейчас",
      "about": "О приложении", "about.dev": "Разработчик: компания <b>ESA</b>", "about.owner": "Владелец: Эркебаев Самат Адылович",
      "about.note": "Неофициальное приложение. Расписание берётся с открытого раздела сайта portal.oshtu.kg и синхронизируется каждые 20 минут. Работает без интернета.",
      "about.privacy": "Политика конфиденциальности →", "foot": "© 2026 ESA · Эркебаев Самат Адылович",

      "ago.just": "только что", "ago.min": "{n} мин назад", "ago.h": "{n} ч назад",
      "toast.weekChanged": "Расписание этой недели изменилось на сайте ОшТУ",
      "toast.nextWeek": "Вышло расписание на следующую неделю", "toast.updated": "Расписание обновлено",
      "toast.stale": "Сайт ОшТУ недоступен — показана сохранённая копия", "toast.actual": "Расписание актуально",
      "toast.failed": "Не удалось обновить — показана сохранённая копия", "toast.offline": "Нет интернета — показана сохранённая копия",
      "toast.allowNotif": "Разреши уведомления для сайта в настройках браузера — пока буду напоминать звуком на странице",
      "toast.remindIn": "Напомню за {n} мин до начала пары", "toast.remOff": "Напоминания выключены",
      "toast.copied": "Ссылка скопирована", "toast.installed": "Приложение установлено 🎉",
      "sync.busy": "Обновление…", "sync.ok": "Онлайн", "sync.stale": "ОшТУ недоступен", "sync.error": "Ошибка сети", "sync.off": "Офлайн",
      "ex.whatLaz": "ЛАЗ (лабораторно-аудиторных занятий)", "ex.whatExams": "зачётов и экзаменов",
      "ex.loading": "Загружаю…", "ex.none": "Пока не опубликован",
      "ex.noneText": "График {what} ещё не появился на сайте ОшТУ. Как только его выложат — он будет здесь автоматически.",
      "ex.consult": "Консультация", "roomShort": "ауд.",
      "hero.laz": "График ЛАЗ", "hero.labs": "Лабораторные занятия", "hero.session": "Сессия", "hero.exams": "Зачёты и экзамены",
      "choose": "Выбрать", "roomPrefix": "Ауд. ", "thisWeek": "Эта неделя", "nextWeek": "Следующая неделя", "week": "Неделя",
      "weekTop": "Верхняя неделя", "weekBottom": "Нижняя неделя",
      "now.pair": "Сейчас {n}-я пара", "now.left": "ещё {d}", "now.firstAt": "Первая пара в {t}",
      "now.break": "Перемена · дальше {n}-я пара", "now.in": "через {d}", "now.dayOff": "Сегодня выходной",
      "now.over": "На сегодня пары закончились", "now.nextFirst": "{rel} первая пара в {t} — {s}", "now.noneRel": "{rel} пар нет",
      "sub": "{n} подгр.", "loadingSchedule": "Загружаю расписание…", "firstLoad": "Первая загрузка занимает пару секунд",
      "sunday": "Воскресенье", "restDay": "Выходной — отдыхай!", "noPairs": "Пар нет",
      "roomFreeDay": "Аудитория свободна весь день", "freeDay": "{rel} свободный день",
      "gap.free": "Свободно", "gap.window": "Окно", "gap.big": "Большая перемена",
      "other": "На {w} неделе: {s}", "other.top": "верхней", "other.bottom": "нижней", "noPair": "пары нет",
      "todaySuffix": "сегодня", "roomFree": "Свободна",
      "synced": "Сверено с сайтом ОшТУ {ago}", "staleSuffix": " · сайт ОшТУ сейчас недоступен",
      "err.title": "Не удалось загрузить", "err.server": "Сервер временно недоступен.", "err.noNet": "Нет подключения к интернету.",
      "err.tail": "Как только связь появится, расписание загрузится и сохранится на телефоне.", "retry": "Повторить",
      "rem.title": "Через {m} мин — {n}-я пара ({t})",
      "hint.simple": "Простой: стандартный звук уведомления телефона.",
      "hint.melody": "Обычный: своя мелодия «Расписания ОшТУ».",
      "hint.voice": "Голосовой: мелодия, затем голос скажет, сколько минут осталось, в какой аудитории, что за занятие и {who}.",
      "who.group": "кто проводит", "who.teacher": "у какой группы", "who.room": "у какой группы и кто проводит",
      "hint.iosVoice": " На iPhone голос звучит, когда приложение открыто; если закрыто — придёт уведомление с мелодией.",
      "hint.voiceLang": "",
      "nh.android": "Напоминание со своей мелодией придёт, даже если приложение закрыто.",
      "nh.ios": "Напоминание со своей мелодией придёт, даже если приложение закрыто. Разреши уведомления, когда iPhone спросит.",
      "nh.browserAndroid": "В браузере напоминания работают, пока сайт открыт. Чтобы они приходили всегда — установи Android-приложение (ниже).",
      "nh.browser": "В браузере напоминания работают, пока сайт открыт.",
      "set.course": "{n} курс", "set.teacher": "Преподаватель · {d}", "set.room": "Аудитория {n}", "set.building": "Корпус {n}",
      "type.lec": "Лекция", "type.prac": "Практика", "type.lab": "Лабораторная", "type.sem": "Семинар",
      "typeShort.lec": "лк.", "typeShort.prac": "пр.", "typeShort.lab": "лаб.", "typeShort.sem": "сем.",
      "lesson": "Занятие", "dur.h": "ч", "dur.min": "мин",
      "w.title": "Пары сегодня", "w.upd": "обновлено {t}", "w.offline": "Нет связи. Данные появятся при подключении.",
      "w.open": "Открой приложение и выбери расписание", "w.monday": "Понедельник", "weekLow.top": "верхняя", "weekLow.bottom": "нижняя",
    },

    ky: {
      "app.title": "ОшТУ жадыбалы",
      "setup.lead": "Студенттер, окутуучулар жана аудиториялардын жадыбалы керек болгондордун баары үчүн. Бир жолу тандаңыз — андан ары тиркеме бүгүнкү сабактарды өзү көрсөтөт.",
      "mode.group": "Студент", "mode.teacher": "Окутуучу", "mode.room": "Аудитория",
      "f.semester": "Семестр", "f.faculty": "Факультет / Институт", "f.course": "Курс", "f.chooseCourse": "Курсту тандаңыз",
      "course.n": "{n}-курс", "f.group": "Топ", "f.facCourseFirst": "Адегенде факультет жана курс",
      "f.dept": "Бөлүм / Институт", "f.teacher": "Окутуучу", "f.search": "Фамилиясы боюнча издөө…",
      "f.deptFirst": "Адегенде бөлүмдү тандаңыз", "f.building": "Корпус", "f.room": "Аудитория", "f.buildingFirst": "Адегенде корпусту тандаңыз",
      "loading": "Жүктөлүүдө…", "loadError": "Жүктөө катасы", "done": "Даяр", "cancel": "Жокко чыгаруу",
      "choose.faculty": "Факультетти тандаңыз", "choose.group": "Топту тандаңыз", "choose.dept": "Бөлүмдү тандаңыз",
      "choose.teacher": "Окутуучуну тандаңыз ({n})", "choose.nobody": "Эч ким табылган жок", "choose.building": "Корпусту тандаңыз",
      "choose.room": "Аудиторияны тандаңыз", "building.n": "{n}-корпус", "sem.autoNow": "Авто (азыр {s})",
      "err.groups": "Топтордун тизмесин жүктөө мүмкүн болбоду. Интернетти текшерип, кайра аракет кылыңыз.",
      "err.teachers": "Окутуучулардын тизмесин жүктөө мүмкүн болбоду. Интернетти текшериңиз.",
      "err.rooms": "Аудиториялардын тизмесин жүктөө мүмкүн болбоду. Интернетти текшериңиз.",
      "err.noServer": "Сервер менен байланыш жок. Биринчи жөндөө үчүн интернетке туташыңыз.",
      "aria.change": "Өзгөртүү", "aria.refresh": "Жаңылоо", "aria.settings": "Жөндөөлөр", "aria.hide": "Жашыруу",
      "aria.close": "Жабуу", "aria.back": "Артка", "aria.forward": "Алдыга", "aria.days": "Аптанын күндөрү",
      "install.title": "Тиркемени орнотуңуз", "install.sub": "Экранда сөлөкөт жана интернетсиз иштөө", "install.btn": "Орнотуу",
      "apk.title": "Иш тактасына виджет", "apk.sub": "Виджети бар Android тиркемесин жүктөп алыңыз", "apk.btn": "Жүктөө",
      "apk.iosSub": "iPhone башкы экранында сабактар", "apk.iosBtn": "Жөндөө",
      "today": "Бүгүн", "tomorrow": "Эртең", "yesterday": "Кечээ", "dayAfter": "Бүрсүгүнү",
      "inDays": "{n} күндөн кийин", "inDaysFull": "{n} күндөн кийин", "daysAgo": "{n} күн мурун", "toToday": "Бүгүнгө",
      "sec.classes": "Сабактар", "sec.exams": "Зачёттор жана экзамендер", "sec.laz": "ЛАЗ",
      "view.day": "Күн", "view.week": "Апта",
      "settings": "Жөндөөлөр", "change": "Өзгөртүү",
      "s.notify": "🔔 Пара алдында эскертүү", "off": "Өчүк", "nMin": "{n} мүн",
      "s.how": "Кантип эскертүү", "style.simple": "Жөнөкөй", "style.melody": "Кадимки", "style.voice": "Үн менен",
      "s.test": "▶︎ Эскертүүнү текшерүү", "s.week": "Азыр кайсы апта", "week.top": "Үстүңкү", "week.bottom": "Астыңкы",
      "s.weekHint": "ОшТУнун сайтында уяча сызык менен бөлүнөт: үстү — үстүңкү апта, асты — астыңкы апта. Апталар автоматтык түрдө алмашат.",
      "s.semester": "Семестр", "auto": "Авто", "sem.autumn": "Күзгү", "sem.spring": "Жазгы",
      "s.theme": "Тема", "theme.light": "Жарык", "theme.dark": "Караңгы", "s.lang": "Тил",
      "s.widget": "Башкы экранга виджет",
      "s.apkHint": "<b>Android:</b> тиркемени жүктөп алыңыз — анда ‹ › баскычтары бар чыныгы «Бүгүнкү сабактар» виджети бар. Орнотуп бүткөндөн кийин тиркемени ачып, топту (же окутуучуну, аудиторияны) тандаңыз, андан соң: экрандын бош жерин узак басыңыз → <b>Виджеттер</b> → «Расписание ОшТУ».",
      "s.apkBtn": "Android үчүн тиркемени жүктөө (APK)",
      "s.apkNote": "Телефон браузерден орнотууга уруксат сурайт — Chrome үчүн уруксат бериңиз.",
      "s.iosText": "<b>iPhone:</b> башкы экранга жана кулпу экранына виджет акысыз Scriptable тиркемеси аркылуу — 1 мүнөттө жөндөлөт.",
      "s.iosBtn": "iPhone үчүн виджетти жөндөө",
      "s.appWidget": "Иш тактасынын бош жерин узак басыңыз → <b>Виджеттер</b> → «Расписание ОшТУ» табыңыз → экранга сүйрөңүз. Виджетте: ‹ › — башка күн, аталышын басуу — бүгүнгө кайтуу, «жаңыланды» сабын басуу — жаңылоо.",
      "s.appWidgetIos": "Экрандын бош жерин узак басыңыз → <b>Түзөтүү</b> → <b>Виджет кошуу</b> → «Расписание ОшТУ» табыңыз. Кулпу экранына да кошсо болот. Виджеттеги ‹ › — башка күн (iOS 17+).",
      "s.webWidget": "Веб-виджет (iPhone жана башка тиркемелер үчүн)", "copy": "Көчүрүү", "s.openWidget": "Веб-виджетти ачуу →",
      "s.installApp": "Тиркемени орнотуу", "s.iosHint": "<b>iPhone:</b> Safari → «Бөлүшүү» → «Башкы экранга».",
      "s.refreshNow": "Жадыбалды азыр жаңылоо",
      "about": "Тиркеме жөнүндө", "about.dev": "Иштеп чыгуучу: <b>ESA</b> компаниясы", "about.owner": "Ээси: Эркебаев Самат Адылович",
      "about.note": "Расмий эмес тиркеме. Жадыбал portal.oshtu.kg сайтынын ачык бөлүмүнөн алынат жана ар 20 мүнөттө шайкештелет. Интернетсиз да иштейт.",
      "about.privacy": "Купуялык саясаты →", "foot": "© 2026 ESA · Эркебаев Самат Адылович",

      "ago.just": "жаңы эле", "ago.min": "{n} мүн мурун", "ago.h": "{n} саат мурун",
      "toast.weekChanged": "Бул аптанын жадыбалы ОшТУнун сайтында өзгөрдү",
      "toast.nextWeek": "Кийинки аптанын жадыбалы чыкты", "toast.updated": "Жадыбал жаңыланды",
      "toast.stale": "ОшТУнун сайты иштебей жатат — сакталган көчүрмө көрсөтүлдү", "toast.actual": "Жадыбал актуалдуу",
      "toast.failed": "Жаңылоо мүмкүн болбоду — сакталган көчүрмө көрсөтүлдү", "toast.offline": "Интернет жок — сакталган көчүрмө көрсөтүлдү",
      "toast.allowNotif": "Браузердин жөндөөлөрүндө сайтка билдирмелерге уруксат бериңиз — азырынча баракчада үн менен эскертем",
      "toast.remindIn": "Пара башталаардан {n} мүнөт мурун эскертем", "toast.remOff": "Эскертүүлөр өчүрүлдү",
      "toast.copied": "Шилтеме көчүрүлдү", "toast.installed": "Тиркеме орнотулду 🎉",
      "sync.busy": "Жаңылоодо…", "sync.ok": "Онлайн", "sync.stale": "ОшТУ иштебейт", "sync.error": "Тармак катасы", "sync.off": "Офлайн",
      "ex.whatLaz": "ЛАЗ (лабораториялык-аудиториялык сабактар)", "ex.whatExams": "Зачёттор жана экзамендер",
      "ex.loading": "Жүктөлүүдө…", "ex.none": "Азырынча жарыялана элек",
      "ex.noneText": "{what} графиги ОшТУнун сайтында али чыга элек. Жарыяланаары менен бул жерде автоматтык түрдө пайда болот.",
      "ex.consult": "Консультация", "roomShort": "ауд.",
      "hero.laz": "ЛАЗ графиги", "hero.labs": "Лабораториялык сабактар", "hero.session": "Сессия", "hero.exams": "Зачёттор жана экзамендер",
      "choose": "Тандоо", "roomPrefix": "Ауд. ", "thisWeek": "Бул апта", "nextWeek": "Кийинки апта", "week": "Апта",
      "weekTop": "Үстүңкү апта", "weekBottom": "Астыңкы апта",
      "now.pair": "Азыр {n}-пара", "now.left": "дагы {d}", "now.firstAt": "Биринчи пара {t} башталат",
      "now.break": "Тыныгуу · андан кийин {n}-пара", "now.in": "{d} кийин", "now.dayOff": "Бүгүн дем алыш күн",
      "now.over": "Бүгүнкү сабактар бүттү", "now.nextFirst": "{rel} биринчи пара {t} — {s}", "now.noneRel": "{rel} сабак жок",
      "sub": "{n}-топчо", "loadingSchedule": "Жадыбал жүктөлүүдө…", "firstLoad": "Биринчи жүктөө бир нече секунд алат",
      "sunday": "Жекшемби", "restDay": "Дем алыш — эс алыңыз!", "noPairs": "Сабак жок",
      "roomFreeDay": "Аудитория күн бою бош", "freeDay": "{rel} бош күн",
      "gap.free": "Бош", "gap.window": "Бош убакыт", "gap.big": "Чоң тыныгуу",
      "other": "{w} аптада: {s}", "other.top": "Үстүңкү", "other.bottom": "Астыңкы", "noPair": "сабак жок",
      "todaySuffix": "бүгүн", "roomFree": "Бош",
      "synced": "ОшТУнун сайты менен салыштырылды: {ago}", "staleSuffix": " · ОшТУнун сайты азыр иштебейт",
      "err.title": "Жүктөө мүмкүн болбоду", "err.server": "Сервер убактылуу жеткиликсиз.", "err.noNet": "Интернет байланышы жок.",
      "err.tail": "Байланыш пайда болоору менен жадыбал жүктөлүп, телефонго сакталат.", "retry": "Кайталоо",
      "rem.title": "{m} мүнөттөн кийин — {n}-пара ({t})",
      "hint.simple": "Жөнөкөй: телефондун кадимки билдирме үнү.",
      "hint.melody": "Кадимки: «ОшТУ жадыбалынын» өз обону.",
      "hint.voice": "Үн менен: обон, андан кийин үн канча мүнөт калганын, кайсы аудиторияда, кандай сабак экенин жана {who} айтып берет.",
      "who.group": "ким өткөрөөрүн", "who.teacher": "кайсы топко экенин", "who.room": "кайсы топко жана ким өткөрөөрүн",
      "hint.iosVoice": " iPhone'до үн тиркеме ачык турганда угулат; жабык болсо — обону менен билдирме келет.",
      "hint.voiceLang": " Кыргызча үн жок болсо, текстти орусча үн окуйт.",
      "nh.android": "Тиркеме жабык болсо да, өз обону менен эскертүү келет.",
      "nh.ios": "Тиркеме жабык болсо да, өз обону менен эскертүү келет. iPhone сураганда билдирмелерге уруксат бериңиз.",
      "nh.browserAndroid": "Браузерде эскертүүлөр сайт ачык турганда гана иштейт. Дайыма келип турушу үчүн Android тиркемесин орнотуңуз (төмөндө).",
      "nh.browser": "Браузерде эскертүүлөр сайт ачык турганда гана иштейт.",
      "set.course": "{n}-курс", "set.teacher": "Окутуучу · {d}", "set.room": "Аудитория {n}", "set.building": "{n}-корпус",
      "type.lec": "Лекция", "type.prac": "Практика", "type.lab": "Лабораториялык", "type.sem": "Семинар",
      "typeShort.lec": "лк.", "typeShort.prac": "пр.", "typeShort.lab": "лаб.", "typeShort.sem": "сем.",
      "lesson": "Сабак", "dur.h": "саат", "dur.min": "мүн",
      "w.title": "Бүгүнкү сабактар", "w.upd": "жаңыланды {t}", "w.offline": "Байланыш жок. Маалымат туташканда пайда болот.",
      "w.open": "Тиркемени ачып, жадыбалды тандаңыз", "w.monday": "Дүйшөмбү", "weekLow.top": "үстүңкү", "weekLow.bottom": "астыңкы",
    },

    en: {
      "app.title": "OshTU Schedule",
      "setup.lead": "For students, teachers and anyone who needs a room timetable. Choose once — after that the app shows today's classes by itself.",
      "mode.group": "Student", "mode.teacher": "Teacher", "mode.room": "Room",
      "f.semester": "Semester", "f.faculty": "Faculty / Institute", "f.course": "Year", "f.chooseCourse": "Choose year",
      "course.n": "Year {n}", "f.group": "Group", "f.facCourseFirst": "Choose faculty and year first",
      "f.dept": "Department / Institute", "f.teacher": "Teacher", "f.search": "Search by surname…",
      "f.deptFirst": "Choose a department first", "f.building": "Building", "f.room": "Room", "f.buildingFirst": "Choose a building first",
      "loading": "Loading…", "loadError": "Loading error", "done": "Done", "cancel": "Cancel",
      "choose.faculty": "Choose faculty", "choose.group": "Choose group", "choose.dept": "Choose department",
      "choose.teacher": "Choose teacher ({n})", "choose.nobody": "Nobody found", "choose.building": "Choose building",
      "choose.room": "Choose room", "building.n": "Building {n}", "sem.autoNow": "Auto (now {s})",
      "err.groups": "Couldn't load the list of groups. Check your internet and try again.",
      "err.teachers": "Couldn't load the list of teachers. Check your internet.",
      "err.rooms": "Couldn't load the list of rooms. Check your internet.",
      "err.noServer": "No connection to the server. Connect to the internet for the first setup.",
      "aria.change": "Change", "aria.refresh": "Refresh", "aria.settings": "Settings", "aria.hide": "Hide",
      "aria.close": "Close", "aria.back": "Back", "aria.forward": "Forward", "aria.days": "Days of the week",
      "install.title": "Install the app", "install.sub": "Home-screen icon and offline mode", "install.btn": "Install",
      "apk.title": "Home-screen widget", "apk.sub": "Get the Android app with a widget", "apk.btn": "Download",
      "apk.iosSub": "Classes on your iPhone home screen", "apk.iosBtn": "Set up",
      "today": "Today", "tomorrow": "Tomorrow", "yesterday": "Yesterday", "dayAfter": "Day after tomorrow",
      "inDays": "In {n} days", "inDaysFull": "In {n} {w}", "daysAgo": "{n} days ago", "toToday": "Go to today",
      "sec.classes": "Classes", "sec.exams": "Credits & exams", "sec.laz": "LAZ",
      "view.day": "Day", "view.week": "Week",
      "settings": "Settings", "change": "Change",
      "s.notify": "🔔 Reminder before class", "off": "Off", "nMin": "{n} min",
      "s.how": "Reminder style", "style.simple": "Simple", "style.melody": "Normal", "style.voice": "Voice",
      "s.test": "▶︎ Test reminder", "s.week": "Which week is it now", "week.top": "Top", "week.bottom": "Bottom",
      "s.weekHint": "On the OshTU site each cell is split by a line: above — the top week, below — the bottom week. Weeks alternate automatically.",
      "s.semester": "Semester", "auto": "Auto", "sem.autumn": "Autumn", "sem.spring": "Spring",
      "s.theme": "Theme", "theme.light": "Light", "theme.dark": "Dark", "s.lang": "Language",
      "s.widget": "Home-screen widget",
      "s.apkHint": "<b>Android:</b> download the app — it has a real “Classes today” widget with ‹ › buttons. After installing, open the app, choose your group (or teacher, room), then: long-press an empty spot on the screen → <b>Widgets</b> → “Расписание ОшТУ”.",
      "s.apkBtn": "Download the Android app (APK)",
      "s.apkNote": "Your phone will ask for permission to install from the browser — allow it for Chrome.",
      "s.iosText": "<b>iPhone:</b> a home-screen and lock-screen widget via the free Scriptable app — set up in 1 minute.",
      "s.iosBtn": "Set up the iPhone widget",
      "s.appWidget": "Long-press an empty spot on the home screen → <b>Widgets</b> → find “Расписание ОшТУ” → drag it onto the screen. In the widget: ‹ › — another day, tap the title — back to today, tap the “updated” line — refresh.",
      "s.appWidgetIos": "Long-press an empty spot on the screen → <b>Edit</b> → <b>Add Widget</b> → find “Расписание ОшТУ”. Works on the lock screen too. ‹ › in the widget — another day (iOS 17+).",
      "s.webWidget": "Web widget (for iPhone and other apps)", "copy": "Copy", "s.openWidget": "Open web widget →",
      "s.installApp": "Install the app", "s.iosHint": "<b>iPhone:</b> Safari → “Share” → “Add to Home Screen”.",
      "s.refreshNow": "Refresh schedule now",
      "about": "About", "about.dev": "Developer: <b>ESA</b> company", "about.owner": "Owner: Samat Adylovich Erkebaev",
      "about.note": "Unofficial app. The schedule is taken from the public section of portal.oshtu.kg and synced every 20 minutes. Works offline.",
      "about.privacy": "Privacy policy →", "foot": "© 2026 ESA · Samat Adylovich Erkebaev",

      "ago.just": "just now", "ago.min": "{n} min ago", "ago.h": "{n} h ago",
      "toast.weekChanged": "This week's schedule has changed on the OshTU site",
      "toast.nextWeek": "Next week's schedule is out", "toast.updated": "Schedule updated",
      "toast.stale": "OshTU site is unavailable — showing the saved copy", "toast.actual": "Schedule is up to date",
      "toast.failed": "Couldn't update — showing the saved copy", "toast.offline": "No internet — showing the saved copy",
      "toast.allowNotif": "Allow notifications for this site in your browser settings — for now I'll remind you with a sound on the page",
      "toast.remindIn": "I'll remind you {n} min before class", "toast.remOff": "Reminders are off",
      "toast.copied": "Link copied", "toast.installed": "App installed 🎉",
      "sync.busy": "Updating…", "sync.ok": "Online", "sync.stale": "OshTU down", "sync.error": "Network error", "sync.off": "Offline",
      "ex.whatLaz": "LAZ (laboratory sessions)", "ex.whatExams": "credits and exams",
      "ex.loading": "Loading…", "ex.none": "Not published yet",
      "ex.noneText": "The {what} schedule hasn't appeared on the OshTU site yet. It will show up here automatically once published.",
      "ex.consult": "Consultation", "roomShort": "room",
      "hero.laz": "LAZ schedule", "hero.labs": "Laboratory sessions", "hero.session": "Exam session", "hero.exams": "Credits & exams",
      "choose": "Choose", "roomPrefix": "Room ", "thisWeek": "This week", "nextWeek": "Next week", "week": "Week",
      "weekTop": "Top week", "weekBottom": "Bottom week",
      "now.pair": "Period {n} now", "now.left": "{d} left", "now.firstAt": "First class at {t}",
      "now.break": "Break · next is period {n}", "now.in": "in {d}", "now.dayOff": "Today is a day off",
      "now.over": "Classes are over for today", "now.nextFirst": "{rel}: first class at {t} — {s}", "now.noneRel": "{rel}: no classes",
      "sub": "subgr. {n}", "loadingSchedule": "Loading schedule…", "firstLoad": "The first load takes a couple of seconds",
      "sunday": "Sunday", "restDay": "Day off — have a rest!", "noPairs": "No classes",
      "roomFreeDay": "The room is free all day", "freeDay": "{rel}: free day",
      "gap.free": "Free", "gap.window": "Gap", "gap.big": "Long break",
      "other": "{w} week: {s}", "other.top": "Top", "other.bottom": "Bottom", "noPair": "no class",
      "todaySuffix": "today", "roomFree": "Free",
      "synced": "Checked with the OshTU site {ago}", "staleSuffix": " · OshTU site is unavailable now",
      "err.title": "Couldn't load", "err.server": "The server is temporarily unavailable.", "err.noNet": "No internet connection.",
      "err.tail": "As soon as you're back online, the schedule will load and be saved on your phone.", "retry": "Retry",
      "rem.title": "In {m} min — period {n} ({t})",
      "hint.simple": "Simple: the phone's standard notification sound.",
      "hint.melody": "Normal: the app's own melody.",
      "hint.voice": "Voice: a melody, then a voice tells you how many minutes are left, which room, what class and {who}.",
      "who.group": "who teaches it", "who.teacher": "which group it's for", "who.room": "which group and who teaches it",
      "hint.iosVoice": " On iPhone the voice plays while the app is open; if it's closed you get a notification with the melody.",
      "hint.voiceLang": " Subject names are read by a Russian voice.",
      "nh.android": "The reminder with its own melody arrives even when the app is closed.",
      "nh.ios": "The reminder with its own melody arrives even when the app is closed. Allow notifications when iPhone asks.",
      "nh.browserAndroid": "In the browser, reminders work only while the site is open. To always get them, install the Android app (below).",
      "nh.browser": "In the browser, reminders work only while the site is open.",
      "set.course": "Year {n}", "set.teacher": "Teacher · {d}", "set.room": "Room {n}", "set.building": "Building {n}",
      "type.lec": "Lecture", "type.prac": "Practical", "type.lab": "Lab", "type.sem": "Seminar",
      "typeShort.lec": "lec.", "typeShort.prac": "pr.", "typeShort.lab": "lab", "typeShort.sem": "sem.",
      "lesson": "Class", "dur.h": "h", "dur.min": "min",
      "w.title": "Classes today", "w.upd": "updated {t}", "w.offline": "No connection. Data will appear once you're online.",
      "w.open": "Open the app and choose a schedule", "w.monday": "Monday", "weekLow.top": "top", "weekLow.bottom": "bottom",
    },
  };

  // ---------- дни недели и месяцы (свои, чтобы не зависеть от поддержки языка в браузере) ----------
  const CAL = {
    ru: {
      wd: ["", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"],
      wds: ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      mon: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
      mons: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    },
    ky: {
      wd: ["", "дүйшөмбү", "шейшемби", "шаршемби", "бейшемби", "жума", "ишемби", "жекшемби"],
      wds: ["", "Дш", "Шш", "Шр", "Бш", "Жм", "Иш", "Жк"],
      mon: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
      mons: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    },
    en: {
      wd: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      wds: ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      mon: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      mons: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
  };

  function savedLang() {
    try {
      const s = JSON.parse(localStorage.getItem("oshtu.settings") || "{}");
      if (s && LANGS.includes(s.lang)) return s.lang;
    } catch {}
    return null;
  }

  function detect() {
    const q = new URLSearchParams(location.search).get("l");
    if (LANGS.includes(q)) return q;
    const s = savedLang();
    if (s) return s;
    const nav = (navigator.languages || [navigator.language || "ru"]).map((x) => String(x).toLowerCase());
    for (const n of nav) {
      if (n.startsWith("ky")) return "ky";
      if (n.startsWith("ru")) return "ru";
      if (n.startsWith("en")) return "en";
    }
    return "ru";
  }

  let lang = detect();

  function t(key, vars) {
    let s = (D[lang] && D[lang][key]) ?? D.ru[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    return s;
  }

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const iso = (d) => ((d.getDay() + 6) % 7) + 1;
  const cal = () => CAL[lang] || CAL.ru;

  /** «Понедельник, 16 ноября» / «Дүйшөмбү, 16-ноябрь» / «Monday, 16 November» */
  function dateLong(d) {
    const c = cal();
    if (lang === "ky") return `${cap(c.wd[iso(d)])}, ${d.getDate()}-${c.mon[d.getMonth()]}`;
    return `${cap(c.wd[iso(d)])}, ${d.getDate()} ${c.mon[d.getMonth()]}`;
  }
  /** «16 ноября» / «16-ноябрь» / «16 November» (short=true → «16 ноя») */
  function dayMonth(d, short) {
    const c = cal();
    const m = short ? c.mons[d.getMonth()] : c.mon[d.getMonth()];
    return lang === "ky" ? `${d.getDate()}-${m}` : `${d.getDate()} ${m}`;
  }
  const weekdayLong = (d) => cap(cal().wd[iso(d)]);
  const weekdayShort = (d) => cal().wds[iso(d)];
  const monthShort = (d) => cal().mons[d.getMonth()];
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  /** Множественное число: ru — 3 формы, en — 2, ky — не изменяется. */
  function plural(n, forms) {
    const f = forms[lang] || forms.ru;
    if (lang === "ru") {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return f[0];
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return f[1];
      return f[2];
    }
    if (lang === "en") return n === 1 ? f[0] : f[1];
    return f[0];
  }
  const PAIRS = { ru: ["пара", "пары", "пар"], ky: ["пара"], en: ["class", "classes"] };
  const DAYS = { ru: ["день", "дня", "дней"], ky: ["күн"], en: ["day", "days"] };

  /** Расставить переводы на статичной разметке: data-i18n, data-i18n-html, data-i18n-ph, data-i18n-aria. */
  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    document.documentElement.lang = lang;
  }

  function setLang(l) {
    if (!LANGS.includes(l)) return;
    lang = l;
    apply();
  }

  window.I18N = {
    LANGS, t, apply, setLang, plural, PAIRS, DAYS, cap,
    get lang() { return lang; },
    dateLong, dayMonth, weekdayLong, weekdayShort, monthShort, hhmm,
  };
})();
