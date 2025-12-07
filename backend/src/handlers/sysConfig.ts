import { Env } from '../types';

// Helper function to get config value from database
async function getConfigValue(env: Env, name: string, defaultValue: any): Promise<any> {
  const result = await env.DB.prepare(
    'SELECT value FROM SysConfig WHERE name = ?'
  ).bind(name).first<{ value: string }>();

  if (!result?.value) {
    return defaultValue;
  }

  // Try to parse JSON, otherwise return as string
  try {
    return JSON.parse(result.value);
  } catch {
    return result.value;
  }
}

// Helper function to set config value in database
async function setConfigValue(env: Env, name: string, value: any): Promise<void> {
  const now = new Date().toISOString();
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

  // Use INSERT OR REPLACE to update or insert
  await env.DB.prepare(
    `INSERT OR REPLACE INTO SysConfig (name, value, createdAt, updatedAt)
     VALUES (?, ?, COALESCE((SELECT createdAt FROM SysConfig WHERE name = ?), ?), ?)`
  ).bind(name, valueStr, name, now, now).run();
}

export async function getSysConfig(request: Request, env: Env) {
  // Return public system configuration
  const config = {
    version: '1.0.0',
    commitId: '',
    adminUserName: await getConfigValue(env, 'adminUserName', 'admin'),
    title: await getConfigValue(env, 'title', '极简朋友圈'),
    favicon: await getConfigValue(env, 'favicon', '/favicon.png'),
    beiAnNo: await getConfigValue(env, 'beiAnNo', ''),
    css: await getConfigValue(env, 'css', ''),
    js: await getConfigValue(env, 'js', ''),
    rss: await getConfigValue(env, 'rss', '/rss'),
    enableAutoLoadNextPage: await getConfigValue(env, 'enableAutoLoadNextPage', true),
    enableS3: await getConfigValue(env, 'enableS3', false),
    enableRegister: await getConfigValue(env, 'enableRegister', true),
    enableGoogleRecaptcha: await getConfigValue(env, 'enableGoogleRecaptcha', false),
    googleSiteKey: await getConfigValue(env, 'googleSiteKey', ''),
    enableComment: await getConfigValue(env, 'enableComment', true),
    maxCommentLength: await getConfigValue(env, 'maxCommentLength', 500),
    memoMaxHeight: await getConfigValue(env, 'memoMaxHeight', 0),
    commentOrder: await getConfigValue(env, 'commentOrder', 'desc'),
    timeFormat: await getConfigValue(env, 'timeFormat', 'timeAgo'),
    s3: {
      thumbnailSuffix: ''
    },
    enableEmail: await getConfigValue(env, 'enableEmail', false),
    resendApiKey: '',
    emailFrom: ''
  };

  return Response.json({
    code: 0,
    data: config
  });
}

export async function getFullSysConfig(request: Request, env: Env) {
  // Return full system configuration including sensitive data
  const config = {
    version: '1.0.0',
    commitId: '',
    adminUserName: await getConfigValue(env, 'adminUserName', 'admin'),
    title: await getConfigValue(env, 'title', '极简朋友圈'),
    favicon: await getConfigValue(env, 'favicon', '/favicon.png'),
    css: await getConfigValue(env, 'css', ''),
    js: await getConfigValue(env, 'js', ''),
    enableAutoLoadNextPage: await getConfigValue(env, 'enableAutoLoadNextPage', true),
    enableComment: await getConfigValue(env, 'enableComment', true),
    enableRegister: await getConfigValue(env, 'enableRegister', true),
    maxCommentLength: await getConfigValue(env, 'maxCommentLength', 500),
    memoMaxHeight: await getConfigValue(env, 'memoMaxHeight', 0),
    commentOrder: await getConfigValue(env, 'commentOrder', 'desc'),
    timeFormat: await getConfigValue(env, 'timeFormat', 'timeAgo'),
    enableEmail: await getConfigValue(env, 'enableEmail', false),
    resendApiKey: await getConfigValue(env, 'resendApiKey', ''),
    emailFrom: await getConfigValue(env, 'emailFrom', '')
  };

  return Response.json({
    code: 0,
    data: config
  });
}

export async function saveSysConfig(request: Request, env: Env) {
  try {
    const body = await request.json();

    // Save each config value to database
    const configKeys = [
      'adminUserName', 'title', 'favicon', 'css', 'js',
      'enableAutoLoadNextPage', 'enableComment', 'enableRegister',
      'maxCommentLength', 'memoMaxHeight', 'commentOrder', 'timeFormat',
      'enableEmail', 'resendApiKey', 'emailFrom'
    ];

    for (const key of configKeys) {
      if (body[key] !== undefined) {
        await setConfigValue(env, key, body[key]);
      }
    }

    return Response.json({
      code: 0,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    console.error('Save config error:', error);
    return Response.json({
      code: 1,
      message: 'Failed to save configuration'
    }, { status: 500 });
  }
}
