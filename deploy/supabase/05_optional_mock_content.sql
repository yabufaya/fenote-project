-- OPTIONAL hosted-Supabase mock content seed, for a visual check only.
-- Run in Supabase SQL Editor AFTER 00_schema_clean.sql and BEFORE 01_rls.sql,
-- on a fresh/empty database. This file contains DATA ONLY: no CREATE/DROP,
-- no service-role key, no Auth accounts, no admin_profiles rows, no patient
-- bookings/PII, no subscribers/messages/notifications. It is MOCK content, not
-- a production pg_dump --data-only. Delete/ignore it when you add real content.
--
-- Every public content row ships with an `en` / `am` translations JSONB object.
-- The public API overlays those values when the visitor clicks the EN / AM
-- language button. Internal filter keys such as category, region and
-- package_key stay in English so existing filters keep working.
--
-- Mock images now use three PUBLIC Supabase Storage URLs on the new project:
--   hero slides + About  -> logo.png
--   blog + highlights    -> blog.jfif
--   doctors / team       -> doc.jfif
-- Resources and Gallery are intentionally EMPTY for owner-supplied content.
-- This is a FRESH-ONLY seed. There is no separate existing-database migration.
-- Working hours are admin-controlled in the booking availability screen; this
-- seed does not hardcode exact bilingual opening-hours display wording.
--
-- Do NOT run deploy/local/02_seed.sql or 04_mock_data_converted.sql directly in
-- hosted SQL Editor: the latter inserts fake admin_profiles and the former
-- includes fake bookings with patient-like PII. This file is the safe subset.

begin;

-- Refuse to duplicate rows on a non-empty content database.
do $$
begin
  if exists (select 1 from public.team) then
    raise exception 'Refusing to seed: public.team already has rows. Use a fresh database, or remove this guard only if you know what you are doing.';
  end if;
end $$;
-- ── team ───────────────────────────────────────────────────────────────
insert into public.team (name, role, description, imageurl, bordercolor, textcolor, "order", translations) values
('Dr. Abebe Kebede', 'Lead Clinical Psychologist', 'Specializing in cognitive behavioral therapy with over 15 years of experience helping individuals overcome anxiety and depression.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/doc.jfif', 'border-fenote-500', 'text-accent', 1, jsonb_build_object('en', jsonb_build_object('name', 'Dr. Abebe Kebede', 'role', 'Lead Clinical Psychologist', 'description', 'Specializing in cognitive behavioral therapy with over 15 years of experience helping individuals overcome anxiety and depression.'), 'am', jsonb_build_object('name', 'ዶ/ር አበበ ከበደ', 'role', 'ዋና ክሊኒካዊ የሥነ-ልቦና ባለሙያ', 'description', 'ጭንቀትና ድብርትን ለማሸነፍ ሰዎችን በመርዳት ከ15 ዓመታት በላይ ልምድ ያለው፣ በግንዛቤ-ባህሪ ቴራፒ ላይ የተካነ ባለሙያ።'))::jsonb),
('Sara Tadesse', 'Group Therapy Facilitator', 'Passionate about creating safe spaces for shared healing and interpersonal growth through structured group sessions.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/doc.jfif', 'border-mint-500', 'text-mint-500', 2, jsonb_build_object('en', jsonb_build_object('name', 'Sara Tadesse', 'role', 'Group Therapy Facilitator', 'description', 'Passionate about creating safe spaces for shared healing and interpersonal growth through structured group sessions.'), 'am', jsonb_build_object('name', 'ሳራ ታደሰ', 'role', 'የቡድን ቴራፒ አመቻች', 'description', 'በተዋቀሩ የቡድን ክፍለ-ጊዜዎች የጋራ ፈውስና የግለሰቦች ግንኙነት እድገት ደህንነቱ የተጠበቀ ቦታ በመፍጠር ትኩረት ታደርጋለች።'))::jsonb),
('Mikael Girma', 'Corporate Wellness Consultant', 'Bridging the gap between mental health and the workplace, offering resilience training for organizations.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/doc.jfif', 'border-amber-500', 'text-amber-500', 3, jsonb_build_object('en', jsonb_build_object('name', 'Mikael Girma', 'role', 'Corporate Wellness Consultant', 'description', 'Bridging the gap between mental health and the workplace, offering resilience training for organizations.'), 'am', jsonb_build_object('name', 'ሚካኤል ግርማ', 'role', 'የድርጅታዊ ደህንነት አማካሪ', 'description', 'በአእምሮ ጤናና በሥራ ቦታ መካከል ያለውን ክፍተት በማስተሳሰር ለድርጅቶች የመቋቋም ችሎታ ሥልጠና ይሰጣል።'))::jsonb);

