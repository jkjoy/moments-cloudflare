import { Env } from '../types';

type ConfigMap = Record<string, unknown>;

function parseConfigValue(value: string | null): unknown {
  if (value == null) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function getConfigValue<T = unknown>(env: Env, name: string, defaultValue: T): Promise<T> {
  const result = await env.DB.prepare(
    'SELECT value FROM SysConfig WHERE name = ? ORDER BY datetime(updatedAt) DESC, id DESC LIMIT 1'
  ).bind(name).first<{ value: string }>();

  if (!result || result.value == null) {
    return defaultValue;
  }

  const value = parseConfigValue(result.value);
  if (value === undefined) {
    return defaultValue;
  }

  return value as T;
}

export async function getConfigValues(env: Env): Promise<ConfigMap> {
  const rows = await env.DB.prepare(
    'SELECT name, value FROM SysConfig ORDER BY datetime(updatedAt) ASC, id ASC'
  ).all<{ name: string; value: string | null }>();

  const config: ConfigMap = {};
  for (const row of rows.results || []) {
    config[row.name] = parseConfigValue(row.value);
  }

  return config;
}

export function getConfigValueFromMap<T>(config: ConfigMap, name: string, defaultValue: T): T {
  const value = config[name];
  return value === undefined ? defaultValue : value as T;
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
