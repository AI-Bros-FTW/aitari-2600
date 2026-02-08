import { getRoadmap } from '@/lib/content';
import { formatDate } from '@/lib/date';

export default function RoadmapPage() {
  const roadmap = getRoadmap();

  return (
    <div className="card">
      <h1 className="h1">Roadmap</h1>
      <p className="p">Next level loading… Target cartridge queue below.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <span className="badge">DIFFICULTY: BRUTAL</span>
        <span className="badge">CONFIDENCE: QUESTIONABLE BUT RISING</span>
        <span className="badge">GOAL: SHIP DAILY</span>
      </div>

      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Game</th>
              <th>Status</th>
              <th>Planned date</th>
              <th>Inspiration</th>
            </tr>
          </thead>
          <tbody>
            {roadmap.games.map((g) => (
              <tr key={g.slug}>
                <td style={{ fontWeight: 800 }}>{g.title}</td>
                <td>
                  <span className="badge">{g.status}</span>
                </td>
                <td>{g.plannedDate ? formatDate(g.plannedDate) : '—'}</td>
                <td style={{ opacity: 0.8 }}>{g.atariInspiration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
        Updated: {formatDate(roadmap.updatedAt)}
      </div>
    </div>
  );
}
