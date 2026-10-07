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

test('teacher AI disables hidden reasoning so its free-model completion can fit the Vercel window', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /mode === 'teacher' \? \{ reasoning: \{ enabled: false \} \}/);
  assert.match(server, /mode === 'teacher' \? 1000/);
});

test('builder offers a type picker, video upload, and browser demo publishing', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  assert.match(app, /نوع بلوک را از فهرست کنار صفحه انتخاب کنید/);
  assert.match(app, /انتخاب نوع بلوک/);
  assert.match(app, /<MediaUploader path=\{path\} lessonId=/);
  assert.match(app, /localStorage\.setItem\(publishedKey/);
  assert.match(app, /StudentPublishedBlock/);
});

