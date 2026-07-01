export type XPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type XAccount = {
  accessToken: string;
  connectedAt: string;
  id: string;
  lastError?: string;
  refreshToken: string;
  revokedAt?: string;
  scopes: string[];
  tokenExpiry: string;
  updatedAt: string;
  userId: string;
  username: string;
  xUserId: string;
};

export type XAccountPublic = {
  connectedAt: string;
  id: string;
  scopes: string[];
  tokenExpiry: string;
  username: string;
  xUserId: string;
};

export type XConnectionStatus = {
  account?: XAccountPublic;
  configured: boolean;
  connected: boolean;
  error?: string;
  missing?: string[];
};

export type ScheduledXPost = {
  campaignId?: string;
  createdAt: string;
  errorMessage?: string;
  id: string;
  label?: string;
  publishedAt: string | null;
  repository?: string;
  scheduledFor: string | null;
  sourceId?: string;
  status: XPostStatus;
  text: string;
  updatedAt: string;
  userId: string;
  xAccountId: string;
  xPostId: string | null;
  xPostUrl: string | null;
};

export type XPostInput = {
  label?: string;
  scheduledFor?: string | null;
  sourceId: string;
  text: string;
};
