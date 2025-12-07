import { Env, AddCommentReq, Comment, AppContext, ErrorCodes, Memo, User } from '../types';
import { successResp, failResp } from '../utils/response';
import { sendCommentNotification } from '../utils/email';

export async function addComment(request: Request, env: Env, ctx?: AppContext): Promise<Response> {
  try {
    const body = await request.json() as AddCommentReq;

    if (!body.memoId || !body.content) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    const now = new Date().toISOString();

    // If user is logged in, use their info
    let username = body.username || null;
    let author = null;

    if (ctx?.user) {
      username = ctx.user.nickname || ctx.user.username;
      author = ctx.user.id;
    }

    await env.DB.prepare(
      `INSERT INTO Comment (
        content, replyTo, username, email, website, memoId, author, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.content,
      body.replyTo || null,
      username,
      body.email || null,
      body.website || null,
      body.memoId,
      author,
      now,
      now
    ).run();

    // Update comment count
    await env.DB.prepare(
      'UPDATE Memo SET commentCount = commentCount + 1 WHERE id = ?'
    ).bind(body.memoId).run();

    // Send email notification (don't wait for it, run in background)
    try {
      // Get memo and author info
      const memo = await env.DB.prepare(
        'SELECT * FROM Memo WHERE id = ?'
      ).bind(body.memoId).first<Memo>();

      if (memo) {
        const memoAuthor = await env.DB.prepare(
          'SELECT * FROM User WHERE id = ?'
        ).bind(memo.userId).first<User>();

        // Only send notification if:
        // 1. Memo author has an email
        // 2. Comment author is not the memo author
        if (memoAuthor?.email && memoAuthor.id !== author) {
          sendCommentNotification(env, {
            memoId: body.memoId,
            memoContent: memo.content || '',
            memoAuthorEmail: memoAuthor.email,
            commentAuthor: username || '匿名用户',
            commentContent: body.content,
            replyTo: body.replyTo || undefined,
          }).catch(err => {
            console.error('Failed to send email notification:', err);
          });
        }
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Email notification error:', emailError);
    }

    return successResp({});
  } catch (error) {
    console.error('Add comment error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function removeComment(request: Request, env: Env, ctx: AppContext, id: string): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const commentId = parseInt(id);
    if (isNaN(commentId)) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    const comment = await env.DB.prepare(
      'SELECT * FROM Comment WHERE id = ?'
    ).bind(commentId).first<Comment>();

    if (!comment) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    // Only admin can delete comments
    if (ctx.user.id !== 1) {
      return failResp(ErrorCodes.FAIL, '没有权限');
    }

    await env.DB.prepare('DELETE FROM Comment WHERE id = ?').bind(commentId).run();

    // Update comment count
    await env.DB.prepare(
      'UPDATE Memo SET commentCount = commentCount - 1 WHERE id = ?'
    ).bind(comment.memoId).run();

    return successResp({});
  } catch (error) {
    console.error('Remove comment error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}
