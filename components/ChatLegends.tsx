import React, { useEffect, useMemo, useState } from 'react';
import { fetchBotrixLeaderboard } from '../utils/botrixApi';
import './ChatLegends.css';

/* ============================================================
   أساطير الشات — قائمة التفاعل فقط (بدون الجيف أواي / العدّاد)
   البيانات حية من Botrix (اسم/نقاط/لفل/ساعات) + صور كيك الحقيقية
   ============================================================ */

interface Legend {
  n: string;
  x: number;
  l: number;
  h: number;
}

type Metric = 'hours' | 'level';

const METRICS: { id: Metric; ar: string; icon: string }[] = [
  { id: 'hours', ar: 'الأكثر ساعات', icon: '⏱' },
  { id: 'level', ar: 'الأعلى لفل', icon: '⭐' },
];

/* صور كيك — كاش مشترك على مستوى الموديول */
const AVATAR_CACHE = new Map<string, string>();
const KICK_CH = (name: string) =>
  '/api/kick?endpoint=' + encodeURIComponent(`https://kick.com/api/v2/channels/${name}`);

const K = (v: number) => (v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : `${v}`);
const hueOf = (name: string) => ([...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) * 37) % 360;

const Avatar: React.FC<{ name: string; img?: string }> = ({ name, img }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="av" style={{ '--h': hueOf(name) } as React.CSSProperties}>
      {img && !failed ? (
        <img src={img} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        name[0].toUpperCase()
      )}
    </div>
  );
};

export const ChatLegends: React.FC = () => {
  const [data, setData] = useState<Legend[] | null>(null);
  const [metric, setMetric] = useState<Metric>('hours');
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  /* ---------- البيانات الحية ---------- */
  useEffect(() => {
    let dead = false;
    fetchBotrixLeaderboard()
      .then((rows) => {
        if (dead) return;
        const sorted = [...rows].sort((a, b) => b.watchtime - a.watchtime || b.xp - a.xp);
        /* ملاحظة: watchtime من Botrix بالدقائق — القسمة على 60 للتحويل لساعات */
        setData(sorted.map((e) => ({ n: e.name, x: e.xp, l: e.level, h: (e.watchtime || 0) / 60 })));
      })
      .catch(() => {
        if (!dead) setData([]);
      });
    return () => {
      dead = true;
    };
  }, []);

  const top = useMemo(() => (data && data.length > 0 ? data : null), [data]);

  /* الترتيب حسب التبويب المختار — الرئيسي دائماً الأكثر ساعات */
  const ranked = useMemo(() => {
    if (!top) return null;
    const arr = [...top];
    if (metric === 'level') arr.sort((a, b) => b.l - a.l || b.x - a.x);
    else arr.sort((a, b) => b.h - a.h || b.x - a.x);
    return arr;
  }, [top, metric]);

  const maxH = ranked ? Math.max(1, ranked[0].h) : 1;
  const imgOf = (name: string) => avatars[name.toLowerCase()] || AVATAR_CACHE.get(name.toLowerCase()) || '';

  /* صور كيك الحقيقية لأعلى 15 — والباقي حرف */
  useEffect(() => {
    if (!top) return;
    let dead = false;
    const names = top.slice(0, 15).map((e) => e.n).filter((n) => !AVATAR_CACHE.has(n.toLowerCase()));
    if (names.length === 0) {
      setAvatars(Object.fromEntries([...AVATAR_CACHE.entries()]));
      return;
    }
    (async () => {
      const out: Record<string, string> = {};
      for (let i = 0; i < names.length; i += 4) {
        const batch = await Promise.all(
          names.slice(i, i + 4).map(async (n) => {
            try {
              const r = await fetch(KICK_CH(n));
              if (!r.ok) return null;
              const d = await r.json();
              const url: string = d?.user?.profile_pic || '';
              return url ? { n, url } : null;
            } catch {
              return null;
            }
          }),
        );
        if (dead) return;
        batch.forEach((b) => {
          if (b) {
            AVATAR_CACHE.set(b.n.toLowerCase(), b.url);
            out[b.n.toLowerCase()] = b.url;
          }
        });
        setAvatars((prev) => ({ ...prev, ...out }));
      }
    })();
    return () => {
      dead = true;
    };
  }, [top]);

  const order = [1, 0, 2];

  return (
    <section className="cl">
      <div className="lg">
        <div className="hd">
          <div className="star">★</div>
          <div>
            <h2>أساطير الشات</h2>
            <div className="sub">الأكثر تفاعلاً في جميع البثوث</div>
          </div>
          <div className="pill">
            <span>{top ? `${top.length} أسطورة` : '…'}</span>
          </div>
        </div>

        {ranked && ranked.length >= 3 && (
          <>
            {/* ===== اختيار الترتيب ===== */}
            <div className="cl-tabs">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  className={`cl-tab${metric === m.id ? ' on' : ''}`}
                  aria-pressed={metric === m.id}
                >
                  <span>{m.icon}</span> {m.ar}
                </button>
              ))}
            </div>
            <p className="cl-sortnote">
              الترتيب حسب <b>{METRICS.find((m) => m.id === metric)?.ar}</b>
            </p>
            <div className="pod" key={`pod-${metric}`}>
              {order
                .filter((d) => ranked[d])
                .map((d) => {
                  const p = ranked[d];
                  return (
                    <div key={p.n} className={`pi p${d + 1}`}>
                      {d === 0 && <div className="crown">👑</div>}
                      <Avatar name={p.n} img={imgOf(p.n)} />
                      <b title={p.n}>{p.n}</b>
                      <small>
                        Lv.{p.l} · {K(p.x)} XP
                      </small>
                      <em>{Math.round(p.h)}h</em>
                      <div className="base">{d + 1}</div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {ranked && ranked.length > 3 && (
          <div className="list" key={`list-${metric}`}>
            {ranked.slice(3).map((p, i) => (
              <div
                key={`${p.n}-${i}`}
                className="row"
                style={{ '--i': Math.min(i, 20), '--w': `${((p.h / maxH) * 100).toFixed(1)}%` } as React.CSSProperties}
              >
                <span className="rk">{String(i + 4).padStart(2, '0')}</span>
                <Avatar name={p.n} img={imgOf(p.n)} />
                <div className="nm">
                  <b title={p.n}>{p.n}</b>
                  <small>
                    Lv.{p.l} · {K(p.x)} XP · {Math.round(p.h)}h
                  </small>
                </div>
                <div className="st">
                  {metric === 'level' ? (
                    <>
                      <span className="h">Lv.{p.l}</span>
                      <span>{Math.round(p.h)}h</span>
                    </>
                  ) : (
                    <>
                      <span className="h">{Math.round(p.h)}h</span>
                      <span>{K(p.x)} XP</span>
                    </>
                  )}
                </div>
                <div className="bar">
                  <i></i>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ChatLegends;