-- Portable PostgreSQL schema for managed PostgreSQL providers.
-- Apply with: npm run db:migrate

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  username_normalized text GENERATED ALWAYS AS (lower(trim(username))) STORED,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_normalized_unique UNIQUE (username_normalized)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid,
  course_subject text CHECK (course_subject IN ('python', 'english')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS course_id uuid;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS course_subject text;
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_course_subject_check CHECK (course_subject IN ('python', 'english'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'python' CHECK (subject IN ('python', 'english')),
  target_language text NOT NULL DEFAULT 'Python',
  instruction_language text NOT NULL DEFAULT 'Persian',
  level text NOT NULL DEFAULT 'مقدماتی',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Add course identity fields to databases created with earlier Nova schemas.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'python';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_language text NOT NULL DEFAULT 'Python';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instruction_language text NOT NULL DEFAULT 'Persian';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'مقدماتی';
DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT courses_subject_check CHECK (subject IN ('python', 'english'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS courses_subject_status_idx ON courses(subject, status);
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS course_teachers (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(course_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  PRIMARY KEY(course_id, student_id)
);
CREATE INDEX IF NOT EXISTS enrollments_student_idx ON enrollments(student_id, status);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text UNIQUE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number integer NOT NULL CHECK (module_number > 0),
  position integer NOT NULL CHECK (position >= 0),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  exercise jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_number, position)
);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS lessons_external_key_unique ON lessons(external_key) WHERE external_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS lessons_course_order_idx ON lessons(course_id, module_number, position);

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_student_date_idx ON quiz_attempts(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_date_idx ON quiz_attempts(quiz_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lesson_progress (
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  time_spent_seconds integer NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx ON lesson_progress(lesson_id);

-- Heartbeats are server-associated to the authenticated account; the client never chooses the user id.
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_session_id text NOT NULL,
  lesson_key text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  UNIQUE(user_id, client_session_id)
);
CREATE INDEX IF NOT EXISTS study_sessions_user_seen_idx ON study_sessions(user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS teacher_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teacher_sources_lesson_approved_idx ON teacher_sources(lesson_id, approved_at);

CREATE TABLE IF NOT EXISTS teacher_guidance (
  lesson_id uuid PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teaching_style text NOT NULL DEFAULT '',
  common_mistakes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  lesson_key text,
  -- Keep storage-provider details generic so Cloudinary can be replaced with an S3-compatible Iranian provider.
  storage_provider text NOT NULL DEFAULT 'cloudinary',
  provider_asset_id text NOT NULL,
  cloudinary_public_id text,
  secure_url text NOT NULL,
  title text NOT NULL,
  bytes bigint NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  status text NOT NULL DEFAULT 'pending-review' CHECK (status IN ('pending-review', 'approved', 'rejected')),
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'cloudinary';
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS provider_asset_id text;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS lesson_key text;
ALTER TABLE media_assets ALTER COLUMN cloudinary_public_id DROP NOT NULL;
UPDATE media_assets SET provider_asset_id = cloudinary_public_id WHERE provider_asset_id IS NULL;
ALTER TABLE media_assets ALTER COLUMN provider_asset_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_provider_asset_unique ON media_assets(storage_provider, provider_asset_id);
CREATE INDEX IF NOT EXISTS media_assets_lesson_status_idx ON media_assets(lesson_id, status);

CREATE TABLE IF NOT EXISTS login_throttles (
  key_hash char(64) PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  failures integer NOT NULL DEFAULT 0 CHECK (failures >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
