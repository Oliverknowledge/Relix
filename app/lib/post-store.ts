import { promises as fs } from "fs";
import path from "path";
import type {
  ScheduledPost,
  ScheduledPostStatus,
  SchedulePostInput
} from "@/app/lib/post-types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "scheduled-posts.json");

export async function listScheduledPosts(campaignId?: string) {
  const posts = await readPosts();

  return posts
    .filter((post) => !campaignId || post.campaign_id === campaignId)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

export async function schedulePosts({
  campaignId,
  posts,
  repository
}: {
  campaignId: string;
  posts: SchedulePostInput[];
  repository: string;
}) {
  const current = await readPosts();
  const now = new Date().toISOString();
  const next = [...current];

  posts.forEach((post) => {
    const id = scheduledPostId(campaignId, post.source_id);
    const existingIndex = next.findIndex((candidate) => candidate.id === id);
    const scheduledPost: ScheduledPost = {
      campaign_id: campaignId,
      created_at:
        existingIndex >= 0 ? next[existingIndex].created_at : now,
      id,
      label: post.label,
      repository,
      scheduled_at: post.scheduled_at,
      source_id: post.source_id,
      status: "scheduled",
      text: post.text,
      updated_at: now
    };

    if (existingIndex >= 0) {
      next[existingIndex] = scheduledPost;
    } else {
      next.push(scheduledPost);
    }
  });

  await writePosts(next);

  return listScheduledPosts(campaignId);
}

export async function updateScheduledPostStatus({
  postId,
  status
}: {
  postId: string;
  status: ScheduledPostStatus;
}) {
  const posts = await readPosts();
  const index = posts.findIndex((post) => post.id === postId);

  if (index === -1) {
    throw new Error("Scheduled post not found.");
  }

  posts[index] = {
    ...posts[index],
    status,
    updated_at: new Date().toISOString()
  };

  await writePosts(posts);

  return posts[index];
}

async function readPosts(): Promise<ScheduledPost[]> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as ScheduledPost[];
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

async function writePosts(posts: ScheduledPost[]) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
}

function scheduledPostId(campaignId: string, sourceId: string) {
  return `${slug(campaignId)}-${slug(sourceId)}`;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
