// Environment bindings
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

// Database Models
export interface User {
  id: number;
  username: string;
  nickname: string;
  password: string;
  avatarUrl?: string;
  slogan?: string;
  coverUrl?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  enableS3?: string;
  domain?: string;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
  thumbnailSuffix?: string;
  favicon?: string;
  title?: string;
  beianNo?: string;
  css?: string;
  js?: string;
}

export interface Memo {
  id: number;
  content: string;
  imgs?: string;
  favCount: number;
  commentCount: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  music163Url?: string;
  bilibiliUrl?: string;
  location?: string;
  externalUrl?: string;
  externalTitle?: string;
  externalFavicon?: string;
  pinned: number;
  ext?: string;
  showType: number;
  user?: Partial<User>;
  comments?: Comment[];
  tags?: string;
  imgConfigs?: ImgConfig[];
}

export interface Comment {
  id: number;
  content: string;
  replyTo?: string;
  replyEmail?: string;
  username?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
  memoId: number;
  author?: string;
}

export interface Friend {
  id: number;
  name: string;
  icon?: string;
  url?: string;
  desc?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SysConfig {
  id: number;
  name: string;
  value?: string;
  createdAt: string;
  updatedAt: string;
}

// Request/Response DTOs
export interface LoginReq {
  username: string;
  password: string;
}

export interface RegReq {
  username: string;
  password: string;
  repeatPassword: string;
}

export interface ProfileReq {
  nickname: string;
  avatarUrl?: string;
  slogan?: string;
  coverUrl?: string;
  email?: string;
  password?: string;
}

export interface SaveMemoReq {
  id?: number;
  content: string;
  imgs: string[];
  location?: string;
  externalUrl?: string;
  externalTitle?: string;
  externalFavicon?: string;
  pinned?: boolean;
  ext?: any;
  showType?: number;
  tags?: string[];
  createdAt?: string;
}

export interface ListMemoReq {
  page: number;
  size: number;
  start?: string;
  end?: string;
  contentContains?: string;
  showType?: number;
  tag?: string;
  username?: string;
  userId?: number;
}

export interface AddCommentReq {
  memoId: number;
  content: string;
  replyTo?: string;
  username?: string;
  email?: string;
  website?: string;
}

export interface ImgConfig {
  url: string;
  thumbUrl: string;
}

// API Response
export interface ApiResponse<T = any> {
  code: number;
  message?: string;
  data?: T;
}

// Context with current user
export interface AppContext {
  user?: User;
}

export const ErrorCodes = {
  SUCCESS: 0,
  FAIL: 1,
  PARAM_ERROR: 2,
  TOKEN_INVALID: 3,
  TOKEN_MISSING: 4,
} as const;
