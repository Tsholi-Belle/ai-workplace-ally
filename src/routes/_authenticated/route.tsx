import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    await new Promise<void>((resolve) => {
      const unsub = auth.onAuthStateChanged(() => {
        unsub();
        resolve();
      });
    });

    if (!auth.currentUser) throw redirect({ to: "/auth" });
    return { user: auth.currentUser };
  },
  component: () => <Outlet />,
});
