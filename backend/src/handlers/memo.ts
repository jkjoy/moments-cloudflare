import { Env, Memo, Comment, User, SaveMemoReq, ListMemoReq, AppContext, ErrorCodes } from '../types';
import { successResp, failResp } from '../utils/response';

export async function listMemos(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    const body = await request.json() as ListMemoReq;

    const page = body.page || 1;
    const size = body.size || 10;
    const offset = (page - 1) * size;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];

    // Visibility filter
    if (!ctx.user) {
      conditions.push('showType = 1');
      conditions.push('createdAt <= ?');
      params.push(new Date().toISOString());
    } else {
      conditions.push('(userId = ? OR (userId <> ? AND showType = 1))');
      params.push(ctx.user.id, ctx.user.id);
      conditions.push('(userId = ? OR createdAt <= ?)');
      params.push(ctx.user.id, new Date().toISOString());
    }

    if (body.start) {
      conditions.push('createdAt >= ?');
      params.push(body.start);
    }
    if (body.end) {
      conditions.push('createdAt <= ?');
      params.push(body.end);
    }
    if (body.contentContains) {
      conditions.push('content LIKE ?');
      params.push(`%${body.contentContains}%`);
    }
    if (body.showType !== undefined && body.showType >= 0) {
      conditions.push('showType = ?');
      params.push(body.showType);
    }
    if (body.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%${body.tag},%`);
    }
    if (body.username) {
      const user = await env.DB.prepare('SELECT id FROM User WHERE username = ?')
        .bind(body.username).first<{ id: number }>();
      if (user) {
        conditions.push('userId = ?');
        params.push(user.id);
      }
    }
    if (body.userId) {
      conditions.push('userId = ?');
      params.push(body.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get memos - use datetime() for proper timestamp sorting
    const memos = await env.DB.prepare(
      `SELECT * FROM Memo ${whereClause} ORDER BY pinned DESC, datetime(createdAt) DESC LIMIT ? OFFSET ?`
    ).bind(...params, size, offset).all<Memo>();

    // Get total count
    const totalResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM Memo ${whereClause}`
    ).bind(...params).first<{ total: number }>();

    const total = totalResult?.total || 0;

    // Fetch user info and comments for each memo
    const list: Memo[] = [];
    for (const memo of memos.results || []) {
      const user = await env.DB.prepare(
        'SELECT username, nickname, slogan, id, avatarUrl, coverUrl FROM User WHERE id = ?'
      ).bind(memo.userId).first<User>();

      const comments = await env.DB.prepare(
        'SELECT * FROM Comment WHERE memoId = ? ORDER BY createdAt DESC LIMIT 5'
      ).bind(memo.id).all<Comment>();

      // Generate imgConfigs from imgs string
      const imgConfigs = memo.imgs
        ? memo.imgs.split(',').filter(Boolean).map(img => ({
            url: img,
            thumbUrl: img, // For now, use same URL for thumbnail
          }))
        : [];

      list.push({
        ...memo,
        user,
        comments: comments.results || [],
        imgConfigs,
      });
    }

    return successResp({
      list,
      total,
      hasNext: page * size < total,
    });
  } catch (error) {
    console.error('List memos error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function saveMemo(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const body = await request.json() as SaveMemoReq;
    const now = new Date().toISOString();

    // Process tags
    const tags = body.tags && body.tags.length > 0
      ? body.tags.join(',') + ','
      : null;

    const imgs = body.imgs.join(',');
    const ext = JSON.stringify(body.ext || {});
    const showType = body.showType ?? 1;
    const pinned = body.pinned ? 1 : 0;

    if (body.id && body.id > 0) {
      // Update existing memo
      const existing = await env.DB.prepare(
        'SELECT * FROM Memo WHERE id = ?'
      ).bind(body.id).first<Memo>();

      if (!existing || existing.userId !== ctx.user.id) {
        return failResp(ErrorCodes.PARAM_ERROR);
      }

      await env.DB.prepare(
        `UPDATE Memo SET
          content = ?, imgs = ?, location = ?, externalUrl = ?,
          externalTitle = ?, externalFavicon = ?, pinned = ?,
          ext = ?, showType = ?, tags = ?, updatedAt = ?
         WHERE id = ?`
      ).bind(
        body.content,
        imgs,
        body.location || null,
        body.externalUrl || null,
        body.externalTitle || null,
        body.externalFavicon || '/favicon.png',
        pinned,
        ext,
        showType,
        tags,
        now,
        body.id
      ).run();
    } else {
      // Create new memo
      const createdAt = body.createdAt || now;

      await env.DB.prepare(
        `INSERT INTO Memo (
          content, imgs, userId, location, externalUrl, externalTitle,
          externalFavicon, pinned, ext, showType, tags, createdAt, updatedAt,
          favCount, commentCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
      ).bind(
        body.content,
        imgs,
        ctx.user.id,
        body.location || null,
        body.externalUrl || null,
        body.externalTitle || null,
        body.externalFavicon || '/favicon.png',
        pinned,
        ext,
        showType,
        tags,
        createdAt,
        now
      ).run();
    }

    return successResp({});
  } catch (error) {
    console.error('Save memo error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function removeMemo(request: Request, env: Env, ctx: AppContext, id: string): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const memoId = parseInt(id);
    if (isNaN(memoId)) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    const memo = await env.DB.prepare(
      'SELECT * FROM Memo WHERE id = ?'
    ).bind(memoId).first<Memo>();

    if (!memo) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    // Check permission (only owner or admin can delete)
    if (memo.userId !== ctx.user.id && ctx.user.id !== 1) {
      return failResp(ErrorCodes.FAIL, '没有权限');
    }

    await env.DB.prepare('DELETE FROM Memo WHERE id = ?').bind(memoId).run();

    // Delete associated images from R2 if needed
    if (memo.imgs) {
      const imgs = memo.imgs.split(',');
      for (const img of imgs) {
        if (img.startsWith('/r2/')) {
          const key = img.replace('/r2/', '');
          await env.BUCKET.delete(key);
        }
      }
    }

    return successResp({});
  } catch (error) {
    console.error('Remove memo error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function getMemo(request: Request, env: Env, ctx: AppContext, id: string): Promise<Response> {
  try {
    const memoId = parseInt(id);
    if (isNaN(memoId)) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    const memo = await env.DB.prepare(
      'SELECT * FROM Memo WHERE id = ?'
    ).bind(memoId).first<Memo>();

    if (!memo) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    // Check permission
    if (memo.showType !== 1 && (!ctx.user || ctx.user.id !== memo.userId)) {
      return failResp(ErrorCodes.FAIL, '暂无权限查看');
    }

    // Get user info
    const user = await env.DB.prepare(
      'SELECT username, nickname, slogan, id, avatarUrl, coverUrl FROM User WHERE id = ?'
    ).bind(memo.userId).first<User>();

    // Get comments
    const comments = await env.DB.prepare(
      'SELECT * FROM Comment WHERE memoId = ? ORDER BY createdAt DESC'
    ).bind(memoId).all<Comment>();

    // Generate imgConfigs from imgs string
    const imgConfigs = memo.imgs
      ? memo.imgs.split(',').filter(Boolean).map(img => ({
          url: img,
          thumbUrl: img, // For now, use same URL for thumbnail
        }))
      : [];

    return successResp({
      ...memo,
      user,
      comments: comments.results || [],
      imgConfigs,
    });
  } catch (error) {
    console.error('Get memo error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function likeMemo(request: Request, env: Env, id: string): Promise<Response> {
  try {
    const memoId = parseInt(id);
    if (isNaN(memoId)) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    await env.DB.prepare(
      'UPDATE Memo SET favCount = favCount + 1 WHERE id = ?'
    ).bind(memoId).run();

    return successResp({});
  } catch (error) {
    console.error('Like memo error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function setPinned(request: Request, env: Env, ctx: AppContext, id: string): Promise<Response> {
  try {
    if (!ctx.user || ctx.user.id !== 1) {
      return failResp(ErrorCodes.FAIL, '没有权限');
    }

    const memoId = parseInt(id);
    if (isNaN(memoId)) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    const memo = await env.DB.prepare(
      'SELECT pinned FROM Memo WHERE id = ?'
    ).bind(memoId).first<{ pinned: number }>();

    if (!memo) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    // Unpin all memos first
    await env.DB.prepare('UPDATE Memo SET pinned = 0').run();

    // Toggle current memo pin status
    const newPinned = memo.pinned ? 0 : 1;
    await env.DB.prepare(
      'UPDATE Memo SET pinned = ? WHERE id = ?'
    ).bind(newPinned, memoId).run();

    return successResp({});
  } catch (error) {
    console.error('Set pinned error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function removeImage(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const body = await request.json() as { img: string };

    if (!body.img) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    // Check if the image URL is from R2
    if (body.img.startsWith('/r2/')) {
      const key = body.img.replace('/r2/', '');

      // Delete from R2
      await env.BUCKET.delete(key);

      console.log(`Image deleted from R2: ${key} by user ${ctx.user.id}`);
    }

    return successResp({});
  } catch (error) {
    console.error('Remove image error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}
