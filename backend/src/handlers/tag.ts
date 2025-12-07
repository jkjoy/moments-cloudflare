import { Env, ErrorCodes } from '../types';
import { successResp, failResp } from '../utils/response';

export async function listTags(request: Request, env: Env): Promise<Response> {
  try {
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

    return successResp({
      tags: Array.from(tagsSet).sort()
    });
  } catch (error) {
    console.error('List tags error:', error);
    return failResp(ErrorCodes.FAIL, '获取标签列表失败');
  }
}
