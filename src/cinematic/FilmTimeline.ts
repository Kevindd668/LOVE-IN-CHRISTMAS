export type FilmChapterId =
  | 'intro'
  | 'tree'
  | 'heart'
  | 'photos'
  | 'numbers'
  | 'scene'
  | 'confession';

export interface FilmChapter {
  id: FilmChapterId;
  start: number;
  end: number;
  title: string;
  subtitle: string;
}

export const FILM_DURATION = 68;

export const FILM_CHAPTERS: readonly FilmChapter[] = [
  {
    id: 'intro',
    start: 0,
    end: 8,
    title: 'LOVE IN CHRISTMAS',
    subtitle: 'A STORY WRITTEN JUST FOR YOU'
  },
  {
    id: 'tree',
    start: 8,
    end: 18,
    title: 'THE TREE WAKES',
    subtitle: '一盏一盏，把冬天点亮。'
  },
  {
    id: 'heart',
    start: 18,
    end: 30,
    title: 'A HEART FOR YOU',
    subtitle: '所有心跳，都朝你而来。'
  },
  {
    id: 'photos',
    start: 30,
    end: 42,
    title: 'OUR MOMENTS',
    subtitle: '三帧时光，写满我们。'
  },
  {
    id: 'numbers',
    start: 42,
    end: 52,
    title: '520 / 1314',
    subtitle: '从一句喜欢，走到一生。'
  },
  {
    id: 'scene',
    start: 52,
    end: 62,
    title: 'OUR CHRISTMAS',
    subtitle: '这一夜，只属于我们。'
  },
  {
    id: 'confession',
    start: 62,
    end: 68,
    title: 'MERRY CHRISTMAS',
    subtitle: '一封写给你的圣诞告白。'
  }
];

export const getFilmChapter = (time: number): FilmChapter => {
  const clamped = Math.max(0, Math.min(FILM_DURATION, time));
  for (let i = FILM_CHAPTERS.length - 1; i >= 0; i -= 1) {
    const chapter = FILM_CHAPTERS[i];
    if (clamped >= chapter.start) return chapter;
  }
  return FILM_CHAPTERS[0];
};

export const getChapterIndex = (time: number): number => {
  const chapter = getFilmChapter(time);
  return FILM_CHAPTERS.findIndex((item) => item.id === chapter.id);
};

export const getChapterStart = (index: number): number => {
  const bounded = Math.max(0, Math.min(FILM_CHAPTERS.length - 1, index));
  return FILM_CHAPTERS[bounded].start;
};
