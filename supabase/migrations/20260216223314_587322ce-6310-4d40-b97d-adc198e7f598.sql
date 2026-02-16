
-- Remover roles dos usuários extras
DELETE FROM public.user_roles 
WHERE user_id NOT IN (
  'ea1c9a69-e436-4de2-953b-432e5fff60ae',
  '0dd8d6c8-b2dc-4fe5-a7de-f0270319a51c',
  '87cbf0b0-3ade-438f-8155-b0d2101932ac'
);

-- Remover perfis extras
DELETE FROM public.profiles 
WHERE id NOT IN (
  'ea1c9a69-e436-4de2-953b-432e5fff60ae',
  '0dd8d6c8-b2dc-4fe5-a7de-f0270319a51c',
  '87cbf0b0-3ade-438f-8155-b0d2101932ac'
);

-- Remover usuários do auth.users
DELETE FROM auth.users 
WHERE id NOT IN (
  'ea1c9a69-e436-4de2-953b-432e5fff60ae',
  '0dd8d6c8-b2dc-4fe5-a7de-f0270319a51c',
  '87cbf0b0-3ade-438f-8155-b0d2101932ac'
);
