-- Create storage bucket for avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- Enable RLS for avatars bucket
create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Authenticated users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);