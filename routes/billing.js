await notificationService.createNotification({
  userId: creatorId,
  type: 'PAYMENT_SUCCESS',
  category: 'Billing',
  priority: 'HIGH',
  title: 'Payment successful',
  message: `Your ${planName} payment was processed successfully.`,
  referenceType: 'payment',
  referenceId: paymentId,
  actionType: 'view_billing'
});