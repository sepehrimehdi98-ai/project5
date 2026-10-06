'use strict';

const { query } = require('./database');
const SUBJECTS = Object.freeze(['python', 'english']);

async function resolveCourseScope(user, subject) {
  if (!SUBJECTS.includes(subject)) throw Object.assign(new Error('ابتدا یک مسیر آموزشی معتبر انتخاب کنید.'), { status: 400 });
  if (user.role === 'admin') {
    const result = await query('SELECT id FROM courses WHERE subject = $1 ORDER BY created_at ASC LIMIT 1', [subject]);
    if (!result.rows[0]) throw Object.assign(new Error('برای این مسیر هنوز دوره‌ای در پایگاه داده ثبت نشده است.'), { status: 403 });
    return { courseId: result.rows[0].id, courseSubject: subject };
  }
  if (user.role === 'teacher') {
    const result = await query(`SELECT c.id FROM course_teachers ct JOIN courses c ON c.id = ct.course_id WHERE ct.teacher_id = $1 AND c.subject = $2 ORDER BY c.created_at ASC LIMIT 1`, [user.id, subject]);
    if (!result.rows[0]) throw Object.assign(new Error('برای این مسیر، دوره‌ای به حساب مدرس تخصیص داده نشده است.'), { status: 403 });
    return { courseId: result.rows[0].id, courseSubject: subject };
  }
  const result = await query(`SELECT c.id FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = $1 AND e.status = 'active' AND c.subject = $2 AND c.status = 'published' ORDER BY e.enrolled_at ASC LIMIT 1`, [user.id, subject]);
  if (!result.rows[0]) throw Object.assign(new Error('در این مسیر ثبت‌نام فعالی ندارید. از مدرس بخواهید شما را به دوره اضافه کند.'), { status: 403 });
  return { courseId: result.rows[0].id, courseSubject: subject };
}

module.exports = { SUBJECTS, resolveCourseScope };
