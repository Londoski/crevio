if (period === 'today') {
  query += ` AND created_at >= CURRENT_DATE`;
} else if (period === 'week') {
  query += ` AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
} else if (period === 'month') {
  query += ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
} else if (period === 'older') {
  query += ` AND created_at < CURRENT_DATE - INTERVAL '30 days'`;
}