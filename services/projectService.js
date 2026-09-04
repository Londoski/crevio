await notificationService.createNotification({
  userId: creatorId,
  type: 'PROJECT_PUBLISHED',
  category: 'Projects',
  priority: 'NORMAL',
  title: 'Project published successfully',
  message: `${projectTitle} has been published to your portfolio.`,
  referenceType: 'project',
  referenceId: projectId,
  actionType: 'view_project'
});