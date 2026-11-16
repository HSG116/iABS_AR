-- ============================================================
-- جدار إيديتات الـ60 يوم — ملف SQL واحد لكل قواعد البيانات
-- ------------------------------------------------------------
-- شغّل هذا الملف نفسه مرة واحدة في كل مشروع من هذه الستة:
--
--   القاعدة الرئيسية:
--     https://mqegvdtuyqglxjqakfha.supabase.co
--
--   مشاريع الوسائط الخمسة (كل مشروع سعة 1GiB تُدار بالميغابايت، بلا حد لعدد الملفات):
--     1) https://lolgnrfyxkwcacaeurry.supabase.co
--     2) https://ojvgpixprtuzqjvfscjg.supabase.co
--     3) https://cdpeczuzqkaoefauzyus.supabase.co
--     4) https://skcoulhrawiqemvaenwe.supabase.co
--     5) https://qajkngnnivpvijvdbbcw.supabase.co
--
-- الملف يكتشف مكانه تلقائياً:
--   • القاعدة الرئيسية (فيها جدول edits_submissions):
--       تُنشأ جداول مساحات الوسائط والتذاكر، ودوال الحجز/الإرسال/الإدارة،
--       وتُوسَّع صلاحية رابط الوسائط في edits_submissions.
--   • مشروع وسائط (بلا edits_submissions):
--       يُنشأ Bucket باسم edits-videos بحد 50MB، وسياسات رفع آمنة
--       للمفتاح العام، ومنع الحذف/الاستبدال من المتصفح.
--
-- آمن للتشغيل المتكرر (idempotent) ولا يحذف أي محتوى.
-- السعة تُحسب بالميغابايت وليس بعدد الملفات: كل مساحة 1GiB، ويُترك حد احتياطي
-- (reserve_bytes، افتراضياً 24MiB). إذا لم يتّسع الملف الجديد مع بقاء الحد
-- الاحتياطي، ينتقل الرفع تلقائياً إلى المساحة التالية حسب الأولوية.
-- الصور والفيديو في نفس المساحات الخمس ونفس الـ Bucket:
--   videos/<uuid>.<ext> للفيديو، images/<uuid>.<ext> للصور، posters/<uuid>.jpg لأغلفة الفيديو.
-- إضافة مشروع جديد لاحقاً: أضف صفّه في edits_video_accounts (القسم ب-1)
-- ثم شغّل هذا الملف في مشروع الوسائط الجديد فقط.
-- المفاتيح السرية (sb_secret_...) غير مستخدمة إطلاقاً؛ الرفع من المتصفح
-- يعتمد على المفتاح العام (sb_publishable_) وسياسات RLS.
--
-- كيف تعرف أن المشروع أُعدّ صح؟
--   • الرئيسية: رسالة "تم تجهيز القاعدة الرئيسية..." + جدول edits_video_accounts
--     فيه 5 صفوف في Table Editor.
--   • مشروع وسائط: رسالة "تم تجهيز مشروع وسائط..." + Bucket باسم edits-videos
--     في Storage.
-- ============================================================

begin;

