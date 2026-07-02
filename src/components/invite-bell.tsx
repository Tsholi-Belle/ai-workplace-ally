import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Inbox, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ACTIVE_KEY,
  declineInvite,
  getPendingInvites,
  subscribeInviteChanges,
  type StoredNotification,
} from "@/lib/invite-store";

export function InviteBell() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<StoredNotification[]>([]);

  useEffect(() => {
    const refresh = () => setPending(getPendingInvites());
    refresh();
    return subscribeInviteChanges(refresh);
  }, []);

  const count = pending.length;

  const openMeeting = (meetingId: string) => {
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(meetingId));
    } catch {
      // ignore
    }
    navigate({ to: "/meetings" });
  };

  const handleDecline = (meetingId: string, title: string) => {
    declineInvite(meetingId);
    setPending(getPendingInvites());
    toast.success(`Declined: ${title}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={
            count > 0 ? `${count} pending invite${count === 1 ? "" : "s"}` : "Invites"
          }
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" /> Pending invites
          </p>
          {count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {count} waiting
            </span>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {count === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No pending invites. Shared meeting links will show up here.
            </p>
          ) : (
            pending.map((n) => (
              <div
                key={n.id}
                className="border-b border-border/40 px-3 py-2.5 last:border-b-0"
              >
                <p className="text-sm font-medium truncate">{n.title}</p>
                {n.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.ts).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => n.meetingId && openMeeting(n.meetingId)}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" /> Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      n.meetingId && handleDecline(n.meetingId, n.title)
                    }
                  >
                    <X className="mr-1 h-3 w-3" /> Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
