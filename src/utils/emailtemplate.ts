export const getWelcomeEmailTemplate = (email: string): { subject: string; text: string; html: string } => {
  const subject = "Welcome to Our Newsletter!";
  const text = `Hi there! Thank you for subscribing to our newsletter with the email: ${email}. We're excited to have you on board.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to our Newsletter</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 1.875rem; font-weight: 700;">Welcome Aboard!</h1>
        </div>

        <!-- Content -->
        <div style="padding: 2rem;">
            <p style="font-size: 1.125rem; color: #374151;">Hi there,</p>
            <p style="font-size: 1.125rem; color: #374151;">Thank you for subscribing to our newsletter with the email: <strong>${email}</strong>.</p>
            <p style="font-size: 1.125rem; color: #374151;">We're excited to share the latest updates, news, and exclusive content with you.</p>

            <div style="text-align: center; margin: 2rem 0;">
                <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 0.75rem 1.5rem; border-radius: 0.375rem;">
                    <p style="color: white; font-weight: 600; margin: 0; font-size: 1.125rem;">You're All Set!</p>
                </div>
            </div>

            <p style="font-size: 1.125rem; color: #374151;">If you did not request this subscription, please ignore this email.</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 1.5rem; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 0.875rem;">&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0; font-size: 0.875rem;">You are receiving this email because you subscribed to our newsletter.</p>
        </div>
    </div>
</body>
</html>
  `;

  return { subject, text, html };
};