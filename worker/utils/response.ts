import { ApiResponse, ErrorCodes } from '../types';

export function successResp<T>(data: T): Response {
  const resp: ApiResponse<T> = {
    code: ErrorCodes.SUCCESS,
    data,
  };
  return new Response(JSON.stringify(resp), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function failResp(code: number, message?: string): Response {
  const messages: Record<number, string> = {
    [ErrorCodes.SUCCESS]: '成功',
    [ErrorCodes.FAIL]: '失败',
    [ErrorCodes.PARAM_ERROR]: '参数错误',
    [ErrorCodes.TOKEN_INVALID]: 'Token无效',
    [ErrorCodes.TOKEN_MISSING]: 'Token缺失',
  };

  const resp: ApiResponse = {
    code,
    message: message || messages[code] || '未知错误',
  };

  return new Response(JSON.stringify(resp), {
    headers: { 'Content-Type': 'application/json' },
  });
}
