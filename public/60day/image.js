/* جدار الإيديتات — ضغط ورفع الصور
   - يعيد ترميز الصورة بجودة عالية دون تغيير الوضوح (نفس الأبعاد حتى 2560px).
   - GIF وAVIF تبقى كما هي حتى لا تفقد الحركة أو الجودة.
   - الرفع إلى نفس مساحات Supabase الخمس (مسار images/) مع نقل تلقائي.
   واجهة الاستخدام:
     const prep = await EditsImage.prepare(file, onProgress);
     const up   = await EditsImage.upload(prep, onProgress);
*/
(function () {
  'use strict';

  const MAX_BYTES = 50000000;
  const MAX_SIDE = 2560;                 // أكبر من أي عرض معروض على الجدار (وحتى شاشات 2x)
  const QUALITIES = [0.94, 0.92, 0.9];   // أعلى جودة ممكنة مع حجم معقول
  const SAVE_RATIO = 0.92;               // لا نستبدل الأصل إلا إذا وفّر 8% على الأقل
  const TARGET_BYTES = 4 * 1048576;

  function report(onProgress, stage, pct, label) {
    if (typeof onProgress === 'function') {
      try { onProgress({ stage: stage, pct: Math.max(0, Math.min(100, pct)), label: label }); } catch (_) {}
    }
  }

  const EXT_MIME = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', avif: 'image/avif'
  };
  const MIME_EXT = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/avif': 'avif'
  };

  function extOf(file) {
    const byMime = MIME_EXT[String(file.type || '').toLowerCase()];
    if (byMime) return byMime;
    const fromName = (file.name || '').split('.').pop().toLowerCase();
    return EXT_MIME[fromName] ? fromName : '';
  }

  function mimeOf(ext) {
    return EXT_MIME[ext] || '';
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return window.createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        return { source: bmp, width: bmp.width, height: bmp.height, close: function () { try { bmp.close(); } catch (_) {} } };
      }).catch(function () { return loadImage(file); });
    }
    return loadImage(file);
  }

  /* بديل متصفحات لا تدعم createImageBitmap (تحترم EXIF تلقائياً) */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        resolve({
          source: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          close: function () { URL.revokeObjectURL(url); }
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('تعذر قراءة الصورة — اختر صورة JPG أو PNG أو WEBP أو GIF أو AVIF'));
      };
      img.src = url;
    });
  }

  function drawToCanvas(source, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  function encode(canvas, type, quality) {
    return new Promise(function (resolve) {
      try {
        canvas.toBlob(function (blob) { resolve(blob || null); }, type, quality);
      } catch (_) { resolve(null); }
    });
  }

  async function prepare(file, onProgress) {
    if (!file || !/^image\//.test(file.type || '')) throw new Error('الملف ليس صورة');
    const ext = extOf(file);
    const mime = mimeOf(ext);
    if (!mime) throw new Error('صيغة الصورة غير مدعومة');
    report(onProgress, 'decode', 4, 'قراءة الصورة...');

    const decoded = await loadBitmap(file);
    const ow = decoded.width, oh = decoded.height;
    if (!ow || !oh || ow > 20000 || oh > 20000) {
      decoded.close();
      throw new Error('أبعاد الصورة غير صالحة (حتى 20000 بكسل)');
    }

    const scale = Math.min(1, MAX_SIDE / Math.max(ow, oh));
    const w = Math.max(1, Math.round(ow * scale));
    const h = Math.max(1, Math.round(oh * scale));
    const keepOriginal = mime === 'image/gif' || mime === 'image/avif';

    let blob = file;
    let outExt = ext;
    let outW = ow;
    let outH = oh;

    if (!keepOriginal) {
      report(onProgress, 'compress', 18, 'ضغط الصورة مع الحفاظ على الجودة...');
      const canvas = drawToCanvas(decoded.source, w, h);
      let best = null;
      for (const q of (mime === 'image/png' ? [undefined] : QUALITIES)) {
        const candidate = await encode(canvas, mime, q);
        if (!candidate) continue;
        best = candidate;
        if (candidate.size <= TARGET_BYTES) break;
      }
      if (best && (scale < 1 || best.size < file.size * SAVE_RATIO)) {
        blob = best;
        outExt = MIME_EXT[best.type] || outExt;
        outW = w;
        outH = h;
      }
      canvas.width = canvas.height = 0; // تحرير الذاكرة
    }
    decoded.close();

    if (!blob || blob.size > MAX_BYTES) throw new Error('الصورة أكبر من الحد المسموح بعد الضغط');
    report(onProgress, 'ready', 68, 'الصورة جاهزة للرفع');
    return {
      blob: blob,
      ext: outExt,
      mime: blob.type || mime,
      width: outW,
      height: outH,
      sizeBytes: blob.size,
      compressed: blob !== file,
      originalBytes: file.size
    };
  }

  function errText(err) {
    const msg = String(err && err.message || 'فشل الرفع');
    if (/could not find the function|schema cache|خدمة الفيديو غير مهيّأة/i.test(msg)) {
      return 'خدمة رفع الصور غير مهيّأة في القاعدة الرئيسية بعد — شغّل ملف الإعداد مرة واحدة';
    }
    return msg;
  }

  async function upload(prep, onProgress, excluded) {
    const exclude = excluded || [];
    if (!window.EditsVideo || !EditsVideo.rpc || !EditsVideo.putObject) {
      throw new Error('نظام الرفع غير محمّل — حدّث الصفحة');
    }
    report(onProgress, 'auth', 70, exclude.length ? 'حجز مساحة بديلة...' : 'حجز مساحة الصورة...');
    let auth;
    try {
      auth = await EditsVideo.rpc('edits_media_upload_auth', {
        p_kind: 'image',
        p_size_bytes: prep.sizeBytes,
        p_ext: prep.ext,
        p_exclude: exclude
      });
    } catch (err) {
      throw new Error(errText(err));
    }
    const ticket = auth.ticket;
    try {
      report(onProgress, 'upload', 74, 'رفع الصورة...');
      await EditsVideo.putObject(auth, auth.path, prep.blob, prep.mime, function (r) {
        report(onProgress, 'upload', 74 + r * 24, 'رفع الصورة ' + Math.round(74 + r * 24) + '%');
      });
      report(onProgress, 'done', 100, 'تم رفع الصورة');
      return {
        media_url: auth.url,
        poster_url: null,
        width: prep.width,
        height: prep.height,
        size_bytes: prep.sizeBytes,
        file_id: auth.path,
        account_id: auth.account_id,
        ticket: ticket,
        label: auth.label
      };
    } catch (err) {
      try { await EditsVideo.release(ticket); } catch (_) {}
      const msg = errText(err);
      if (exclude.length < 4 && !/حد الرفع|ضغط كبير/.test(msg)) {
        exclude.push(auth.account_id);
        report(onProgress, 'auth', 70, 'تعذّر الرفع على «' + auth.label + '» — تجربة المساحة التالية...');
        return upload(prep, onProgress, exclude);
      }
      throw new Error(msg);
    }
  }

  window.EditsImage = { prepare: prepare, upload: upload };
})();
