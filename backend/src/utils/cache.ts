import { Env } from '../types';

export const CACHE_TTL_SECONDS = {
  short: 120,
  medium: 300,
  long: 600,
};

export const CACHE_KEYS = {
  friendList: 'friend:list',
  sysConfigPublic: 'config:public',
  tagList: 'tag:list',
};

export const CACHE_PREFIXES = {
  memo: 'memo:',
  user: 'user:',
  config: 'config:',
};

const ROOT_PREFIX = 'moments:v1:';

function getCache(env: Env): KVNamespace | undefined {
  return env.CACHE;
}

function fullKey(key: string): string {
  return `${ROOT_PREFIX}${key}`;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildCacheKey(scope: string, value: unknown): Promise<string> {
  return `${scope}:${await sha256(JSON.stringify(stableValue(value)))}`;
}

export async function getCachedJson<T>(env: Env, key: string): Promise<T | null> {
  const cache = getCache(env);
  if (!cache) {
    return null;
  }

  try {
    return await cache.get<T>(fullKey(key), 'json');
  } catch (error) {
    console.warn('[KV Cache] get failed:', key, error);
    return null;
  }
}

export async function setCachedJson(
  env: Env,
  key: string,
  value: unknown,
  ttlSeconds = CACHE_TTL_SECONDS.medium
): Promise<void> {
  const cache = getCache(env);
  if (!cache) {
    return;
  }

  try {
    await cache.put(fullKey(key), JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
  } catch (error) {
    console.warn('[KV Cache] put failed:', key, error);
  }
}

export async function deleteCachedKey(env: Env, key: string): Promise<void> {
  const cache = getCache(env);
  if (!cache) {
    return;
  }

  try {
    await cache.delete(fullKey(key));
  } catch (error) {
    console.warn('[KV Cache] delete failed:', key, error);
  }
}

export async function deleteCachedPrefix(env: Env, prefix: string): Promise<void> {
  const cache = getCache(env);
  if (!cache) {
    return;
  }

  const scopedPrefix = fullKey(prefix);
  let cursor: string | undefined;

  try {
    do {
      const result = await cache.list({ prefix: scopedPrefix, cursor });
      await Promise.all(result.keys.map((key) => cache.delete(key.name)));
      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);
  } catch (error) {
    console.warn('[KV Cache] delete prefix failed:', prefix, error);
  }
}

export async function invalidateMemoCache(env: Env): Promise<void> {
  await Promise.all([
    deleteCachedPrefix(env, CACHE_PREFIXES.memo),
    deleteCachedKey(env, CACHE_KEYS.tagList),
  ]);
}

export async function invalidateUserCache(env: Env): Promise<void> {
  await Promise.all([
    deleteCachedPrefix(env, CACHE_PREFIXES.user),
    deleteCachedPrefix(env, CACHE_PREFIXES.memo),
  ]);
}

export async function invalidateFriendCache(env: Env): Promise<void> {
  await deleteCachedKey(env, CACHE_KEYS.friendList);
}

export async function invalidateConfigCache(env: Env): Promise<void> {
  await deleteCachedPrefix(env, CACHE_PREFIXES.config);
}
