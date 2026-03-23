import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET!;
const KEY_PREFIX = "data/";

function toKey(pathname: string): string {
  return pathname.startsWith(KEY_PREFIX) ? pathname : `${KEY_PREFIX}${pathname}`;
}

export async function readJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: toKey(pathname) })
    );
    const text = await result.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJson(pathname: string, data: unknown): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: toKey(pathname),
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    })
  );
}

export async function deleteBlob(pathname: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: toKey(pathname) })
  );
}

export async function uploadFile(
  pathname: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: toKey(pathname),
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function readFile(
  pathname: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: toKey(pathname) })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return null;
    return { body: bytes, contentType: result.ContentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function readFileStream(pathname: string): Promise<ReadableStream | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: toKey(pathname) })
    );
    return result.Body?.transformToWebStream() ?? null;
  } catch {
    return null;
  }
}

export async function listBlobs(prefix: string): Promise<string[]> {
  try {
    const result = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: toKey(prefix) })
    );
    return (result.Contents ?? [])
      .map((obj) => obj.Key ?? "")
      .filter(Boolean)
      .map((key) => key.replace(KEY_PREFIX, ""));
  } catch {
    return [];
  }
}
