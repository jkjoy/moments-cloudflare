import { Env, ErrorCodes } from '../types';
import { successResp, failResp } from '../utils/response';
import { CACHE_KEYS, CACHE_TTL_SECONDS, getCachedJson, setCachedJson } from '../utils/cache';

export async function listTags(request: Request, env: Env): Promise<Response> {
  try {
    const cached = await getCachedJson(env, CACHE_KEYS.tagList);
    if (cached) {
      return successResp(cached);
    }

    // Query all unique tags from Memo table
    const result = await env.DB.prepare(
      `SELECT DISTINCT tags FROM Memo WHERE tags IS NOT NULL AND tags != ''`
    ).all();

    // Extract and flatten all tags
    const tagsSet = new Set<string>();
    if (result.results) {
      for (const row of result.results) {
        const tagString = (row as any).tags as string;
        if (tagString) {
          // Tags are stored as comma-separated values ending with comma
          const tags = tagString.split(',').filter(Boolean);
          tags.forEach(tag => tagsSet.add(tag.trim()));
        }
      }
    }

    const data = {
      tags: Array.from(tagsSet).sort()
    };

    await setCachedJson(env, CACHE_KEYS.tagList, data, CACHE_TTL_SECONDS.long);

    return successResp(data);
  } catch (error) {
    console.error('List tags error:', error);
    return failResp(ErrorCodes.FAIL, '获取标签列表失败');
  }
}
