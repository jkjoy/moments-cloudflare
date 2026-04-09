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

interface DoubanMovieAbstractResponse {
  r: number;
  subject?: {
    title?: string;
    url?: string;
    rate?: string;
    id?: string;
    directors?: string[];
    actors?: string[];
    duration?: string;
    release_year?: string;
    short_comment?: {
      content?: string;
    };
  };
}

interface DoubanMovieSuggestItem {
  id: string;
  title: string;
  url: string;
  img: string;
  year?: string;
  sub_title?: string;
}

const DOUBAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

async function cacheDoubanCoverToR2(env: Env, sourceUrl: string, key: string): Promise<string> {
  try {
    const existing = await env.BUCKET.head(key);
    if (existing) {
      return `/r2/${key}`;
    }

    const response = await fetch(sourceUrl, {
      headers: DOUBAN_HEADERS,
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

async function fetchDoubanJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: DOUBAN_HEADERS,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('Fetch Douban JSON error:', error);
    return null;
  }
}

function stripMovieYear(title: string): string {
  return title.replace(/\s*[（(]\d{4}[）)]\s*$/, '').trim();
}

function getMoviePrimaryTitle(title: string): string {
  const normalizedTitle = stripMovieYear(title);
  const localizedTitle = normalizedTitle.match(/^(.*?)(?=\s+[A-Za-z0-9])/);

  return localizedTitle?.[1]?.trim() || normalizedTitle;
}

function pickMovieDescription(subject: DoubanMovieAbstractResponse['subject']): string {
  if (!subject) {
    return '';
  }

  if (subject.short_comment?.content) {
    return subject.short_comment.content.trim();
  }

  const parts = [
    subject.directors?.[0],
    subject.actors?.slice(0, 3).join(' / '),
    subject.duration,
    subject.release_year,
  ].filter(Boolean);

  return parts.join(' · ');
}

async function resolveMoviePoster(env: Env, id: string, title: string): Promise<string> {
  const queries = [...new Set([
    getMoviePrimaryTitle(title),
    stripMovieYear(title),
  ].filter(Boolean))];

  for (const query of queries) {
    const suggestions = await fetchDoubanJson<DoubanMovieSuggestItem[]>(
      `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`
    );

    if (!suggestions?.length) {
      continue;
    }

    const matchedSuggestion = suggestions.find((item) => item.id === id) || suggestions[0];
    if (matchedSuggestion?.img) {
      return cacheDoubanCoverToR2(env, matchedSuggestion.img, `douban/movie/${id}`);
    }
  }

  return '';
}

export async function getDoubanBookInfo(request: Request, env: Env, id: string): Promise<Response> {
  try {
    if (!id) {
      return failResp(ErrorCodes.PARAM_ERROR, '请提供豆瓣读书ID');
    }

    const url = `https://book.douban.com/subject/${id}/`;

    // Fetch the page
    const response = await fetch(url, {
      headers: DOUBAN_HEADERS,
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

    const abstract = await fetchDoubanJson<DoubanMovieAbstractResponse>(
      `https://movie.douban.com/j/subject_abstract?subject_id=${encodeURIComponent(id)}`
    );
    const subject = abstract?.subject;

    if (!abstract || abstract.r !== 0 || !subject) {
      return failResp(ErrorCodes.FAIL, '获取豆瓣电影信息失败');
    }

    const title = getMoviePrimaryTitle(subject.title || '');
    const image = subject.title
      ? await resolveMoviePoster(env, id, subject.title)
      : '';

    const movieInfo: DoubanMovieInfo = {
      id,
      url: subject.url || `https://movie.douban.com/subject/${id}/`,
      title: title || stripMovieYear(subject.title || ''),
      desc: pickMovieDescription(subject),
      image,
      director: subject.directors?.[0] || '',
      releaseDate: subject.release_year || '',
      rating: subject.rate || '',
      actors: subject.actors?.slice(0, 5).join(' / ') || '',
      runtime: subject.duration || '',
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
