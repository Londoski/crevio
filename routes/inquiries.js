const notificationService = require('../services/notificationService');

// Inside the inquiry creation handler, after saving inquiry
const inquiry = await saveInquiryToDB(data);
await notificationService.createNotification({
  userId: creatorId, // the creator who receives the inquiry
  type: 'NEW_INQUIRY',
  category: 'Messages',
  priority: 'NORMAL',
  title: 'New inquiry received',
  message: `${clientName} sent you an inquiry about ${serviceTitle}.`,
  referenceType: 'inquiry',
  referenceId: inquiry.id,
  actionType: 'view_message'
});