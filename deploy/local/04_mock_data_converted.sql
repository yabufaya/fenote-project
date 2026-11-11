-- Converted MOCK data from the repository's legacy SQL files.
-- Sources (recovered from git HEAD; deleted from the current patch):
--   server/database-schema.sql              (main schema + mock data)
--   admin-app/backend/database-schema.sql  (subset of the same mock data)
--   admin-app/backend/admin-schema.sql     (users/notifications/bookings only)
--   admin-app/backend/update-password.sql  (plaintext password update)
--
-- Those files were NOT pure MySQL: they mixed MySQL-only
--   CREATE DATABASE IF NOT EXISTS / USE
-- with PostgreSQL-only SERIAL, JSONB, ON CONFLICT, BOOLEAN, "order",
-- NOW(), CREATE INDEX IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.
--
-- This file contains DATA ONLY. The schema file is CREATE-only and contains no
-- mock rows. Run it AFTER deploy/supabase/00_schema_clean.sql
-- on a fresh local database. It deliberately does NOT:
--   * create/drop databases or tables,
--   * include the legacy public.users table or any default admin credential,
--   * run destructive DROP TABLE statements,
--   * use the invalid contact(address, phone, email, hours, ...) insert.
--
-- Column names are mapped to the canonical lowercase PostgreSQL schema
-- (imageUrl -> imageurl, borderColor -> bordercolor, altText -> alttext, ...).
-- ../public/uploads/* paths that do not exist are mapped to the 38 committed
-- files under admin-app/backend/public/uploads, exposed as /uploads/*.
--
-- This is MOCK data, not a production pg_dump --data-only. See
-- deploy/local/MYSQL_MOCK_DATA_ANALYSIS.md and deploy/local/README.md.

begin;

-- Refuse to duplicate rows on a non-empty database.
do $$
begin
  if exists (select 1 from public.team) then
    raise exception 'Refusing to seed: public.team already has rows. Use scripts/setup-local-db.sh (it drops/recreates the local DB) or a fresh database.';
  end if;
end $$;

insert into public.team (name, role, description, imageurl, bordercolor, textcolor, "order") values
('Dr. Abebe Kebede', 'Lead Clinical Psychologist', 'Specializing in cognitive behavioral therapy with over 15 years of experience helping individuals overcome anxiety and depression.', '/uploads/team/1781276745617-504022334.jfif', 'border-fenote-500', 'text-accent', 1),
('Sara Tadesse', 'Group Therapy Facilitator', 'Passionate about creating safe spaces for shared healing and interpersonal growth through structured group sessions.', '/uploads/team/1781279226049-981768783.jfif', 'border-mint-500', 'text-mint-500', 2),
('Mikael Girma', 'Corporate Wellness Consultant', 'Bridging the gap between mental health and the workplace, offering resilience training for organizations.', '/uploads/team/1781279676876-32135996.jfif', 'border-amber-500', 'text-amber-500', 3);

insert into public.blog (title, category, issue, content, imageurl, slug) values
('Understanding Anxiety in Daily Life', 'Mental Health', 'Anxiety', 'Anxiety is a natural response to stress, but when it becomes overwhelming, it can interfere with daily activities. In this article, we explore practical steps to manage anxiety, including mindfulness techniques and when to seek professional help.', '/uploads/blogs/1781274351995-261615314.jfif', 'understanding-anxiety-daily-life'),
('The Power of Group Therapy', 'Therapy', 'Depression', 'Group therapy provides a supportive network of peers who understand your struggles. Discover how shared experiences can foster healing, reduce isolation, and provide new perspectives on managing depression.', '/uploads/blogs/1781278206642-504746773.jfif', 'power-of-group-therapy'),
('Workplace Burnout: Signs and Solutions', 'Corporate', 'Burnout', 'Chronic workplace stress can lead to physical and emotional exhaustion. Learn how to identify the early signs of burnout and implement boundaries to protect your mental well-being on the job.', '/uploads/blogs/1781278931081-652949782.jfif', 'workplace-burnout-signs-solutions')
on conflict (slug) do nothing;

insert into public.resource (title, description, downloadurl, category, imageurl) values
('Anxiety Management Workbook', 'A comprehensive PDF workbook filled with CBT exercises to help you manage daily anxiety and panic attacks.', '/uploads/resources/1781276451779-850679833.pdf', 'Worksheets', '/uploads/resources/1781276451756-206436659.jfif'),
('Mindfulness Starter Guide', 'A beginner-friendly guide to incorporating mindfulness and meditation into your daily routine for stress relief.', '/uploads/resources/1781292384411-277830697.pdf', 'Guides', '/uploads/resources/1781292384410-296902575.jfif'),
('Corporate Wellness Checklist', 'A quick checklist for HR and management to evaluate and improve the mental health culture in their organization.', '/uploads/resources/1781276451779-850679833.pdf', 'Corporate', '/uploads/resources/1781292384410-296902575.jfif');

insert into public.gallery (imageurl, alttext, category, video_url) values
('/uploads/gallery/1781275870114-533902937.jfif', 'Fenote Clinic Reception Area', 'Clinic', null),
('/uploads/gallery/1781276491566-831485656.jfif', 'Group Therapy Session in Progress', 'Events', null),
('/uploads/gallery/1781279091893-595216551.jfif', 'Peaceful Therapy Room Setup', 'Clinic', null);

insert into public.testimonial (name, title, quote, imageurl, rate) values
('Hanna M.', 'Individual Therapy Client', 'Fenote helped me find clarity during the darkest period of my life. My therapist was incredibly empathetic and professional. I finally feel like myself again.', '/uploads/testimonials/1781276131211-856595868.jfif', 5),
('David T.', 'Corporate Client', 'The corporate wellness workshop completely shifted how our team handles stress. Highly recommended for any organization looking to support their employees.', '/uploads/testimonials/1781276513929-626070342.jfif', 5),
('Sara A.', 'Group Therapy Participant', 'Being in a room with people who truly understood my struggles was life-changing. The facilitator was amazing at guiding our conversations.', '/uploads/testimonials/1781279145371-81607924.jfif', 4);

insert into public.team_members (name, role, bio, imageurl) values
('Dr. Abebe Kebede', 'Lead Clinical Psychologist', 'Dr. Abebe has dedicated his career to providing evidence-based treatments for anxiety, depression, and trauma. He believes in a collaborative approach to therapy, empowering clients to reclaim their mental health.', '/uploads/team/1781276745617-504022334.jfif'),
('Sara Tadesse', 'Group Therapy Facilitator', 'With a background in social work and counseling, Sara brings warmth and structure to her group sessions. She specializes in interpersonal dynamics and grief support.', '/uploads/team/1781279226049-981768783.jfif'),
('Mikael Girma', 'Corporate Wellness Consultant', 'Mikael combines organizational psychology with clinical insights to help companies build resilient, healthy work environments. He is a frequent speaker at HR leadership summits.', '/uploads/team/1781279676876-32135996.jfif');

insert into public.highlight (title, description, image_url, category, read_more_link) values
('Mental Health Awareness Month', 'Join us this May for a series of free webinars, community events, and workshops dedicated to breaking the stigma around mental health.', '/uploads/highlights/1781276946666-849020209.jfif', 'Events', '/blog/mental-health-awareness-month'),
('New Group Therapy Cohort Starting', 'Our upcoming 8-week group therapy cohort focusing on anxiety management is now open for registration. Reserve your spot today.', '/uploads/highlights/1781279048237-425842361.jfif', 'Programs', '/services/group-therapy'),
('Opening of Our New Bole Branch', 'We are thrilled to announce the opening of our second location in Bole, making our services more accessible to the community.', '/uploads/highlights/1781279486354-277204473.jfif', 'News', '/about#locations');

insert into public.services (title, description, category, "order") values
('Individual Counseling', 'Evidence-based counseling tailored to children, adolescents, youth, adults, and vulnerable populations. One-on-one sessions addressing personal, emotional, behavioral, and psychological challenges.', 'therapy', 1),
('Group Counseling', 'Professionally facilitated sessions bringing together individuals facing similar challenges, promoting peer support, shared learning, and social skill development.', 'therapy', 2),
('Family Counseling', 'Engaging parents, children, and family members to strengthen communication, collaborative problem-solving, and overall family cohesion.', 'therapy', 3),
('Virtual Counseling', 'Secure virtual counseling through video conferencing, providing the same professional, ethical, and confidential care as in-person sessions.', 'therapy', 4),
('Telephone Consultation', 'Short-term psychological guidance and emotional support for urgent or follow-up needs, ensuring accessibility and timely assistance.', 'therapy', 5),
('Training Packages (Therapy)', 'Structured training equipping children, youth, and adults with life skills, psychological first aid, positive parenting, and MHPSS.', 'training', 6),
('Relationship Coaching', 'Insights and strategies to foster healthy connections, resolve conflicts, and enhance communication skills in personal or professional relationships.', 'coaching', 7),
('Training & Workshops', 'Life skills, personal development, psychological first aid, positive parenting, youth development, and organizational training programs.', 'training', 8),
('Career Counseling & OD', 'Career counseling and organizational development programs that align individual growth with company goals, maximizing efficiency and effectiveness.', 'corporate', 9);

insert into public.client (imageurl) values
('/uploads/clients/1781431845001-2398594.jfif'),
('/uploads/clients/1781431882069-852086337.jfif'),
('/uploads/clients/1781503149689-858370713.png');

insert into public.hero_slide (imageurl) values
('/uploads/carousel/1781540437741-842094321.png'),
('/uploads/carousel/1781540479533-816607987.png'),
('/uploads/carousel/1781540510331-52746063.png');

-- ── singleton rows (idempotent on a fresh DB) ──────────────────────────
insert into public.contact (map_embed_url, full_address, full_phone, full_email)
select '', E'Bole, Addis Ababa, Ethiopia\n3rd Floor, Atlas Building', '+251 906 851 567', 'info@fenotepsych.com'
where not exists (select 1 from public.contact);

insert into public.hero_content (title_quote, below_lines)
select E'Restoring\nBalance In Life', E'We are professionals dedicated to your recovery.\nMental wellness is our top priority.\nPersonalized care. Compassion. Expertise.'
where not exists (select 1 from public.hero_content);

insert into public.about (title1, title2, desc1, desc2, years_experience, clients_served)
select 'About', 'Fenote Psych', 'Default desc 1', 'Default desc 2', 12, 500
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

insert into public.notifications (type, title, message, is_read) values
('booking', 'New Booking Request', 'A new appointment has been requested by Hanna M. for tomorrow at 10:00 AM.', false),
('feedback', 'New Testimonial Submitted', 'David T. has submitted a 5-star review regarding the Corporate Wellness program.', false),
('system', 'System Update Successful', 'The clinic management system was successfully updated to the latest version.', true);

insert into public.bookings (patient_name, patient_email, patient_phone, appointment_date, appointment_time, reason, status, notes, form_data) values
('Hanna M.', 'hanna.m@example.com', '+251 911 234 567', (current_date + interval '10 hours')::timestamp, '10:00 AM', 'Follow-up session for anxiety management', 'confirmed', 'Client prefers morning sessions.', '{"source":"converted_mock"}'::jsonb),
('David T.', 'david.t@corporate.com', '+251 922 345 678', (current_date + interval '14 hours')::timestamp, '02:00 PM', 'Corporate consultation', 'pending', 'Wants to discuss packages for a team of 50.', '{"source":"converted_mock"}'::jsonb),
('Sara A.', 'sara.a@example.com', '+251 933 456 789', (current_date + interval '11 hours')::timestamp, '11:00 AM', 'Group therapy session', 'confirmed', 'First-time participant.', '{"source":"converted_mock"}'::jsonb);

-- ── subscribers / contact messages / campaign drafts (mock data) ─────────
insert into public.subscribers (email) values
('hanna.m@example.com'), ('david.t@corporate.com'), ('sara.a@example.com'), ('info@fenotepsych.com');

insert into public.contact_messages (name, email, message, is_read) values
('Selam A.', 'selam.a@example.com', 'Hello, I would like to ask about individual therapy availability.', false),
('Robel T.', 'robel.t@example.com', 'Do you offer corporate wellness sessions for a team of 20?', false),
('Marta G.', 'marta.g@example.com', 'Thank you for the mindfulness resources.', true);

insert into public.messages (subject, body, status, sent_at) values
('May wellness newsletter', 'This is a saved draft. The later Gmail automation can send it to all subscribers.', 'draft', null),
('New group therapy schedule', 'Queued for the subscriber group; no external email is sent by this local patch.', 'queued', null);

insert into public.message_recipients (message_id, subscriber_id, email, status)
select m.id, s.id, s.email, case when m.status = 'queued' then 'queued' else 'draft' end
from public.messages m cross join public.subscribers s
on conflict (message_id, subscriber_id) do nothing;

insert into public.notifications (type, title, message, is_read, related_type, related_id) values
('message', 'New contact message', 'Selam A. sent a message from the website.', false, 'contact_message', 1),
('campaign', 'Subscriber message queued', 'New group therapy schedule was queued for 4 subscribers.', false, 'message', 2);

-- ── admin profiles (local test only; no password/hash) ─────────────────
insert into public.admin_profiles (email, role, is_active) values
('superadmin@fenote.test', 'superadmin', true),
('admin@fenote.test', 'admin', true);

-- ── keep sequences in sync with inserted rows ───────────────────────────

select setval(pg_get_serial_sequence('public.admin_profiles', 'id'), coalesce((select max(id) from public.admin_profiles), 1), true);

select setval(pg_get_serial_sequence('public.about', 'id'), coalesce((select max(id) from public.about), 1), true);

select setval(pg_get_serial_sequence('public.blog', 'id'), coalesce((select max(id) from public.blog), 1), true);

select setval(pg_get_serial_sequence('public.bookings', 'id'), coalesce((select max(id) from public.bookings), 1), true);

select setval(pg_get_serial_sequence('public.subscribers', 'id'), coalesce((select max(id) from public.subscribers), 1), true);
select setval(pg_get_serial_sequence('public.contact_messages', 'id'), coalesce((select max(id) from public.contact_messages), 1), true);
select setval(pg_get_serial_sequence('public.messages', 'id'), coalesce((select max(id) from public.messages), 1), true);
select setval(pg_get_serial_sequence('public.message_recipients', 'id'), coalesce((select max(id) from public.message_recipients), 1), true);

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

commit;
