const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

exports.getAllBlogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blog ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all blogs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM blog WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get blog by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const { title, category, issue, content } = req.body;

    const slug = generateSlug(title) + '-' + Date.now();

    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'blogs' }) || '';

    const result = await pool.query(
      `INSERT INTO blog (title, category, issue, content, imageurl, slug, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [title, category || '', issue || null, content || null, imageurl, slug]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, issue, content } = req.body;

    const existing = await pool.query('SELECT * FROM blog WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'blogs' }) || existing.rows[0].imageurl;

    const slug = existing.rows[0].slug;

    const result = await pool.query(
      `UPDATE blog 
       SET title = $1, category = $2, issue = $3, content = $4, imageurl = $5, slug = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, category || '', issue || null, content || null, imageurl, slug, id]
    );

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blog WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.status(200).json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};