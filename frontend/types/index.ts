// API Response types
export type ResultVO<T> = {
  code: number;
  message?: string;
  data: T;
};

export type ApiResponse<T = any> = ResultVO<T>;

// User types
export type LoginResp = {
  id: number;
  token: string;
  username: string;
};

export type UserVO = {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string;
  slogan: string;
  coverUrl: string;
  email: string;
  title?: string;
};

export type User = UserVO;

// Comment types
export type CommentVO = {
  id: number;
  content: string;
  username: string;
  website?: string;
  replyTo: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  memoId: number;
  author: number;
};

export type Comment = CommentVO;

// Memo types
export type ImgConfig = {
  url: string;
  thumbUrl: string;
};

export type MemoVO = {
  id: number;
  content: string;
  location: string;
  imgs: string;
  imgConfigs?: ImgConfig[];
  favCount: number;
  commentCount?: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  externalFavicon: string;
  pinned: boolean;
  ext: string;
  externalTitle: string;
  externalUrl: string;
  showType: number;
  user: UserVO;
  comments: Array<CommentVO>;
  tags: string;
};

export type Memo = MemoVO;

// System config types
export type SysConfigVO = {
  version: string;
  commitId: string;
  adminUserName: string;
  title: string;
  favicon: string;
  beiAnNo: string;
  css: string;
  js: string;
  rss: string;
  enableAutoLoadNextPage: boolean;
  enableS3: boolean;
  enableRegister: boolean;
  enableGoogleRecaptcha: boolean;
  googleSiteKey: string;
  enableComment: boolean;
  maxCommentLength: number;
  memoMaxHeight: number;
  commentOrder: "desc" | "asc";
  timeFormat: "timeAgo" | "time";
  s3: {
    thumbnailSuffix: string;
  };
  enableEmail: boolean;
  resendApiKey: string;
  emailFrom: string;
};

// Music types
export type MetingJSDTO = {
  id: string | undefined;
  api: string | undefined;
  server: "netease" | "tencent" | "kugou" | "xiami" | "baidu" | undefined;
  type: "song" | "playlist" | "album" | "search" | "artist" | undefined;
};

export type MetingMusicServer = Exclude<MetingJSDTO["server"], undefined>;
export type MetingMusicType = Exclude<MetingJSDTO["type"], undefined>;

export type MusicDTO = {
  id?: string;
  server?: MetingMusicServer;
  type?: MetingMusicType;
  api?: string;
};

// Douban types
export type DoubanBook = {
  url?: string;
  id?: string;
  title?: string;
  desc?: string;
  image?: string;
  isbn?: string;
  author?: string;
  rating?: string;
  pubDate?: string;
  keywords?: string;
};

export type DoubanMovie = {
  url?: string;
  id?: string;
  title?: string;
  desc?: string;
  image?: string;
  director?: string;
  releaseDate?: string;
  rating?: string;
  actors?: string;
  runtime?: string;
};

// Video types
export type Video = {
  type: "youtube" | "bilibili" | "online";
  value: string;
};

export type VideoType = Video["type"];

// Extension types
export type ExtDTO = {
  music: MusicDTO;
  doubanBook: DoubanBook;
  doubanMovie: DoubanMovie;
  video: Video;
};

// Friend types
export type Friend = {
  id: number;
  name: string;
  icon: string;
  url: string;
  desc: string;
};
