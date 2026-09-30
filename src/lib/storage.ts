import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type DeleteObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig {
  readonly region: string;
  readonly endpoint: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

function getStorageConfig(): StorageConfig {
  return {
    region: process.env.STORAGE_REGION || "us-chicago-1",
    endpoint:
      process.env.STORAGE_ENDPOINT ||
      "https://axmxsrsbkswu.compat.objectstorage.us-chicago-1.oraclecloud.com",
    bucket: process.env.STORAGE_BUCKET || "ganttx-storage",
    accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
  };
}

let cachedS3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const config = getStorageConfig();

  cachedS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // Obligatorio para compatibilidad con Oracle S3
  });

  return cachedS3Client;
}

export const s3Client: S3Client = getS3Client();

export function getBucketName(): string {
  return process.env.STORAGE_BUCKET || "ganttx-storage";
}

export interface UploadedFileResult {
  readonly url: string;
  readonly key: string;
  readonly originalName: string;
  readonly size: number;
  readonly mimeType: string;
  readonly isImage: boolean;
}

// Backward compatibility type alias
export type UploadedBlobResult = UploadedFileResult;

/**
 * Sube un archivo a Oracle Cloud Object Storage
 */
export async function uploadFile(
  fileName: string,
  fileBuffer: Buffer | Uint8Array,
  mimeType: string
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType || "application/octet-stream",
  });

  await client.send(command);
  return fileName;
}

/**
 * Elimina un archivo de Oracle Cloud Object Storage
 */
export async function deleteFile(
  fileName: string
): Promise<DeleteObjectCommandOutput> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: fileName,
  });

  return await client.send(command);
}

export interface GetFileResponse {
  readonly stream: ReadableStream | null;
  readonly contentType: string;
  readonly contentLength?: number;
  readonly etag?: string;
  readonly lastModified?: Date;
}

/**
 * Obtiene el archivo desde Oracle Cloud Object Storage como ReadableStream
 */
export async function getFile(fileName: string): Promise<GetFileResponse> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fileName,
  });

  const response = await client.send(command);

  // AWS SDK v3 SdkStream provides transformToWebStream() in Node/modern environments
  let stream: ReadableStream | null = null;
  if (response.Body && typeof response.Body.transformToWebStream === "function") {
    stream = response.Body.transformToWebStream();
  }

  return {
    stream,
    contentType: response.ContentType || "application/octet-stream",
    contentLength: response.ContentLength,
    etag: response.ETag,
    lastModified: response.LastModified,
  };
}

/**
 * Genera una URL prefirmada temporal para descarga segura
 */
export async function getPresignedDownloadUrl(
  fileName: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fileName,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Genera una URL temporal para que el frontend suba directamente el archivo a Oracle
 * sin saturar el ancho de banda ni la memoria de funciones serverless
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Sube un buffer generando un path único y devuelve la URL accesible para la app
 */
export async function uploadBufferToStorage(
  buffer: Buffer | Uint8Array,
  originalFilename: string,
  mimeType: string,
  prefix = "attachments"
): Promise<UploadedFileResult> {
  const cleanFilename = originalFilename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_");

  const key = `${prefix}/${Date.now()}-${cleanFilename}`;
  await uploadFile(key, buffer, mimeType);

  const isImage = mimeType.startsWith("image/");
  // Para buckets privados, se sirve a través del proxy seguro de API autenticado
  const url = `/api/files/${encodeURI(key)}`;

  return {
    url,
    key,
    originalName: originalFilename,
    size: buffer.length,
    mimeType,
    isImage,
  };
}

// Backward-compatibility alias
export const uploadBufferToBlob = uploadBufferToStorage;
