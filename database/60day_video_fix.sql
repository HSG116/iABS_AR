-- ============================================================
-- جدار إيديتات الـ60 يوم — إيقاف الفيديوهات + إصلاح الموجود
-- ------------------------------------------------------------
-- المشكلة: حساب ImageKit الأساسي (ld5rplgcm) استنفد حصة معالجة
-- الفيديو الشهرية (500 وحدة على الخطة المجانية) فيرفض كل طلب فيديو
-- بـ 403 ELIMIT، بينما الصور تعمل بشكل طبيعي. النتيجة: كل فيديو
-- جديد يُرفع بنجاح ثم يتعذّر تشغيله forever، وتظهر رسالة
-- "تعذر تشغيل هذا الترميز" بدل الفيديو.
--
-- الحل المطبَّق:
--   1) إيقاف رفع الفيديوهات مؤقتاً — الصور فقط.
--   2) منع الفيديو على مستوى قاعدة البيانات أيضاً (حماية إضافية).
--   3) أداة "إصلاح الفيديوهات" في لوحة الإدارة: تعيد رفع الفيديوهات
--      على حساب ImageKit السليم ليعمل الجدار (تُستدعى من المتصفح).
--
-- هذا الملف آمن للتشغيل المتكرر (idempotent) ولا يمسّ أي محتوى قائم.
-- شغّله كاملاً في SQL Editor الخاص بمشروع Supabase.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) منع الفيديو على مستوى القاعدة (رفع الصور فقط)
--    يعمل مع أي عميل — حتى لو绕过 التحقق في المتصفح.
-- ------------------------------------------------------------
create or replace function public.edits_submit(
  p_name text, p_caption text, p_media_type text, p_media_url text,
  p_poster_url text, p_width integer, p_height integer,
  p_size_bytes bigint, p_file_id text, p_account_id uuid, p_upload_ticket text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.edits_upload_tickets%rowtype; v_endpoint text; v_id uuid;
begin
  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(p_name) > 40 then raise exception 'الاسم مطلوب (1-40 حرف)'; end if;
  if p_caption is not null and char_length(p_caption) > 300 then raise exception 'الوصف طويل جداً'; end if;
  if p_media_type is null or p_media_type not in ('image','video') then raise exception 'نوع الملف غير مدعوم'; end if;
  -- رفع الفيديوهات متوقّف مؤقتاً: نف��ح الصور فقط
  if p_media_type = 'video' then raise exception 'رفع الفيديوهات متوقّف مؤقتاً — ارفع صورة فقط'; end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 20971520 then raise exception 'حجم الملف غير صالح'; end if;
  if (p_width is not null and p_width not between 1 and 20000) or
     (p_height is not null and p_height not between 1 and 20000) then raise exception 'أبعاد الملف غير صالحة'; end if;
  if p_file_id is null or char_length(btrim(p_file_id)) < 1 or char_length(btrim(p_file_id)) > 200 then raise exception 'file_id مطلوب (1-200 حرف)'; end if;
  if p_upload_ticket is null or p_upload_ticket !~ '^[0-9a-f]{64}$' then raise exception 'تذكرة الرفع غير صالحة'; end if;
  select * into t from public.edits_upload_tickets
  where ticket_hash = encode(extensions.digest(p_upload_ticket, 'sha256'), 'hex') for update;
  if t.ticket_hash is null or t.consumed_at is not null or t.expires_at <= clock_timestamp() then raise exception 'تذكرة الرفع منتهية أو مستخدمة أو غير صالحة'; end if;
  select rtrim(url_endpoint, '/') into v_endpoint from public.imagekit_accounts where id = t.account_id;
  if p_media_url is null or p_media_url <> t.expected_url or p_media_type <> t.media_type or p_size_bytes <> t.size_bytes or
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
    null, p_width, p_height, p_size_bytes, btrim(p_file_id), p_account_id, 'pending') returning id into v_id;
  update public.edits_upload_tickets set consumed_at = clock_timestamp(), file_id = btrim(p_file_id) where ticket_hash = t.ticket_hash;
  update public.imagekit_accounts set used_bytes = used_bytes + p_size_bytes where id = p_account_id;
  return v_id;
end $$;

-- ------------------------------------------------------------
-- 2) إعادة استضافة فيديو موجود على حساب معطّل إلى حساب سليم.
--    تستدعيها لوحة الإدارة من المتصفح بعد رفع الملف على حساب سليم.
--    (للإدارة فقط — نفس مستوى صلاحيات باقي إجراءات الإدارة).
-- ------------------------------------------------------------
create or replace function public.edits_admin_rehost(
  p_password text, p_id uuid, p_media_url text, p_file_id text,
  p_account_id uuid, p_poster_url text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare sub public.edits_submissions%rowtype;
begin
  perform public.edits_verify_password(p_password);
  select * into sub from public.edits_submissions where id = p_id for update;
  if sub.id is null then raise exception 'العنصر غير موجود'; end if;
  if p_media_url is null or p_media_url !~ '^https://ik\.imagekit\.io/(ld5rplgcm|jco71x7fu)/60day-edits/[A-Za-z0-9_.-]+\.(mp4|webm|mov|m4v|ogv)$' then raise exception 'رابط الملف غير صالح'; end if;
  if p_file_id is null or char_length(btrim(p_file_id)) < 1 or char_length(btrim(p_file_id)) > 200 then raise exception 'file_id مطلوب (1-200 حرف)'; end if;
  if p_account_id is null or not exists (select 1 from public.imagekit_accounts where id = p_account_id) then raise exception 'حساب التخزين غير موجود'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('edits-file-id:' || btrim(p_file_id), 0));
  if exists (select 1 from public.edits_submissions where btrim(file_id) = btrim(p_file_id) and id <> p_id) or
     exists (select 1 from public.edits_upload_tickets where consumed_at is not null and file_id = btrim(p_file_id)) then raise exception 'file_id مستخدم بالفعل'; end if;
  update public.edits_submissions
     set media_url = p_media_url,
         file_id = btrim(p_file_id),
         account_id = p_account_id,
         poster_url = case when p_poster_url is not null and btrim(p_poster_url) <> '' then p_poster_url else poster_url end
   where id = p_id;
  perform public.edits_log('rehost', 'submission', p_id::text, sub.name, 'إعادة استضافة الفيديو على حساب تخزين سليم');
end $$;

-- ------------------------------------------------------------
-- 3) الصلاحيات
-- ------------------------------------------------------------
revoke all on function public.edits_admin_rehost(text, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.edits_admin_rehost(text, uuid, text, text, uuid, text) to anon, authenticated;

commit;
