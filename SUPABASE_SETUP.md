# Supabase Setup

The sync feature uses a simple supabase backend with Twitter oauth.

## OAuth Setup

1. Get a Twitter developer account and create an application.
2. Go to `Authentication > Providers` and enable Twitter.
3. Go to `Authentication > URL Configuration` and set the following:
    1. Site URL: https://x.com/twitter-art-tags/gallery
    2. Redirect URLs: https://x.com/twitter-art-tags/gallery/auth/callback/twitter

## Database Setup

1. Create a database with the following columns:
    1. `user_id: uuid` (Primary key)
    2. `data: json`
    3. `created_at: timestamptz`
    4. `synced_at: teimstamptz`
2. Set the following 4 RLS policies:

```sql
-- Insert
alter policy "Enable insert for users based on user_id"
on "public"."user_data"
to public
with check (
(( SELECT auth.uid() AS uid) = user_id)
);
-- Update
alter policy "Enable update for users based on user_id"
on "public"."user_data"
to public
using (
(( SELECT auth.uid() AS uid) = user_id)
);
-- Select
alter policy "Enable read access based on user_id"
on "public"."user_data"
to public
using (
(( SELECT auth.uid() AS uid) = user_id)
);
-- Delete
alter policy "Enable delete for users based on user_id"
on "public"."user_data"
to public
using (
(( SELECT auth.uid() AS uid) = user_id)
);
```

## Code setup

Copy `.env.sample` to `.env` and add the correct values.
