import ffmpeg from "fluent-ffmpeg";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

// Resolve binary paths at runtime to avoid Next.js build-time path rewriting.
// Next.js 16 rewrites import-resolved paths to /ROOT/..., which breaks at runtime.
function resolveRuntime(candidates: string[]): string | null {
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const ffmpegPath = resolveRuntime([
  join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg"),
  "/usr/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
]);
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const ffprobePath = resolveRuntime([
  join(process.cwd(), "node_modules/ffprobe-static/bin/linux/x64/ffprobe"),
  "/usr/bin/ffprobe",
  "/usr/local/bin/ffprobe",
]);
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

export interface ExtractResult {
  frames: string[]; // base64 data URIs
  timestamps: string[]; // "00:05", "00:10", etc.
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

export async function extractFrames(
  videoBuffer: Buffer
): Promise<ExtractResult> {
  const workDir = join(tmpdir(), `chief-advisor-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const inputPath = join(workDir, "input.mp4");
  await writeFile(inputPath, videoBuffer);

  try {
    const duration = await getVideoDuration(inputPath);
    const interval = 1; // seconds
    const maxFrames = 240;
    const frameCount = Math.min(Math.floor(duration / interval), maxFrames);

    if (frameCount === 0) {
      return { frames: [], timestamps: [] };
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([`-vf`, `fps=1/${interval}`, `-frames:v`, `${frameCount}`, `-q:v`, `2`])
        .output(join(workDir, "frame-%03d.jpg"))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    const frames: string[] = [];
    const timestamps: string[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const framePath = join(workDir, `frame-${String(i).padStart(3, "0")}.jpg`);
      const data = await readFile(framePath);
      frames.push(`data:image/jpeg;base64,${data.toString("base64")}`);
      timestamps.push(formatTimestamp(i * interval));
    }

    return { frames, timestamps };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
