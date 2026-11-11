const pool = require('../db');

// Get recent 5 blogs for home page
exports.getRecentBlogs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM blog ORDER BY "created_at" DESC LIMIT 5'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all blogs with pagination for blog page
exports.getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM blog'
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated blogs
    const result = await pool.query(
      'SELECT * FROM blog ORDER BY "created_at" DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM blog WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
