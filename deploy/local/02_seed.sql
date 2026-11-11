-- Seed data derived from the repository's schema/mock-data SQL, corrected to:
--  * match the canonical 17-table schema in deploy/supabase/00_schema_clean.sql
--  * use lowercase PostgreSQL column names
--  * point at files that ACTUALLY exist in admin-app/backend/public/uploads
--  * avoid the invalid `contact(address, phone, ...)` insert in the old files
--
-- Data is deliberately in this separate file; 00_schema_clean.sql contains no
-- INSERT statements. This is SAMPLE data, not patient data. It is the smaller ALTERNATIVE seed;
-- scripts/setup-local-db.sh now defaults to 04_mock_data_converted.sql, which
-- was converted from the legacy hybrid "MySQL?" mock SQL. See
-- deploy/local/MYSQL_MOCK_DATA_ANALYSIS.md.
-- To load your real local database, use scripts/export-local-data.sh instead
-- (pg_dump --data-only).

-- ── team ───────────────────────────────────────────────────────────────
insert into public.team (name, role, description, imageurl, bordercolor, textcolor, "order") values
('Dr. Abebe Kebede', 'Lead Clinical Psychologist', 'Specializing in cognitive behavioral therapy with over 15 years of experience helping individuals overcome anxiety and depression.', '/uploads/team/1781276745617-504022334.jfif', 'border-fenote-500', 'text-accent', 1),
('Sara Tadesse', 'Group Therapy Facilitator', 'Passionate about creating safe spaces for shared healing and interpersonal growth through structured group sessions.', '/uploads/team/1781279226049-981768783.jfif', 'border-mint-500', 'text-mint-500', 2),
('Mikael Girma', 'Corporate Wellness Consultant', 'Bridging the gap between mental health and the workplace, offering resilience training for organizations.', '/uploads/team/1781279676876-32135996.jfif', 'border-amber-500', 'text-amber-500', 3);

-- ── blog ───────────────────────────────────────────────────────────────
insert into public.blog (title, category, issue, content, imageurl, slug) values
('Understanding Anxiety in Daily Life', 'Mental Health', 'Anxiety', 'Anxiety is a natural response to stress, but when it becomes overwhelming, it can interfere with daily activities. In this article, we explore practical steps to manage anxiety, including mindfulness techniques and when to seek professional help.', '/uploads/blogs/1781274351995-261615314.jfif', 'understanding-anxiety-daily-life'),
('The Power of Group Therapy', 'Therapy', 'Depression', 'Group therapy provides a supportive network of peers who understand your struggles. Discover how shared experiences can foster healing, reduce isolation, and provide new perspectives on managing depression.', '/uploads/blogs/1781278206642-504746773.jfif', 'power-of-group-therapy'),
('Workplace Burnout: Signs and Solutions', 'Corporate', 'Burnout', 'Chronic workplace stress can lead to physical and emotional exhaustion. Learn how to identify the early signs of burnout and implement boundaries to protect your mental well-being on the job.', '/uploads/blogs/1781278931081-652949782.jfif', 'workplace-burnout-signs-solutions')
on conflict (slug) do nothing;

-- ── resource ───────────────────────────────────────────────────────────
insert into public.resource (title, description, downloadurl, category, imageurl) values
('Anxiety Management Workbook', 'A comprehensive PDF workbook filled with CBT exercises to help you manage daily anxiety and panic attacks.', '/uploads/resources/1781276451779-850679833.pdf', 'Worksheets', '/uploads/resources/1781276451756-206436659.jfif'),
('Mindfulness Starter Guide', 'A beginner-friendly guide to incorporating mindfulness and meditation into your daily routine for stress relief.', '/uploads/resources/1781292384411-277830697.pdf', 'Guides', '/uploads/resources/1781292384410-296902575.jfif');

-- ── gallery ────────────────────────────────────────────────────────────
insert into public.gallery (imageurl, alttext, category) values
('/uploads/gallery/1781275870114-533902937.jfif', 'Fenote Clinic Reception Area', 'Clinic'),
('/uploads/gallery/1781276491566-831485656.jfif', 'Group Therapy Session in Progress', 'Events'),
('/uploads/gallery/1781279091893-595216551.jfif', 'Peaceful Therapy Room Setup', 'Clinic');

