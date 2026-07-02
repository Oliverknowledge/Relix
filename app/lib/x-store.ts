import { promises as fs } from "fs";
import type { NextRequest } from "next/server";
import { decryptString, encryptString } from "@/app/lib/crypto";
import { dataDirectory, dataPath } from "@/app/lib/data-path";
import { getXAccountCookie } from "@/app/lib/x-account-cookie";
import type {
  ScheduledXPost,
  XAccount,
  XAccountPublic,
  XPostInput,
  XPostStatus
} from "@/app/lib/x-types";

const accountsFile = dataPath("x-accounts.json");
const postsFile = dataPath("x-posts.json");

export function publicXAccount(account: XAccount): XAccountPublic {
  return {
    connectedAt: account.connectedAt,
    id: account.id,
    scopes: account.scopes,
    tokenExpiry: account.tokenExpiry,
    username: account.username,
    xUserId: account.xUserId
  };
}

export async function getXAccountForUser(userId: string) {
  const accounts = await readAccounts();

  return (
    accounts
      .filter((account) => account.userId === userId && !account.revokedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null
  );
}

export async function getXAccountForRequest(
  request: NextRequest,
  userId: string
) {
  return (await getXAccountForUser(userId)) || getXAccountCookie(request, userId);
}

export async function upsertXAccount({
  accessToken,
  refreshToken,
  scopes,
  tokenExpiry,
  userId,
  username,
  xUserId
}: {
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  tokenExpiry: string;
  userId: string;
  username: string;
  xUserId: string;
}) {
  const accounts = await readAccounts();
  const now = new Date().toISOString();
  const id = xAccountId(userId, xUserId);
  const existingIndex = accounts.findIndex((account) => account.id === id);
  const connectedAt =
    existingIndex >= 0 ? accounts[existingIndex].connectedAt : now;
  const account: XAccount = {
    accessToken: encryptString(accessToken),
    connectedAt,
    id,
    refreshToken: encryptString(refreshToken),
    scopes,
    tokenExpiry,
    updatedAt: now,
    userId,
    username,
    xUserId
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  await writeAccounts(accounts);

  return account;
}

export async function updateXAccountTokens({
  accessToken,
  accountId,
  fallbackAccount,
  refreshToken,
  scopes,
  tokenExpiry
}: {
  accessToken: string;
  accountId: string;
  fallbackAccount?: XAccount;
  refreshToken?: string;
  scopes?: string[];
  tokenExpiry: string;
}) {
  const accounts = await readAccounts();
  const index = accounts.findIndex((account) => account.id === accountId);
  const baseAccount = index >= 0 ? accounts[index] : fallbackAccount;

  if (!baseAccount) {
    throw new Error("X account not found.");
  }

  const updatedAccount: XAccount = {
    ...baseAccount,
    accessToken: encryptString(accessToken),
    lastError: undefined,
    refreshToken: refreshToken
      ? encryptString(refreshToken)
      : baseAccount.refreshToken,
    revokedAt: undefined,
    scopes: scopes || baseAccount.scopes,
    tokenExpiry,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    accounts[index] = updatedAccount;
  } else {
    accounts.push(updatedAccount);
  }

  await writeAccounts(accounts);

  return updatedAccount;
}

export async function markXAccountRevoked(userId: string, message: string) {
  const accounts = await readAccounts();
  const now = new Date().toISOString();

  const next = accounts.map((account) =>
    account.userId === userId && !account.revokedAt
      ? {
          ...account,
          lastError: message,
          revokedAt: now,
          updatedAt: now
        }
      : account
  );

  await writeAccounts(next);
}

export async function disconnectXAccount(userId: string) {
  const accounts = await readAccounts();
  const nextAccounts = accounts.filter((account) => account.userId !== userId);
  const posts = await readPosts();
  const now = new Date().toISOString();
  const nextPosts = posts.map((post) =>
    post.userId === userId && post.status === "scheduled"
      ? {
          ...post,
          errorMessage: "X account disconnected before publishing.",
          status: "failed" as const,
          updatedAt: now
        }
      : post
  );

  await writeAccounts(nextAccounts);
  await writePosts(nextPosts);
}

export async function listScheduledXPosts({
  campaignId,
  userId
}: {
  campaignId?: string;
  userId: string;
}) {
  const posts = await readPosts();

  return posts
    .filter(
      (post) =>
        post.userId === userId && (!campaignId || post.campaignId === campaignId)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveXPostDrafts({
  campaignId,
  posts,
  repository,
  userId,
  xAccountId
}: {
  campaignId: string;
  posts: XPostInput[];
  repository: string;
  userId: string;
  xAccountId: string;
}) {
  return upsertXPosts({
    campaignId,
    posts: posts.map((post) => ({ ...post, scheduledFor: null })),
    repository,
    status: "draft",
    userId,
    xAccountId
  });
}

export async function scheduleXPosts({
  campaignId,
  posts,
  repository,
  userId,
  xAccountId
}: {
  campaignId: string;
  posts: XPostInput[];
  repository: string;
  userId: string;
  xAccountId: string;
}) {
  return upsertXPosts({
    campaignId,
    posts,
    repository,
    status: "scheduled",
    userId,
    xAccountId
  });
}

export async function updateScheduledXPost({
  postId,
  scheduledFor,
  text,
  userId
}: {
  postId: string;
  scheduledFor?: string | null;
  text?: string;
  userId: string;
}) {
  const posts = await readPosts();
  const index = posts.findIndex(
    (post) => post.id === postId && post.userId === userId
  );

  if (index === -1) {
    throw new Error("X post not found.");
  }

  if (posts[index].status === "published" || posts[index].status === "publishing") {
    throw new Error("Published posts cannot be edited.");
  }

  posts[index] = {
    ...posts[index],
    scheduledFor:
      scheduledFor === undefined ? posts[index].scheduledFor : scheduledFor,
    status: scheduledFor === null ? "draft" : posts[index].status,
    text: text === undefined ? posts[index].text : text,
    updatedAt: new Date().toISOString()
  };

  await writePosts(posts);

  return posts[index];
}

export async function cancelScheduledXPost({
  postId,
  userId
}: {
  postId: string;
  userId: string;
}) {
  const posts = await readPosts();
  const index = posts.findIndex(
    (post) => post.id === postId && post.userId === userId
  );

  if (index === -1) {
    throw new Error("X post not found.");
  }

  if (posts[index].status !== "scheduled") {
    throw new Error("Only scheduled posts can be cancelled.");
  }

  posts[index] = {
    ...posts[index],
    scheduledFor: null,
    status: "draft",
    updatedAt: new Date().toISOString()
  };

  await writePosts(posts);

  return posts[index];
}

export async function prepareApprovedXPost({
  campaignId,
  label,
  repository,
  sourceId,
  text,
  userId,
  xAccountId
}: {
  campaignId?: string;
  label?: string;
  repository?: string;
  sourceId?: string;
  text: string;
  userId: string;
  xAccountId: string;
}) {
  const posts = await readPosts();
  const now = new Date().toISOString();
  const id =
    campaignId && sourceId
      ? xPostId(userId, campaignId, sourceId)
      : `xpost_${slug(userId)}_${Date.now().toString(36)}`;
  const existingIndex = posts.findIndex((post) => post.id === id);

  if (
    existingIndex >= 0 &&
    ["publishing", "published"].includes(posts[existingIndex].status)
  ) {
    throw new Error("This post is already publishing or published.");
  }

  const post: ScheduledXPost = {
    campaignId,
    createdAt: existingIndex >= 0 ? posts[existingIndex].createdAt : now,
    id,
    label,
    publishedAt: null,
    repository,
    scheduledFor: null,
    sourceId,
    status: "publishing",
    text,
    updatedAt: now,
    userId,
    xAccountId,
    xPostId: null,
    xPostUrl: null
  };

  if (existingIndex >= 0) {
    posts[existingIndex] = post;
  } else {
    posts.push(post);
  }

  await writePosts(posts);

  return post;
}

export async function claimXPostForPublishing({
  postId,
  userId
}: {
  postId: string;
  userId: string;
}) {
  const posts = await readPosts();
  const index = posts.findIndex(
    (post) => post.id === postId && post.userId === userId
  );

  if (index === -1) {
    throw new Error("X post not found.");
  }

  if (posts[index].status === "published" || posts[index].status === "publishing") {
    throw new Error("This post is already publishing or published.");
  }

  posts[index] = {
    ...posts[index],
    errorMessage: undefined,
    status: "publishing",
    updatedAt: new Date().toISOString()
  };

  await writePosts(posts);

  return posts[index];
}

export async function markXPostPublished({
  postId,
  publishedAt,
  text,
  userId,
  xPostId,
  xPostUrl
}: {
  postId: string;
  publishedAt: string;
  text: string;
  userId: string;
  xPostId: string;
  xPostUrl: string;
}) {
  const posts = await readPosts();
  const index = posts.findIndex(
    (post) => post.id === postId && post.userId === userId
  );

  if (index === -1) {
    throw new Error("X post not found.");
  }

  posts[index] = {
    ...posts[index],
    errorMessage: undefined,
    publishedAt,
    status: "published",
    text,
    updatedAt: publishedAt,
    xPostId,
    xPostUrl
  };

  await writePosts(posts);

  return posts[index];
}

export async function markXPostFailed({
  errorMessage,
  postId,
  userId
}: {
  errorMessage: string;
  postId: string;
  userId: string;
}) {
  const posts = await readPosts();
  const index = posts.findIndex(
    (post) => post.id === postId && post.userId === userId
  );

  if (index === -1) {
    return null;
  }

  posts[index] = {
    ...posts[index],
    errorMessage,
    status: "failed",
    updatedAt: new Date().toISOString()
  };

  await writePosts(posts);

  return posts[index];
}

export async function listDueScheduledXPosts(userId: string) {
  const posts = await readPosts();
  const now = Date.now();

  return posts.filter(
    (post) =>
      post.userId === userId &&
      post.status === "scheduled" &&
      post.scheduledFor !== null &&
      new Date(post.scheduledFor).getTime() <= now
  );
}

export function decryptedXTokens(account: XAccount) {
  return {
    accessToken: decryptString(account.accessToken),
    refreshToken: decryptString(account.refreshToken)
  };
}

async function upsertXPosts({
  campaignId,
  posts,
  repository,
  status,
  userId,
  xAccountId
}: {
  campaignId: string;
  posts: XPostInput[];
  repository: string;
  status: Extract<XPostStatus, "draft" | "scheduled">;
  userId: string;
  xAccountId: string;
}) {
  const current = await readPosts();
  const now = new Date().toISOString();
  const next = [...current];

  posts.forEach((post) => {
    const id = xPostId(userId, campaignId, post.sourceId);
    const existingIndex = next.findIndex((candidate) => candidate.id === id);

    if (
      existingIndex >= 0 &&
      ["publishing", "published"].includes(next[existingIndex].status)
    ) {
      return;
    }

    const scheduledPost: ScheduledXPost = {
      campaignId,
      createdAt:
        existingIndex >= 0 ? next[existingIndex].createdAt : now,
      id,
      label: post.label,
      publishedAt: null,
      repository,
      scheduledFor: status === "scheduled" ? post.scheduledFor || now : null,
      sourceId: post.sourceId,
      status,
      text: post.text,
      updatedAt: now,
      userId,
      xAccountId,
      xPostId: null,
      xPostUrl: null
    };

    if (existingIndex >= 0) {
      next[existingIndex] = scheduledPost;
    } else {
      next.push(scheduledPost);
    }
  });

  await writePosts(next);

  return listScheduledXPosts({ campaignId, userId });
}

async function readAccounts(): Promise<XAccount[]> {
  return readJson(accountsFile);
}

async function writeAccounts(accounts: XAccount[]) {
  await writeJson(accountsFile, accounts);
}

async function readPosts(): Promise<ScheduledXPost[]> {
  return readJson(postsFile);
}

async function writePosts(posts: ScheduledXPost[]) {
  await writeJson(postsFile, posts);
}

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const data = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(data) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeJson<T>(file: string, records: T[]) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function xAccountId(userId: string, xUserId: string) {
  return `xacct_${slug(userId)}_${slug(xUserId)}`;
}

function xPostId(userId: string, campaignId: string, sourceId: string) {
  return `xpost_${slug(userId)}_${slug(campaignId)}_${slug(sourceId)}`.slice(
    0,
    180
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}
