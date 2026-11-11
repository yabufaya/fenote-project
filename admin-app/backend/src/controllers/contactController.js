const pool = require('../db');

exports.getContact = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const { 
      map_embed_url,
      loc_title, loc_subtitle,
      phone_title, phone_subtitle,
      email_title, email_subtitle,
      hours_title, hours_subtitle,
      full_address, full_phone, full_email,
      mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours,
      facebook_url, instagram_url, twitter_url, youtube_url, linkedin_url
    } = req.body;
    
    const existing = await pool.query('SELECT id FROM contact LIMIT 1');
    
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE contact SET 
         map_embed_url = $1, 
         loc_title = $2, loc_subtitle = $3,
         phone_title = $4, phone_subtitle = $5,
         email_title = $6, email_subtitle = $7,
         hours_title = $8, hours_subtitle = $9,
         full_address = $10, full_phone = $11, full_email = $12,
         mon_hours = $13, tue_hours = $14, wed_hours = $15, thu_hours = $16, fri_hours = $17, sat_hours = $18, sun_hours = $19,
         facebook_url = $20, instagram_url = $21, twitter_url = $22, youtube_url = $23, linkedin_url = $24,
         updated_at = NOW() 
         WHERE id = $25 RETURNING *`,
        [map_embed_url, loc_title, loc_subtitle, phone_title, phone_subtitle, email_title, email_subtitle, hours_title, hours_subtitle, full_address, full_phone, full_email, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, facebook_url, instagram_url, twitter_url, youtube_url, linkedin_url, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO contact (
          map_embed_url, loc_title, loc_subtitle, phone_title, phone_subtitle, 
          email_title, email_subtitle, hours_title, hours_subtitle, 
          full_address, full_phone, full_email, 
          mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours,
          facebook_url, instagram_url, twitter_url, youtube_url, linkedin_url, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24, NOW()) RETURNING *`,
        [map_embed_url, loc_title, loc_subtitle, phone_title, phone_subtitle, email_title, email_subtitle, hours_title, hours_subtitle, full_address, full_phone, full_email, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, facebook_url, instagram_url, twitter_url, youtube_url, linkedin_url]
      );
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};