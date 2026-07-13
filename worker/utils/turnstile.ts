import { Env } from '../types';

type TurnstileVerifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
};

type TurnstileVerifyResult = {
  ok: boolean;
  errors?: string[];
};

function getClientIp(request: Request): string | null {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(',')[0]?.trim() || null;
}

export async function verifyTurnstileToken(
  request: Request,
  env: Env,
  token: string
): Promise<TurnstileVerifyResult> {
  if (!env.TURNSTILE_SECRET_KEY) {
    return {
      ok: false,
      errors: ['missing-input-secret'],
    };
  }

  const formData = new URLSearchParams();
  formData.set('secret', env.TURNSTILE_SECRET_KEY);
  formData.set('response', token);

  const remoteIp = getClientIp(request);
  if (remoteIp) {
    formData.set('remoteip', remoteIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    return {
      ok: false,
      errors: ['bad-turnstile-response'],
    };
  }

  const result = await response.json() as TurnstileVerifyResponse;

  if (!result.success) {
    return {
      ok: false,
      errors: result['error-codes'] || ['invalid-input-response'],
    };
  }

  if (result.action && result.action !== 'comment') {
    return {
      ok: false,
      errors: ['action-mismatch'],
    };
  }

  return {
    ok: true,
  };
}
