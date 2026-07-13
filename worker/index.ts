import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, AppContext, User } from './types';
import { verifyToken } from './utils/jwt';
import * as userHandler from './handlers/user';
import * as memoHandler from './handlers/memo';
import * as commentHandler from './handlers/comment';
import * as fileHandler from './handlers/file';
import * as friendHandler from './handlers/friend';
import * as sysConfigHandler from './handlers/sysConfig';
import * as tagHandler from './handlers/tag';
import * as doubanHandler from './handlers/douban';
import * as locationHandler from './handlers/location';
import { CACHE_PREFIXES, CACHE_TTL_SECONDS, getCachedJson, setCachedJson } from './utils/cache';

const app = new Hono<{ Bindings: Env; Variables: { user?: User } }>();

// CORS middleware
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-TOKEN'],
  credentials: true,
}));

// Handle all OPTIONS requests
app.options('/*', (c) => {
  return c.body(null, 204);
});

// Auth middleware
app.use('/api/*', async (c, next) => {
  const token = c.req.header('X-API-TOKEN');

  if (token) {
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      if (payload) {
        const cacheKey = `${CACHE_PREFIXES.user}auth:${payload.userId}`;
        let user = await getCachedJson<User>(c.env, cacheKey);

        if (!user) {
          user = await c.env.DB.prepare(
            'SELECT * FROM User WHERE id = ?'
          ).bind(payload.userId).first<User>();

          if (user) {
            await setCachedJson(c.env, cacheKey, user, CACHE_TTL_SECONDS.medium);
          }
        }

        if (user) {
          c.set('user', user);
        }
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
    }
  }

  await next();
});

// User routes
app.post('/api/user/login', async (c) => {
  return userHandler.login(c.req.raw, c.env);
});

app.post('/api/user/reg', async (c) => {
  return userHandler.register(c.req.raw, c.env);
});

app.post('/api/user/profile', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return userHandler.getProfile(c.req.raw, c.env, ctx);
});

app.post('/api/user/profile/:username', async (c) => {
  const username = c.req.param('username');
  return userHandler.getProfileByUsername(c.req.raw, c.env, username);
});

app.post('/api/user/saveProfile', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return userHandler.saveProfile(c.req.raw, c.env, ctx);
});

// Memo routes
app.post('/api/memo/list', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return memoHandler.listMemos(c.req.raw, c.env, ctx);
});

app.post('/api/memo/save', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return memoHandler.saveMemo(c.req.raw, c.env, ctx);
});

app.post('/api/memo/remove', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  const id = c.req.query('id') || '';
  return memoHandler.removeMemo(c.req.raw, c.env, ctx, id);
});

app.post('/api/memo/get', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  const id = c.req.query('id') || '';
  return memoHandler.getMemo(c.req.raw, c.env, ctx, id);
});

app.post('/api/memo/like', async (c) => {
  const id = c.req.query('id') || '';
  return memoHandler.likeMemo(c.req.raw, c.env, id);
});

app.post('/api/memo/setPinned', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  const id = c.req.query('id') || '';
  return memoHandler.setPinned(c.req.raw, c.env, ctx, id);
});

app.post('/api/memo/removeImage', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return memoHandler.removeImage(c.req.raw, c.env, ctx);
});

app.post('/api/memo/getFaviconAndTitle', async (c) => {
  return memoHandler.getFaviconAndTitle(c.req.raw, c.env);
});

app.post('/api/memo/getDoubanBookInfo', async (c) => {
  const id = c.req.query('id') || '';
  return doubanHandler.getDoubanBookInfo(c.req.raw, c.env, id);
});

app.post('/api/memo/getDoubanMovieInfo', async (c) => {
  const id = c.req.query('id') || '';
  return doubanHandler.getDoubanMovieInfo(c.req.raw, c.env, id);
});

app.post('/api/memo/reverseGeocode', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return locationHandler.reverseGeocode(c.req.raw, c.env, ctx);
});

// Comment routes
app.post('/api/comment/add', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return commentHandler.addComment(c.req.raw, c.env, ctx);
});

app.post('/api/comment/remove', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  const id = c.req.query('id') || '';
  return commentHandler.removeComment(c.req.raw, c.env, ctx, id);
});

// File routes
app.post('/api/file/upload', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return fileHandler.uploadFile(c.req.raw, c.env, ctx);
});

app.get('/r2/*', async (c) => {
  const key = c.req.path.replace('/r2/', '');
  return fileHandler.getFile(c.req.raw, c.env, key);
});

// Friend routes
app.post('/api/friend/list', async (c) => {
  return friendHandler.listFriends(c.req.raw, c.env);
});

app.post('/api/friend/add', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return friendHandler.addFriend(c.req.raw, c.env, ctx);
});

app.post('/api/friend/delete', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  const id = c.req.query('id') || '';
  return friendHandler.deleteFriend(c.req.raw, c.env, ctx, id);
});

// System config routes
app.post('/api/sysConfig/get', async (c) => {
  return sysConfigHandler.getSysConfig(c.req.raw, c.env);
});

app.post('/api/sysConfig/getFull', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return sysConfigHandler.getFullSysConfig(c.req.raw, c.env, ctx);
});

app.post('/api/sysConfig/save', async (c) => {
  const ctx: AppContext = { user: c.get('user') };
  return sysConfigHandler.saveSysConfig(c.req.raw, c.env, ctx);
});

// Tag routes
app.post('/api/tag/list', async (c) => {
  return tagHandler.listTags(c.req.raw, c.env);
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ message: 'Moments API is running', version: c.env.APP_VERSION || '1.0.0' });
});

export default app;
