'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lessons = require('../src/english-lessons.json');
const { buildAIPrompt } = require('../lib/course-adapters');

test('English demo content is a distinct multi-lesson A1 curriculum with no Python examples', () => {
  assert.equal(lessons.length, 4);
  assert.equal(new Set(lessons.map(item => item.id)).size, lessons.length);
  for (const lesson of lessons) {
    assert.equal(lesson.level, 'A1');
    assert.ok(lesson.vocabulary.length >= 4);
    assert.ok(lesson.dialogue.length >= 3);
    assert.equal(lesson.options.length, 4);
    assert.ok(lesson.correct >= 0 && lesson.correct < 4);
    assert.doesNotMatch(JSON.stringify(lesson), /python|print\s*\(|variable|متغیر/i);
  }
});

test('English lesson creator gets language blocks and is instructed never to use Python or sandbox', () => {
  const prompt = buildAIPrompt('teacher', {
    subject: 'english', level: 'A1', topic: 'ordering a drink',
    lessonTitle: 'سفارش ساده در کافه', lessonContent: 'I’d like a tea, please.',
  });
  assert.match(prompt, /واژگان/);
  assert.match(prompt, /گفت‌وگو/);
  assert.match(prompt, /پرسش‌های آزمون|سه پرسش چهارگزینه‌ای/);
  assert.match(prompt, /مطلقاً کد پایتون/);
  assert.doesNotMatch(prompt, /print\s*\(/);
});

test('all AI roles disable hidden reasoning and default to the selected free model', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /reasoning: \{ enabled: false \}/);
  assert.match(server, /mode === 'teacher' \? 1000/);
  assert.match(server, /const FREE_MODEL = 'nvidia\/nemotron-3-ultra-550b-a55b:free'/);
  assert.match(server, /configuredModel === 'nvidia\/nemotron-3-ultra-550b-a55b' \? FREE_MODEL/);
  assert.match(server, /provider: \{ allow_fallbacks: true, sort: 'throughput' \}/);
  assert.match(server, /attempt < 2/);
  assert.match(server, /deadline - Date\.now\(\) > 12_000/);
});

test('builder offers a type picker, video upload, and browser demo publishing', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  assert.match(app, /نوع بلوک را از فهرست کنار صفحه انتخاب کنید/);
  assert.match(app, /انتخاب نوع بلوک/);
  assert.match(app, /<MediaUploader path=\{path\} lessonId=/);
  assert.match(app, /localStorage\.setItem\(publishedKey/);
  assert.match(app, /StudentPublishedBlock/);
  const creator = app.slice(app.indexOf('function AIDraft('), app.indexOf('\nconst studentRows='));
  assert.match(creator, /موضوع درس/);
  assert.match(creator, /منابع و راهنمای مدرس/);
  assert.match(creator, /درخواست‌های آماده/);
  assert.match(creator, /buildPreparedLessonAnswer/);
  assert.match(creator, /به سرویس AI درخواست نمی‌فرستد/);
  assert.doesNotMatch(creator, /requestApi|\/api\/ai|حالت.*loading/);
  assert.match(creator, /افزودن به بوم درس/);
  assert.match(app, /inline-block-editor/);
  assert.match(app, /updateBlock\(b\.id/);
  assert.match(app, /گزینه‌ها و پاسخ درست/);
  assert.match(app, /getEnglishLesson\(lessonId\)\.title/);
});