-- ── blog ───────────────────────────────────────────────────────────────
insert into public.blog (title, category, issue, content, imageurl, slug, translations) values
('Understanding Anxiety in Daily Life', 'Mental Health', 'Anxiety', 'Anxiety is a natural response to stress, but when it becomes overwhelming, it can interfere with daily activities. In this article, we explore practical steps to manage anxiety, including mindfulness techniques and when to seek professional help.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif', 'understanding-anxiety-daily-life', jsonb_build_object('en', jsonb_build_object('title', 'Understanding Anxiety in Daily Life', 'category', 'Mental Health', 'issue', 'Anxiety', 'content', 'Anxiety is a natural response to stress, but when it becomes overwhelming, it can interfere with daily activities. In this article, we explore practical steps to manage anxiety, including mindfulness techniques and when to seek professional help.'), 'am', jsonb_build_object('title', 'በዕለት ተዕለት ሕይወት ውስጥ ጭንቀትን መረዳት', 'category', 'የአእምሮ ጤና', 'issue', 'ጭንቀት', 'content', 'ጭንቀት ለውጥረት ተፈጥሯዊ ምላሽ ነው፤ ነገር ግን ከመጠን በላይ ሲሆን የዕለት ተዕለት እንቅስቃሴን ሊያስተጓጉል ይችላል። በዚህ ጽሑፍ ጭንቀትን ለመቆጣጠር የሚረዱ ተግባራዊ እርምጃዎችን፣ የንቃተ-ህሊና ዘዴዎችንና የባለሙያ እርዳታ መቼ መጠየቅ እንዳለብን እንመለከታለን።'))::jsonb),
('The Power of Group Therapy', 'Therapy', 'Depression', 'Group therapy provides a supportive network of peers who understand your struggles. Discover how shared experiences can foster healing, reduce isolation, and provide new perspectives on managing depression.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif', 'power-of-group-therapy', jsonb_build_object('en', jsonb_build_object('title', 'The Power of Group Therapy', 'category', 'Therapy', 'issue', 'Depression', 'content', 'Group therapy provides a supportive network of peers who understand your struggles. Discover how shared experiences can foster healing, reduce isolation, and provide new perspectives on managing depression.'), 'am', jsonb_build_object('title', 'የቡድን ቴራፒ ኃይል', 'category', 'ቴራፒ', 'issue', 'ድብርት', 'content', 'የቡድን ቴራፒ ችግርዎን የሚረዱ እኩዮች ደጋፊ መረብ ይፈጥራል። የጋራ ተሞክሮ ፈውስን እንዴት እንደሚያበረታታ፣ ብቸኝነትን እንደሚቀንስና ድብርትን ለመቆጣጠር አዳዲስ አመለካከቶችን እንደሚሰጥ ይወቁ።'))::jsonb),
('Workplace Burnout: Signs and Solutions', 'Corporate', 'Burnout', 'Chronic workplace stress can lead to physical and emotional exhaustion. Learn how to identify the early signs of burnout and implement boundaries to protect your mental well-being on the job.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif', 'workplace-burnout-signs-solutions', jsonb_build_object('en', jsonb_build_object('title', 'Workplace Burnout: Signs and Solutions', 'category', 'Corporate', 'issue', 'Burnout', 'content', 'Chronic workplace stress can lead to physical and emotional exhaustion. Learn how to identify the early signs of burnout and implement boundaries to protect your mental well-being on the job.'), 'am', jsonb_build_object('title', 'የሥራ ቦታ ድካም፡ ምልክቶችና መፍትሔዎች', 'category', 'ድርጅታዊ', 'issue', 'የሥራ ድካም', 'content', 'ሥር የሰደደ የሥራ ውጥረት ወደ አካላዊና ስሜታዊ ድካም ሊያመራ ይችላል። የድካሙን ቀደምት ምልክቶች ለይቶ ማወቅና በሥራ ቦታ የአእምሮ ደህንነትዎን ለመጠበቅ ወሰኖችን መዘርጋት ይማሩ።'))::jsonb)
on conflict (slug) do nothing;

-- ── resource / gallery ──────────────────────────────────────────────────
-- Intentionally EMPTY. The owner injects real resources and gallery images
-- from the admin panel after the fresh database is created.

