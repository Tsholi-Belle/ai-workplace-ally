
-- Trigger-only functions: not callable by anyone directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_add_owner_member() FROM PUBLIC, anon, authenticated;

-- Membership helpers: needed by RLS policies, so authenticated must keep EXECUTE; block anon.
REVOKE ALL ON FUNCTION public.is_project_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.is_project_owner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_owner(UUID, UUID) TO authenticated;
