-- 60-day edits wall: run the WHOLE file in the Supabase SQL editor, not in a browser.
-- Rerunnable migration; existing submissions, settings and provider keys are preserved.
-- Copy initial_password from the final SQL result on bootstrap/default-password revocation.
-- Previously distributed provider keys must be rotated EXTERNALLY in ImageKit, then updated
-- in public.imagekit_accounts.private_key using the SQL editor. This script rotates no provider keys.
-- NEW accounts deliberately have empty private keys and cannot sign until configured.
-- Global rolling limits are availability safeguards, NOT complete bot/human identification.
-- No browser ID, IP header, quota error or claimed upload metadata is provider evidence.

begin;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.edits_submissions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  caption text not null default '' check (char_length(caption) <= 300),
  media_type text not null check (media_type in ('image','video')),
  media_url text not null check (media_url ~ '^https://ik\.imagekit\.io/'),
  poster_url text,
  width integer check (width is null or width between 1 and 20000),
  height integer check (height is null or height between 1 and 20000),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  file_id text, account_id uuid,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  likes_count integer not null default 0 check (likes_count >= 0),
  reports_count integer not null default 0 check (reports_count >= 0),
  reject_reason text, created_at timestamptz not null default now(), reviewed_at timestamptz
);
create index if not exists edits_submissions_status_idx on public.edits_submissions(status, created_at desc);
-- Non-unique: historical duplicate file IDs must not break migration.
create index if not exists edits_submissions_file_id_idx on public.edits_submissions(file_id);
create table if not exists public.edits_messages (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 600),
  anonymous boolean not null default false,
  avatar integer not null default 0 check (avatar between 0 and 11),
  status text not null default 'approved' check (status in ('approved','hidden')),
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);
create index if not exists edits_messages_status_idx on public.edits_messages(status, created_at desc);
create table if not exists public.edits_reports (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  submission_id uuid not null references public.edits_submissions(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists edits_reports_sub_idx on public.edits_reports(submission_id, created_at desc);
create table if not exists public.edits_admin_log (
  id bigint generated always as identity primary key,
  action text not null, target_type text not null default 'submission',
  target_id text, target_name text, detail text,
  created_at timestamptz not null default now()
);
create index if not exists edits_admin_log_time_idx on public.edits_admin_log(created_at desc);
create table if not exists public.edits_settings (
  id integer primary key default 1 check (id = 1),
  password_hash text not null, updated_at timestamptz not null default now()
);
create table if not exists public.edits_login_attempts (
  id bigint generated always as identity primary key,
  ok boolean not null, created_at timestamptz not null default now()
);
create index if not exists edits_login_attempts_time_idx on public.edits_login_attempts(created_at desc);
create table if not exists public.edits_admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(), expires_at timestamptz not null
);
create table if not exists public.edits_reauth_attempts (
  id bigint generated always as identity primary key,
  session_hash text not null, created_at timestamptz not null default clock_timestamp()
);
create index if not exists edits_reauth_attempts_session_idx on public.edits_reauth_attempts(session_hash, created_at);
create table if not exists public.imagekit_accounts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  label text not null, url_endpoint text not null, public_key text not null, private_key text not null,
  priority integer not null default 1,
  is_active boolean not null default true, is_full boolean not null default false,
  used_bytes bigint not null default 0 check (used_bytes >= 0),
  storage_limit_bytes bigint not null default 21474836480,
  quota_failures integer not null default 0, last_quota_failure timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.edits_upload_tickets (
  ticket_hash text primary key,
  account_id uuid not null references public.imagekit_accounts(id),
  expected_url text not null,
  media_type text not null check (media_type in ('image','video')),
  size_bytes bigint not null check (size_bytes >= 1),
  expires_at timestamptz not null, consumed_at timestamptz, file_id text
);
create index if not exists edits_upload_tickets_file_idx on public.edits_upload_tickets(file_id);
-- Bounded rolling arrays (at most 600 entries per scope/target), independent of content rows.
create table if not exists public.edits_rate_budgets (
  scope text not null, target text not null default '',
  event_times timestamptz[] not null default '{}', event_bytes bigint[] not null default '{}',
  request_count integer not null default 0, declared_bytes bigint not null default 0,
  touched_at timestamptz not null default clock_timestamp(), primary key (scope, target)
);

alter table public.edits_submissions enable row level security;
alter table public.edits_messages enable row level security;
alter table public.edits_reports enable row level security;
alter table public.edits_admin_log enable row level security;
alter table public.edits_settings enable row level security;
alter table public.edits_login_attempts enable row level security;
alter table public.edits_admin_sessions enable row level security;
alter table public.edits_reauth_attempts enable row level security;
alter table public.imagekit_accounts enable row level security;
alter table public.edits_upload_tickets enable row level security;
alter table public.edits_rate_budgets enable row level security;
drop policy if exists edits_submissions_public_read on public.edits_submissions;
create policy edits_submissions_public_read on public.edits_submissions for select to anon, authenticated using (status = 'approved');
drop policy if exists edits_messages_public_read on public.edits_messages;
create policy edits_messages_public_read on public.edits_messages for select to anon, authenticated using (status = 'approved');

insert into public.imagekit_accounts(label, url_endpoint, public_key, private_key, priority)
select 'الحساب الأساسي', 'https://ik.imagekit.io/ld5rplgcm', 'public_511Wo7JnIRiOr0BpFwGVAotRJyQ=', '', 1
where not exists (select 1 from public.imagekit_accounts where url_endpoint = 'https://ik.imagekit.io/ld5rplgcm');
insert into public.imagekit_accounts(label, url_endpoint, public_key, private_key, priority)
select 'الحساب الاحتياطي', 'https://ik.imagekit.io/jco71x7fu', 'public_K9+E4PxcVq1UIiMH42lciuNzCwE=', '', 2
where not exists (select 1 from public.imagekit_accounts where url_endpoint = 'https://ik.imagekit.io/jco71x7fu');

-- Plaintext exists only in a temporary SQL result, never public settings/logs.
create temporary table if not exists edits_setup_result(initial_password text, message text);
revoke all on table pg_temp.edits_setup_result from public, anon, authenticated;
truncate table pg_temp.edits_setup_result;
do $$
declare v_hash text; v_password text;
begin
  lock table public.edits_settings in share row exclusive mode;
  select password_hash into v_hash from public.edits_settings where id = 1 for update;
  if v_hash is null or extensions.crypt('hsg60day', v_hash) = v_hash then
    v_password := encode(extensions.gen_random_bytes(16), 'hex');
    insert into public.edits_settings(id, password_hash)
    values (1, extensions.crypt(v_password, extensions.gen_salt('bf', 10)))
    on conflict (id) do update set password_hash = excluded.password_hash, updated_at = clock_timestamp();
    delete from public.edits_admin_sessions;
    insert into pg_temp.edits_setup_result values (v_password, 'Copy this new admin password now. The published default is revoked. Configure/rotate ImageKit keys externally, then update private_key in the SQL editor.');
  else
    insert into pg_temp.edits_setup_result values (null, 'Existing changed password and ImageKit keys preserved. No new initial password.');
  end if;
end;
$$;
update public.edits_admin_sessions
set expires_at = least(expires_at, created_at + interval '2 hours', clock_timestamp() + interval '2 hours');

-- Repair only owned endpoint URLs; retain IDs, statuses and all other content.
update public.edits_submissions s
set media_type = 'video', poster_url = s.media_url || '/ik-thumbnail.jpg'
where s.media_type = 'image' and s.media_url ~* '\.(mp4|webm|mov|m4v|ogv)$'
  and exists (select 1 from public.imagekit_accounts a
    where left(s.media_url, length(rtrim(a.url_endpoint, '/')) + 1) = rtrim(a.url_endpoint, '/') || '/');

-- ONLY obsolete matching overloads, no CASCADE; unrelated site functions are untouched.
drop function if exists public.imagekit_upload_auth(uuid[]);
drop function if exists public.edits_submit(text,text,text,text,text,integer,integer,bigint,text,uuid);
drop function if exists public.edits_admin_change_password(text,text);

-- Private atomic rolling budgets: upsert takes a row lock BEFORE prune/check/append.
-- Locks last through the caller's transaction. Moderation/deletion never refunds budgets.
-- Scope limits are INTERNAL constants, never public RPC parameters.
create or replace function public.edits_take_budget(p_scope text, p_target text default '', p_bytes bigint default 0)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  b public.edits_rate_budgets%rowtype;
  v_limit integer; v_window interval; v_byte_limit bigint := 9223372036854775807;
  v_now timestamptz; v_times timestamptz[] := '{}'; v_bytes bigint[] := '{}';
  v_sum bigint := 0; i integer;
begin
  case p_scope
    when 'upload' then v_limit := 40; v_window := interval '10 minutes'; v_byte_limit := 1073741824;
    when 'submit' then v_limit := 40; v_window := interval '10 minutes';
    when 'message' then v_limit := 30; v_window := interval '10 minutes';
    when 'report' then v_limit := 60; v_window := interval '1 hour';
    when 'like' then v_limit := 600; v_window := interval '1 minute';
    when 'like_target' then v_limit := 20; v_window := interval '1 minute';
    when 'login' then v_limit := 15; v_window := interval '15 minutes';
    else raise exception 'Invalid internal budget scope';
  end case;
  if p_target is null or (p_scope <> 'like_target' and p_target <> '') or
     (p_scope = 'like_target' and p_target !~ '^(submission|message):[0-9a-f-]{36}$') or
     p_bytes is null or p_bytes < 0 or (p_scope <> 'upload' and p_bytes <> 0) then
    raise exception 'Invalid internal budget parameters';
  end if;
  insert into public.edits_rate_budgets(scope, target) values (p_scope, p_target)
  on conflict (scope, target) do update set touched_at = clock_timestamp() returning * into b;
  v_now := clock_timestamp();
  for i in 1..cardinality(b.event_times) loop
    if b.event_times[i] > v_now - v_window then
      v_times := array_append(v_times, b.event_times[i]);
      v_bytes := array_append(v_bytes, b.event_bytes[i]);
      v_sum := v_sum + b.event_bytes[i];
    end if;
  end loop;
  if cardinality(v_times) >= v_limit or p_bytes > v_byte_limit - v_sum then return false; end if;
  update public.edits_rate_budgets
  set event_times = array_append(v_times, v_now), event_bytes = array_append(v_bytes, p_bytes),
      request_count = cardinality(v_times) + 1, declared_bytes = v_sum + p_bytes, touched_at = v_now
  where scope = p_scope and target = p_target;
  return true;
end;
$$;

-- Compatibility name: p_password is a SESSION SECRET, never a raw password.
-- Settings lock comes BEFORE session validation, serializing revocation/password changes.
create or replace function public.edits_verify_password(p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.edits_settings where id = 1 for update;
  if p_password is null or octet_length(p_password) > 256 or not exists (
    select 1 from public.edits_admin_sessions
    where token_hash = encode(extensions.digest(p_password, 'sha256'), 'hex') and expires_at > clock_timestamp()
  ) then raise exception 'انتهت جلسة الإدارة — سجل الدخول مجدداً'; end if;
end;
$$;
create or replace function public.edits_issue_session()
returns json language plpgsql security definer set search_path = '' as $$
declare v_token text := encode(extensions.gen_random_bytes(32), 'hex');
        v_now timestamptz := clock_timestamp(); v_expires timestamptz;
begin
  v_expires := v_now + interval '2 hours';
  delete from public.edits_admin_sessions where expires_at <= v_now;
  insert into public.edits_admin_sessions(token_hash, created_at, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_now, v_expires);
  return json_build_object('ok', true, 'token', v_token, 'expires_at', v_expires);
end;
$$;
create or replace function public.edits_log(p_action text, p_target_type text, p_target_id text, p_target_name text, p_detail text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.edits_admin_log(action, target_type, target_id, target_name, detail)
  values (p_action, p_target_type, p_target_id, p_target_name, p_detail);
$$;

-- ImageKit V2: POST https://upload.imagekit.io/api/v2/files/upload
-- https://imagekit.io/docs/api-reference/upload-file/upload-file-v2
-- HS256 JWT header: alg=HS256, typ=JWT, kid=public_key. FLAT payload contains string
-- multipart fields plus numeric iat and exp=iat+600, NOT an uploadPayload wrapper.
-- EVERY multipart field except file/token MUST match the signed fields exactly.
-- Add no V1 signature/expire/publicKey or arbitrary fields. Provider checks bind exact
-- bytes and real extension-specific MIME. Tickets constrain claims, NOT upload success.
create or replace function public.imagekit_upload_auth(
  p_media_type text, p_size_bytes bigint, p_extension text, p_exclude uuid[] default '{}'
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  acc public.imagekit_accounts%rowtype;
  v_ext text := lower(p_extension); v_mimes text; v_fields jsonb;
  v_iat bigint; v_exp bigint; v_header text; v_payload text; v_input text; v_jwt text;
  v_filename text; v_ticket text;
begin
  if p_media_type is null or p_media_type not in ('image','video') or p_extension is null then
    raise exception 'نوع الملف أو الامتداد غير مدعوم';
  end if;
  if p_size_bytes is null or p_size_bytes < 1 or
     p_size_bytes > (case when p_media_type = 'image' then 20971520 else 104857600 end) then
    raise exception 'حجم الملف غير صالح (صور 20MiB، فيديو 100MiB)';
  end if;
  if p_media_type = 'image' then
    case v_ext
      when 'jpg' then v_mimes := '["image/jpeg"]';
      when 'jpeg' then v_mimes := '["image/jpeg"]';
      when 'png' then v_mimes := '["image/png"]';
      when 'gif' then v_mimes := '["image/gif"]';
      when 'webp' then v_mimes := '["image/webp"]';
      when 'avif' then v_mimes := '["image/avif"]';
      else raise exception 'امتداد الصورة غير مدعوم';
    end case;
  else
    case v_ext
      when 'mp4' then v_mimes := '["video/mp4"]';
      when 'webm' then v_mimes := '["video/webm"]';
      when 'mov' then v_mimes := '["video/quicktime"]';
      when 'm4v' then v_mimes := '["video/mp4","video/x-m4v"]';
      when 'ogv' then v_mimes := '["video/ogg"]';
      else raise exception 'امتداد الفيديو غير مدعوم';
    end case;
  end if;
  select * into acc from public.imagekit_accounts
  where is_active and not is_full and not (id = any(coalesce(p_exclude, '{}'::uuid[])))
  order by priority, created_at, id limit 1;
  if acc.id is null then raise exception 'كل حسابات التخزين ممتلئة أو متوقفة — راجع الإدارة'; end if;
  if nullif(btrim(acc.private_key), '') is null then
    raise exception 'ImageKit private_key is not configured; set it privately in the SQL editor';
  end if;
  if acc.url_endpoint !~ '^https://ik\.imagekit\.io/[A-Za-z0-9_-]+/?$' then raise exception 'ImageKit endpoint is not valid'; end if;
  if not public.edits_take_budget('upload', '', p_size_bytes) then raise exception 'حد توقيعات الرفع (40 / 1GiB خلال 10 دقائق) — جرّب لاحقاً'; end if;
  v_filename := pg_catalog.gen_random_uuid()::text || '.' || v_ext;
  v_fields := jsonb_build_object('fileName', v_filename, 'folder', '/60day-edits',
    'useUniqueFileName', 'false', 'overwriteFile', 'false',
    'checks', '"file.size" = ' || p_size_bytes::text || ' AND "file.mime" IN ' || v_mimes);
  v_iat := floor(extract(epoch from clock_timestamp()))::bigint;
  v_exp := v_iat + 600;
  v_header := rtrim(translate(replace(encode(convert_to(jsonb_build_object(
    'alg', 'HS256', 'typ', 'JWT', 'kid', acc.public_key)::text, 'UTF8'), 'base64'), E'\n', ''), '+/', '-_'), '=');
  v_payload := rtrim(translate(replace(encode(convert_to((v_fields || jsonb_build_object(
    'iat', v_iat, 'exp', v_exp))::text, 'UTF8'), 'base64'), E'\n', ''), '+/', '-_'), '=');
  v_input := v_header || '.' || v_payload;
  v_jwt := v_input || '.' || rtrim(translate(replace(encode(
    extensions.hmac(convert_to(v_input, 'UTF8'), convert_to(acc.private_key, 'UTF8'), 'sha256'),
    'base64'), E'\n', ''), '+/', '-_'), '=');
  v_ticket := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.edits_upload_tickets(ticket_hash, account_id, expected_url, media_type, size_bytes, expires_at)
  values (encode(extensions.digest(v_ticket, 'sha256'), 'hex'), acc.id,
    rtrim(acc.url_endpoint, '/') || '/60day-edits/' || v_filename, p_media_type, p_size_bytes, clock_timestamp() + interval '30 minutes');
  return json_build_object('account_id', acc.id, 'label', acc.label, 'url_endpoint', acc.url_endpoint,
    'public_key', acc.public_key, 'token', v_jwt, 'upload_fields', v_fields, 'ticket', v_ticket, 'expire', v_exp);
end;
$$;

-- Retained privately; browser quota errors can NEVER mutate storage flags.
create or replace function public.imagekit_note_failure(p_account_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Browser failure persistence is disabled; quota flags are admin-controlled';
end;
$$;

-- All eleven arguments required: mandatory ticket, no permissive legacy defaults.
create or replace function public.edits_submit(
  p_name text, p_caption text, p_media_type text, p_media_url text,
  p_poster_url text, p_width integer, p_height integer,
  p_size_bytes bigint, p_file_id text, p_account_id uuid, p_upload_ticket text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.edits_upload_tickets%rowtype; v_endpoint text; v_id uuid;
begin
  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(p_name) > 40 then raise exception 'الاسم مطلوب (1-40 حرف)'; end if;
  if p_caption is not null and char_length(p_caption) > 300 then raise exception 'الوصف طويل جداً (300 حرف)'; end if;
  if p_media_type is null or p_media_type not in ('image','video') then raise exception 'نوع الملف غير مدعوم'; end if;
  if p_size_bytes is null or p_size_bytes < 1 or
    p_size_bytes > (case when p_media_type = 'image' then 20971520 else 104857600 end) then raise exception 'حجم الملف غير صالح'; end if;
  if (p_width is not null and p_width not between 1 and 20000) or
     (p_height is not null and p_height not between 1 and 20000) then raise exception 'أبعاد الملف غير صالحة'; end if;
  if p_file_id is null or char_length(btrim(p_file_id)) < 1 or char_length(p_file_id) > 200 then raise exception 'file_id مطلوب (1-200 حرف)'; end if;
  if p_upload_ticket is null or p_upload_ticket !~ '^[0-9a-f]{64}$' then raise exception 'تذكرة الرفع غير صالحة'; end if;
  select * into t from public.edits_upload_tickets
  where ticket_hash = encode(extensions.digest(p_upload_ticket, 'sha256'), 'hex') for update;
  if t.ticket_hash is null or t.consumed_at is not null or t.expires_at <= clock_timestamp() then raise exception 'تذكرة الرفع منتهية أو مستخدمة أو غير صالحة'; end if;
  select rtrim(url_endpoint, '/') into v_endpoint from public.imagekit_accounts where id = t.account_id;
  if p_account_id is null or p_account_id <> t.account_id or p_media_url is null or
     p_media_url <> t.expected_url or p_media_type <> t.media_type or p_size_bytes <> t.size_bytes or
     v_endpoint is null or v_endpoint !~ '^https://ik\.imagekit\.io/[A-Za-z0-9_-]+$' or
     left(p_media_url, length(v_endpoint) + 13) <> v_endpoint || '/60day-edits/' or
     substring(p_media_url from length(v_endpoint) + 14) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp|avif|mp4|webm|mov|m4v|ogv)$' then
    raise exception 'رابط الملف أو الحساب أو بيانات الرفع لا تطابق التذكرة';
  end if;
  -- Serialize equal IDs across tickets/accounts, no UNIQUE on historical duplicate data.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('edits-file-id:' || btrim(p_file_id), 0));
  if exists (select 1 from public.edits_submissions where btrim(file_id) = btrim(p_file_id)) or
     exists (select 1 from public.edits_upload_tickets where consumed_at is not null and file_id = btrim(p_file_id)) then raise exception 'file_id مستخدم بالفعل'; end if;
  if not public.edits_take_budget('submit') then raise exception 'ضغط كبير على الجدار (40 / 10 دقائق) — جرّب لاحقاً'; end if;
  insert into public.edits_submissions(name, caption, media_type, media_url, poster_url, width, height, size_bytes, file_id, account_id, status)
  values (btrim(p_name), coalesce(btrim(p_caption), ''), p_media_type, p_media_url,
    case when p_media_type = 'video' then p_media_url || '/ik-thumbnail.jpg' else null end,
    p_width, p_height, p_size_bytes, btrim(p_file_id), p_account_id, 'pending') returning id into v_id;
  update public.edits_upload_tickets set consumed_at = clock_timestamp(), file_id = btrim(p_file_id) where ticket_hash = t.ticket_hash;
  -- Estimated claims only: never infer fullness, reset failures or refund remote storage.
  update public.imagekit_accounts set used_bytes = used_bytes + p_size_bytes where id = p_account_id;
  return v_id;
end;
$$;
create or replace function public.edits_message_submit(p_name text, p_body text, p_anonymous boolean default false, p_avatar integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_avatar integer; v_anonymous boolean := coalesce(p_anonymous, false);
begin
  if p_body is null or char_length(btrim(p_body)) < 1 or char_length(p_body) > 600 then raise exception 'الرسالة مطلوبة (1-600 حرف)'; end if;
  if not v_anonymous and (p_name is null or char_length(btrim(p_name)) < 1 or char_length(p_name) > 40) then raise exception 'الاسم مطلوب (1-40 حرف) أو فعّل المجهول'; end if;
  if not public.edits_take_budget('message') then raise exception 'ضغط كبير على الجدار (30 / 10 دقائق) — جرّب لاحقاً'; end if;
  v_avatar := coalesce(p_avatar, floor(random() * 12)::integer);
  if v_avatar not between 0 and 11 then v_avatar := floor(random() * 12)::integer; end if;
  insert into public.edits_messages(name, body, anonymous, avatar, status)
  values (case when v_anonymous then 'مجهول' else btrim(p_name) end, btrim(p_body), v_anonymous, v_avatar, 'approved') returning id into v_id;
  return v_id; -- Instant messages; media still requires moderation.
end;
$$;
create or replace function public.edits_like(p_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_likes integer;
begin
  if not public.edits_take_budget('like') or not public.edits_take_budget('like_target', 'submission:' || p_id::text) then raise exception 'إعجابات كثيرة — جرّب لاحقاً'; end if;
  update public.edits_submissions set likes_count = likes_count + 1 where id = p_id and status = 'approved' returning likes_count into v_likes;
  if v_likes is null then raise exception 'العنصر غير موجود'; end if;
  return v_likes;
end;
$$;
create or replace function public.edits_message_like(p_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_likes integer;
begin
  if not public.edits_take_budget('like') or not public.edits_take_budget('like_target', 'message:' || p_id::text) then raise exception 'إعجابات كثيرة — جرّب لاحقاً'; end if;
  update public.edits_messages set likes_count = likes_count + 1 where id = p_id and status = 'approved' returning likes_count into v_likes;
  if v_likes is null then raise exception 'الرسالة غير موجودة'; end if;
  return v_likes;
end;
$$;
create or replace function public.edits_report(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) < 1 or char_length(p_reason) > 300 then raise exception 'سبب البلاغ مطلوب (1-300 حرف)'; end if;
  perform 1 from public.edits_submissions where id = p_id and status = 'approved' for update;
  if not found then raise exception 'العنصر غير موجود'; end if;
  if not public.edits_take_budget('report') then raise exception 'بلاغات كثيرة جداً (60 / ساعة) — جرّب لاحقاً'; end if;
  insert into public.edits_reports(submission_id, reason) values (p_id, btrim(p_reason));
  update public.edits_submissions set reports_count = reports_count + 1 where id = p_id;
end;
$$;

-- Global login lock/cap can deny legitimate admins during attacks; not perfect bot defense.
-- Failures RETURN JSON, not exceptions: failure/budget rows must COMMIT through RPC.
create or replace function public.edits_admin_login(p_password text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_hash text; v_valid boolean := false;
begin
  select password_hash into v_hash from public.edits_settings where id = 1 for update;
  if not public.edits_take_budget('login') then return json_build_object('ok', false, 'message', 'محاولات كثيرة — انتظر 15 دقيقة'); end if;
  if (select count(*) from public.edits_login_attempts where not ok and created_at > clock_timestamp() - interval '15 minutes') >= 15 then
    return json_build_object('ok', false, 'message', 'محاولات كثيرة خاطئة — انتظر 15 دقيقة');
  end if;
  -- Separate IF: oversized UTF8 inputs NEVER reach bcrypt (72-byte truncation).
  if p_password is not null and octet_length(convert_to(p_password, 'UTF8')) <= 72 and v_hash is not null then v_valid := extensions.crypt(p_password, v_hash) = v_hash; end if;
  insert into public.edits_login_attempts(ok, created_at) values (coalesce(v_valid, false), clock_timestamp());
  if not coalesce(v_valid, false) then return json_build_object('ok', false, 'message', 'كلمة المرور غير صحيحة'); end if;
  return public.edits_issue_session();
end;
$$;
create or replace function public.edits_admin_logout(p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.edits_settings where id = 1 for update;
  delete from public.edits_admin_sessions where token_hash = encode(extensions.digest(p_password, 'sha256'), 'hex');
end;
$$;
create or replace function public.edits_admin_data(p_password text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.edits_verify_password(p_password);
  return json_build_object(
    'submissions', coalesce((select json_agg(t order by t.created_at desc) from (select * from public.edits_submissions order by created_at desc limit 1000) t), '[]'::json),
    'messages', coalesce((select json_agg(t order by t.created_at desc) from (select * from public.edits_messages order by created_at desc limit 1000) t), '[]'::json),
    'reports', coalesce((select json_agg(t order by t.created_at desc) from (select * from public.edits_reports order by created_at desc limit 500) t), '[]'::json),
    'log', coalesce((select json_agg(t order by t.created_at desc) from (select * from public.edits_admin_log order by created_at desc limit 200) t), '[]'::json),
    'accounts', coalesce((select json_agg(t order by t.priority) from (
      select id, label, url_endpoint, public_key, priority, is_active, is_full, used_bytes, storage_limit_bytes, quota_failures, last_quota_failure, created_at
      from public.imagekit_accounts order by priority) t), '[]'::json),
    'password_updated_at', (select updated_at from public.edits_settings where id = 1));
end;
$$;
create or replace function public.edits_admin_action(p_password text, p_id uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare sub public.edits_submissions%rowtype;
begin
  perform public.edits_verify_password(p_password);
  select * into sub from public.edits_submissions where id = p_id for update;
  if sub.id is null then raise exception 'العنصر غير موجود'; end if;
  if p_action = 'approve' then update public.edits_submissions set status = 'approved', reviewed_at = clock_timestamp(), reject_reason = null where id = p_id;
  elsif p_action = 'reject' then update public.edits_submissions set status = 'rejected', reviewed_at = clock_timestamp(), reject_reason = nullif(btrim(coalesce(p_reason,'')), '') where id = p_id;
  elsif p_action = 'withdraw' then update public.edits_submissions set status = 'pending', reviewed_at = null where id = p_id;
  elsif p_action = 'restore' then update public.edits_submissions set status = 'pending', reviewed_at = null, reject_reason = null where id = p_id;
  elsif p_action = 'dismiss_reports' then
    delete from public.edits_reports where submission_id = p_id;
    update public.edits_submissions set reports_count = 0 where id = p_id;
  elsif p_action = 'delete' then delete from public.edits_submissions where id = p_id; -- NO remote storage refund.
  else raise exception 'إجراء غير معروف'; end if;
  perform public.edits_log(p_action, 'submission', p_id::text, sub.name,
    case when p_action = 'reject' then nullif(btrim(coalesce(p_reason,'')), '') else null end);
end;
$$;
create or replace function public.edits_admin_bulk(p_password text, p_ids uuid[], p_action text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_count integer := 0;
begin
  perform public.edits_verify_password(p_password);
  if p_action is null or p_action not in ('approve','reject','withdraw','restore','delete','dismiss_reports') then raise exception 'إجراء غير معروف'; end if;
  foreach v_id in array coalesce(p_ids, '{}'::uuid[]) loop
    begin
      perform public.edits_admin_action(p_password, v_id, p_action); v_count := v_count + 1;
    exception when others then null;
    end;
  end loop;
  perform public.edits_log('bulk_' || p_action, 'submission', null, null, v_count::text || ' عنصر');
  return v_count;
end;
$$;
create or replace function public.edits_admin_message_action(p_password text, p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare msg public.edits_messages%rowtype;
begin
  perform public.edits_verify_password(p_password);
  select * into msg from public.edits_messages where id = p_id for update;
  if msg.id is null then raise exception 'الرسالة غير موجودة'; end if;
  if p_action = 'hide' then update public.edits_messages set status = 'hidden' where id = p_id;
  elsif p_action = 'unhide' then update public.edits_messages set status = 'approved' where id = p_id;
  elsif p_action = 'delete' then delete from public.edits_messages where id = p_id;
  else raise exception 'إجراء غير معروف'; end if;
  perform public.edits_log(p_action, 'message', p_id::text, msg.name, left(msg.body, 60));
end;
$$;
create or replace function public.edits_admin_storage(p_password text, p_account_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare acc public.imagekit_accounts%rowtype;
begin
  perform public.edits_verify_password(p_password);
  select * into acc from public.imagekit_accounts where id = p_account_id for update;
  if acc.id is null then raise exception 'الحساب غير موجود'; end if;
  if p_action = 'mark_full' then update public.imagekit_accounts set is_full = true where id = p_account_id;
  elsif p_action = 'mark_ok' then update public.imagekit_accounts set is_full = false, quota_failures = 0 where id = p_account_id;
  elsif p_action = 'toggle' then update public.imagekit_accounts set is_active = not is_active where id = p_account_id;
  else raise exception 'إجراء غير معروف'; end if;
  perform public.edits_log(p_action, 'account', p_account_id::text, acc.label, null);
end;
$$;
create or replace function public.edits_admin_change_password(p_password text, p_old text, p_new text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_hash text; v_session_hash text; v_valid boolean := false;
begin
  perform public.edits_verify_password(p_password); -- Holds settings lock through rotation.
  v_session_hash := encode(extensions.digest(p_password, 'sha256'), 'hex');
  if (select count(*) from public.edits_reauth_attempts where session_hash = v_session_hash
      and created_at > clock_timestamp() - interval '15 minutes') >= 5 then
    return json_build_object('ok', false, 'message', 'محاولات كلمة السر الحالية كثيرة — انتظر 15 دقيقة');
  end if;
  select password_hash into v_hash from public.edits_settings where id = 1;
  if p_old is not null and octet_length(convert_to(p_old, 'UTF8')) <= 72 then v_valid := extensions.crypt(p_old, v_hash) = v_hash; end if;
  if not coalesce(v_valid, false) then
    insert into public.edits_reauth_attempts(session_hash) values (v_session_hash);
    return json_build_object('ok', false, 'message', 'كلمة السر الحالية غير صحيحة');
  end if;
  if p_new is null or char_length(p_new) < 12 or octet_length(convert_to(p_new, 'UTF8')) > 72 then
    raise exception 'كلمة السر الجديدة: 12 حرفاً على الأقل و72 بايت UTF8 على الأكثر';
  end if;
  if p_new = p_old then raise exception 'كلمة السر الجديدة يجب أن تختلف عن الحالية'; end if;
  update public.edits_settings set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)), updated_at = clock_timestamp() where id = 1;
  delete from public.edits_admin_sessions;
  perform public.edits_log('change_password', 'settings', '1', null, null);
  return public.edits_issue_session();
end;
$$;

-- Scoped grants ONLY: no blanket revocation affecting other site functions.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
revoke all on table public.edits_settings, public.edits_admin_sessions, public.edits_login_attempts,
  public.edits_reauth_attempts, public.imagekit_accounts, public.edits_upload_tickets,
  public.edits_rate_budgets, public.edits_admin_log, public.edits_reports from public, anon, authenticated;
revoke all on table public.edits_submissions, public.edits_messages from public, anon, authenticated;
grant select on table public.edits_submissions, public.edits_messages to anon, authenticated;
revoke all on sequence public.edits_admin_log_id_seq, public.edits_login_attempts_id_seq,
  public.edits_reauth_attempts_id_seq from public, anon, authenticated;
revoke all on function public.edits_take_budget(text,text,bigint), public.edits_verify_password(text),
  public.edits_issue_session(), public.edits_log(text,text,text,text,text), public.imagekit_note_failure(uuid)
  from public, anon, authenticated;
revoke all on function public.imagekit_upload_auth(text,bigint,text,uuid[]),
  public.edits_submit(text,text,text,text,text,integer,integer,bigint,text,uuid,text),
  public.edits_message_submit(text,text,boolean,integer), public.edits_like(uuid),
  public.edits_message_like(uuid), public.edits_report(uuid,text), public.edits_admin_login(text),
  public.edits_admin_logout(text), public.edits_admin_data(text), public.edits_admin_action(text,uuid,text,text),
  public.edits_admin_bulk(text,uuid[],text), public.edits_admin_message_action(text,uuid,text),
  public.edits_admin_storage(text,uuid,text), public.edits_admin_change_password(text,text,text)
  from public, anon, authenticated;
grant execute on function public.imagekit_upload_auth(text,bigint,text,uuid[]),
  public.edits_submit(text,text,text,text,text,integer,integer,bigint,text,uuid,text),
  public.edits_message_submit(text,text,boolean,integer), public.edits_like(uuid),
  public.edits_message_like(uuid), public.edits_report(uuid,text), public.edits_admin_login(text),
  public.edits_admin_logout(text), public.edits_admin_data(text), public.edits_admin_action(text,uuid,text,text),
  public.edits_admin_bulk(text,uuid[],text), public.edits_admin_message_action(text,uuid,text),
  public.edits_admin_storage(text,uuid,text), public.edits_admin_change_password(text,text,text)
  to anon, authenticated;
commit;
select initial_password, message as setup_message from pg_temp.edits_setup_result;