-- ── highlight ───────────────────────────────────────────────────────────────
insert into public.highlight (title, description, image_url, category, read_more_link, translations) values
('Mental Health Awareness Month', 'Join us this May for a series of free webinars, community events, and workshops dedicated to breaking the stigma around mental health.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif', 'Events', '/blog/mental-health-awareness-month', jsonb_build_object('en', jsonb_build_object('title', 'Mental Health Awareness Month', 'description', 'Join us this May for a series of free webinars, community events, and workshops dedicated to breaking the stigma around mental health.', 'category', 'Events'), 'am', jsonb_build_object('title', 'የአእምሮ ጤና ግንዛቤ ወር', 'description', 'በዚህ ግንቦት የአእምሮ ጤናን መገለል ለመስበር በተዘጋጁ ነፃ ዌቢናሮች፣ የማህበረሰብ ዝግጅቶችና አውደ ጥናቶች ላይ ይቀላቀሉን።', 'category', 'ዝግጅቶች'))::jsonb),
('New Group Therapy Cohort Starting', 'Our upcoming 8-week group therapy cohort focusing on anxiety management is now open for registration.', 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif', 'Programs', '/services/group-therapy', jsonb_build_object('en', jsonb_build_object('title', 'New Group Therapy Cohort Starting', 'description', 'Our upcoming 8-week group therapy cohort focusing on anxiety management is now open for registration.', 'category', 'Programs'), 'am', jsonb_build_object('title', 'አዲስ የቡድን ቴራፒ ቡድን ይጀምራል', 'description', 'በጭንቀት አስተዳደር ላይ የሚያተኩረው የ8 ሳምንታት የቡድን ቴራፒ ቡድናችን ለምዝገባ ክፍት ሆኗል።', 'category', 'ፕሮግራሞች'))::jsonb);

-- ── services ───────────────────────────────────────────────────────────────
insert into public.services (title, description, category, "order", translations) values
('Individual Counseling', 'Evidence-based counseling tailored to children, adolescents, youth, adults, and vulnerable populations.', 'therapy', 1, jsonb_build_object('en', jsonb_build_object('title', 'Individual Counseling', 'description', 'Evidence-based counseling tailored to children, adolescents, youth, adults, and vulnerable populations.'), 'am', jsonb_build_object('title', 'የግለሰብ ምክር አገልግሎት', 'description', 'ለህፃናት፣ ለጎረምሶች፣ ለወጣቶች፣ ለአዋቂዎችና ለተጋላጭ ቡድኖች በተበጀ፣ በማስረጃ ላይ የተመሠረተ ምክር አገልግሎት።'))::jsonb),
('Group Counseling', 'Professionally facilitated sessions bringing together individuals facing similar challenges.', 'therapy', 2, jsonb_build_object('en', jsonb_build_object('title', 'Group Counseling', 'description', 'Professionally facilitated sessions bringing together individuals facing similar challenges.'), 'am', jsonb_build_object('title', 'የቡድን ምክር አገልግሎት', 'description', 'ተመሳሳይ ችግሮች ያጋጠሟቸውን ግለሰቦች በሙያዊ አመቻችነት የሚያገናኙ ክፍለ-ጊዜዎች።'))::jsonb),
('Family Counseling', 'Engaging parents, children, and family members to strengthen communication and family cohesion.', 'therapy', 3, jsonb_build_object('en', jsonb_build_object('title', 'Family Counseling', 'description', 'Engaging parents, children, and family members to strengthen communication and family cohesion.'), 'am', jsonb_build_object('title', 'የቤተሰብ ምክር አገልግሎት', 'description', 'ወላጆችን፣ ልጆችንና የቤተሰብ አባላትን በማሳተፍ ግንኙነትንና የቤተሰብ አንድነትን ማጠናከር።'))::jsonb),
('Virtual Counseling', 'Secure virtual counseling through video conferencing, providing the same professional, ethical, and confidential care.', 'therapy', 4, jsonb_build_object('en', jsonb_build_object('title', 'Virtual Counseling', 'description', 'Secure virtual counseling through video conferencing, providing the same professional, ethical, and confidential care.'), 'am', jsonb_build_object('title', 'የርቀት ምክር አገልግሎት', 'description', 'በቪዲዮ ጥሪ ደህንነቱ የተጠበቀ፣ ተመሳሳይ ሙያዊ፣ ሥነ-ምግባራዊና ሚስጥራዊ እንክብካቤ የሚሰጥ የርቀት ምክር።'))::jsonb),
('Telephone Consultation', 'Short-term psychological guidance and emotional support for urgent or follow-up needs.', 'therapy', 5, jsonb_build_object('en', jsonb_build_object('title', 'Telephone Consultation', 'description', 'Short-term psychological guidance and emotional support for urgent or follow-up needs.'), 'am', jsonb_build_object('title', 'የስልክ ምክክር', 'description', 'ለአስቸኳይ ወይም ለክትትል ፍላጎቶች የሚሰጥ የአጭር ጊዜ የሥነ-ልቦና መመሪያና ስሜታዊ ድጋፍ።'))::jsonb),
('Training Packages (Therapy)', 'Structured training equipping children, youth, and adults with life skills and psychological first aid.', 'training', 6, jsonb_build_object('en', jsonb_build_object('title', 'Training Packages (Therapy)', 'description', 'Structured training equipping children, youth, and adults with life skills and psychological first aid.'), 'am', jsonb_build_object('title', 'የሥልጠና ፓኬጆች (ቴራፒ)', 'description', 'ለህፃናት፣ ለወጣቶችና ለአዋቂዎች የሕይወት ክህሎትና የመጀመሪያ የሥነ-ልቦና እርዳታን የሚሰጥ የተዋቀረ ሥልጠና።'))::jsonb),
('Relationship Coaching', 'Insights and strategies to foster healthy connections, resolve conflicts, and enhance communication skills.', 'coaching', 7, jsonb_build_object('en', jsonb_build_object('title', 'Relationship Coaching', 'description', 'Insights and strategies to foster healthy connections, resolve conflicts, and enhance communication skills.'), 'am', jsonb_build_object('title', 'የግንኙነት ስልጠና', 'description', 'ጤናማ ግንኙነቶችን ለመገንባት፣ ግጭቶችን ለመፍታትና የመግባቢያ ክህሎትን ለማሻሻል ግንዛቤዎችና ስልቶች።'))::jsonb),
('Training & Workshops', 'Life skills, personal development, psychological first aid, positive parenting, and organizational training.', 'training', 8, jsonb_build_object('en', jsonb_build_object('title', 'Training & Workshops', 'description', 'Life skills, personal development, psychological first aid, positive parenting, and organizational training.'), 'am', jsonb_build_object('title', 'ሥልጠናዎችና አውደ ጥናቶች', 'description', 'የሕይወት ክህሎት፣ የግል እድገት፣ የመጀመሪያ የሥነ-ልቦና እርዳታ፣ አዎንታዊ ወላጅነትና ድርጅታዊ ሥልጠና።'))::jsonb),
('Career Counseling & OD', 'Career counseling and organizational development programs that align individual growth with company goals.', 'corporate', 9, jsonb_build_object('en', jsonb_build_object('title', 'Career Counseling & OD', 'description', 'Career counseling and organizational development programs that align individual growth with company goals.'), 'am', jsonb_build_object('title', 'የሙያ ምክርና ድርጅታዊ ልማት', 'description', 'የግለሰብ እድገትን ከድርጅት ግቦች ጋር የሚያስተሳስሩ የሙያ ምክርና የድርጅታዊ ልማት ፕሮግራሞች።'))::jsonb);

-- ── client ───────────────────────────────────────────────────────────────
-- Image-only trusted-company rows. Headings come from static EN/AM labels.
insert into public.client (imageurl) values
('https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif'),
('https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif'),
('https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/blog.jfif');

-- ── hero_slide ───────────────────────────────────────────────────────────────
-- Image-only carousel rows; no titles or other specifications.
insert into public.hero_slide (imageurl) values
('https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/logo.png'),
('https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/logo.png');

-- ── singleton rows ─────────────────────────────────────────────────────
insert into public.contact (map_embed_url, translations)
select '', jsonb_build_object('en', jsonb_build_object('loc_title', 'Addis Ababa, Ethiopia', 'loc_subtitle', 'Fenote Psychological Services', 'phone_title', 'Telephone Consultation', 'phone_subtitle', 'Available for urgent support', 'email_title', 'info@fenotepsych.com', 'email_subtitle', 'We respond within 24 hours', 'hours_title', 'Mon - Fri 8:00 AM - 6:00 PM', 'hours_subtitle', 'Virtual & in-person sessions', 'full_address', 'Bole, Addis Ababa, Ethiopia
3rd Floor, Atlas Building', 'mon_hours', '8:00 - 19:00', 'tue_hours', '8:00 - 19:00', 'wed_hours', '8:00 - 19:00', 'thu_hours', '8:00 - 19:00', 'fri_hours', '8:00 - 19:00', 'sat_hours', '8:00 - 17:00', 'sun_hours', 'Closed'), 'am', jsonb_build_object('loc_title', 'አዲስ አበባ፣ ኢትዮጵያ', 'loc_subtitle', 'የፈኖተ የሥነ-ልቦና አገልግሎት', 'phone_title', 'የስልክ ምክክር', 'phone_subtitle', 'ለአስቸኳይ ድጋፍ ዝግጁ', 'email_title', 'info@fenotepsych.com', 'email_subtitle', 'በ24 ሰዓት ውስጥ ምላሽ እንሰጣለን', 'hours_title', '', 'hours_subtitle', '', 'full_address', 'ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ
3ኛ ፎቅ፣ አትላስ ሕንፃ', 'mon_hours', '', 'tue_hours', '', 'wed_hours', '', 'thu_hours', '', 'fri_hours', '', 'sat_hours', '', 'sun_hours', ''))::jsonb
where not exists (select 1 from public.contact);

insert into public.hero_content (title_quote, below_lines, translations)
select E'Restoring\nBalance In Life', E'We are professionals dedicated to your recovery.\nMental wellness is our top priority.\nPersonalized care. Compassion. Expertise.',
       jsonb_build_object(
         'en', jsonb_build_object('title_quote', E'Restoring\nBalance In Life', 'below_lines', E'We are professionals dedicated to your recovery.\nMental wellness is our top priority.\nPersonalized care. Compassion. Expertise.'),
         'am', jsonb_build_object('title_quote', E'ሚዛንን መመለስ\nበሕይወት ውስጥ', 'below_lines', E'ለማገገምዎ የተሰጡ ባለሙያዎች ነን።\nየአእምሮ ደህንነት ቀዳሚ ተቀዳሚነታችን ነው።\nለግል የተበጀ እንክብካቤ። ርህራሄ። ሙያዊ ብቃት።')
       )::jsonb
where not exists (select 1 from public.hero_content);

insert into public.about (title1, title2, desc1, desc2, years_experience, clients_served, imageurl, translations)
select 'About', 'Fenote Psych', 'Fenote Psychological Services provides compassionate, evidence-based mental health care in Addis Ababa.', 'Our team combines clinical expertise with a deep understanding of the communities we serve.', 12, 500, 'https://wscpswlfcruheibfyivm.supabase.co/storage/v1/object/public/fenote-images/logo.png', jsonb_build_object('en', jsonb_build_object('title1', 'About', 'title2', 'Fenote Psych', 'desc1', 'Fenote Psychological Services provides compassionate, evidence-based mental health care in Addis Ababa.', 'desc2', 'Our team combines clinical expertise with a deep understanding of the communities we serve.'), 'am', jsonb_build_object('title1', 'ስለ እኛ', 'title2', 'ፈኖተ ሳይክ', 'desc1', 'የፈኖተ የሥነ-ልቦና አገልግሎት በአዲስ አበባ ርህራሄ የተሞላና በማስረጃ ላይ የተመሠረተ የአእምሮ ጤና እንክብካቤ ይሰጣል።', 'desc2', 'ቡድናችን ክሊኒካዊ እውቀትን ከምናገለግላቸው ማህበረሰቦች ጥልቅ ግንዛቤ ጋር ያጣምራል።'))::jsonb
where not exists (select 1 from public.about);

insert into public.payment_settings (cbe_account, cbe_swift, telebirr_account, translations)
select '1000193681917', 'CBETETAA', '0906851567', jsonb_build_object('en', '{}'::jsonb, 'am', '{}'::jsonb)::jsonb
where not exists (select 1 from public.payment_settings);

insert into public.payment_packages (region, package_key, duration, price, registration_fee, translations) values
('local', 'individual', '60 min', '2,000 Birr', '400 Birr', jsonb_build_object('en', jsonb_build_object('duration', '60 min', 'price', '2,000 Birr', 'registration_fee', '400 Birr'), 'am', jsonb_build_object('duration', '60 ደቂቃ', 'price', '2,000 ብር', 'registration_fee', '400 ብር'))::jsonb),
('local', 'couple', '90 min', '2,500 Birr', '400 Birr', jsonb_build_object('en', jsonb_build_object('duration', '90 min', 'price', '2,500 Birr', 'registration_fee', '400 Birr'), 'am', jsonb_build_object('duration', '90 ደቂቃ', 'price', '2,500 ብር', 'registration_fee', '400 ብር'))::jsonb),
('local', 'family', '130 min', '3,000 Birr', '400 Birr', jsonb_build_object('en', jsonb_build_object('duration', '130 min', 'price', '3,000 Birr', 'registration_fee', '400 Birr'), 'am', jsonb_build_object('duration', '130 ደቂቃ', 'price', '3,000 ብር', 'registration_fee', '400 ብር'))::jsonb),
('local', 'training', 'Varies', 'Varies', 'Included', jsonb_build_object('en', jsonb_build_object('duration', 'Varies', 'price', 'Varies', 'registration_fee', 'Included'), 'am', jsonb_build_object('duration', 'ይለያያል', 'price', 'ይለያያል', 'registration_fee', 'ተካትቷል'))::jsonb),
('local', 'phone', '60 min', '1,400 Birr', 'Included', jsonb_build_object('en', jsonb_build_object('duration', '60 min', 'price', '1,400 Birr', 'registration_fee', 'Included'), 'am', jsonb_build_object('duration', '60 ደቂቃ', 'price', '1,400 ብር', 'registration_fee', 'ተካትቷል'))::jsonb),
('international', 'individual', '70 min', '35 USD', 'Included', jsonb_build_object('en', jsonb_build_object('duration', '70 min', 'price', '35 USD', 'registration_fee', 'Included'), 'am', jsonb_build_object('duration', '70 ደቂቃ', 'price', '35 ዶላር', 'registration_fee', 'ተካትቷል'))::jsonb),
('international', 'couple', '90 min', '45 USD', 'Included', jsonb_build_object('en', jsonb_build_object('duration', '90 min', 'price', '45 USD', 'registration_fee', 'Included'), 'am', jsonb_build_object('duration', '90 ደቂቃ', 'price', '45 ዶላር', 'registration_fee', 'ተካትቷል'))::jsonb),
('international', 'family', '130 min', '50 USD', 'Included', jsonb_build_object('en', jsonb_build_object('duration', '130 min', 'price', '50 USD', 'registration_fee', 'Included'), 'am', jsonb_build_object('duration', '130 ደቂቃ', 'price', '50 ዶላር', 'registration_fee', 'ተካትቷል'))::jsonb);

-- ── keep sequences in sync with inserted rows ───────────────────────────
select setval(pg_get_serial_sequence('public.about', 'id'), coalesce((select max(id) from public.about), 1), true);
select setval(pg_get_serial_sequence('public.blog', 'id'), coalesce((select max(id) from public.blog), 1), true);
select setval(pg_get_serial_sequence('public.client', 'id'), coalesce((select max(id) from public.client), 1), true);
select setval(pg_get_serial_sequence('public.contact', 'id'), coalesce((select max(id) from public.contact), 1), true);
select setval(pg_get_serial_sequence('public.gallery', 'id'), coalesce((select max(id) from public.gallery), 1), true);
select setval(pg_get_serial_sequence('public.hero_content', 'id'), coalesce((select max(id) from public.hero_content), 1), true);
select setval(pg_get_serial_sequence('public.hero_slide', 'id'), coalesce((select max(id) from public.hero_slide), 1), true);
select setval(pg_get_serial_sequence('public.highlight', 'id'), coalesce((select max(id) from public.highlight), 1), true);
select setval(pg_get_serial_sequence('public.payment_packages', 'id'), coalesce((select max(id) from public.payment_packages), 1), true);
select setval(pg_get_serial_sequence('public.payment_settings', 'id'), coalesce((select max(id) from public.payment_settings), 1), true);
select setval(pg_get_serial_sequence('public.resource', 'id'), coalesce((select max(id) from public.resource), 1), true);
select setval(pg_get_serial_sequence('public.services', 'id'), coalesce((select max(id) from public.services), 1), true);
select setval(pg_get_serial_sequence('public.team', 'id'), coalesce((select max(id) from public.team), 1), true);
select setval(pg_get_serial_sequence('public.team_members', 'id'), coalesce((select max(id) from public.team_members), 1), true);
select setval(pg_get_serial_sequence('public.testimonial', 'id'), coalesce((select max(id) from public.testimonial), 1), true);
commit;
