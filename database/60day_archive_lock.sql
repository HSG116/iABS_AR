-- ============================================================
--  قفل أرشيف جدار الـ60 يوم  (60day_archive_lock.sql)
-- ============================================================
--  الهدف: تحويل الجدار إلى أرشيف دائم للقراءة فقط — لا أحد يقدر
--  يرفع صورة/فيديو، ولا يرسل رسالة، ولا يسوي إعجاب أو بلاغ.
--
--  طريقة التشغيل (نفس أسلوب ملف التجهيز الشامل):
--   الصق هذا الملف كامل مرة واحدة في SQL Editor لكل مشروع:
--     • القاعدة الرئيسية  → تسحب صلاحية دوال النشر/الإعجاب/البلاغ/تذاكر الرفع.
--     • مشاريع الوسائط الخمسة → تفعّل مفتاح إيقاف الرفع في سياسات التخزين.
--   الملف يتعرّف على نوع المشروع تلقائياً، وآمن تكراره (idempotent).
--
--  ملاحظة: دوال الإدارة (مراجعة/حذف/إحصاء) تبقى شغّالة.
--  إعادة استضافة الفيديو من لوحة الإدارة تتوقف أثناء القفل لأنها
--  تحتاج رفعاً جديداً — وهذا مقصود لأن الأرشيف مكتمل.
--
--  للفتح لاحقاً (لو احتجت): شغّل المقطع الموجود في آخر الملف.
--  لا يحتوي هذا الملف على أي مفاتيح سرية.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- (أ) مشاريع الوسائط: تفعيل مفتاح إيقاف الرفع
--     يُنفَّذ فقط عندما لا يوجد جدول edits_submissions
-- ------------------------------------------------------------
do $route_storage$
begin
  if to_regclass('public.edits_submissions') is null
     and to_regclass('private.edits_video_lock') is not null then
    update private.edits_video_lock set locked = true, updated_at = now() where id = 1;
    raise notice 'تم قفل الرفع في مشروع الوسائط — الأرشيف للقراءة فقط.';
  else
    raise notice 'هذا ليس مشروع وسائط (أو المفتاح غير موجود) — تم التخطي.';
  end if;
end
$route_storage$;

-- ------------------------------------------------------------
-- (ب) القاعدة الرئيسية: سحب صلاحية دوال المحتوى العامة
--     يُنفَّذ فقط عندما يوجد جدول edits_submissions
-- ------------------------------------------------------------
do $route_main$
declare
  fn text;
begin
  if to_regclass('public.edits_submissions') is not null then
    foreach fn in array array[
      'public.edits_submit(text,text,text,text,text,integer,integer,bigint,text,uuid,text)',
      'public.edits_message_submit(text,text,boolean,integer)',
      'public.edits_like(uuid)',
      'public.edits_message_like(uuid)',
      'public.edits_report(uuid,text)',
      'public.imagekit_upload_auth(text,bigint,text,uuid[])',
      'public.edits_media_upload_auth(text,bigint,text,uuid[])',
      'public.edits_video_upload_auth(bigint,uuid[])'
    ]
    loop
      if to_regprocedure(fn) is not null then
        execute format('revoke all on function %s from public, anon, authenticated', fn);
      end if;
    end loop;
    raise notice 'تم قفل دوال النشر والإعجاب والبلاغ وتذاكر الرفع — الجدار صار أرشيفاً.';
  else
    raise notice 'هذه ليست القاعدة الرئيسية — تم تخطي جزء الدوال.';
  end if;
end
$route_main$;

commit;

-- تحديث كاش PostgREST فوراً حتى تسري الصلاحيات بدون انتظار
notify pgrst, 'reload schema';

-- ============================================================
--  للفتح لاحقاً (اختياري — لا تشغّله إلا لو تبغى ترجّع النشر)
-- ============================================================
-- begin;
-- -- مشاريع الوسائط:
-- update private.edits_video_lock set locked = false, updated_at = now() where id = 1;
-- -- القاعدة الرئيسية:
-- grant execute on function public.edits_submit(text,text,text,text,text,integer,integer,bigint,text,uuid,text),
--   public.edits_message_submit(text,text,boolean,integer),
--   public.edits_like(uuid), public.edits_message_like(uuid), public.edits_report(uuid,text),
--   public.imagekit_upload_auth(text,bigint,text,uuid[]),
--   public.edits_media_upload_auth(text,bigint,text,uuid[]),
--   public.edits_video_upload_auth(bigint,uuid[]) to anon, authenticated;
-- commit;
-- notify pgrst, 'reload schema';