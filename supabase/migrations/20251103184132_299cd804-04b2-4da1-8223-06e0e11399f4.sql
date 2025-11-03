-- Promote quantisolutions2@gmail.com to admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('fb65ad47-5771-4271-9082-bf5b1604b175', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;