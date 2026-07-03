type KvResponse<T> = {
  error?: string;
  result?: T;
};

type KvConfig = {
  token: string;
  url: string;
};

function kvConfig(): KvConfig | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";

  if (!url || !token) {
    return null;
  }

  return {
    token,
    url: url.replace(/\/+$/, "")
  };
}

export function persistentKvAvailable() {
  return Boolean(kvConfig());
}

export async function readJsonFromKv<T>(key: string): Promise<T | null> {
  const result = await kvCommand<string | null>(["GET", kvKey(key)]);

  if (!result) {
    return null;
  }

  return JSON.parse(result) as T;
}

export async function writeJsonToKv(key: string, value: unknown) {
  await kvCommand<string>(["SET", kvKey(key), JSON.stringify(value)]);
}

async function kvCommand<T>(command: unknown[]): Promise<T> {
  const config = kvConfig();

  if (!config) {
    throw new Error("Persistent KV is not configured.");
  }

  const response = await fetch(config.url, {
    body: JSON.stringify(command),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const data = (await response.json().catch(() => ({}))) as KvResponse<T>;

  if (!response.ok || data.error) {
    throw new Error(data.error || "Persistent KV request failed.");
  }

  return data.result as T;
}

function kvKey(key: string) {
  const prefix = process.env.RELIX_KV_PREFIX || "relix";

  return `${prefix}:${key}`;
}
