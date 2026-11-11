const pool = require('../db');

exports.getDashboardStats = async (req, res) => {
  try {
    await pool.query('select public.expire_pending_bookings()');
    const [blogCount, resourceCount, testimonialCount, teamCount, notificationCount, clientCount, heroSlideCount, serviceCount, packageCount, subscriberCount, unreadMessageCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM blog'),
      pool.query('SELECT COUNT(*) as count FROM resource'),
      pool.query('SELECT COUNT(*) as count FROM testimonial'),
      pool.query('SELECT COUNT(*) as count FROM team'),
      pool.query('SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE'),
      pool.query('SELECT COUNT(*) as count FROM client'),
      pool.query('SELECT COUNT(*) as count FROM hero_slide'),
      pool.query('SELECT COUNT(*) as count FROM services'),
      pool.query('SELECT COUNT(*) as count FROM payment_packages'), // ✅ NEW
      pool.query('SELECT COUNT(*) as count FROM subscribers'),
      pool.query('SELECT COUNT(*) as count FROM contact_messages WHERE is_read = FALSE')
    ]);

    const recentNotifications = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
    const recentBookings = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5');

    res.status(200).json({
      success: true,
      data: {
        blogs: parseInt(blogCount.rows[0].count),
        resources: parseInt(resourceCount.rows[0].count),
        testimonials: parseInt(testimonialCount.rows[0].count),
        team: parseInt(teamCount.rows[0].count),
        clients: parseInt(clientCount.rows[0].count),
        hero_slides: parseInt(heroSlideCount.rows[0].count),
        services: parseInt(serviceCount.rows[0].count),
        packages: parseInt(packageCount.rows[0].count), // ✅ NEW
        subscribers: parseInt(subscriberCount.rows[0].count),
        unreadMessages: parseInt(unreadMessageCount.rows[0].count),
        unreadNotifications: parseInt(notificationCount.rows[0].count),
        recentNotifications: recentNotifications.rows,
        recentBookings: recentBookings.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ... keep getBookingStats exactly the same
// Get booking statistics
exports.getBookingStats = async (req, res) => {
  try {
    await pool.query('select public.expire_pending_bookings()');
    const result = await pool.query(
      `select status, count(*)::int as count
         from bookings
        group by status`
    );
    const data = { pending: 0, confirmed: 0, completed: 0, denied: 0, expired: 0, cancelled: 0 };
    for (const row of result.rows) data[row.status] = row.count;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};