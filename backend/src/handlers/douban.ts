import { Env, ErrorCodes } from '../types';
import { successResp, failResp } from '../utils/response';

interface DoubanBookInfo {
  id: string;
  url: string;
  title: string;
  desc: string;
  image: string;
  isbn: string;
  author: string;
  rating: string;
  pubDate: string;
  keywords: string;
}

interface DoubanMovieInfo {
  id: string;
  url: string;
  title: string;
  desc: string;
  image: string;
  director: string;
  releaseDate: string;
  rating: string;
  actors: string;
  runtime: string;
}

async function cacheDoubanCoverToR2(env: Env, sourceUrl: string, key: string): Promise<string> {
  try {
    const existing = await env.BUCKET.head(key);
    if (existing) {
      return `/r2/${key}`;
    }

    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok || !response.body) {
      return sourceUrl;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const body = await response.arrayBuffer();

    await env.BUCKET.put(key, body, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        sourceUrl,
        cachedAt: new Date().toISOString(),
      },
    });

    return `/r2/${key}`;
  } catch (error) {
    console.error('Cache Douban cover to R2 error:', error);
    return sourceUrl;
  }
}

export async function getDoubanBookInfo(request: Request, env: Env, id: string): Promise<Response> {
  try {
    if (!id) {
      return failResp(ErrorCodes.PARAM_ERROR, '请提供豆瓣读书ID');
    }

    const url = `https://book.douban.com/subject/${id}/`;

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return failResp(ErrorCodes.FAIL, '获取豆瓣读书信息失败');
    }

    const html = await response.text();

    // Fetch via image proxy first, then cache into R2 to avoid future external hotlink failures.
    const imageSourceUrl = `https://dou.img.lithub.cc/book/${id}.jpg`;
    const image = await cacheDoubanCoverToR2(env, imageSourceUrl, `douban/book/${id}`);

    const bookInfo: DoubanBookInfo = {
      id,
      url,
      title: extractContent(html, /<h1[^>]*><span[^>]*property="v:itemreviewed"[^>]*>([^<]+)<\/span>/) ||
             extractContent(html, /<span[^>]*property="v:itemreviewed"[^>]*>([^<]+)<\/span>/),
      desc: extractContent(html, /<meta\s+property="og:description"\s+content="([^"]+)"/) ||
            extractContent(html, /<span[^>]*class="intro"[^>]*>([\s\S]*?)<\/span>/),
      image,
      isbn: extractContent(html, /ISBN:\s*([0-9-]+)/) ||
            extractContent(html, /<span[^>]*>ISBN:<\/span>\s*([0-9-]+)/),
      author: extractContent(html, /<span[^>]*>\s*作者<\/span>[\s\S]*?<a[^>]*>([^<]+)<\/a>/) ||
              extractContent(html, /<a[^>]*class="author"[^>]*>([^<]+)<\/a>/),
      rating: extractContent(html, /<strong[^>]*property="v:average"[^>]*>([^<]+)<\/strong>/),
      pubDate: extractContent(html, /<span[^>]*>\s*出版年:<\/span>([^<\n]+)/) ||
               extractContent(html, /<span[^>]*>出版年:<\/span>\s*([^<\n]+)/),
      keywords: extractContent(html, /<meta\s+name="keywords"\s+content="([^"]+)"/),
    };

    return successResp(bookInfo);
  } catch (error) {
    console.error('Get Douban book info error:', error);
    return failResp(ErrorCodes.FAIL, '获取豆瓣读书信息失败');
  }
}

export async function getDoubanMovieInfo(request: Request, env: Env, id: string): Promise<Response> {
  try {
    if (!id) {
      return failResp(ErrorCodes.PARAM_ERROR, '请提供豆瓣电影ID');
    }

    const url = `https://movie.douban.com/subject/${id}/`;

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return failResp(ErrorCodes.FAIL, '获取豆瓣电影信息失败');
    }

    const html = await response.text();

    // Fetch via image proxy first, then cache into R2 to avoid future external hotlink failures.
    const imageSourceUrl = `https://dou.img.lithub.cc/movie/${id}.jpg`;
    const image = await cacheDoubanCoverToR2(env, imageSourceUrl, `douban/movie/${id}`);

    const movieInfo: DoubanMovieInfo = {
      id,
      url,
      title: extractContent(html, /<span[^>]*property="v:itemreviewed"[^>]*>([^<]+)<\/span>/) ||
             extractContent(html, /<h1[^>]*>([^<]+)<\/h1>/),
      desc: extractContent(html, /<meta\s+property="og:description"\s+content="([^"]+)"/) ||
            extractContent(html, /<span[^>]*class="all hidden"[^>]*>([\s\S]*?)<\/span>/),
      image,
      director: extractContent(html, /<a[^>]*rel="v:directedBy"[^>]*>([^<]+)<\/a>/),
      releaseDate: extractContent(html, /<span[^>]*property="v:initialReleaseDate"[^>]*>([^<]+)<\/span>/),
      rating: extractContent(html, /<strong[^>]*property="v:average"[^>]*>([^<]+)<\/strong>/),
      actors: extractActors(html),
      runtime: extractContent(html, /<span[^>]*property="v:runtime"[^>]*>([^<]+)<\/span>/),
    };

    return successResp(movieInfo);
  } catch (error) {
    console.error('Get Douban movie info error:', error);
    return failResp(ErrorCodes.FAIL, '获取豆瓣电影信息失败');
  }
}

// Helper function to extract content using regex
function extractContent(html: string, regex: RegExp): string {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

// Helper function to extract actors
function extractActors(html: string): string {
  const actorRegex = /<a[^>]*rel="v:starring"[^>]*>([^<]+)<\/a>/g;
  const actors: string[] = [];
  let match;

  while ((match = actorRegex.exec(html)) !== null && actors.length < 5) {
    actors.push(match[1].trim());
  }

  return actors.join(' / ');
}
