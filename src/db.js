import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const sb = createClient(config.supabase.url, config.supabase.key, {
  auth: { persistSession: false },
});

const unwrap = ({ data, error }) => {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
};

export async function upsertPost(row) {
  return unwrap(
    await sb.from('posts').upsert(row, { onConflict: 'post_date' }).select().single()
  );
}

export async function updatePost(id, patch) {
  return unwrap(await sb.from('posts').update(patch).eq('id', id).select().single());
}

export async function getPost(id) {
  return unwrap(await sb.from('posts').select('*').eq('id', id).single());
}

export async function getPostByDate(postDate) {
  return unwrap(
    await sb.from('posts').select('*').eq('post_date', postDate).maybeSingle()
  );
}

export async function recentTopicKeys(days = 35) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rows = unwrap(await sb.from('topic_history').select('topic_key').gte('used_at', since));
  return rows.map((r) => r.topic_key);
}

export async function markTopicUsed(topicKey) {
  await sb.from('topic_history').insert({ topic_key: topicKey });
}
