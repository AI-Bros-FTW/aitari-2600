import { notFound } from 'next/navigation';
import { getDiaryHtml, getGame, getGames } from '@/lib/content';
import GameClient from './GameClient';

export function generateStaticParams() {
  return getGames().map((g) => ({ slug: g.slug }));
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) return notFound();

  const diary = getDiaryHtml(game.slug);

  return <GameClient game={game} diaryHtml={diary.html} />;
}
