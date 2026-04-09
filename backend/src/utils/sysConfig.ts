import { Env } from '../types';

export async function getConfigValue<T = unknown>(env: Env, name: string, defaultValue: T): Promise<T> {
  const result = await env.DB.prepare(
    'SELECT value FROM SysConfig WHERE name = ?'
  ).bind(name).first<{ value: string }>();

  if (!result?.value) {
    return defaultValue;
  }

  try {
    return JSON.parse(result.value) as T;
  } catch {
    return result.value as T;
  }
}

export async function setConfigValue(env: Env, name: string, value: unknown): Promise<void> {
  const now = new Date().toISOString();
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

  await env.DB.prepare(
    `INSERT OR REPLACE INTO SysConfig (name, value, createdAt, updatedAt)
     VALUES (?, ?, COALESCE((SELECT createdAt FROM SysConfig WHERE name = ?), ?), ?)`
  ).bind(name, valueStr, name, now, now).run();
}
