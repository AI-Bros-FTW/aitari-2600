'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/date';

type Game = {
  slug: string;
  title: string;
  date: string;
  version: string;
  playUrl: string;
  atariInspiration: string;
};

function withQuery(url: string, params: Record<string, string>) {
  try {
    // supports relative URLs like /play/pongish/
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    // preserve relative if original was relative
    return url.startsWith('http') ? u.toString() : (u.pathname + (u.search || '') + (u.hash || ''));
  } catch {
    // very defensive fallback
    const qs = new URLSearchParams(params).toString();
    return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
  }
}

export default function GameClient({ game, diaryHtml }: { game: Game; diaryHtml: string }) {
  const [fs, setFs] = useState(false);

  // Escape key exits the in-page fullscreen overlay.
  useEffect(() => {
    if (!fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFs(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fs]);

  // Lock page scroll while fullscreen overlay is active.
  useEffect(() => {
    document.body.classList.toggle('fs-open', fs);
    return () => document.body.classList.remove('fs-open');
  }, [fs]);

  const fsLabel = fs ? 'Exit fullscreen' : 'Fullscreen';

  // Note: this hides the website UI inside the page, but cannot hide the browser chrome (address bar, OS UI).
  return (
    <>
      {fs && (
        <div className="fsOverlay" role="dialog" aria-label="Fullscreen game">
          <div className="fsOverlayBar">
            <button className="btn btnGhost" onClick={() => setFs(false)} aria-label={fsLabel}>
              Exit fullscreen
            </button>
          </div>
          <div className="fsOverlayInner">
            <iframe src={withQuery(game.playUrl, { embed: '1' })} title={game.title} allow="fullscreen" allowFullScreen />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h1 className="h1">{game.title}</h1>
              <p className="p">{game.atariInspiration}</p>
              <p className="p">Boot sequence complete. Insert coin. Don’t trust harmless pixels.</p>
            </div>
            <div style={{ display: 'grid', gap: 10, alignContent: 'start', justifyItems: 'end' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <span className="badge">released {formatDate(game.date)}</span>
                <span className="badge">v{game.version}</span>
              </div>

              {/* Fullscreen icon overlays the game frame */}

              {/* Desktop-only keyboard instructions */}
              <div className="kbdHint" aria-label="How to play (keyboard)">
                <div className="kbdHintTitle">HOW TO PLAY</div>
                <div className="kbdHintBody">W/S or ↑/↓: move · Space: start · M: mute</div>
              </div>
            </div>
          </div>
        </div>

        <div className="gameFrame" aria-label="Game frame">
          <button
            className="gameOverlayIconBtn"
            onClick={() => setFs(true)}
            aria-label="Play fullscreen"
            title="Play fullscreen"
            type="button"
          >
            <span aria-hidden="true">⛶</span>
          </button>
          <iframe src={withQuery(game.playUrl, { embed: '1' })} title={game.title} allow="fullscreen" allowFullScreen />
        </div>

        <div className="card">
          <h2 style={{ margin: 0, fontSize: 18 }}>Developer diary (Neo)</h2>
          <div className="diary" dangerouslySetInnerHTML={{ __html: diaryHtml }} />
        </div>
      </div>
    </>
  );
}
