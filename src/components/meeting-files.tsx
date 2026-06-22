import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUCKET = "meeting-files";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

type StoredFile = {
  name: string;
  size: number;
  updatedAt: string;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function MeetingFiles({ meetingId }: { meetingId: string }) {
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const prefix = user ? `${user.id}/${meetingId}` : "";

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFiles(
      (data ?? [])
        .filter((f) => f.name && !f.name.endsWith("/"))
        .map((f) => ({
          name: f.name,
          size: (f.metadata as { size?: number } | null)?.size ?? 0,
          updatedAt: f.updated_at ?? f.created_at ?? "",
        })),
    );
  }, [user, prefix]);

  useEffect(() => {
    if (user) refresh();
    else setFiles([]);
  }, [user, refresh]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} exceeds 25 MB`);
          continue;
        }
        const path = `${prefix}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) {
          toast.error(`${file.name}: ${error.message}`);
        } else {
          toast.success(`Uploaded ${file.name}`);
        }
      }
      await refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(name: string) {
    if (!user) return;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(`${prefix}/${name}`, 60);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not create download link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(name: string) {
    if (!user) return;
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([`${prefix}/${name}`]);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    await refresh();
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4" /> Files & transcripts
        </CardTitle>
        {user && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={handleUpload}
              accept=".pdf,.txt,.md,.docx,.doc,.csv,.json,.vtt,.srt,.mp3,.wav,.m4a,.png,.jpg,.jpeg"
            />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              Upload
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {authLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !user ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to upload transcripts and attachments for this meeting.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading files…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files yet. Drop transcripts, PDFs, audio, or images here — up to 25 MB each.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {files.map((f) => {
              const display = f.name.replace(/^\d+-/, "");
              return (
                <li key={f.name} className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(f.name)}
                    className="flex-1 truncate text-left text-sm hover:underline"
                    title={display}
                  >
                    {display}
                  </button>
                  <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                  <Button size="icon" variant="ghost" onClick={() => handleDownload(f.name)} title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(f.name)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