-- pgcrypto مطلوب في القاعدة الرئيسية لتوليد التذاكر والهاش.
-- تشغيله هنا آمن في كل المشاريع (supabase يجهّزه مسبقاً في مخطط extensions).
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- (أ) مشاريع الوسائط: Bucket + سياسات الرفع
--     يُنفَّذ فقط عندما لا يوجد جدول edits_submissions
-- ============================================================
do $route_storage$
begin
  -- مشروع وسائط فقط إذا لم يوجد أي أثر للقاعدة الرئيسية (حتى لو حُذف
  -- جدول المشاركات يوماً ما، لا يُنشأ Bucket داخل القاعدة الرئيسية أبداً).
  if to_regclass('public.edits_submissions') is null
     and to_regclass('public.imagekit_accounts') is null
     and to_regclass('public.edits_settings') is null then
    execute $store_setup$
      create schema if not exists private;

      -- 1) Bucket عام بحد 50MB (فيديو + صور + أغلفة)
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('edits-videos', 'edits-videos', true, 52428800,
        array['video/mp4','video/webm','video/quicktime','video/x-m4v','image/jpeg','image/png','image/webp','image/gif','image/avif'])
      on conflict (id) do update
      set public = true,
          file_size_limit = 52428800,
          allowed_mime_types = array['video/mp4','video/webm','video/quicktime','video/x-m4v','image/jpeg','image/png','image/webp','image/gif','image/avif'];

      -- 2) مفتاح إيقاف الرفع (اختياري)
      create table if not exists private.edits_video_lock (
        id integer primary key check (id = 1),
        locked boolean not null default false,
        updated_at timestamptz not null default now()
      );
      insert into private.edits_video_lock(id, locked) values (1, false) on conflict (id) do nothing;

      create or replace function private.edits_video_is_open()
      returns boolean language sql stable security definer set search_path = ''
      as $$ select not coalesce((select locked from private.edits_video_lock where id = 1), false) $$;

      revoke all on table private.edits_video_lock from public, anon, authenticated;
      revoke all on function private.edits_video_is_open() from public;
      grant usage on schema private to anon, authenticated;
      grant execute on function private.edits_video_is_open() to anon, authenticated;

      -- 3) سياسات storage.objects
      drop policy if exists "edits video upload (keyed)" on storage.objects;
      drop policy if exists "edits video no delete" on storage.objects;
      drop policy if exists "edits video no update" on storage.objects;

      create policy "edits video upload (keyed)"
      on storage.objects for insert to anon, authenticated
      with check (
        bucket_id = 'edits-videos'
        and (
          name ~ '^videos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm|mov|m4v)$'
          or name ~ '^images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|avif)$'
          or name ~ '^posters/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
        )
        and coalesce(current_setting('request.headers', true)::json ->> 'x-access-key', '') = 'edits-videos'
        and coalesce(current_setting('request.headers', true)::json ->> 'x-upsert', 'false') <> 'true'
        and private.edits_video_is_open()
      );

      -- منع الاستبدال والتعديل
      create policy "edits video no update"
      on storage.objects for update to anon, authenticated
      using (false) with check (false);

      -- منع الحذف من المتصفح نهائياً
      create policy "edits video no delete"
      on storage.objects for delete to anon, authenticated
      using (false);
    $store_setup$;

    raise notice 'تم تجهيز مشروع وسائط: Bucket = edits-videos + سياسات الرفع الآمنة.';
  else
    raise notice 'هذه القاعدة الرئيسية — تم تخطي تهيئة Bucket الوسائط.';
  end if;
end
$route_storage$;

