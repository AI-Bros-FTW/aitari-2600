import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

export type RoadmapItem = {
  slug: string;
  title: string;
  atariInspiration: string;
  status: 'planned' | 'in development' | 'testing' | 'published';
  plannedDate?: string;
};

export type GameMeta = {
  slug: string;
  title: string;
  date: string;
  version: string;
  thumbnail: string;
  playUrl: string;
  atariInspiration: string;
};

export type Lesson = {
  date: string;
  game: string;
  slug: string;
  category: string;
  lesson: string;
};

const ROOT = process.cwd();
const dataPath = (...p: string[]) => path.join(ROOT, 'data', ...p);

export function readJson<T>(file: string): T {
  const full = dataPath(file);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw) as T;
}

export function getRoadmap(): { updatedAt: string; games: RoadmapItem[] } {
  return readJson('roadmap.json');
}

export function getGames(): GameMeta[] {
  const games = readJson<GameMeta[]>('games.json');
  return [...games].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getGame(slug: string): GameMeta | undefined {
  return getGames().find((g) => g.slug === slug);
}

export function getLessons(): Lesson[] {
  return readJson<Lesson[]>('lessons.json');
}

export function getDiaryHtml(slug: string): { title?: string; html: string } {
  const mdFile = dataPath('diaries', `${slug}.md`);
  if (!fs.existsSync(mdFile)) return { html: '<p>No diary yet.</p>' };
  const md = fs.readFileSync(mdFile, 'utf8');
  const tokens = marked.lexer(md);
  const titleToken = tokens.find((t: any) => t.type === 'heading' && t.depth === 1) as any;
  const title = titleToken ? String(titleToken.text ?? '') : undefined;
  const html = marked.parse(md) as string;
  return { title, html };
}
