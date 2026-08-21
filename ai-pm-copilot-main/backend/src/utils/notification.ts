import { Notification, NotificationType } from '../models/Notification';

interface SendNotificationParams {
  recipientId: any;
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Utility function to dispatch notifications.
 * Creates an in-app database notification and logs mock email/Slack hooks.
 */
export async function sendNotification(params: SendNotificationParams): Promise<any> {
  const type = params.type || 'info';

  // 1. Create in-app notification in MongoDB
  const notification = await Notification.create({
    recipient: params.recipientId,
    title: params.title,
    message: params.message,
    type,
  });

  // 2. Mock external triggers representing Slack webhooks or SMTP transmissions
  console.log(`📣 [NOTIFICATION SYSTEM] Dispatching alert: "${params.title}"`);
  console.log(`   - In-app Notification created with ID: ${notification._id}`);
  console.log(`   - [MOCK Slack Hook] Alert posted to workspace channel`);
  console.log(`   - [MOCK SMTP Email] Notification dispatch succeeded`);

  return notification;
}
