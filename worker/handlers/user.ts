import { Env, LoginReq, RegReq, ProfileReq, User, ErrorCodes, AppContext } from '../types';
import { successResp, failResp } from '../utils/response';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { CACHE_PREFIXES, CACHE_TTL_SECONDS, getCachedJson, invalidateUserCache, setCachedJson } from '../utils/cache';

export async function login(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as LoginReq;

    if (!body.username || !body.password) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    // Query user
    const result = await env.DB.prepare('SELECT * FROM User WHERE username = ?')
      .bind(body.username)
      .first<User>();

    if (!result) {
      return failResp(ErrorCodes.FAIL, '用户不存在或密码不正确');
    }

    // Verify password
    const isValid = await comparePassword(body.password, result.password!);
    if (!isValid) {
      return failResp(ErrorCodes.FAIL, '用户不存在或密码不正确');
    }

    if (!env.JWT_SECRET) {
      return failResp(ErrorCodes.FAIL, 'JWT_SECRET 未配置');
    }

    // Generate token
    const token = await generateToken(
      { id: result.id!, username: result.username! },
      env.JWT_SECRET
    );

    return successResp({
      token,
      username: result.username,
      id: result.id,
    });
  } catch (error) {
    console.error('Login error:', error);
    return failResp(ErrorCodes.FAIL, '登录失败');
  }
}

export async function register(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as RegReq;

    if (!body.username || !body.password || !body.repeatPassword) {
      return failResp(ErrorCodes.PARAM_ERROR);
    }

    if (body.username.length < 3) {
      return failResp(ErrorCodes.FAIL, '用户名最少3个字符');
    }

    if (body.password !== body.repeatPassword) {
      return failResp(ErrorCodes.FAIL, '两次密码不一致');
    }

    // Check if username exists
    const existing = await env.DB.prepare('SELECT id FROM User WHERE username = ?')
      .bind(body.username)
      .first();

    if (existing) {
      return failResp(ErrorCodes.FAIL, '用户名已存在');
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);
    const now = new Date().toISOString();

    // Insert user
    await env.DB.prepare(
      `INSERT INTO User (username, nickname, password, avatarUrl, slogan, coverUrl, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.username,
      body.username,
      hashedPassword,
      '/avatar.webp',
      '修道者，逆天而行，注定要一生孤独。',
      '/cover.webp',
      now,
      now
    ).run();

    await invalidateUserCache(env);

    return successResp({});
  } catch (error) {
    console.error('Register error:', error);
    return failResp(ErrorCodes.FAIL, '注册失败');
  }
}

export async function getProfile(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    let user: User | null = null;

    if (ctx.user) {
      user = ctx.user;
    } else {
      const cached = await getCachedJson<User>(env, `${CACHE_PREFIXES.user}profile:default`);
      if (cached) {
        return successResp(cached);
      }

      // Get first user (admin)
      user = await env.DB.prepare(
        'SELECT username, nickname, slogan, id, avatarUrl, coverUrl, email FROM User ORDER BY id LIMIT 1'
      ).first<User>();
    }

    if (!user) {
      return failResp(ErrorCodes.FAIL, '用户不存在');
    }

    if (!ctx.user) {
      await setCachedJson(env, `${CACHE_PREFIXES.user}profile:default`, user, CACHE_TTL_SECONDS.long);
    }

    return successResp(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function getProfileByUsername(request: Request, env: Env, username: string): Promise<Response> {
  try {
    const cacheKey = `${CACHE_PREFIXES.user}profile:username:${username}`;
    const cached = await getCachedJson<User>(env, cacheKey);
    if (cached) {
      return successResp(cached);
    }

    const user = await env.DB.prepare(
      'SELECT username, nickname, slogan, id, avatarUrl, coverUrl, email FROM User WHERE username = ?'
    ).bind(username).first<User>();

    if (!user) {
      return failResp(ErrorCodes.FAIL, '用户不存在');
    }

    await setCachedJson(env, cacheKey, user, CACHE_TTL_SECONDS.long);

    return successResp(user);
  } catch (error) {
    console.error('Get profile by username error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}

export async function saveProfile(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const body = await request.json() as ProfileReq;

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (body.nickname) {
      updates.push('nickname = ?');
      values.push(body.nickname);
    }
    if (body.avatarUrl !== undefined) {
      updates.push('avatarUrl = ?');
      values.push(body.avatarUrl);
    }
    if (body.slogan !== undefined) {
      updates.push('slogan = ?');
      values.push(body.slogan);
    }
    if (body.coverUrl !== undefined) {
      updates.push('coverUrl = ?');
      values.push(body.coverUrl);
    }
    if (body.email !== undefined) {
      updates.push('email = ?');
      values.push(body.email);
    }
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());

    values.push(ctx.user.id);

    await env.DB.prepare(
      `UPDATE User SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    await invalidateUserCache(env);

    return successResp({});
  } catch (error) {
    console.error('Save profile error:', error);
    return failResp(ErrorCodes.FAIL);
  }
}
