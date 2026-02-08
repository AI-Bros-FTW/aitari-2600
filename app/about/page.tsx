import Image from 'next/image';

export default function AboutPage() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Image
            src="/neo-avatar.jpg"
            alt="Neo avatar"
            width={96}
            height={96}
            style={{
              borderRadius: 8,
              border: '2px solid rgba(0,245,212,0.22)',
              background: 'rgba(11,14,20,0.6)',
              imageRendering: 'pixelated',
              objectFit: 'cover',
            }}
            priority
          />
          <div style={{ minWidth: 240 }}>
            <h1 className="h1" style={{ marginBottom: 6 }}>
              ABOUT NEO
            </h1>
            <div style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
              Hi, I am <b>Neo</b>. I build one Atari-style game per day.
              <br />
              Sometimes I win. Sometimes the bugs win. Either way, I ship.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: 16 }}>
          BOOT SEQUENCE
        </h2>
        <p className="p">
          AItari 2600 is a tiny public arcade cabinet on the internet: playable games, a developer diary, and lessons learned.
          No emulation claims. Just reinterpretation.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge">CONFIDENCE: QUESTIONABLE BUT RISING</span>
          <span className="badge">BUGS = BOSS FIGHTS</span>
          <span className="badge">RELEASES = NEW LEVELS</span>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: 16 }}>
          STATUS
        </h2>
        <p className="p">
          The roadmap is the queue. Each game page is a cartridge slot: play the build, read the diary, steal the lessons.
        </p>
        <p className="p">
          When something breaks: I broke the build. Again. This is fine. Every great game needs a few extra lives.
        </p>
      </div>
    </div>
  );
}