-- ── testimonial ────────────────────────────────────────────────────────
insert into public.testimonial (name, title, quote, imageurl, rate) values
('Hanna M.', 'Individual Therapy Client', 'Fenote helped me find clarity during the darkest period of my life. My therapist was incredibly patient and knowledgeable.', '/uploads/testimonials/1781276131211-856595868.jfif', 5),
('David T.', 'Corporate Wellness Client', 'The team training gave our managers practical tools to support staff mental health. Highly recommended.', '/uploads/testimonials/1781276513929-626070342.jfif', 5),
('Sara A.', 'Group Therapy Participant', 'Being able to share with people who understood made all the difference. I felt safe from the first session.', '/uploads/testimonials/1781279145371-81607924.jfif', 4);

-- ── team_members ───────────────────────────────────────────────────────
insert into public.team_members (name, role, bio, imageurl) values
('Dr. Abebe Kebede', 'Lead Clinical Psychologist', 'Dr. Abebe has dedicated his career to providing evidence-based treatments for anxiety, depression, and trauma.', '/uploads/team/1781276745617-504022334.jfif'),
('Sara Tadesse', 'Group Therapy Facilitator', 'With a background in social work and counseling, Sara brings warmth and structure to her group sessions.', '/uploads/team/1781279226049-981768783.jfif'),
('Mikael Girma', 'Corporate Wellness Consultant', 'Mikael combines organizational psychology with clinical insights to help companies build resilient teams.', '/uploads/team/1781279676876-32135996.jfif');

-- ── highlight ──────────────────────────────────────────────────────────
insert into public.highlight (title, description, image_url, category, read_more_link) values
('Mental Health Awareness Month', 'Join us this May for a series of free webinars, community events, and workshops dedicated to breaking the stigma around mental health.', '/uploads/highlights/1781276946666-849020209.jfif', 'Events', '/blog/mental-health-awareness-month'),
('New Group Therapy Cohort Starting', 'Our upcoming 8-week group therapy cohort focusing on anxiety management is now open for registration.', '/uploads/highlights/1781279048237-425842361.jfif', 'Programs', '/services/group-therapy');

-- ── services ───────────────────────────────────────────────────────────
insert into public.services (title, description, category, "order") values
('Individual Counseling', 'Evidence-based counseling tailored to children, adolescents, youth, adults, and vulnerable populations.', 'therapy', 1),
('Group Counseling', 'Professionally facilitated sessions bringing together individuals facing similar challenges.', 'therapy', 2),
('Family Counseling', 'Engaging parents, children, and family members to strengthen communication and family cohesion.', 'therapy', 3),
('Virtual Counseling', 'Secure virtual counseling through video conferencing, providing the same professional, ethical, and confidential care.', 'therapy', 4),
('Telephone Consultation', 'Short-term psychological guidance and emotional support for urgent or follow-up needs.', 'therapy', 5),
('Training Packages (Therapy)', 'Structured training equipping children, youth, and adults with life skills and psychological first aid.', 'training', 6),
('Relationship Coaching', 'Insights and strategies to foster healthy connections, resolve conflicts, and enhance communication skills.', 'coaching', 7),
('Training & Workshops', 'Life skills, personal development, psychological first aid, positive parenting, and organizational training.', 'training', 8),
('Career Counseling & OD', 'Career counseling and organizational development programs that align individual growth with company goals.', 'corporate', 9);

-- ── client ─────────────────────────────────────────────────────────────
insert into public.client (imageurl) values
('/uploads/clients/1781431845001-2398594.jfif'),
('/uploads/clients/1781431882069-852086337.jfif'),
('/uploads/clients/1781503149689-858370713.png');

-- ── hero_slide ─────────────────────────────────────────────────────────
insert into public.hero_slide (imageurl) values
('/uploads/carousel/1781540437741-842094321.png'),
('/uploads/carousel/1781540479533-816607987.png');

-- ── singleton rows ─────────────────────────────────────────────────────
insert into public.contact (map_embed_url)
select '' where not exists (select 1 from public.contact);

insert into public.hero_content (title_quote, below_lines)
select E'Restoring\nBalance In Life', E'We are professionals dedicated to your recovery.\nMental wellness is our top priority.\nPersonalized care. Compassion. Expertise.'
where not exists (select 1 from public.hero_content);

