import lessons from "./english-lessons.json";

export type EnglishLesson = {
  id: string;
  level: string;
  title: string;
  duration: string;
  goal: string;
  vocabulary: [string, string][];
  dialogue: { speaker: string; english: string; persian: string }[];
  question: string;
  options: string[];
  correct: number;
  feedback: string;
  practice: string;
};

export const englishLessons = lessons as EnglishLesson[];
export function getEnglishLesson(id?: string) {
  return englishLessons.find((lesson) => lesson.id === id) || englishLessons[0];
}

