import { Env, Friend, AppContext, ErrorCodes } from '../types';
import { successResp, failResp } from '../utils/response';

export async function listFriends(request: Request, env: Env): Promise<Response> {
  try {
    const friends = await env.DB.prepare(
      'SELECT * FROM Friend ORDER BY createdAt DESC'
    ).all<Friend>();

    return successResp({
      list: friends.results || [],
    });
  } catch (error) {
    console.error('List friends error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function addFriend(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const body = await request.json() as { name: string; icon?: string; url?: string; desc?: string };

    if (!body.name) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO Friend (name, icon, url, desc, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      body.name,
      body.icon || null,
      body.url || null,
      body.desc || null,
      now,
      now
    ).run();

    return successResp({});
  } catch (error) {
    console.error('Add friend error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function deleteFriend(request: Request, env: Env, ctx: AppContext, id: string): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const friendId = parseInt(id);
    if (isNaN(friendId)) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    await env.DB.prepare('DELETE FROM Friend WHERE id = ?').bind(friendId).run();

    return successResp({});
  } catch (error) {
    console.error('Delete friend error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}
