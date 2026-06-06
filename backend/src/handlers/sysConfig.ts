import { AppContext, Env, ErrorCodes } from '../types';
import { failResp } from '../utils/response';
import { getConfigValueFromMap, getConfigValues, setConfigValue } from '../utils/sysConfig';

function requireAdmin(ctx: AppContext): Response | null {
  if (!ctx.user) {
    return failResp(ErrorCodes.TOKEN_MISSING);
  }

  if (ctx.user.id !== 1) {
    return failResp(ErrorCodes.FAIL, '没有权限');
  }

  return null;
}

function getReleaseMeta(env: Env, configValues: Record<string, unknown>) {
  return {
    version: env.APP_VERSION || getConfigValueFromMap(configValues, 'version', '1.0.0'),
    commitId: env.APP_COMMIT_ID || getConfigValueFromMap(configValues, 'commitId', ''),
  };
}

export async function getSysConfig(request: Request, env: Env) {
  // Return public system configuration
  const configValues = await getConfigValues(env);
  const releaseMeta = getReleaseMeta(env, configValues);
  const config = {
    version: releaseMeta.version,
    commitId: releaseMeta.commitId,
    adminUserName: getConfigValueFromMap(configValues, 'adminUserName', 'admin'),
    title: getConfigValueFromMap(configValues, 'title', '极简朋友圈'),
    favicon: getConfigValueFromMap(configValues, 'favicon', '/favicon.png'),
    beiAnNo: getConfigValueFromMap(configValues, 'beiAnNo', ''),
    css: getConfigValueFromMap(configValues, 'css', ''),
    js: getConfigValueFromMap(configValues, 'js', ''),
    rss: getConfigValueFromMap(configValues, 'rss', '/rss'),
    enableAutoLoadNextPage: getConfigValueFromMap(configValues, 'enableAutoLoadNextPage', true),
    enableS3: getConfigValueFromMap(configValues, 'enableS3', false),
    enableRegister: getConfigValueFromMap(configValues, 'enableRegister', true),
    enableGoogleRecaptcha: getConfigValueFromMap(configValues, 'enableGoogleRecaptcha', false),
    googleSiteKey: getConfigValueFromMap(configValues, 'googleSiteKey', ''),
    enableTurnstile: getConfigValueFromMap(configValues, 'enableTurnstile', false),
    turnstileSiteKey: getConfigValueFromMap(configValues, 'turnstileSiteKey', ''),
    enableComment: getConfigValueFromMap(configValues, 'enableComment', true),
    maxCommentLength: getConfigValueFromMap(configValues, 'maxCommentLength', 500),
    memoMaxHeight: getConfigValueFromMap(configValues, 'memoMaxHeight', 0),
    commentOrder: getConfigValueFromMap(configValues, 'commentOrder', 'desc'),
    timeFormat: getConfigValueFromMap(configValues, 'timeFormat', 'timeAgo'),
    s3: {
      thumbnailSuffix: ''
    },
    // Only expose whether the Tencent LBS feature is on; never leak the key itself.
    enableTencentLbs: !!getConfigValueFromMap(configValues, 'tencentLbsKey', ''),
    enableEmail: getConfigValueFromMap(configValues, 'enableEmail', false),
    resendApiKey: '',
    emailFrom: ''
  };

  return Response.json({
    code: 0,
    data: config
  });
}

export async function getFullSysConfig(request: Request, env: Env, ctx: AppContext) {
  const unauthorized = requireAdmin(ctx);
  if (unauthorized) {
    return unauthorized;
  }

  // Return full system configuration including sensitive data
  const configValues = await getConfigValues(env);
  const releaseMeta = getReleaseMeta(env, configValues);
  const config = {
    version: releaseMeta.version,
    commitId: releaseMeta.commitId,
    adminUserName: getConfigValueFromMap(configValues, 'adminUserName', 'admin'),
    title: getConfigValueFromMap(configValues, 'title', '极简朋友圈'),
    favicon: getConfigValueFromMap(configValues, 'favicon', '/favicon.png'),
    css: getConfigValueFromMap(configValues, 'css', ''),
    js: getConfigValueFromMap(configValues, 'js', ''),
    enableAutoLoadNextPage: getConfigValueFromMap(configValues, 'enableAutoLoadNextPage', true),
    enableComment: getConfigValueFromMap(configValues, 'enableComment', true),
    enableRegister: getConfigValueFromMap(configValues, 'enableRegister', true),
    enableTurnstile: getConfigValueFromMap(configValues, 'enableTurnstile', false),
    turnstileSiteKey: getConfigValueFromMap(configValues, 'turnstileSiteKey', ''),
    maxCommentLength: getConfigValueFromMap(configValues, 'maxCommentLength', 500),
    memoMaxHeight: getConfigValueFromMap(configValues, 'memoMaxHeight', 0),
    commentOrder: getConfigValueFromMap(configValues, 'commentOrder', 'desc'),
    timeFormat: getConfigValueFromMap(configValues, 'timeFormat', 'timeAgo'),
    enableEmail: getConfigValueFromMap(configValues, 'enableEmail', false),
    resendApiKey: getConfigValueFromMap(configValues, 'resendApiKey', ''),
    emailFrom: getConfigValueFromMap(configValues, 'emailFrom', ''),
    tencentLbsKey: getConfigValueFromMap(configValues, 'tencentLbsKey', '')
  };

  return Response.json({
    code: 0,
    data: config
  });
}

export async function saveSysConfig(request: Request, env: Env, ctx: AppContext) {
  const unauthorized = requireAdmin(ctx);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json() as Record<string, unknown>;

    // Save each config value to database
    const configKeys = [
      'adminUserName', 'title', 'favicon', 'css', 'js',
      'enableAutoLoadNextPage', 'enableComment', 'enableRegister',
      'enableTurnstile', 'turnstileSiteKey',
      'maxCommentLength', 'memoMaxHeight', 'commentOrder', 'timeFormat',
      'enableEmail', 'resendApiKey', 'emailFrom',
      'tencentLbsKey'
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
