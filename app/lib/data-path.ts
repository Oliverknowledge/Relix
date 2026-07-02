import path from "path";

export function dataPath(fileName: string) {
  if (process.env.RELIX_DATA_DIR) {
    return path.join(process.env.RELIX_DATA_DIR, fileName);
  }

  if (process.env.VERCEL) {
    return path.join("/tmp", "relix-data", fileName);
  }

  return path.join(process.cwd(), "data", fileName);
}

export function dataDirectory() {
  if (process.env.RELIX_DATA_DIR) {
    return process.env.RELIX_DATA_DIR;
  }

  if (process.env.VERCEL) {
    return path.join("/tmp", "relix-data");
  }

  return path.join(process.cwd(), "data");
}
