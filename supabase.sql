-- База для «Расписание ОшТУ» (уже применено в проекте Supabase family-finance).
-- Синхронизация идёт прямо из Postgres: расширение http (curl/OpenSSL) умеет
-- работать со старым TLS сайта ОшТУ, а pg_cron обновляет данные каждые 20 минут.

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.oshtu_schedules (
  group_id integer not null,
  semester_id integer not null,
  group_name text,
  raw jsonb not null default '[]'::jsonb,   -- ArrayData с сайта ОшТУ как есть
  hash text,
  checked_at timestamptz,                    -- когда последний раз сверяли с ОшТУ
  changed_at timestamptz,                    -- когда расписание реально изменилось
  last_error text,
  last_error_at timestamptz,
  last_requested_at timestamptz default now(),
  primary key (group_id, semester_id)
);

create table if not exists public.oshtu_meta (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.oshtu_schedules enable row level security;
alter table public.oshtu_meta enable row level security;
create policy "oshtu public read schedules" on public.oshtu_schedules for select to anon, authenticated using (true);
create policy "oshtu public read meta" on public.oshtu_meta for select to anon, authenticated using (true);

create schema if not exists oshtu_private;
revoke all on schema oshtu_private from public, anon, authenticated;

create or replace function oshtu_private.call(p_endpoint text, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r extensions.http_response; j jsonb;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '9000');
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', '5000');
  r := extensions.http_post('https://portal.oshtu.kg/api/' || p_endpoint, p_body, 'application/x-www-form-urlencoded');
  if r.status <> 200 then raise exception 'OshTU HTTP %', r.status; end if;
  j := r.content::jsonb;
  if coalesce((j->>'Result')::int, -1) <> 0 then raise exception 'OshTU: %', coalesce(j->>'Msg', 'error'); end if;
  return coalesce(j->'ArrayData', '[]'::jsonb);
end $$;

create or replace function oshtu_private.meta(p_key text, p_endpoint text, p_body text, p_max_age interval)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_data jsonb; v_at timestamptz; d jsonb;
begin
  select data, updated_at into v_data, v_at from public.oshtu_meta where key = p_key;
  if v_data is not null and v_at > now() - p_max_age then
    return jsonb_build_object('data', v_data, 'source', 'cache', 'updated_at', v_at);
  end if;
  begin
    d := oshtu_private.call(p_endpoint, p_body);
    insert into public.oshtu_meta(key, data, updated_at) values (p_key, d, now())
      on conflict (key) do update set data = excluded.data, updated_at = excluded.updated_at;
    return jsonb_build_object('data', d, 'source', 'live', 'updated_at', now());
  exception when others then
    if v_data is not null then
      return jsonb_build_object('data', v_data, 'source', 'stale', 'updated_at', v_at, 'error', sqlerrm);
    end if;
    raise;
  end;
end $$;

create or replace function oshtu_private.refresh(p_group int, p_semester int, p_name text, p_touch boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_raw jsonb; v_err text; v_row public.oshtu_schedules;
begin
  begin
    v_raw := oshtu_private.call('schedule.ashx',
      format('operation=get-schedule-list&semesterId=%s&auditoryId=0&employeeId=0&groupId=%s', p_semester, p_group));
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null then
    insert into public.oshtu_schedules as s (group_id, semester_id, group_name, raw, hash, checked_at, changed_at, last_requested_at)
    values (p_group, p_semester, nullif(left(p_name, 60), ''), v_raw, md5(v_raw::text), now(), now(), now())
    on conflict (group_id, semester_id) do update set
      raw = excluded.raw, hash = excluded.hash, checked_at = now(),
      changed_at = case when s.hash is distinct from excluded.hash then now() else s.changed_at end,
      group_name = coalesce(excluded.group_name, s.group_name),
      last_requested_at = case when p_touch then now() else s.last_requested_at end,
      last_error = null
    returning * into v_row;
    return to_jsonb(v_row) || jsonb_build_object('source', 'live');
  end if;
  update public.oshtu_schedules set last_error = v_err, last_error_at = now(),
    last_requested_at = case when p_touch then now() else last_requested_at end
  where group_id = p_group and semester_id = p_semester
  returning * into v_row;
  if v_row.group_id is not null then
    return to_jsonb(v_row) || jsonb_build_object('source', 'stale', 'error', v_err);
  end if;
  raise exception 'ОшТУ недоступен, сохранённой копии нет: %', v_err;
end $$;

create or replace function oshtu_private.sync_all()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in
    select group_id, semester_id from public.oshtu_schedules
    where last_requested_at > now() - interval '60 days'
      and (checked_at is null or checked_at < now() - interval '10 minutes')
  loop
    begin
      perform oshtu_private.refresh(r.group_id, r.semester_id, null, false);
      n := n + 1;
    exception when others then null;
    end;
  end loop;
  return n;
end $$;

revoke all on all functions in schema oshtu_private from public, anon, authenticated;

create or replace function public.oshtu_semesters()
returns jsonb language sql security definer set search_path = '' as $$
  select oshtu_private.meta('semesters', 'common.ashx', 'operation=get-semester-list', interval '12 hours');
$$;

create or replace function public.oshtu_faculties()
returns jsonb language sql security definer set search_path = '' as $$
  select oshtu_private.meta('faculties', 'common.ashx', 'operation=get-faculty-list', interval '24 hours');
$$;

create or replace function public.oshtu_groups(p_faculty int, p_course int)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_faculty is null or p_faculty <= 0 or p_course not between 1 and 6 then raise exception 'bad params'; end if;
  return oshtu_private.meta('groups:' || p_faculty || ':' || p_course, 'common.ashx',
    format('operation=get-group-list&academicYearId=0&rate=%s&facultyId=%s', p_course, p_faculty), interval '6 hours');
end $$;

create or replace function public.oshtu_schedule(p_group int, p_semester int, p_name text default null, p_max_age_sec int default 60)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.oshtu_schedules;
begin
  if p_group is null or p_group <= 0 or p_group > 10000000 or p_semester not in (1, 2) then raise exception 'bad params'; end if;
  select * into v_row from public.oshtu_schedules where group_id = p_group and semester_id = p_semester;
  if v_row.group_id is not null and v_row.checked_at > now() - make_interval(secs => greatest(coalesce(p_max_age_sec, 60), 30)) then
    update public.oshtu_schedules set last_requested_at = now(),
      group_name = coalesce(nullif(left(p_name, 60), ''), group_name)
    where group_id = p_group and semester_id = p_semester;
    return to_jsonb(v_row) || jsonb_build_object('source', 'cache');
  end if;
  return oshtu_private.refresh(p_group, p_semester, p_name, true);
end $$;

grant execute on function public.oshtu_semesters(), public.oshtu_faculties(), public.oshtu_groups(int, int),
  public.oshtu_schedule(int, int, text, int) to anon, authenticated;

select cron.schedule('oshtu-sync', '*/20 * * * *', 'select oshtu_private.sync_all()');

-- ===== Версии по неделям (ОшТУ каждую субботу выкладывает расписание следующей недели) =====
create table if not exists public.oshtu_schedule_weeks (
  group_id integer not null,
  semester_id integer not null,
  week_start date not null,          -- понедельник недели (Asia/Bishkek)
  raw jsonb not null,
  hash text not null,
  updated_at timestamptz not null default now(),
  primary key (group_id, semester_id, week_start)
);
alter table public.oshtu_schedule_weeks enable row level security;
create policy "oshtu public read weeks" on public.oshtu_schedule_weeks for select to anon, authenticated using (true);

-- изменения в субботу после 12:00 и в воскресенье → следующая неделя, иначе → текущая
create or replace function oshtu_private.store_week(p_group int, p_semester int, p_raw jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamp := now() at time zone 'Asia/Bishkek';
  v_mon date := date_trunc('week', v_now)::date;
  v_dow int := extract(isodow from v_now);
  v_late boolean := v_dow = 7 or (v_dow = 6 and extract(hour from v_now) >= 12);
  v_hash text := md5(p_raw::text);
begin
  if v_late then
    insert into public.oshtu_schedule_weeks (group_id, semester_id, week_start, raw, hash)
    values (p_group, p_semester, v_mon, p_raw, v_hash) on conflict do nothing;
    v_mon := v_mon + 7;
  end if;
  insert into public.oshtu_schedule_weeks as w (group_id, semester_id, week_start, raw, hash)
  values (p_group, p_semester, v_mon, p_raw, v_hash)
  on conflict (group_id, semester_id, week_start) do update
    set raw = excluded.raw, hash = excluded.hash, updated_at = now()
    where w.hash is distinct from excluded.hash;
end $$;

create or replace function oshtu_private.weeks_json(p_group int, p_semester int)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('week_start', week_start, 'raw', raw, 'hash', hash) order by week_start), '[]'::jsonb)
  from public.oshtu_schedule_weeks
  where group_id = p_group and semester_id = p_semester
    and week_start >= (date_trunc('week', now() at time zone 'Asia/Bishkek')::date - 14);
$$;
-- refresh() вызывает store_week() после успешной загрузки, а oshtu_schedule()/refresh()
-- добавляют в ответ поле "weeks": oshtu_private.weeks_json(group, semester).

-- ===== 1.2: все режимы (group / teacher / room), экзамены и ЛАЗ =====
-- Таблицы oshtu_schedules и oshtu_schedule_weeks получили колонку kind ('group','teacher','room'),
-- первичные ключи (kind, group_id, semester_id[, week_start]); group_id = ID цели.
-- Публичные RPC:
--   oshtu_timetable(p_kind, p_id, p_semester, p_name, p_max_age_sec)  — расписание занятий любой цели
--   oshtu_schedule(p_group, ...)                                     — старый вызов = oshtu_timetable('group', ...)
--   oshtu_departments(), oshtu_teachers(p_department)                 — подразделения и преподаватели
--   oshtu_buildings(), oshtu_rooms(p_building)                        — корпуса и аудитории
--   oshtu_exams(p_kind, p_id, p_semester, p_type)                     — p_type 0: зачёты/экзамены, 1: ЛАЗ (кэш 20 мин)
-- Полный текст — миграция oshtu_all_kinds в проекте Supabase.
