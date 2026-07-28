/** Entity & response shapes shared between server and mobile client. */

export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionDto {
  id: string;
  deviceInfo: string | null;
  ip: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

/** Returned to mobile clients; web clients rely on cookies. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserDto;
  session: SessionDto;
  tokens: AuthTokens;
}

export interface FolderDto {
  id: string;
  name: string;
  protected: boolean;
  bookmarkCount: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkDto {
  id: string;
  folderId: string;
  url: string;
  title: string;
  description: string | null;
  domain: string;
  contentText: string | null;
  contentMarkdown: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full bookmark including HTML — only returned by GET /bookmarks/:id (reader). */
export interface BookmarkDetailDto extends BookmarkDto {
  contentHtml: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ServerInfoDto {
  name: string;
  version: string;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
