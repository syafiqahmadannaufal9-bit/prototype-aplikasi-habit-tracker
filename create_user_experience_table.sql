-- Create the user_experience table for storing feedback ratings and comments
create table public.user_experience (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.user_experience enable row level security;

-- Policy: Users can insert their own feedback
create policy "Users can insert their own feedback"
  on public.user_experience for insert
  with check (auth.uid() = user_id);

-- Policy: Users can read their own feedback (optional, but good practice)
create policy "Users can view their own feedback"
  on public.user_experience for select
  using (auth.uid() = user_id);
