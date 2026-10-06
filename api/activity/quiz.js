'use strict';

const { query, transaction } = require('../../lib/database');
const { getSessionUser, requestIsSameOrigin } = require('../../lib/sessions');

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!requestIsSameOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'JSON content type required.' });
  try {
    const user = await getSessionUser(req);
    if (!user) return send(res, 401, { error: 'Sign in is required.' });
    if (user.role !== 'student') return send(res, 403, { error: 'Only students can submit quiz attempts.' });
    let body = req.body || {};
    if (!req.body) {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16_384) return send(res, 413, { error: 'Request too large.' }); }
      try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'Invalid JSON.' }); }
    }
    const lessonKey = String(body.lessonKey || '');
    if (!/^[\p{L}\p{N}_-]{1,120}$/u.test(lessonKey) || !Array.isArray(body.answers) || body.answers.length > 50 || !body.answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 100)) {
      return send(res, 400, { error: 'Invalid quiz submission.' });
    }
    const found = await query(
      `SELECT q.id, q.lesson_id, q.questions FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
       WHERE l.external_key = $1 AND l.course_id = $2 AND q.status = 'published' ORDER BY q.updated_at DESC LIMIT 1`, [lessonKey, user.courseId]
    );
    const quiz = found.rows[0];
    if (!quiz) return send(res, 404, { error: 'No published quiz is connected to this lesson yet.' });
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    if (!questions.length || body.answers.length !== questions.length) return send(res, 400, { error: 'Answer every quiz question before submitting.' });
    const correct = questions.reduce((count, question, index) => count + (Number(body.answers[index]) === Number(question.answer) ? 1 : 0), 0);
    const score = Math.round(correct * 100 / questions.length);
    const saved = await transaction(async client => {
      const attempt = await client.query(
        'INSERT INTO quiz_attempts(quiz_id, student_id, answers, score) VALUES ($1, $2, $3::jsonb, $4) RETURNING id, score, created_at',
        [quiz.id, user.id, JSON.stringify(body.answers), score]
      );
      const xp = score >= 60 ? 15 : 0;
      await client.query(
        `INSERT INTO lesson_progress(student_id, lesson_id, completed_at, xp_earned)
         VALUES ($1, $2, CASE WHEN $3 > 0 THEN now() ELSE NULL END, $3)
         ON CONFLICT (student_id, lesson_id) DO UPDATE SET
           completed_at = CASE WHEN $3 > 0 THEN COALESCE(lesson_progress.completed_at, now()) ELSE lesson_progress.completed_at END,
           xp_earned = GREATEST(lesson_progress.xp_earned, $3), updated_at = now()`, [user.id, quiz.lesson_id, xp]
      );
      return attempt.rows[0];
    });
    return send(res, 201, { attemptId: saved.id, score: Number(saved.score), correct, total: questions.length, passed: score >= 60, createdAt: saved.created_at });
  } catch (error) {
    console.error('Quiz submission failed:', error.code || error.message);
    return send(res, 503, { error: 'Quiz results are temporarily unavailable.' });
  }
}

module.exports = handler;
