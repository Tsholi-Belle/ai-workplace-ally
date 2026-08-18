import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from "firebase/storage";
import { storage } from "@/integrations/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

type StoredFile = {
  name: string;
  fullPath: string;
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

  const prefix = user ? `meeting-files/${user.id}/${meetingId}` : "";

  const refresh = useCallback(async () => {
    if (!user || !prefix) return;
    setLoading(true);
    try {
      const folderRef = ref(storage, prefix);
      const res = await listAll(folderRef);
      const items: StoredFile[] = [];

      for (const itemRef of res.items) {
        try {
          const meta = await getMetadata(itemRef);
          items.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            size: meta.size,
            updatedAt: meta.updated,
          });
        } catch {
          items.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            size: 0,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      setFiles(items);
    } catch (e) {
      console.warn("[MeetingFiles] Storage list error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, prefix]);

  useEffect(() => {
    if (user) refresh();
    else setFiles([]);
  }, [user, refresh]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0 || !user || !prefix) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} exceeds 25 MB`);
          continue;
        }
        const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
        const fileRef = ref(storage, `${prefix}/${safeName}`);
        await uploadBytes(fileRef, file, {
          contentType: file.type || "application/octet-stream",
        });
        toast.success(`Uploaded ${file.name}`);
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(fullPath: string) {
    if (!user) return;
    try {
      const fileRef = ref(storage, fullPath);
      const url = await getDownloadURL(fileRef);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open download link");
    }
  }

  async function handleDelete(fullPath: string, name: string) {
    if (!user) return;
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const fileRef = ref(storage, fullPath);
      await deleteObject(fileRef);
      toast.success("Deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
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
                <li key={f.fullPath} className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(f.fullPath)}
                    className="flex-1 truncate text-left text-sm hover:underline"
                    title={display}
                  >
                    {display}
                  </button>
                  <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(f.fullPath)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(f.fullPath, f.name)}
                    title="Delete"
                  >
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
