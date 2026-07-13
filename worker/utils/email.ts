import { Resend } from 'resend';
import { Env } from '../types';

// Helper function to get config value from database
async function getConfigValue(env: Env, name: string, defaultValue: any): Promise<any> {
  const result = await env.DB.prepare(
    'SELECT value FROM SysConfig WHERE name = ?'
  ).bind(name).first<{ value: string }>();

  if (!result?.value) {
    return defaultValue;
  }

  try {
    return JSON.parse(result.value);
  } catch {
    return result.value;
  }
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(env: Env, params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email is enabled
    const enableEmail = await getConfigValue(env, 'enableEmail', false);
    if (!enableEmail) {
      return { success: false, error: 'Email is not enabled' };
    }

    // Get Resend configuration
    const resendApiKey = await getConfigValue(env, 'resendApiKey', '');
    const emailFrom = await getConfigValue(env, 'emailFrom', '');

    if (!resendApiKey || !emailFrom) {
      return { success: false, error: 'Email configuration is incomplete' };
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Send email
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Send email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send comment notification email
export async function sendCommentNotification(
  env: Env,
  params: {
    memoId: number;
    memoContent: string;
    memoAuthorEmail?: string;
    commentAuthor: string;
    commentContent: string;
    replyTo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!params.memoAuthorEmail) {
    return { success: false, error: 'Memo author email not provided' };
  }

  const subject = params.replyTo
    ? `${params.commentAuthor} 回复了你的评论`
    : `${params.commentAuthor} 评论了你的动态`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${subject}</h2>

      ${params.replyTo ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #666; margin: 20px 0;">
          <p style="margin: 0; color: #666;">原评论：</p>
          <p style="margin: 10px 0 0 0;">${params.replyTo}</p>
        </div>
      ` : ''}

      <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
        <p style="margin: 0; color: #666;">新评论：</p>
        <p style="margin: 10px 0 0 0;"><strong>${params.commentAuthor}</strong>: ${params.commentContent}</p>
      </div>

      <div style="background-color: #fafafa; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #666;">你的动态：</p>
        <p style="margin: 10px 0 0 0;">${params.memoContent.substring(0, 200)}${params.memoContent.length > 200 ? '...' : ''}</p>
      </div>

      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        此邮件由系统自动发送，请勿直接回复。
      </p>
    </div>
  `;

  return sendEmail(env, {
    to: params.memoAuthorEmail,
    subject,
    html,
  });
}
