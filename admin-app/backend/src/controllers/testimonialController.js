const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

// Get all testimonials
exports.getAllTestimonials = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM testimonial ORDER BY created_at DESC'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all testimonials error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single testimonial by ID
exports.getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM testimonial WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get testimonial by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new testimonial
exports.createTestimonial = async (req, res) => {
  try {
    const { name, title, quote, rate } = req.body;
    
    // Build imageurl from the uploaded file
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'testimonials' }) || '';
    
    const result = await pool.query(
      `INSERT INTO testimonial (name, title, quote, imageurl, rate, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [name, title, quote, imageurl, rate || 0]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create testimonial error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update testimonial
exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, quote, rate } = req.body;
    
    // Get existing item to keep old imageurl if no new file is uploaded
    const existing = await pool.query('SELECT * FROM testimonial WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    // Use new file if uploaded, otherwise keep existing imageurl
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'testimonials' }) || existing.rows[0].imageurl;
    
    const result = await pool.query(
      `UPDATE testimonial 
       SET name = $1, title = $2, quote = $3, imageurl = $4, rate = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, title, quote, imageurl, rate || 0, id]
    );
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete testimonial
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM testimonial WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    
    res.status(200).json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};