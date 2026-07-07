
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION private.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION private.shares_project(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members m1
    JOIN public.project_members m2 ON m1.project_id = m2.project_id
    WHERE m1.user_id = _a AND m2.user_id = _b
      AND m1.status = 'active' AND m2.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.is_project_member(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_project_owner(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.shares_project(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_project_member(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.shares_project(uuid,uuid) TO authenticated, service_role;

-- projects
DROP POLICY IF EXISTS "owner or active member reads project" ON public.projects;
CREATE POLICY "owner or active member reads project" ON public.projects
  FOR SELECT TO authenticated
  USING ((owner_id = auth.uid()) OR private.is_project_member(id, auth.uid()));

-- project_members
DROP POLICY IF EXISTS "owner or member reads members" ON public.project_members;
CREATE POLICY "owner or member reads members" ON public.project_members
  FOR SELECT TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()) OR private.is_project_member(project_id, auth.uid()) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "owner or self updates member" ON public.project_members;
CREATE POLICY "owner or self updates member" ON public.project_members
  FOR UPDATE TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()) OR (user_id = auth.uid()))
  WITH CHECK (private.is_project_owner(project_id, auth.uid()) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "owner removes member" ON public.project_members;
CREATE POLICY "owner removes member" ON public.project_members
  FOR DELETE TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()));

DROP POLICY IF EXISTS "owner inserts members" ON public.project_members;
CREATE POLICY "owner inserts members" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (private.is_project_owner(project_id, auth.uid()) OR (user_id = auth.uid()));

-- project_invites
DROP POLICY IF EXISTS "invitee or owner reads invite" ON public.project_invites;
CREATE POLICY "invitee or owner reads invite" ON public.project_invites
  FOR SELECT TO authenticated
  USING ((invited_by = auth.uid()) OR private.is_project_owner(project_id, auth.uid())
    OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))));

DROP POLICY IF EXISTS "invitee or owner updates invite" ON public.project_invites;
CREATE POLICY "invitee or owner updates invite" ON public.project_invites
  FOR UPDATE TO authenticated
  USING (private.is_project_owner(project_id, auth.uid())
    OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))))
  WITH CHECK (private.is_project_owner(project_id, auth.uid())
    OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))));

DROP POLICY IF EXISTS "owner deletes invite" ON public.project_invites;
CREATE POLICY "owner deletes invite" ON public.project_invites
  FOR DELETE TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()));

DROP POLICY IF EXISTS "owner creates invite" ON public.project_invites;
CREATE POLICY "owner creates invite" ON public.project_invites
  FOR INSERT TO authenticated
  WITH CHECK ((invited_by = auth.uid()) AND private.is_project_owner(project_id, auth.uid()));

-- tasks
DROP POLICY IF EXISTS "project members read tasks" ON public.tasks;
CREATE POLICY "project members read tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()) OR private.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "project members update tasks" ON public.tasks;
CREATE POLICY "project members update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()) OR private.is_project_member(project_id, auth.uid()))
  WITH CHECK (private.is_project_owner(project_id, auth.uid()) OR private.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "owner or creator deletes task" ON public.tasks;
CREATE POLICY "owner or creator deletes task" ON public.tasks
  FOR DELETE TO authenticated
  USING (private.is_project_owner(project_id, auth.uid()) OR (created_by = auth.uid()));

DROP POLICY IF EXISTS "project members create tasks" ON public.tasks;
CREATE POLICY "project members create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK ((created_by = auth.uid()) AND (private.is_project_owner(project_id, auth.uid()) OR private.is_project_member(project_id, auth.uid())));

-- Now safe to drop public helpers
DROP FUNCTION IF EXISTS public.is_project_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid, uuid);

-- profiles: restrict SELECT
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable to self or shared project members" ON public.profiles
  FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR private.shares_project(auth.uid(), id));
