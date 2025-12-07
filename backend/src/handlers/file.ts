import { Env, AppContext, ErrorCodes } from '../types';
import { successResp, failResp } from '../utils/response';

// 允许的文件类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function uploadFile(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return failResp(ErrorCodes.TOKEN_MISSING);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return failResp(ErrorCodes.PARAM_ERROR, '没有上传文件');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return failResp(ErrorCodes.PARAM_ERROR, `文件大小超过限制 (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return failResp(ErrorCodes.PARAM_ERROR, '不支持的文件类型，仅支持图片和视频');
    }

    // Generate filename with timestamp + original extension
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const filename = `${timestamp}.${ext}`;

    // Upload directly to Cloudflare R2
    await env.BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        userId: ctx.user.id.toString(),
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return R2 URL
    const url = `/r2/${filename}`;

    console.log(`File uploaded successfully to R2: ${filename} by user ${ctx.user.id}`);

    return successResp({ url });
  } catch (error) {
    console.error('Upload file error:', error);
    return failResp(ErrorCodes.FAIL, '文件上传失败');
  }
}

export async function getFile(request: Request, env: Env, key: string): Promise<Response> {
  try {
    const object = await env.BUCKET.get(key);

    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');

    // Add CORS headers for cross-origin access
    headers.set('access-control-allow-origin', '*');
    headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get file error:', error);
    return new Response('Error retrieving file', { status: 500 });
  }
}
