import { Env } from '../types';
import { getConfigValue, setConfigValue } from '../utils/sysConfig';

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
    enableTurnstile: await getConfigValue(env, 'enableTurnstile', false),
    turnstileSiteKey: await getConfigValue(env, 'turnstileSiteKey', ''),
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
    enableTurnstile: await getConfigValue(env, 'enableTurnstile', false),
    turnstileSiteKey: await getConfigValue(env, 'turnstileSiteKey', ''),
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
    const body = await request.json() as Record<string, unknown>;

    // Save each config value to database
    const configKeys = [
      'adminUserName', 'title', 'favicon', 'css', 'js',
      'enableAutoLoadNextPage', 'enableComment', 'enableRegister',
      'enableTurnstile', 'turnstileSiteKey',
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
