const notificationService = require('../services/notificationService');

// After marking portfolio as published
await notificationService.createNotification({
  userId: creatorId,
  type: 'PORTFOLIO_PUBLISHED',
  category: 'Portfolio',
  priority: 'NORMAL',
  title: 'Portfolio published',
  message: 'Your portfolio is now publicly available.',
  referenceType: 'portfolio',
  referenceId: portfolioId,
  actionType: 'view_portfolio'
});