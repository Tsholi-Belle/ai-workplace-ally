import { jsPDF } from "jspdf";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function sanitizeFilename(name: string): string {
  return (name || "meeting").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80);
}

export interface ExportPayload {
  title: string;
  startsAt: string;
  platform: string;
  joinUrl: string;
  attendees: string[];
  notes: string;
  summary: string;
}

function fmt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function buildMarkdown(p: ExportPayload): string {
  const parts: string[] = [];
  parts.push(`# ${p.title || "Meeting"}`);
  const meta: string[] = [];
  if (p.startsAt) meta.push(`**When:** ${fmt(p.startsAt)}`);
  if (p.platform) meta.push(`**Platform:** ${p.platform}`);
  if (p.joinUrl) meta.push(`**Join:** ${p.joinUrl}`);
  if (p.attendees.length) meta.push(`**Attendees:** ${p.attendees.join(", ")}`);
  if (meta.length) parts.push(meta.join("  \n"));
  if (p.summary?.trim()) {
    parts.push("---");
    parts.push("# AI Summary");
    parts.push(p.summary.trim());
  }
  if (p.notes?.trim()) {
    parts.push("---");
    parts.push("# Notes");
    parts.push(p.notes.trim());
  }
  return parts.join("\n\n") + "\n";
}

export function exportMarkdown(p: ExportPayload) {
  const md = buildMarkdown(p);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(p.title)}.md`);
}

/**
 * Render meeting as PDF. Plain text rendering with simple Markdown awareness
 * (headings become bold/larger, bullets indent). Auto page breaks.
 */
export function exportPdf(p: ExportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (text: string, size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensure(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  // Title
  writeLines(p.title || "Meeting", 20, true);
  y += 4;

  // Meta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta: string[] = [];
  if (p.startsAt) meta.push(`When: ${fmt(p.startsAt)}`);
  if (p.platform) meta.push(`Platform: ${p.platform}`);
  if (p.joinUrl) meta.push(`Join: ${p.joinUrl}`);
  if (p.attendees.length) meta.push(`Attendees: ${p.attendees.join(", ")}`);
  for (const m of meta) writeLines(m, 10);
  y += 8;

  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        y += 6;
        continue;
      }
      if (line.startsWith("## ")) {
        y += 4;
        writeLines(line.slice(3), 13, true);
        continue;
      }
      if (line.startsWith("# ")) {
        y += 6;
        writeLines(line.slice(2), 16, true);
        continue;
      }
      if (/^- \[[ x]\] /i.test(line)) {
        const done = /^- \[x\] /i.test(line);
        writeLines(`${done ? "☑" : "☐"} ${line.replace(/^- \[[ x]\] /i, "")}`, 11);
        continue;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        writeLines(`• ${line.slice(2)}`, 11);
        continue;
      }
      writeLines(line, 11);
    }
  };

  if (p.summary?.trim()) {
    writeLines("AI Summary", 14, true);
    y += 4;
    renderMarkdown(p.summary.trim());
    y += 10;
  }
  if (p.notes?.trim()) {
    writeLines("Notes", 14, true);
    y += 4;
    renderMarkdown(p.notes.trim());
  }

  doc.save(`${sanitizeFilename(p.title)}.pdf`);
}
