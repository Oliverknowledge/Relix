export type ScheduledPostStatus =
  | "draft"
  | "scheduled"
  | "copied"
  | "published_manually";

export type ScheduledPost = {
  campaign_id: string;
  created_at: string;
  id: string;
  label: string;
  repository: string;
  scheduled_at: string;
  source_id: string;
  status: ScheduledPostStatus;
  text: string;
  updated_at: string;
};

export type SchedulePostInput = {
  label: string;
  scheduled_at: string;
  source_id: string;
  text: string;
};
