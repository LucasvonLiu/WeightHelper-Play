import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const r2Enabled = !!(
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_ENDPOINT &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_PUBLIC_URL
);

let s3Client = null;
if (r2Enabled) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export const R2Service = {
  isEnabled() {
    return r2Enabled;
  },

  async uploadBase64Image(base64Str) {
    if (!r2Enabled) return null;

    // 解析 Base64 数据
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('格式错误的 Base64 图片数据');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // 生成唯一的 UUID 文件名
    const ext = mimeType.split('/')[1] || 'jpg';
    const key = `meals/${crypto.randomUUID()}.${ext}`;

    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // 拼装公开访问 URL
    const publicUrlBase = process.env.R2_PUBLIC_URL.endsWith('/')
      ? process.env.R2_PUBLIC_URL
      : `${process.env.R2_PUBLIC_URL}/`;

    return `${publicUrlBase}${key}`;
  },

  async deleteImage(publicUrl) {
    if (!r2Enabled || !publicUrl) return;

    const publicUrlBase = process.env.R2_PUBLIC_URL.endsWith('/')
      ? process.env.R2_PUBLIC_URL
      : `${process.env.R2_PUBLIC_URL}/`;

    // 只有当图片 URL 是以我们配置的 R2_PUBLIC_URL 开头时，才从云端删除
    if (!publicUrl.startsWith(publicUrlBase)) return;

    const key = publicUrl.substring(publicUrlBase.length);

    const deleteParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };

    try {
      await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (e) {
      console.error('从 Cloudflare R2 删除图片失败:', e);
    }
  }
};
