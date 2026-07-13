import type { Env } from '../types';

export function normalizeR2Domain(value: unknown): string {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) {
    return '';
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) {
    throw new Error('R2 域名仅支持 HTTP 或 HTTPS');
  }

  const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname || url.username || url.password) {
    throw new Error('R2 域名仅支持 HTTP 或 HTTPS');
  }

  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

export function getR2Domain(env: Env): string {
  try {
    return normalizeR2Domain(env.R2_DOMAIN);
  } catch (error) {
    console.warn('Invalid R2 domain configuration, using Worker proxy:', error);
    return '';
  }
}

export function buildR2PublicUrl(domain: string, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${domain}/${encodedKey}`;
}