insert into public.about (title1, title2, desc1, desc2, years_experience, clients_served)
select 'About', 'Fenote Psych', 'Fenote Psychological Services provides compassionate, evidence-based mental health care in Addis Ababa.', 'Our team combines clinical expertise with a deep understanding of the communities we serve.', 12, 500
where not exists (select 1 from public.about);

insert into public.payment_settings (cbe_account, cbe_swift, telebirr_account)
select '1000193681917', 'CBETETAA', '0906851567'
where not exists (select 1 from public.payment_settings);

insert into public.payment_packages (region, package_key, duration, price, registration_fee) values
('local', 'individual', '60 min', '2,000 Birr', '400 Birr'),
('local', 'couple', '90 min', '2,500 Birr', '400 Birr'),
('local', 'family', '130 min', '3,000 Birr', '400 Birr'),
('local', 'training', 'Varies', 'Varies', 'Included'),
('local', 'phone', '60 min', '1,400 Birr', 'Included'),
('international', 'individual', '70 min', '35 USD', 'Included'),
('international', 'couple', '90 min', '45 USD', 'Included'),
('international', 'family', '130 min', '50 USD', 'Included');

-- ── notifications ──────────────────────────────────────────────────────
insert into public.notifications (type, title, message, is_read) values
('booking', 'New Booking Request', 'A new appointment has been requested.', false),
('system', 'System Update Successful', 'The clinic management system was updated successfully.', true);

-- ── sample bookings (fake data — replace with your real pg_dump) ─────────
insert into public.bookings (patient_name, patient_email, patient_phone, appointment_date, appointment_time, reason, status, notes, form_data) values
('Sample Client A', 'sample.a@example.com', '+251 911 000 001', '2026-11-10 10:00:00', '10:00 AM', 'Follow-up session', 'pending', 'Sample row.', '{"source":"seed"}'::jsonb),
('Sample Client B', 'sample.b@example.com', '+251 911 000 002', '2026-11-11 02:00:00', '02:00 PM', 'Corporate consultation', 'confirmed', 'Sample row.', '{"source":"seed"}'::jsonb);

-- ── keep sequences in sync with inserted rows ───────────────────────────
select setval(pg_get_serial_sequence('public.about', 'id'), coalesce((select max(id) from public.about), 1), true);
select setval(pg_get_serial_sequence('public.blog', 'id'), coalesce((select max(id) from public.blog), 1), true);
select setval(pg_get_serial_sequence('public.bookings', 'id'), coalesce((select max(id) from public.bookings), 1), true);
select setval(pg_get_serial_sequence('public.client', 'id'), coalesce((select max(id) from public.client), 1), true);
select setval(pg_get_serial_sequence('public.contact', 'id'), coalesce((select max(id) from public.contact), 1), true);
select setval(pg_get_serial_sequence('public.gallery', 'id'), coalesce((select max(id) from public.gallery), 1), true);
select setval(pg_get_serial_sequence('public.hero_content', 'id'), coalesce((select max(id) from public.hero_content), 1), true);
select setval(pg_get_serial_sequence('public.hero_slide', 'id'), coalesce((select max(id) from public.hero_slide), 1), true);
select setval(pg_get_serial_sequence('public.highlight', 'id'), coalesce((select max(id) from public.highlight), 1), true);
select setval(pg_get_serial_sequence('public.notifications', 'id'), coalesce((select max(id) from public.notifications), 1), true);
select setval(pg_get_serial_sequence('public.payment_packages', 'id'), coalesce((select max(id) from public.payment_packages), 1), true);
select setval(pg_get_serial_sequence('public.payment_settings', 'id'), coalesce((select max(id) from public.payment_settings), 1), true);
select setval(pg_get_serial_sequence('public.resource', 'id'), coalesce((select max(id) from public.resource), 1), true);
select setval(pg_get_serial_sequence('public.services', 'id'), coalesce((select max(id) from public.services), 1), true);
select setval(pg_get_serial_sequence('public.team', 'id'), coalesce((select max(id) from public.team), 1), true);
select setval(pg_get_serial_sequence('public.team_members', 'id'), coalesce((select max(id) from public.team_members), 1), true);
select setval(pg_get_serial_sequence('public.testimonial', 'id'), coalesce((select max(id) from public.testimonial), 1), true);
