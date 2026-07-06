
-- ============================================================
-- Profiles (one per auth user)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Any signed-in user can look up a profile (needed to render member names/emails on shared projects)
CREATE POLICY "profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user manages own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "user inserts own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Projects
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Project members (real users OR placeholders with just a name)
-- ============================================================
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  placeholder_name TEXT,
  colour TEXT NOT NULL DEFAULT '#3B82F6',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT member_kind CHECK (user_id IS NOT NULL OR placeholder_name IS NOT NULL),
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers avoid recursive RLS on projects/project_members
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  );
$$;

-- Projects policies
CREATE POLICY "owner or active member reads project"
  ON public.projects FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_project_member(id, auth.uid()));
CREATE POLICY "user creates own project"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates project"
  ON public.projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes project"
  ON public.projects FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Members policies
CREATE POLICY "owner or member reads members"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_owner(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid())
      OR user_id = auth.uid());
CREATE POLICY "owner inserts members"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_project_owner(project_id, auth.uid()));
CREATE POLICY "owner or self updates member"
  ON public.project_members FOR UPDATE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (public.is_project_owner(project_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "owner removes member"
  ON public.project_members FOR DELETE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()));

-- Auto-add owner as member on project creation
CREATE OR REPLACE FUNCTION public.tg_add_owner_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, colour, role, status)
  VALUES (NEW.id, NEW.owner_id, '#3B82F6', 'owner', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER projects_add_owner_member
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_add_owner_member();

-- ============================================================
-- Project invites (email-based)
-- ============================================================
CREATE TABLE public.project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  colour TEXT NOT NULL DEFAULT '#3B82F6',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invites TO authenticated;
GRANT ALL ON public.project_invites TO service_role;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX project_invites_email_idx ON public.project_invites (lower(email));

CREATE POLICY "invitee or owner reads invite"
  ON public.project_invites FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.is_project_owner(project_id, auth.uid())
    OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
CREATE POLICY "owner creates invite"
  ON public.project_invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.is_project_owner(project_id, auth.uid()));
CREATE POLICY "invitee or owner updates invite"
  ON public.project_invites FOR UPDATE TO authenticated
  USING (
    public.is_project_owner(project_id, auth.uid())
    OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  WITH CHECK (
    public.is_project_owner(project_id, auth.uid())
    OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
CREATE POLICY "owner deletes invite"
  ON public.project_invites FOR DELETE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()));

-- ============================================================
-- Tasks
-- ============================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assignee_member_id UUID REFERENCES public.project_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  due_date DATE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  last_reminder_sent_for DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "project members read tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.is_project_owner(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid()));
CREATE POLICY "project members create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.is_project_owner(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid()))
  );
CREATE POLICY "project members update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid()))
  WITH CHECK (public.is_project_owner(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid()));
CREATE POLICY "owner or creator deletes task"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()) OR created_by = auth.uid());

-- ============================================================
-- Notifications (bell)
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE POLICY "user reads own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user updates own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user deletes own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
-- No INSERT policy: notifications are only inserted by service_role (cron / server-side triggers)
