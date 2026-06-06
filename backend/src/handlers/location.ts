import { Env, ErrorCodes, AppContext } from '../types';
import { successResp, failResp } from '../utils/response';
import { getConfigValue } from '../utils/sysConfig';

interface TencentGeocoderResponse {
  status: number;
  message?: string;
  result?: {
    address?: string;
    formatted_addresses?: {
      recommend?: string;
      rough?: string;
    };
    address_component?: {
      nation?: string;
      province?: string;
      city?: string;
      district?: string;
      street?: string;
      street_number?: string;
    };
    pois?: Array<{
      title?: string;
      address?: string;
      _distance?: number;
    }>;
  };
}

/**
 * 通过经纬度逆地址解析获取地址（腾讯位置服务 WebService API）。
 * 浏览器 navigator.geolocation 返回 WGS-84(GPS) 坐标，因此固定 coord_type=1。
 * Key 仅保存在后端配置中，不会下发到浏览器。
 */
export async function reverseGeocode(request: Request, env: Env, ctx: AppContext): Promise<Response> {
  if (!ctx.user) {
    return failResp(ErrorCodes.TOKEN_MISSING);
  }

  try {
    const body = await request.json() as { lat?: number; lng?: number };
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return failResp(ErrorCodes.PARAM_ERROR, '缺少有效的经纬度');
    }

    const key = await getConfigValue<string>(env, 'tencentLbsKey', '');
    if (!key) {
      return failResp(ErrorCodes.FAIL, '管理员尚未配置腾讯位置服务 Key');
    }

    // location 顺序为「纬度,经度」；coord_type=1 表示输入为 GPS(WGS-84) 坐标；get_poi=1 返回周边地点。
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&coord_type=1&get_poi=1&key=${encodeURIComponent(key)}`;

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'moments-cloudflare' },
    });

    if (!resp.ok) {
      return failResp(ErrorCodes.FAIL, '腾讯位置服务请求失败');
    }

    const data = await resp.json() as TencentGeocoderResponse;

    if (data.status !== 0 || !data.result) {
      return failResp(ErrorCodes.FAIL, data.message || '逆地址解析失败');
    }

    const result = data.result;
    const component = result.address_component || {};
    const address = result.address || result.formatted_addresses?.recommend || '';
    const poi = result.pois?.[0]?.title || '';

    // 完整地址 + 周边地点：以最近地标(POI)为主，附带完整街道地址。
    let location = address;
    if (poi && !address.includes(poi)) {
      location = `${poi} ${address}`;
    }

    // 兜底：连地址都没有时用省/市/区拼接（直辖市会自动去重）。
    if (!location) {
      location = [component.province, component.city, component.district]
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .join(' ');
    }

    return successResp({
      location,
      address,
      recommend: result.formatted_addresses?.recommend || '',
      poi,
      province: component.province || '',
      city: component.city || '',
      district: component.district || '',
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return failResp(ErrorCodes.FAIL, '逆地址解析失败');
  }
}
