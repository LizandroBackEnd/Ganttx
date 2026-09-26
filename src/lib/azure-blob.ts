import "server-only";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";

function getConnectionString(): string {
  const envConn =
    process.env.BLOB_STORAGE_CONNECTION_STRING ||
    process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (envConn) {
    return envConn;
  }

  // Fallback to configured Azurite VPS instance
  return "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://100.120.156.101:10001/devstoreaccount1;";
}

export function getContainerName(): string {
  return (
    process.env.BLOB_STORAGE_CONTAINER ||
    process.env.AZURE_STORAGE_CONTAINER_NAME ||
    "ganttx-storage"
  );
}

let containerClientPromise: Promise<ContainerClient> | null = null;

export async function getBlobContainerClient(): Promise<ContainerClient> {
  if (containerClientPromise) {
    return containerClientPromise;
  }

  containerClientPromise = (async () => {
    const connStr = getConnectionString();
    const containerName = getContainerName();
    const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists with public blob access for direct rendering
    await containerClient.createIfNotExists({ access: "blob" });
    return containerClient;
  })();

  return containerClientPromise;
}

export interface UploadedBlobResult {
  readonly url: string;
  readonly blobName: string;
  readonly originalName: string;
  readonly size: number;
  readonly mimeType: string;
  readonly isImage: boolean;
}

export async function uploadBufferToBlob(
  buffer: Buffer | Uint8Array,
  originalFilename: string,
  mimeType: string,
  prefix = "attachments"
): Promise<UploadedBlobResult> {
  const containerClient = await getBlobContainerClient();

  const cleanFilename = originalFilename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_");

  const uniqueBlobName = `${prefix}/${Date.now()}-${cleanFilename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: mimeType || "application/octet-stream",
    },
  });

  const isImage = mimeType.startsWith("image/");

  return {
    url: blockBlobClient.url,
    blobName: uniqueBlobName,
    originalName: originalFilename,
    size: buffer.length,
    mimeType,
    isImage,
  };
}