-- ============================================================
-- (ب) القاعدة الرئيسية: حسابات المساحات + التذاكر + الدوال
--     يُنفَّذ فقط عندما يوجد جدول edits_submissions
-- ============================================================
do $route_main$
begin
  -- القاعدة الرئيسية: أي جدول من جداولها الأساسية يكفي للتعرف عليها
  -- (حتى لا يُعامل المشروع الرئيسي كمشروع وسائط بالخطأ).
  if to_regclass('public.edits_submissions') is not null
     or to_regclass('public.imagekit_accounts') is not null
     or to_regclass('public.edits_settings') is not null then
    execute $main_setup$
      -- 0) السماح بروابط تخزين الوسائط الجديدة بجانب روابط ImageKit القديمة
      --    NOT VALID: لا يفحص الصفوف القديمة (حتى لا يفشل الترحيل بسبب بيانات قديمة)،
      --    ويُطبَّق على كل إدخال جديد.
      alter table public.edits_submissions drop constraint if exists edits_submissions_media_url_check;
      alter table public.edits_submissions add constraint edits_submissions_media_url_check check (
        media_url ~ '^https://ik\.imagekit\.io/'
        or media_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/edits-videos/videos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm|mov|m4v)$'
        or media_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/edits-videos/images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|avif)$'
      ) not valid;

      -- 1) مساحات الوسائط الخمس (صور + فيديو) — السعة بالميغابايت بلا حد لعدد الملفات
      create table if not exists public.edits_video_accounts (
        id uuid primary key default pg_catalog.gen_random_uuid(),
        label text not null,
        project_url text not null unique check (project_url ~ '^https://[a-z0-9]+\.supabase\.co/?$'),
        publishable_key text not null check (publishable_key like 'sb_publishable_%'),
        bucket text not null default 'edits-videos' check (bucket ~ '^[a-z0-9-]+$'),
        storage_limit_bytes bigint not null default 1073741824 check (storage_limit_bytes > 0),
        reserve_bytes bigint not null default 25165824 check (reserve_bytes >= 0),
        used_count integer not null default 0 check (used_count >= 0),
        used_bytes bigint not null default 0 check (used_bytes >= 0),
        reserved_count integer not null default 0 check (reserved_count >= 0),
        reserved_bytes bigint not null default 0 check (reserved_bytes >= 0),
        priority integer not null default 1,
        is_active boolean not null default true,
        is_full boolean not null default false,
        created_at timestamptz not null default now(),
        constraint edits_video_accounts_bytes_cap check (used_bytes + reserved_bytes <= storage_limit_bytes)
      );

      -- نُزيل قيد السقف مؤقتاً أثناء الترحيل (تُعاد إضافته NOT VALID بعد
      -- مزامنة العدّادات في القسم 10) حتى لا يفشل التصحيح بسبب أرقام قديمة متضخمة.
      alter table public.edits_video_accounts drop constraint if exists edits_video_accounts_bytes_cap;

      -- ترقية تلقائية لقاعدة شُغّل عليها ملف أقدم: إلغاء حد عدد الملفات
      -- والتحويل الكامل إلى سعة بايتات + حد احتياطي (reserve_bytes) قبل النقل للمساحة التالية.
      alter table public.edits_video_accounts drop constraint if exists edits_video_accounts_count_cap;
      alter table public.edits_video_accounts drop constraint if exists edits_video_accounts_max_videos_check;
      alter table public.edits_video_accounts drop column if exists max_videos;
      alter table public.edits_video_accounts add column if not exists reserve_bytes bigint not null default 25165824;
      alter table public.edits_video_accounts alter column reserve_bytes set default 25165824;
      -- الحد الاحتياطي المطلوب 24MiB بالضبط (كان 20MiB في النسخة السابقة)
      update public.edits_video_accounts set reserve_bytes = 25165824 where reserve_bytes = 20971520;

      -- تصحيح سعة المساحات الخمس إلى السعة الحقيقية 1GiB (كانت بعض النسخ
      -- القديمة تكتب قيمة أصغر فتظهر "ممتلئة" بعد أول ملف رغم أن المساحة فارغة).
      update public.edits_video_accounts
      set storage_limit_bytes = 1073741824
      where storage_limit_bytes <> 1073741824
        and rtrim(project_url, '/') in (
          'https://lolgnrfyxkwcacaeurry.supabase.co',
          'https://ojvgpixprtuzqjvfscjg.supabase.co',
          'https://cdpeczuzqkaoefauzyus.supabase.co',
          'https://skcoulhrawiqemvaenwe.supabase.co',
          'https://qajkngnnivpvijvdbbcw.supabase.co'
        );

      insert into public.edits_video_accounts(label, project_url, publishable_key, priority)
      select v.label, v.project_url, v.publishable_key, v.priority
      from (values
        ('مساحة الفيديو ١', 'https://lolgnrfyxkwcacaeurry.supabase.co', 'sb_publishable_iYrnK0TBvwjHpX4BATXY6Q_qRb0xhGH', 1),
        ('مساحة الفيديو ٢', 'https://ojvgpixprtuzqjvfscjg.supabase.co', 'sb_publishable_gweDAFN6PqyMB02xNT8Ngg_JXvpLIPB', 2),
        ('مساحة الفيديو ٣', 'https://cdpeczuzqkaoefauzyus.supabase.co', 'sb_publishable_GZMXNZIZU4Gp7EQXRkGbaQ_c-kqQ4xq', 3),
        ('مساحة الفيديو ٤', 'https://skcoulhrawiqemvaenwe.supabase.co', 'sb_publishable_9FT3AyhcHm0WGHgBFJf2YA_oq3aLqWI', 4),
        ('مساحة الفيديو ٥', 'https://qajkngnnivpvijvdbbcw.supabase.co', 'sb_publishable_LoI75CPRhv7V19sO4uo8Sw_XZwY41NK', 5)
      ) as v(label, project_url, publishable_key, priority)
      where not exists (
        select 1 from public.edits_video_accounts a where a.project_url = v.project_url
      );

      update public.edits_video_accounts
      set label = replace(label, 'مساحة الفيديو', 'مساحة الوسائط')
      where label like 'مساحة الفيديو%';

      -- 2) تذاكر رفع الوسائط (صور + فيديو) — تحجز السعة قبل رفع الملف
      create table if not exists public.edits_video_tickets (
        ticket_hash text primary key,
        account_id uuid not null references public.edits_video_accounts(id) on delete cascade,
        kind text not null default 'video' check (kind in ('image','video')),
        video_path text not null,
        video_url text not null,
        poster_path text,
        poster_url text,
        size_bytes bigint not null check (size_bytes between 1 and 52428800),
        poster_bytes bigint not null default 262144 check (poster_bytes >= 0),
        expires_at timestamptz not null,
        consumed_at timestamptz,
        file_id text
      );
      -- ترقية تلقائية: التذاكر القديمة كلها فيديو، والصور بلا غلاف
      alter table public.edits_video_tickets add column if not exists kind text not null default 'video';
      alter table public.edits_video_tickets alter column poster_path drop not null;
      alter table public.edits_video_tickets alter column poster_url drop not null;
      alter table public.edits_video_tickets drop constraint if exists edits_video_tickets_kind_check;
      alter table public.edits_video_tickets add constraint edits_video_tickets_kind_check
        check (kind in ('image','video')) not valid;
      create index if not exists edits_video_tickets_file_idx on public.edits_video_tickets(file_id);
      create index if not exists edits_video_tickets_exp_idx on public.edits_video_tickets(expires_at) where consumed_at is null;

      alter table public.edits_video_accounts enable row level security;
      alter table public.edits_video_tickets enable row level security;

      -- 3) تحرير الحجوزات المنتهية (داخلية فقط)
      create or replace function public.edits_video_reap()
      returns void language plpgsql security definer set search_path = '' as $$
      declare t public.edits_video_tickets%rowtype;
      begin
        for t in
          select * from public.edits_video_tickets
          where consumed_at is null and expires_at <= clock_timestamp()
          for update skip locked
        loop
          delete from public.edits_video_tickets where ticket_hash = t.ticket_hash;
          update public.edits_video_accounts
          set reserved_count = greatest(0, reserved_count - 1),
              reserved_bytes = greatest(0, reserved_bytes - t.size_bytes - t.poster_bytes)
          where id = t.account_id;
        end loop;

        -- لا نعلّم أي مساحة "ممتلئة" هنا ولا نمسّ العلامات اليدوية:
        -- الاختيار في edits_media_upload_auth يتحقق من دخول الملف كاملاً
        -- مع بقاء 24MiB حرة، وإلا ينتقل تلقائياً للمساحة التالية.
      end;
      $$;

      -- 4) توقيع رفع وسيط (صورة أو فيديو): اختيار مساحة + حجز سعة + تذكرة
      create or replace function public.edits_media_upload_auth(
        p_kind text, p_size_bytes bigint, p_ext text, p_exclude uuid[] default '{}'
      )
      returns json language plpgsql security definer set search_path = '' as $$
      declare
        acc public.edits_video_accounts%rowtype;
        v_kind text := lower(btrim(coalesce(p_kind, 'video')));
        v_ext text := lower(btrim(coalesce(p_ext, '')));
        v_overhead bigint;
        v_ticket text; v_uuid uuid; v_path text; v_poster_path text; v_base text;
        v_now timestamptz := clock_timestamp(); v_expires timestamptz;
      begin
        if v_kind = 'video' then
          if v_ext !~ '^(mp4|webm|mov|m4v)$' then raise exception 'امتداد الفيديو غير مدعوم'; end if;
          v_overhead := 262144;
        elsif v_kind = 'image' then
          if v_ext !~ '^(jpg|jpeg|png|webp|gif|avif)$' then raise exception 'امتداد الصورة غير مدعوم'; end if;
          v_overhead := 0;
        else
          raise exception 'نوع الملف غير مدعوم';
        end if;
        if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 52428800 then
          raise exception 'حجم الملف يجب أن يكون أكبر من 0 وأقل من 50MB';
        end if;
        perform public.edits_video_reap();
        if not public.edits_take_budget('upload', '', p_size_bytes) then
          raise exception 'حد الرفع (40 ملفاً / 1GiB خلال 10 دقائق) — جرّب لاحقاً';
        end if;

        -- الاختيار حسب المساحة الفعلية: يجب أن يدخل الملف كاملاً
        -- مع بقاء 24MiB حرة (reserve_bytes)، وإلا ينتقل تلقائياً للمساحة التالية.
        select * into acc
        from public.edits_video_accounts
        where is_active and not is_full
          and used_bytes + reserved_bytes + p_size_bytes + v_overhead + reserve_bytes <= storage_limit_bytes
          and not (id = any (coalesce(p_exclude, '{}'::uuid[])))
        order by priority, used_bytes, created_at
        limit 1
        for update skip locked;

        if acc.id is null then
          raise exception 'مساحات الصور والفيديو ممتلئة حالياً — راجع الإدارة';
        end if;

        v_base := rtrim(acc.project_url, '/') || '/storage/v1/object/public/' || acc.bucket || '/';
        v_uuid := pg_catalog.gen_random_uuid();
        if v_kind = 'video' then
          v_path := 'videos/' || v_uuid::text || '.' || v_ext;
          v_poster_path := 'posters/' || v_uuid::text || '.jpg';
        else
          v_path := 'images/' || v_uuid::text || '.' || v_ext;
          v_poster_path := null;
        end if;
        v_ticket := encode(extensions.gen_random_bytes(32), 'hex');
        v_expires := v_now + interval '30 minutes';

        insert into public.edits_video_tickets(
          ticket_hash, account_id, kind, video_path, video_url, poster_path, poster_url,
          size_bytes, poster_bytes, expires_at
        ) values (
          encode(extensions.digest(v_ticket, 'sha256'), 'hex'), acc.id, v_kind,
          v_path, v_base || v_path,
          v_poster_path, case when v_poster_path is null then null else v_base || v_poster_path end,
          p_size_bytes, v_overhead, v_expires
        );

        update public.edits_video_accounts
        set reserved_count = reserved_count + 1,
            reserved_bytes = reserved_bytes + p_size_bytes + v_overhead
        where id = acc.id;

        return json_build_object(
          'kind', v_kind,
          'account_id', acc.id,
          'label', acc.label,
          'project_url', rtrim(acc.project_url, '/'),
          'publishable_key', acc.publishable_key,
          'bucket', acc.bucket,
          'path', v_path,
          'url', v_base || v_path,
          'poster_path', v_poster_path,
          'poster_url', case when v_poster_path is null then null else v_base || v_poster_path end,
          -- أسماء متوافقة مع عميل الفيديو القديم
          'video_path', v_path,
          'video_url', v_base || v_path,
          'ticket', v_ticket,
          'max_bytes', 52428800,
          'expires_at', v_expires
        );
      end;
      $$;

      -- توافق خلفي: عميل الفيديو الحالي ينادي التوقيع القديم
      create or replace function public.edits_video_upload_auth(
        p_size_bytes bigint, p_exclude uuid[] default '{}'
      )
      returns json language sql security definer set search_path = '' as $$
        select public.edits_media_upload_auth('video', p_size_bytes, 'mp4', p_exclude);
      $$;

      -- تحرير الحجز فوراً عند فشل الرفع في المتصفح
      create or replace function public.edits_video_release(p_ticket text)
      returns void language plpgsql security definer set search_path = '' as $$
      declare t public.edits_video_tickets%rowtype;
      begin
        if p_ticket is null or p_ticket !~ '^[0-9a-f]{64}$' then return; end if;
        select * into t from public.edits_video_tickets
        where ticket_hash = encode(extensions.digest(p_ticket, 'sha256'), 'hex')
          and consumed_at is null
        for update;
        if t.ticket_hash is null then return; end if;
        delete from public.edits_video_tickets where ticket_hash = t.ticket_hash;
        update public.edits_video_accounts
        set reserved_count = greatest(0, reserved_count - 1),
            reserved_bytes = greatest(0, reserved_bytes - t.size_bytes - t.poster_bytes),
            is_full = (used_bytes + greatest(0, reserved_bytes - t.size_bytes - t.poster_bytes) + reserve_bytes >= storage_limit_bytes)
        where id = t.account_id;
      end;
      $$;

      -- 5) إرسال الإيديت: صور وفيديو من نفس مساحات Supabase الخمس
      create or replace function public.edits_submit(
        p_name text, p_caption text, p_media_type text, p_media_url text,
        p_poster_url text, p_width integer, p_height integer,
        p_size_bytes bigint, p_file_id text, p_account_id uuid, p_upload_ticket text
      )
      returns uuid language plpgsql security definer set search_path = '' as $$
      declare
        vt public.edits_video_tickets%rowtype;
        va public.edits_video_accounts%rowtype;
        v_base text; v_id uuid;
        v_acc_full boolean; v_acc_label text; v_remaining bigint;
      begin
        if p_name is null or char_length(btrim(p_name)) < 1 or char_length(p_name) > 40 then raise exception 'الاسم مطلوب (1-40 حرف)'; end if;
        if p_caption is not null and char_length(p_caption) > 300 then raise exception 'الوصف طويل جداً (300 حرف)'; end if;
        if p_media_type is null or p_media_type not in ('image','video') then raise exception 'نوع الملف غير مدعوم'; end if;
        if (p_width is not null and p_width not between 1 and 20000) or
           (p_height is not null and p_height not between 1 and 20000) then raise exception 'أبعاد الملف غير صالحة'; end if;
        if p_file_id is null or char_length(btrim(p_file_id)) < 1 or char_length(p_file_id) > 200 then raise exception 'file_id مطلوب (1-200 حرف)'; end if;
        if p_upload_ticket is null or p_upload_ticket !~ '^[0-9a-f]{64}$' then raise exception 'تذكرة الرفع غير صالحة'; end if;
        if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 52428800 then raise exception 'حجم الملف غير صالح (حتى 50MB)'; end if;

        select * into vt from public.edits_video_tickets
        where ticket_hash = encode(extensions.digest(p_upload_ticket, 'sha256'), 'hex') for update;
        if vt.ticket_hash is null or vt.consumed_at is not null or vt.expires_at <= clock_timestamp() then raise exception 'تذكرة الرفع منتهية أو مستخدمة أو غير صالحة'; end if;
        if vt.kind <> p_media_type then raise exception 'نوع الملف لا يطابق التذكرة'; end if;
        select * into va from public.edits_video_accounts where id = vt.account_id;
        v_base := rtrim(va.project_url, '/') || '/storage/v1/object/public/' || va.bucket || '/';
        if p_account_id is null or p_account_id <> vt.account_id or p_media_url is null or p_media_url <> vt.video_url or
           p_size_bytes <> vt.size_bytes or btrim(p_file_id) <> vt.video_path or
           vt.video_url <> v_base || vt.video_path then
          raise exception 'رابط الملف أو الحساب أو بيانات الرفع لا تطابق التذكرة';
        end if;
        if p_media_type = 'video' then
          if (p_poster_url is not null and p_poster_url <> vt.poster_url) or
             vt.poster_url is null or vt.poster_url <> v_base || vt.poster_path then
            raise exception 'غلاف الفيديو لا يطابق التذكرة';
          end if;
        else
          if p_poster_url is not null and btrim(p_poster_url) <> '' then raise exception 'الصور لا تحتاج غلافاً'; end if;
          if vt.poster_path is not null then raise exception 'تذكرة صورة غير صالحة'; end if;
        end if;

        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('edits-file-id:' || btrim(p_file_id), 0));
        if exists (select 1 from public.edits_submissions where btrim(file_id) = btrim(p_file_id)) or
           exists (select 1 from public.edits_video_tickets where consumed_at is not null and file_id = btrim(p_file_id)) then raise exception 'الملف مسجل بالفعل'; end if;
        if not public.edits_take_budget('submit') then raise exception 'ضغط كبير على الجدار (40 / 10 دقائق) — جرّب لاحقاً'; end if;

        insert into public.edits_submissions(name, caption, media_type, media_url, poster_url, width, height, size_bytes, file_id, account_id, status)
        values (btrim(p_name), coalesce(btrim(p_caption), ''), p_media_type, p_media_url,
          case when p_media_type = 'video' then nullif(btrim(coalesce(p_poster_url, '')), '') else null end,
          p_width, p_height, p_size_bytes, btrim(p_file_id), p_account_id, 'pending') returning id into v_id;

        update public.edits_video_tickets set consumed_at = clock_timestamp(), file_id = btrim(p_file_id) where ticket_hash = vt.ticket_hash;
        update public.edits_video_accounts
        set reserved_count = greatest(0, reserved_count - 1),
            reserved_bytes = greatest(0, reserved_bytes - vt.size_bytes - vt.poster_bytes),
            used_count = used_count + 1,
            used_bytes = used_bytes + vt.size_bytes + vt.poster_bytes,
            is_full = (used_bytes + reserved_bytes + vt.size_bytes + vt.poster_bytes + reserve_bytes >= storage_limit_bytes)
        where id = vt.account_id
        returning is_full, label into v_acc_full, v_acc_label;

        if v_acc_full and not va.is_full then
          v_remaining := greatest(0, va.storage_limit_bytes - va.used_bytes - vt.size_bytes - vt.poster_bytes);
          perform public.edits_log('video_full', 'video_account', vt.account_id::text, v_acc_label,
            format('بقي %s فقط — وصل الحد الاحتياطي %s — الرفع التالي ينتقل تلقائياً للمساحة التالية',
              pg_catalog.pg_size_pretty(v_remaining), pg_catalog.pg_size_pretty(va.reserve_bytes)));
        end if;

        return v_id;
      end;
      $$;

      -- 6) ImageKit أُوقف لرفع الصور نهائياً — الصور القديمة تبقى معروضة كما هي
      create or replace function public.imagekit_upload_auth(
        p_media_type text, p_size_bytes bigint, p_extension text, p_exclude uuid[] default '{}'
      )
      returns json language plpgsql security definer set search_path = '' as $$
      begin
        raise exception 'رفع الصور عبر ImageKit أُوقف — الصور تُرفع الآن على مساحات Supabase (حدّث الصفحة)';
      end;
      $$;

      -- 7) بيانات لوحة الإدارة + إدارة مساحات الوسائط
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
          'video_accounts', coalesce((select json_agg(t order by t.priority) from (
            select id, label, project_url, bucket, priority, storage_limit_bytes, reserve_bytes,
                   used_count, used_bytes, reserved_count, reserved_bytes, is_active, is_full, created_at
            from public.edits_video_accounts order by priority) t), '[]'::json),
          'password_updated_at', (select updated_at from public.edits_settings where id = 1));
      end;
      $$;

      create or replace function public.edits_admin_video_storage(p_password text, p_account_id uuid, p_action text)
      returns void language plpgsql security definer set search_path = '' as $$
      declare acc public.edits_video_accounts%rowtype;
      begin
        perform public.edits_verify_password(p_password);
        select * into acc from public.edits_video_accounts where id = p_account_id for update;
        if acc.id is null then raise exception 'مساحة الوسائط غير موجودة'; end if;
        if p_action = 'mark_full' then update public.edits_video_accounts set is_full = true where id = p_account_id;
        elsif p_action = 'mark_ok' then update public.edits_video_accounts set is_full = false where id = p_account_id;
        elsif p_action = 'toggle' then update public.edits_video_accounts set is_active = not is_active where id = p_account_id;
        else raise exception 'إجراء غير معروف'; end if;
        perform public.edits_log(p_action, 'video_account', p_account_id::text, acc.label, null);
      end;
      $$;

      -- 8) حذف الإيديت: تحرير عداد الفيديو المنطقي
      --    (الملف الفعلي يبقى في Supabase Storage — نظّفه من لوحة Supabase عند الحاجة)
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
        elsif p_action = 'delete' then
          if sub.account_id is not null
             and sub.media_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/edits-videos/(videos|images)/' then
            update public.edits_video_accounts
            set used_count = greatest(0, used_count - 1),
                used_bytes = greatest(0, used_bytes - sub.size_bytes - case when sub.media_type = 'video' then 262144 else 0 end),
                is_full = (greatest(0, used_bytes - sub.size_bytes - case when sub.media_type = 'video' then 262144 else 0 end) + reserved_bytes + reserve_bytes >= storage_limit_bytes)
            where id = sub.account_id;
          elsif sub.account_id is not null
             and sub.media_url ~ '^https://ik\.imagekit\.io/' then
            update public.imagekit_accounts
            set used_bytes = greatest(0, used_bytes - sub.size_bytes)
            where id = sub.account_id;
          end if;
          delete from public.edits_submissions where id = p_id; -- NO remote file refund (ImageKit/Storage object remains)
        else raise exception 'إجراء غير معروف'; end if;
        perform public.edits_log(p_action, 'submission', p_id::text, sub.name,
          case when p_action = 'reject' then nullif(btrim(coalesce(p_reason,'')), '') else null end);
      end;
      $$;

      -- 9) ترحيل فيديو قديم (ImageKit) إلى مساحة الفيديو الجديدة
      --    يستدعيها المدير بعد رفع الملف عبر edits_video_upload_auth
      create or replace function public.edits_admin_rehost_video(
        p_password text, p_id uuid, p_media_url text, p_poster_url text,
        p_size_bytes bigint, p_file_id text, p_account_id uuid, p_upload_ticket text
      )
      returns void language plpgsql security definer set search_path = '' as $$
      declare
        sub public.edits_submissions%rowtype;
        acc public.edits_video_accounts%rowtype;
        t public.edits_video_tickets%rowtype;
        v_base text;
        v_acc_full boolean; v_acc_label text;
      begin
        perform public.edits_verify_password(p_password);
        select * into sub from public.edits_submissions where id = p_id for update;
        if sub.id is null then raise exception 'العنصر غير موجود'; end if;
        if sub.media_type <> 'video' then raise exception 'العنصر ليس فيديو'; end if;
        if p_upload_ticket is null or p_upload_ticket !~ '^[0-9a-f]{64}$' then raise exception 'تذكرة الرفع غير صالحة'; end if;
        select * into t from public.edits_video_tickets
        where ticket_hash = encode(extensions.digest(p_upload_ticket, 'sha256'), 'hex') and consumed_at is null
        for update;
        if t.ticket_hash is null or t.expires_at <= clock_timestamp() then raise exception 'تذكرة الرفع منتهية أو مستخدمة'; end if;
        if t.kind <> 'video' then raise exception 'التذكرة ليست تذكرة فيديو'; end if;
        select * into acc from public.edits_video_accounts where id = t.account_id;
        v_base := rtrim(acc.project_url, '/') || '/storage/v1/object/public/' || acc.bucket || '/';
        if p_account_id is null or p_account_id <> t.account_id or p_media_url is null or p_media_url <> t.video_url or
           p_size_bytes <> t.size_bytes or btrim(p_file_id) <> t.video_path or
           (p_poster_url is not null and p_poster_url <> t.poster_url) or
           t.video_url <> v_base || t.video_path or t.poster_url <> v_base || t.poster_path then
          raise exception 'بيانات الرفع لا تطابق التذكرة';
        end if;
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('edits-file-id:' || btrim(p_file_id), 0));
        if exists (select 1 from public.edits_submissions where btrim(file_id) = btrim(p_file_id) and id <> p_id) or
           exists (select 1 from public.edits_video_tickets where consumed_at is not null and file_id = btrim(p_file_id)) then
          raise exception 'الملف مسجل بالفعل';
        end if;

        -- خصم الاستهلاك القديم من ImageKit (إن وُجد) لأن الملف انتقل
        if sub.account_id is not null and sub.media_url ~ '^https://ik\.imagekit\.io/' then
          update public.imagekit_accounts set used_bytes = greatest(0, used_bytes - sub.size_bytes) where id = sub.account_id;
        end if;

        update public.edits_submissions
        set media_url = p_media_url,
            poster_url = coalesce(nullif(btrim(coalesce(p_poster_url, '')), ''), poster_url),
            size_bytes = p_size_bytes,
            file_id = btrim(p_file_id),
            account_id = p_account_id,
            media_type = 'video'
        where id = p_id;

        update public.edits_video_tickets set consumed_at = clock_timestamp(), file_id = btrim(p_file_id) where ticket_hash = t.ticket_hash;
        update public.edits_video_accounts
        set reserved_count = greatest(0, reserved_count - 1),
            reserved_bytes = greatest(0, reserved_bytes - t.size_bytes - t.poster_bytes),
            used_count = used_count + 1,
            used_bytes = used_bytes + t.size_bytes + t.poster_bytes,
            is_full = (used_bytes + reserved_bytes + t.size_bytes + t.poster_bytes + reserve_bytes >= storage_limit_bytes)
        where id = t.account_id
        returning is_full, label into v_acc_full, v_acc_label;
        perform public.edits_log('rehost', 'submission', p_id::text, sub.name, 'نقل الفيديو إلى مساحة Supabase');
        if v_acc_full and not acc.is_full then
          perform public.edits_log('video_full', 'video_account', t.account_id::text, v_acc_label,
            format('بقي %s فقط — وصل الحد الاحتياطي %s — الرفع التالي ينتقل تلقائياً للمساحة التالية',
              pg_catalog.pg_size_pretty(greatest(0, acc.storage_limit_bytes - acc.used_bytes - t.size_bytes - t.poster_bytes)),
              pg_catalog.pg_size_pretty(acc.reserve_bytes)));
        end if;
      end;
      $$;

      -- 10) مزامنة الحساب مع الواقع (تذاكر منتهية + حجوزات + استهلاك فعلي)
      --    يصلح أي أرقام قديمة متضخمة كانت تجعل المساحة تبدو ممتلئة قبل أوانها.
      delete from public.edits_video_tickets
      where consumed_at is null and expires_at <= clock_timestamp();

      update public.edits_video_accounts a
      set reserved_count = coalesce(r.cnt, 0),
          reserved_bytes = coalesce(r.bytes, 0)
      from (
        select account_id, count(*)::int as cnt,
               sum(size_bytes + poster_bytes)::bigint as bytes
        from public.edits_video_tickets
        where consumed_at is null
        group by account_id
      ) r
      where a.id = r.account_id;

      update public.edits_video_accounts a
      set reserved_count = 0, reserved_bytes = 0
      where not exists (
        select 1 from public.edits_video_tickets t
        where t.account_id = a.id and t.consumed_at is null
      );

      update public.edits_video_accounts a
      set used_count = coalesce(s.cnt, 0),
          used_bytes = coalesce(s.bytes, 0)
      from (
        select account_id, count(*)::int as cnt,
               sum(size_bytes + case when media_type = 'video' then 262144 else 0 end)::bigint as bytes
        from public.edits_submissions
        where account_id is not null
          and media_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/edits-videos/(videos|images)/'
        group by account_id
      ) s
      where a.id = s.account_id;

      update public.edits_video_accounts a
      set used_count = 0, used_bytes = 0
      where not exists (
        select 1 from public.edits_submissions s
        where s.account_id = a.id
          and s.media_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/edits-videos/(videos|images)/'
      );

      update public.edits_video_accounts
      set is_full = (storage_limit_bytes - used_bytes - reserved_bytes <= reserve_bytes)
      where is_full <> (storage_limit_bytes - used_bytes - reserved_bytes <= reserve_bytes);

      -- إعادة قيد السقف بعد التصحيح (NOT VALID: لا يمسّ الصفوف الحالية)
      alter table public.edits_video_accounts
        add constraint edits_video_accounts_bytes_cap
        check (used_bytes + reserved_bytes <= storage_limit_bytes) not valid;

      -- 11) الصلاحيات
      revoke all on table public.edits_video_accounts, public.edits_video_tickets from public, anon, authenticated;
      revoke all on function public.edits_video_reap() from public, anon, authenticated;
      revoke all on function public.edits_media_upload_auth(text, bigint, text, uuid[]),
        public.edits_video_upload_auth(bigint, uuid[]),
        public.edits_video_release(text),
        public.edits_admin_video_storage(text, uuid, text),
        public.edits_admin_rehost_video(text, uuid, text, text, bigint, text, uuid, text)
        from public, anon, authenticated;
      grant execute on function public.edits_media_upload_auth(text, bigint, text, uuid[]),
        public.edits_video_upload_auth(bigint, uuid[]),
        public.edits_video_release(text),
        public.edits_admin_video_storage(text, uuid, text),
        public.edits_admin_rehost_video(text, uuid, text, text, bigint, text, uuid, text)
        to anon, authenticated;
      grant execute on function public.edits_submit(text,text,text,text,text,integer,integer,bigint,text,uuid,text),
        public.imagekit_upload_auth(text,bigint,text,uuid[]),
        public.edits_admin_data(text),
        public.edits_admin_action(text,uuid,text,text)
        to anon, authenticated;
    $main_setup$;

    raise notice 'تم تجهيز القاعدة الرئيسية: مساحات الصور والفيديو والتذاكر والدوال جاهزة.';
  else
    raise notice 'هذا مشروع وسائط — تم تخطي جزء القاعدة الرئيسية.';
  end if;
end
$route_main$;

commit;

-- تحديث كاش PostgREST فوراً حتى تظهر الدوال الجديدة بدون انتظار
notify pgrst, 'reload schema';
