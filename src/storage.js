import { sb } from './db.js';
import { config } from './config.js';

/** PNG'yi Supabase Storage'a yukler ve public URL dondurur. */
export async function uploadImage(buffer, objectPath) {
  const { error } = await sb.storage
    .from(config.supabase.bucket)
    .upload(objectPath, buffer, { contentType: 'image/png', upsert: true });

  if (error) throw new Error(`Storage yukleme hatasi: ${error.message}`);

  const { data } = sb.storage.from(config.supabase.bucket).getPublicUrl(objectPath);
  return { path: objectPath, url: data.publicUrl };
}
