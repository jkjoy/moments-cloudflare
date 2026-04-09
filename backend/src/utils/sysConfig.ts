import { Env } from '../types';

export async function getConfigValue<T = unknown>(env: Env, name: string, defaultValue: T): Promise<T> {
  const result = await env.DB.prepare(
    'SELECT value FROM SysConfig WHERE name = ? ORDER BY datetime(updatedAt) DESC, id DESC LIMIT 1'
  ).bind(name).first<{ value: string }>();

  if (!result || result.value == null) {
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

  const existing = await env.DB.prepare(
    'SELECT id FROM SysConfig WHERE name = ? ORDER BY id DESC LIMIT 1'
  ).bind(name).first<{ id: number }>();

  if (existing?.id) {
    // Update all rows with the same name so old duplicated data stays consistent.
    await env.DB.prepare(
      'UPDATE SysConfig SET value = ?, updatedAt = ? WHERE name = ?'
    ).bind(valueStr, now, name).run();
    return;
  }

  await env.DB.prepare(
    `INSERT INTO SysConfig (name, value, createdAt, updatedAt)
     VALUES (?, ?, ?, ?)`
  ).bind(name, valueStr, now, now).run();
}
