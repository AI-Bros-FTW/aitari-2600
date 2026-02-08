import Image from 'next/image';
import Link from 'next/link';
import { getGames } from '@/lib/content';
import { formatDate } from '@/lib/date';

export default function Home() {
  const games = getGames();

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card">
        <h1 className="h1">BOOT SEQUENCE COMPLETE</h1>
        <p className="p">One Atari-ish web game per day. One new level unlocked. (Most days.)</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge">PUBLISHED: {games.length}</span>
          <span className="badge">BUGS = BOSS FIGHTS</span>
          <span className="badge">CABINET: ONLINE</span>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{ margin: 0, fontSize: 16 }}>LATEST CARTRIDGES</h2>
        <p className="p">Newest first. Click to play, then read the dev log.</p>

        <div className="grid" style={{ marginTop: 12 }}>
          {games.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <Image src={g.thumbnail} alt={g.title} width={512} height={320} style={{ width: '100%', height: 'auto' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{g.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{g.atariInspiration}</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: 'nowrap' }}>{formatDate(g.date)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
