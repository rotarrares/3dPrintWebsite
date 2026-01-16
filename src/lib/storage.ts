import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a file to R2 storage
 * @param file - The file to upload
 * @param folder - The folder path (e.g., 'uploads', 'variants')
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${folder}/${timestamp}-${sanitizedName}`;
  const buffer = await file.arrayBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    Body: Buffer.from(buffer),
    ContentType: file.type,
  }));

  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

/**
 * Uploads a buffer to R2 storage
 * @param buffer - The buffer to upload
 * @param filename - The filename
 * @param contentType - The MIME type
 * @param folder - The folder path
 * @returns The public URL of the uploaded file
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${timestamp}-${sanitizedName}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Deletes a file from R2 storage
 * @param url - The public URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  const publicUrl = process.env.R2_PUBLIC_URL || '';
  if (!url.startsWith(publicUrl)) {
    throw new Error('Invalid file URL');
  }

  const key = url.replace(`${publicUrl}/`, '');

  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Extracts the file key from a public URL
 */
export function getKeyFromUrl(url: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL || '';
  return url.replace(`${publicUrl}/`, '');
}

/**
 * Generates a presigned URL for direct upload to R2
 * @param filename - Original filename
 * @param contentType - MIME type of the file
 * @param folder - The folder path (e.g., 'models', 'products')
 * @returns Object with presigned upload URL and the final public URL
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${timestamp}-${sanitizedName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry

  return {
    uploadUrl,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
    key,
  };
}
