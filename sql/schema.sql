-- Supabase SQL Editor'de calistir.

create table if not exists posts (
  id            bigserial primary key,
  post_date     date        not null unique,     -- haftada 3 gun; gunde tek gonderi
  template      text        not null,            -- quote | tip | stat | case | cta
  topic         text        not null,
  headline      text,
  body          text,
  footnote      text,
  caption       text,
  hashtags      text,
  image_path    text,                            -- storage icindeki yol
  image_url     text,                            -- public url (Graph API bunu okur)
  status        text        not null default 'draft',
                -- draft | pending | approved | rejected | skipped | published | failed
  ig_media_id   text,
  error         text,
  revision      int         not null default 0,
  tg_message_id bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);

create index if not exists posts_status_idx on posts (status);
create index if not exists posts_date_idx   on posts (post_date desc);

-- Ayni konunun kisa surede tekrar etmemesi icin konu gecmisi
create table if not exists topic_history (
  id         bigserial primary key,
  topic_key  text        not null,
  used_at    timestamptz not null default now()
);
create index if not exists topic_history_key_idx on topic_history (topic_key, used_at desc);

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists posts_touch on posts;
create trigger posts_touch before update on posts
for each row execute function touch_updated_at();
