-- Idempotent Nova starter catalog; this adds only public course and lesson examples.
-- It does not create accounts, enrollments, or teacher assignments.
INSERT INTO courses(slug, title, description, subject, target_language, instruction_language, level, status)
VALUES
  ('nova-python-foundations', 'پایتون از پایه', 'مبانی پایتون با تمرین‌های کوتاه و قابل اجرا.', 'python', 'Python', 'Persian', 'مقدماتی', 'published'),
  ('nova-english-a1', 'انگلیسی از پایه · A1', 'واژگان، دستور زبان و گفت‌وگوی روزمره برای سطح A1.', 'english', 'English', 'Persian', 'A1', 'published')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons(external_key, course_id, module_number, position, title, content, status)
SELECT seed.external_key, c.id, seed.module_number, seed.position, seed.title, seed.content::jsonb, 'published'
  FROM (VALUES
    ('l2-1', 'nova-python-foundations', 2, 1, 'متغیرها و انواع داده', '[{"kind":"heading","title":"متغیر چیست؟","body":"نامی برای نگهداری و بازیابی یک مقدار."},{"kind":"text","title":"یک مثال","body":"متغیر name متن Nila و متغیر age عدد 14 را نگه می‌دارد."},{"kind":"code","title":"نمایش مقادیر","body":"name = \"Nila\"\nage = 14\nprint(name, age)"}]'),
    ('en-l1-1', 'nova-english-a1', 1, 1, 'معرفی خود در یک گفت‌وگوی کوتاه', '[{"kind":"heading","title":"معرفی خود","body":"نام و شهر خود را با جمله‌های کوتاه بگویید."},{"kind":"text","title":"نمونه مکالمه","body":"ترجمه فارسی: سلام، من نیلا هستم.\nEnglish: Hello, I’m Nila."},{"kind":"exercise","title":"تمرین","body":"با نام خودتان جمله Hello, I’m … را کامل کنید."}]')
  ) AS seed(external_key, slug, module_number, position, title, content)
  JOIN courses c ON c.slug = seed.slug
ON CONFLICT DO NOTHING;
