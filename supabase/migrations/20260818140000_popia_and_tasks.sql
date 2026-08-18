-- ============================================================
-- POPIA Compliance & Task Planner Enhancements
-- Protection of Personal Information Act (Act 4 of 2013)
-- ============================================================

-- 1. Extend profiles with POPIA consent and data protection fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS popia_consented_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_consent BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_retention_preference TEXT NOT NULL DEFAULT 'standard';

-- 2. Extend tasks with priority and category improvements
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- 3. Create helpful indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks (project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks (assignee_member_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_proj_user ON public.project_members (project_id, user_id);

-- 4. POPIA Right to Erasure (Section 24) helper procedure for clean cascade delete
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the user themselves or service role
  IF auth.uid() != _user_id AND current_user != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized data deletion request';
  END IF;

  -- 1. Delete user notifications
  DELETE FROM public.notifications WHERE user_id = _user_id;

  -- 2. Delete invites created by user or sent to user email
  DELETE FROM public.project_invites WHERE invited_by = _user_id;

  -- 3. Remove user from project memberships
  DELETE FROM public.project_members WHERE user_id = _user_id;

  -- 4. Delete user-owned projects (this will cascade delete tasks and members of those projects)
  DELETE FROM public.projects WHERE owner_id = _user_id;

  -- 5. Delete tasks created by user in other projects
  DELETE FROM public.tasks WHERE created_by = _user_id;

  -- 6. Delete user profile
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated, service_role;
