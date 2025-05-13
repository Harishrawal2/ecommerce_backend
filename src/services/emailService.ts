import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<boolean> => {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM!,
      subject,
      html,
    };

    await sgMail.send(msg);
    logger.info(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    logger.error('Error sending email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
  const subject = 'Welcome to Our Store!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Our Store, ${name}!</h2>
      <p>Thank you for creating an account with us. We're excited to have you as a customer!</p>
      <p>You can now:</p>
      <ul>
        <li>Browse our products</li>
        <li>Add items to your cart</li>
        <li>Track your orders</li>
        <li>And much more!</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Happy shopping!</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

export const sendOrderConfirmationEmail = async (
  email: string,
  name: string,
  orderId: string,
  orderDetails: any
): Promise<boolean> => {
  const subject = `Order Confirmation #${orderId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Thank you for your order, ${name}!</h2>
      <p>We've received your order and it's being processed.</p>
      
      <h3>Order Details:</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Total Amount:</strong> $${orderDetails.totalAmount}</p>
      
      <h3>Items Ordered:</h3>
      <ul>
        ${orderDetails.items.map((item: any) => `
          <li>
            ${item.product.title} - Quantity: ${item.quantity} - Price: $${item.price}
          </li>
        `).join('')}
      </ul>
      
      <p>We'll send you another email when your order ships.</p>
      <p>Thank you for shopping with us!</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

export const sendOrderStatusUpdateEmail = async (
  email: string,
  name: string,
  orderId: string,
  status: string
): Promise<boolean> => {
  const subject = `Order Status Update #${orderId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Status Update</h2>
      <p>Hello ${name},</p>
      <p>Your order #${orderId} has been ${status.toLowerCase()}.</p>
      
      ${status === 'SHIPPED' ? `
        <p>Your order is on its way! You can track your shipment using the following link:</p>
        <p><a href="#">Track Your Order</a></p>
      ` : ''}
      
      ${status === 'DELIVERED' ? `
        <p>We hope you're happy with your purchase! If you'd like to leave a review, please visit our website.</p>
      ` : ''}
      
      <p>If you have any questions about your order, please don't hesitate to contact us.</p>
      <p>Thank you for shopping with us!</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<boolean> => {
  const subject = 'Password Reset Request';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      <p>
        <a href="${resetUrl}" style="
          background-color: #4CAF50;
          border: none;
          color: white;
          padding: 15px 32px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        ">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};