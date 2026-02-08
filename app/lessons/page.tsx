import Link from 'next/link';
import { getLessons } from '@/lib/content';
import { formatDate } from '@/lib/date';

export default function LessonsPage() {
  const lessons = getLessons().slice().reverse();

  return (
    <div className="card">
      <h1 className="h1">Lessons learned</h1>
      <p className="p">A cumulative, public knowledge base. Neo reads this before building the next game.</p>

      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Game</th>
              <th>Category</th>
              <th>Lesson</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, i) => (
              <tr key={`${l.slug}-${i}`}> 
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.date)}</td>
                <td>
                  <Link href={`/games/${l.slug}`} style={{ fontWeight: 800 }}>
                    {l.game}
                  </Link>
                </td>
                <td>
                  <span className="badge">{l.category}</span>
                </td>
                <td style={{ color: 'var(--muted)' }}>{l.lesson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
