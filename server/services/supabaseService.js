import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'meals';

const supabaseEnabled = !!(supabaseUrl && supabaseAnonKey);

let supabase = null;
if (supabaseEnabled) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const SupabaseService = {
  isEnabled() {
    return supabaseEnabled;
  },

  async uploadBase64Image(base64Str) {
    if (!supabaseEnabled) return null;

    // 解析 Base64 数据
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('格式错误的 Base64 图片数据');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // 生成唯一的 UUID 文件名
    const ext = mimeType.split('/')[1] || 'jpg';
    const filePath = `meals/${crypto.randomUUID()}.${ext}`;

    // 上传文件到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // 获取公开可访问 URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteImage(publicUrl) {
    if (!supabaseEnabled || !publicUrl) return;

    // 从公网 URL 中匹配文件路径
    // Supabase 默认公网链接格式: https://<project-id>.supabase.co/storage/v1/object/public/<bucket-name>/meals/<uuid>.<ext>
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return;

    const filePath = publicUrl.substring(index + marker.length);

    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error) {
        console.error('从 Supabase Storage 删除文件失败:', error);
      }
    } catch (e) {
      console.error('从 Supabase Storage 删除文件出错:', e);
    }
  }
};
