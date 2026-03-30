-- ============================================================
-- TEMPTECH Portal de Clientes — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- EXTENSION
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  email       text,
  role        text default 'client' check (role in ('client', 'admin')),
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios ven su perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins ven todos los perfiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Usuarios actualizan su perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- POSTS (foro público)
-- ─────────────────────────────────────────
create table public.posts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  category    text default 'otro',
  status      text default 'open' check (status in ('open', 'resolved', 'closed')),
  votes       integer default 0,
  views       integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Posts son públicos para leer"
  on public.posts for select using (true);

create policy "Usuarios autenticados crean posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Dueños y admins actualizan posts"
  on public.posts for update
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─────────────────────────────────────────
-- REPLIES (respuestas del foro)
-- ─────────────────────────────────────────
create table public.replies (
  id          uuid default uuid_generate_v4() primary key,
  post_id     uuid references public.posts(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  body        text not null,
  is_official boolean default false,
  created_at  timestamptz default now()
);

alter table public.replies enable row level security;

create policy "Replies son públicas para leer"
  on public.replies for select using (true);

create policy "Usuarios autenticados crean replies"
  on public.replies for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- RECLAMOS
-- ─────────────────────────────────────────
create table public.reclamos (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  order_number text,
  type         text not null,
  priority     text default 'medium' check (priority in ('low', 'medium', 'high')),
  description  text not null,
  status       text default 'open' check (status in ('open', 'in_progress', 'closed')),
  admin_note   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.reclamos enable row level security;

create policy "Usuarios ven sus reclamos"
  on public.reclamos for select
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Usuarios crean reclamos"
  on public.reclamos for insert
  with check (auth.uid() = user_id);

create policy "Admins actualizan reclamos"
  on public.reclamos for update
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─────────────────────────────────────────
-- VIDEOS
-- ─────────────────────────────────────────
create table public.videos (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  description text,
  url         text not null,
  duration    text,
  category    text default 'tutorial',
  created_at  timestamptz default now()
);

alter table public.videos enable row level security;

create policy "Videos son públicos"
  on public.videos for select using (true);

create policy "Solo admins crean videos"
  on public.videos for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Solo admins actualizan videos"
  on public.videos for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────
-- MANUALES
-- ─────────────────────────────────────────
create table public.manuales (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  description text,
  url         text not null,
  pages       text,
  version     text,
  category    text default 'uso',
  created_at  timestamptz default now()
);

alter table public.manuales enable row level security;

create policy "Manuales son públicos"
  on public.manuales for select using (true);

create policy "Solo admins crean manuales"
  on public.manuales for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────
-- NOVEDADES
-- ─────────────────────────────────────────
create table public.novedades (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  body        text not null,
  type        text default 'news' check (type in ('launch', 'maintenance', 'update', 'news')),
  emoji       text default '📢',
  created_at  timestamptz default now()
);

alter table public.novedades enable row level security;

create policy "Novedades son públicas"
  on public.novedades for select using (true);

create policy "Solo admins crean novedades"
  on public.novedades for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────
-- SEED: novedad de bienvenida
-- ─────────────────────────────────────────
insert into public.novedades (title, body, type, emoji) values
  ('¡Bienvenido al Portal TEMPTECH!', 'Estamos lanzando nuestro nuevo portal de atención al cliente. Aquí podés hacer consultas, registrar reclamos, ver videos tutoriales y descargar manuales. ¡Gracias por ser parte de TEMPTECH!', 'launch', '🚀');
