/* جدار الإيديتات — ضغط ورفع الفيديو
   - يضغط في المتصفح (ffmpeg.wasm محلي) حتى يصبح كل فيديو < 50MB.
   - يرفع إلى Bucket مستقل (نفس المشروع الذي منحته قاعدة البيانات الرئيسية).
   - يولّد غلافاً JPEG من الإطار الأول.
   - يعيد بيانات جاهزة لـ edits_submit.
   واجهة الاستخدام:
     const prep = await EditsVideo.prepare(file, onProgress);
     const up   = await EditsVideo.upload(prep, onProgress);
*/
(function () {
  'use strict';

  const MAX_BYTES = 50000000;          // حد Bucket الصارم
  const TARGET_BYTES = 46000000;       // هامش أمان داخل الحد
  const MAX_INPUT_BYTES = 350 * 1024 * 1024;
  const MAX_DURATION = 90;             // ثوانٍ — ضغط wasm أبطأ من الأصلي
  const FF_BASE = new URL('vendor/ffmpeg/', document.currentScript ? document.currentScript.src : document.baseURI).href;

  let ffPromise = null;
  let ffBusy = false;

  function report(onProgress, stage, pct, label) {
    if (typeof onProgress === 'function') {
      try { onProgress({ stage: stage, pct: Math.max(0, Math.min(100, pct)), label: label }); } catch (_) {}
    }
  }

  function formatSize(bytes) {
    return bytes >= 1048576
      ? (bytes / 1048576).toFixed(1) + 'MB'
      : Math.max(1, Math.round(bytes / 1024)) + 'KB';
  }

  function videoMeta(blob) {
    return new Promise(function (resolve, reject) {
      const v = document.createElement('video');
      const url = URL.createObjectURL(blob);
      let settled = false;
      const finish = function (ok) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const meta = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
        URL.revokeObjectURL(url);
        v.removeAttribute('src');
        try { v.load(); } catch (_) {}
        if (ok && meta.width > 0 && meta.height > 0) resolve(meta);
        else reject(new Error('تعذّر قراءة بيانات الفيديو — جرّب ملفاً آخر'));
      };
      const timer = setTimeout(function () { finish(false); }, 12000);
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      v.onloadedmetadata = function () { finish(true); };
      v.onerror = function () { finish(false); };
      v.src = url;
    });
  }

  /* بعض الملفات (WebM من تسجيل الشاشة، MOV بلا moov في البداية) لا تُعلن
     المدة للمتصفح. نقرأها من ffmpeg نفسها حتى لا نرفض ملفاً سليماً. */
  async function probeWithFF(file, onProgress) {
    const ff = await loadFF(onProgress);
    if (ffBusy) throw new Error('الضاغط يعمل على فيديو آخر — انتظر لحظات');
    ffBusy = true;
    const mountDir = '/p_' + Math.random().toString(36).slice(2, 8);
    let text = '';
    const h = function (e) { text += (e && e.message ? e.message : '') + '\n'; };
    try {
      await ff.createDir(mountDir);
      await ff.mount('WORKERFS', { files: [new File([file], 'probe.mp4', { type: file.type || 'video/mp4' })] }, mountDir);
      ff.on('log', h);
      try { await ff.exec(['-hide_banner', '-i', mountDir + '/probe.mp4']); } catch (_) {}
      ff.off('log', h);
      const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
      const dim = /(\d{2,5})x(\d{2,5})/.exec(text);
      return {
        duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : NaN,
        width: dim ? Number(dim[1]) : 0,
        height: dim ? Number(dim[2]) : 0
      };
    } finally {
      try { ff.off('log', h); } catch (_) {}
      try { await ff.unmount(mountDir); } catch (_) {}
      ffBusy = false;
    }
  }

  function makePoster(blob) {
    return new Promise(function (resolve, reject) {
      const v = document.createElement('video');
      const url = URL.createObjectURL(blob);
      let settled = false;
      let fallback = null;
      const finish = function (posterBlob) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(fallback);
        URL.revokeObjectURL(url);
        v.removeAttribute('src');
        try { v.load(); } catch (_) {}
        if (posterBlob) resolve(posterBlob);
        else reject(new Error('تعذّر توليد غلاف الفيديو'));
      };
      const timer = setTimeout(function () { finish(null); }, 15000);
      const grab = function () {
        if (settled) return;
        try {
          const sw = v.videoWidth || 0;
          const sh = v.videoHeight || 0;
          if (!sw || !sh) return finish(null);
          const scale = Math.min(1, 720 / Math.max(sw, sh));
          const w = Math.max(2, Math.round((sw * scale) / 2) * 2);
          const h = Math.max(2, Math.round((sh * scale) / 2) * 2);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(v, 0, 0, w, h);
          canvas.toBlob(function (b) {
            finish(b || null);
          }, 'image/jpeg', 0.82);
        } catch (_) {
          finish(null);
        }
      };
      const afterSeek = function () { setTimeout(grab, 90); };
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = function () {
        const seekTo = Math.min(0.5, (isFinite(v.duration) ? v.duration : 1) * 0.12);
        v.addEventListener('seeked', afterSeek, { once: true });
        try { v.currentTime = seekTo; } catch (_) { afterSeek(); }
        /* لو تعذّر القفز (ملف بلا فهرس) نلتقط الإطار الحالي */
        fallback = setTimeout(function () {
          if (!settled && v.readyState >= 2) grab();
        }, 1200);
      };
      v.onerror = function () { done(false); };
      v.src = url;
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('تعذّر تحميل محرك الضغط')); };
      document.head.appendChild(s);
    });
  }

  function loadFF(onProgress) {
    if (ffPromise) return ffPromise;
    ffPromise = (async function () {
      report(onProgress, 'load', 2, 'تجهيز محرك الضغط (مرة واحدة)...');
      if (!window.FFmpegWASM) await loadScript(FF_BASE + 'ffmpeg.js');
      if (!window.FFmpegWASM || !window.FFmpegWASM.FFmpeg) throw new Error('محرك الضغط غير متوفر');
      const ff = new window.FFmpegWASM.FFmpeg();
      await ff.load({
        coreURL: FF_BASE + 'ffmpeg-core.js',
        wasmURL: FF_BASE + 'ffmpeg-core.wasm'
      });
      report(onProgress, 'load', 8, 'محرك الضغط جاهز');
      return ff;
    })().catch(function (err) {
      ffPromise = null;
      throw err;
    });
    return ffPromise;
  }

  function buildArgs(input, output, duration, attempt) {
    const dur = isFinite(duration) && duration > 0.3 ? duration : MAX_DURATION;
    const budget = TARGET_BYTES * Math.pow(0.72, attempt);
    let bitrate = Math.floor((budget * 8) / Math.max(1, dur));
    const ceiling = attempt === 0 ? 3400000 : 2600000;
    bitrate = Math.min(bitrate, ceiling);
    bitrate = Math.max(bitrate, 360000);
    const kbps = Math.max(300, Math.floor(bitrate / 1000));
    const cap = attempt >= 2 ? 480 : 720;
    return [
      '-hide_banner', '-y', '-i', input,
      '-t', String(MAX_DURATION),
      '-sn', '-dn', '-map_metadata', '-1',
      '-vf', "scale='min(1280,iw)':'min(" + cap + ",ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      '-r', '30',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-profile:v', 'main',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '44100',
      '-b:v', kbps + 'k', '-maxrate', kbps + 'k', '-bufsize', (kbps * 2) + 'k',
      '-movflags', '+faststart', '-f', 'mp4', output
    ];
  }

  async function transcode(file, meta, onProgress) {
    const ff = await loadFF(onProgress);
    if (ffBusy) throw new Error('الضاغط يعمل على فيديو آخر — انتظر لحظات');
    ffBusy = true;
    const mountDir = '/in_' + Math.random().toString(36).slice(2, 8);
    const inputName = 'input.mp4';
    const outName = 'out.mp4';
    let handler = null;
    try {
      report(onProgress, 'compress', 12, 'قراءة الفيديو...');
      await ff.createDir(mountDir);
      await ff.mount('WORKERFS', { files: [new File([file], inputName, { type: file.type || 'video/mp4' })] }, mountDir);
      const inputPath = mountDir + '/' + inputName;

      for (let attempt = 0; attempt < 3; attempt++) {
        const args = buildArgs(inputPath, outName, meta.duration || 1, attempt);
        if (attempt > 0) {
          try { await ff.deleteFile(outName); } catch (_) {}
          report(onProgress, 'compress', 14, 'تقليل الجودة أكثر قليلاً...');
        }
        handler = function (p) {
          const raw = p && typeof p.progress === 'number' ? p.progress : 0;
          const ratio = Math.max(0, Math.min(1, raw));
          report(onProgress, 'compress', 14 + ratio * 46, 'ضغط الفيديو ' + Math.round(14 + ratio * 46) + '%');
        };
        ff.on('progress', handler);
        await ff.exec(args);
        if (handler) { ff.off('progress', handler); handler = null; }
        const data = await ff.readFile(outName);
        const blob = new Blob([data], { type: 'video/mp4' });
        if (blob.size <= MAX_BYTES) {
          report(onProgress, 'compress', 62, 'تم الضغط (' + formatSize(blob.size) + ')');
          return blob;
        }
      }
      throw new Error('تعذّر ضغط الفيديو تحت 50MB — جرّب مقطعاً أقصر');
    } finally {
      if (handler) { try { ff.off('progress', handler); } catch (_) {} }
      try { await ff.deleteFile(outName); } catch (_) {}
      try { await ff.unmount(mountDir); } catch (_) {}
      ffBusy = false;
    }
  }

  function putObject(auth, path, blob, contentType, onPct) {
    return new Promise(function (resolve, reject) {
      const base = String(auth.project_url).replace(/\/+$/, '');
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', base + '/storage/v1/object/' + auth.bucket + '/' + encodedPath, true);
      xhr.timeout = 15 * 60 * 1000;
      xhr.setRequestHeader('apikey', auth.publishable_key);
      xhr.setRequestHeader('Authorization', 'Bearer ' + auth.publishable_key);
      xhr.setRequestHeader('x-access-key', 'edits-videos');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('cache-control', 'max-age=31536000');
      xhr.setRequestHeader('content-type', contentType);
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && typeof onPct === 'function') onPct(e.loaded / e.total);
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let msg = 'فشل رفع الفيديو (' + xhr.status + ')';
        try {
          const j = JSON.parse(xhr.responseText);
          if (j && (j.message || j.error)) msg = j.message || j.error;
        } catch (_) {}
        reject(new Error(msg));
      };
      xhr.onerror = function () { reject(new Error('انقطع الاتصال أثناء رفع الفيديو')); };
      xhr.ontimeout = function () { reject(new Error('انتهت مهلة رفع الفيديو')); };
      xhr.send(blob);
    });
  }

  function rpc(fn, args) {
    return fetch(SB_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(async function (res) {
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
      if (!res.ok) {
        const raw = String((data && (data.message || data.hint || data.error)) || text || '');
        if ((data && data.code === 'PGRST202') || /could not find the function|schema cache/i.test(raw)) {
          console.error('RPC غير موجود في القاعدة:', raw);
          throw new Error('خدمة الفيديو غير مهيّأة في القاعدة الرئيسية بعد — يلزم تفعيل إعدادات الفيديو مرة واحدة');
        }
        throw new Error(raw || ('فشل الطلب (' + res.status + ')'));
      }
      return data;
    });
  }

  async function prepare(file, onProgress, opts) {
    if (!file || !/^video\//.test(file.type || '')) throw new Error('الملف ليس فيديو');
    if (file.size > MAX_INPUT_BYTES) throw new Error('حجم الفيديو الأصلي كبير جداً (الحد 350MB)');
    report(onProgress, 'probe', 1, 'فحص الفيديو...');
    let meta = null;
    try { meta = await videoMeta(file); } catch (_) { meta = null; }
    if (!meta || !isFinite(meta.duration) || meta.duration < 0.3) {
      report(onProgress, 'probe', 4, 'قراءة مدة الفيديو من الملف...');
      try {
        const probed = await probeWithFF(file, onProgress);
        meta = {
          duration: isFinite(probed.duration) ? probed.duration : NaN,
          width: probed.width || (meta && meta.width) || 0,
          height: probed.height || (meta && meta.height) || 0
        };
      } catch (_) { /* نكمل بمدة غير معروفة */ }
    }
    if (!(opts && opts.allowLong) && meta && isFinite(meta.duration) && meta.duration > MAX_DURATION) {
      throw new Error('الفيديو طويل — الحد دقيقة ونصف (اضغطه أو قسّمه أولاً)');
    }
    const alreadySmall = /^video\/mp4$/.test(file.type || '') && file.size <= TARGET_BYTES;
    let blob = file;
    let compressed = false;
    if (!alreadySmall) {
      blob = await transcode(file, meta || {}, onProgress);
      compressed = true;
    }
    if (blob.size > MAX_BYTES) throw new Error('الفيديو أكبر من 50MB بعد الضغط');
    report(onProgress, 'poster', 66, 'تجهيز الغلاف...');
    let poster = null;
    try { poster = await makePoster(blob); } catch (_) { poster = null; }
    const finalMeta = await videoMeta(blob).catch(function () { return meta || {}; });
    return {
      blob: blob,
      poster: poster,
      width: finalMeta.width || (meta && meta.width) || 0,
      height: finalMeta.height || (meta && meta.height) || 0,
      sizeBytes: blob.size,
      compressed: compressed,
      originalBytes: file.size
    };
  }

  async function upload(prep, onProgress, excluded) {
    const exclude = excluded || [];
    report(onProgress, 'auth', 70, exclude.length ? 'حجز مساحة بديلة...' : 'حجز مساحة الفيديو...');
    const auth = await rpc('edits_video_upload_auth', { p_size_bytes: prep.sizeBytes, p_exclude: exclude });
    const ticket = auth.ticket;
    try {
      report(onProgress, 'upload', 74, 'رفع الفيديو...');
      await putObject(auth, auth.video_path, prep.blob, 'video/mp4', function (r) {
        report(onProgress, 'upload', 74 + r * 20, 'رفع الفيديو ' + Math.round(74 + r * 20) + '%');
      });
      if (prep.poster) {
        report(onProgress, 'upload', 95, 'رفع الغلاف...');
        await putObject(auth, auth.poster_path, prep.poster, 'image/jpeg', function () {});
      }
      report(onProgress, 'done', 100, 'تم الرفع');
      return {
        media_url: auth.video_url,
        poster_url: auth.poster_url,
        width: prep.width,
        height: prep.height,
        size_bytes: prep.sizeBytes,
        file_id: auth.video_path,
        account_id: auth.account_id,
        ticket: ticket,
        label: auth.label
      };
    } catch (err) {
      try { await rpc('edits_video_release', { p_ticket: ticket }); } catch (_) {}
      const msg = String(err && err.message || '');
      if (exclude.length < 4 && !/حد الرفع|ضغط كبير/.test(msg)) {
        exclude.push(auth.account_id);
        report(onProgress, 'auth', 70, 'تعذّر الرفع على «' + auth.label + '» — تجربة المساحة التالية...');
        return upload(prep, onProgress, exclude);
      }
      throw err;
    }
  }

  window.EditsVideo = {
    prepare: prepare,
    upload: upload,
    release: function (ticket) { return rpc('edits_video_release', { p_ticket: ticket }).catch(function () {}); },
    isReady: function () { return !!ffPromise; }
  };
})();
