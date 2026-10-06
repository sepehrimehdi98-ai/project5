'use strict';

const { query } = require('../../lib/database');
const { getSessionUser, requestIsSameOrigin } = require('../../lib/sessions');

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(body));
}

async function handler(req, res) {
  if (req.method === 'POST') {
    if (!requestIsSameOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'JSON content type required.' });
    try {
      const user = await getSessionUser(req);
      if (!user) return send(res, 401, { error: 'Sign in is required.' });
      if (user.role !== 'student' || !user.courseId) return send(res, 403, { error: 'Study tracking is available only for the signed-in student course.' });
      let body = req.body || {};
      if (!req.body) {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 8192) return send(res, 413, { error: 'Request too large.' });
        }
        try { body = JSON.parse(raw || '{}'); }
        catch { return send(res, 400, { error: 'Invalid JSON.' }); }
      }
      const clientId = String(body.sessionId || '');
      if (!/^[0-9a-f-]{36}$/i.test(clientId)) return send(res, 400, { error: 'Invalid study session.' });
      const seconds = Math.max(0, Math.min(120, Math.floor(Number(body.seconds) || 0)));
      const lesson = String(body.lessonId || '').slice(0, 120) || null;
      if (lesson) {
        const scoped = await query('SELECT external_key FROM lessons WHERE external_key = $1 AND course_id = $2', [lesson, user.courseId]);
        if (!scoped.rows[0]) return send(res, 403, { error: 'This lesson does not belong to your signed-in course.' });
      }
      const result = await query(
        `INSERT INTO study_sessions(user_id, client_session_id, lesson_key, duration_seconds)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, client_session_id) DO UPDATE SET
           lesson_key = COALESCE(EXCLUDED.lesson_key, study_sessions.lesson_key),
           duration_seconds = study_sessions.duration_seconds + EXCLUDED.duration_seconds,
           last_seen_at = now()
         RETURNING duration_seconds`,
        [user.id, clientId, lesson, seconds]
      );
      return send(res, 200, { ok: true, seconds: result.rows[0].duration_seconds });
    } catch (error) {
      console.error('Study activity write failed:', error.code || error.message);
      return send(res, 503, { error: 'Study activity is temporarily unavailable.' });
    }
  }
  if (req.method === 'GET') {
    try {
      const user = await getSessionUser(req);
      if (!user) return send(res, 401, { error: 'Sign in is required.' });
      if (!['teacher', 'admin'].includes(user.role)) return send(res, 403, { error: 'Teacher or administrator access is required.' });
      const targetId = new URL(req.url, 'http://localhost').searchParams.get('studentId');
      if (targetId && !/^[0-9a-f-]{36}$/i.test(targetId)) return send(res, 400, { error: 'Invalid student id.' });
      const values = [user.id];
      let studentFilter = '';
      if (targetId) { values.push(targetId); studentFilter = ` AND u.id = $${values.length}`; }
      const scope = user.role === 'admin' ? '' : ` AND EXISTS (
        SELECT 1 FROM enrollments e JOIN course_teachers ct ON ct.course_id = e.course_id
        WHERE e.student_id = u.id AND e.status = 'active' AND ct.teacher_id = $1
      )`;
      const result = await query(
        `SELECT u.id, u.display_name, u.username,
          COALESCE(study.total_seconds, 0)::int AS study_seconds,
          COALESCE(study.week_seconds, 0)::int AS week_seconds,
          COALESCE(quizzes.attempt_count, 0)::int AS quiz_count,
          quizzes.average_score,
          quizzes.latest_score,
          quizzes.latest_at
         FROM users u
         LEFT JOIN LATERAL (
           SELECT SUM(ss.duration_seconds) AS total_seconds,
             SUM(ss.duration_seconds) FILTER (WHERE ss.last_seen_at >= now() - interval '7 days') AS week_seconds
           FROM study_sessions ss WHERE ss.user_id = u.id
         ) study ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS attempt_count, ROUND(AVG(qa.score), 1) AS average_score,
             (array_agg(qa.score ORDER BY qa.created_at DESC))[1] AS latest_score,
             MAX(qa.created_at) AS latest_at
           FROM quiz_attempts qa WHERE qa.student_id = u.id
         ) quizzes ON true
         WHERE u.role = 'student' AND u.is_active = true ${scope} ${studentFilter}
         ORDER BY u.display_name`, values
      );
      return send(res, 200, { students: result.rows });
    } catch (error) {
      console.error('Study analytics lookup failed:', error.code || error.message);
      return send(res, 503, { error: 'Student analytics are temporarily unavailable.' });
    }
  }
  return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });
}

module.exports = handler;
