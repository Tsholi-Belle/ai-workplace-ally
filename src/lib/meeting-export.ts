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
    parts.push("## AI Summary");
    parts.push(p.summary.trim());
  }
  if (p.notes?.trim()) {
    parts.push("---");
    parts.push("## Notes");
    parts.push(p.notes.trim());
  }
  return parts.join("\n\n") + "\n";
}

export function exportMarkdown(p: ExportPayload) {
  const md = buildMarkdown(p);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(p.title)}.md`);
}

// ===================== PDF export =====================
// Themed renderer matching the app: violet brand accent, dark slate ink on
// off-white paper, clean typographic rhythm with proper Markdown wrapping
// for headings (H1–H3), bullet & numbered lists, task lists, blockquotes,
// inline emphasis, links and inline code.

const THEME = {
  // Match the app's primary (violet ~oklch(0.55 0.22 275)).
  brand: [124, 58, 237] as [number, number, number],
  brandSoft: [237, 233, 254] as [number, number, number],
  ink: [30, 27, 46] as [number, number, number],
  muted: [113, 113, 132] as [number, number, number],
  rule: [228, 228, 235] as [number, number, number],
  codeBg: [243, 244, 246] as [number, number, number],
  paper: [253, 252, 255] as [number, number, number],
};

interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

// Parse a single line into inline runs (bold/italic/code/links).
function parseInline(line: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let i = 0;
  const push = (r: InlineRun) => {
    if (r.text) runs.push(r);
  };
  while (i < line.length) {
    // [text](url)
    const linkMatch = line.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      push({ text: linkMatch[1], link: linkMatch[2] });
      i += linkMatch[0].length;
      continue;
    }
    // **bold**
    if (line.startsWith("**", i)) {
      const end = line.indexOf("**", i + 2);
      if (end !== -1) {
        push({ text: line.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    // *italic* or _italic_
    if ((line[i] === "*" || line[i] === "_") && line[i + 1] !== line[i]) {
      const tok = line[i];
      const end = line.indexOf(tok, i + 1);
      if (end !== -1 && end - i > 1) {
        push({ text: line.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    // `code`
    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1);
      if (end !== -1) {
        push({ text: line.slice(i + 1, end), code: true });
        i = end + 1;
        continue;
      }
    }
    // raw URL
    const urlMatch = line.slice(i).match(/^https?:\/\/[^\s)]+/);
    if (urlMatch) {
      push({ text: urlMatch[0], link: urlMatch[0] });
      i += urlMatch[0].length;
      continue;
    }
    // plain char accumulate
    let j = i;
    while (j < line.length) {
      const c = line[j];
      if (c === "*" || c === "_" || c === "`" || c === "[") break;
      if (c === "h" && line.startsWith("http", j)) break;
      j++;
    }
    push({ text: line.slice(i, Math.max(i + 1, j)) });
    i = Math.max(i + 1, j);
  }
  return runs;
}

export function exportPdf(p: ExportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = margin;

  // ----- helpers -----
  const newPage = () => {
    doc.addPage();
    y = margin;
    paintPaper();
  };
  const ensure = (h: number) => {
    if (y + h > pageH - margin - 20) newPage();
  };
  const paintPaper = () => {
    doc.setFillColor(...THEME.paper);
    doc.rect(0, 0, pageW, pageH, "F");
    // Footer rule + page number
    doc.setDrawColor(...THEME.rule);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - margin + 8, pageW - margin, pageH - margin + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...THEME.muted);
    const pageNum = doc.getNumberOfPages();
    doc.text(
      `${p.title || "Meeting"}  ·  Page ${pageNum}`,
      pageW / 2,
      pageH - margin + 22,
      { align: "center" },
    );
  };

  // Measure inline run width with the appropriate font.
  const runWidth = (r: InlineRun, baseSize: number) => {
    doc.setFont("helvetica", r.bold ? (r.italic ? "bolditalic" : "bold") : r.italic ? "italic" : "normal");
    doc.setFontSize(baseSize);
    if (r.code) {
      doc.setFont("courier", "normal");
    }
    return doc.getTextWidth(r.text);
  };

  // Word-wrap an array of inline runs into visual lines that fit maxW,
  // preserving per-word styling. Each output line is an array of runs.
  const wrapRuns = (runs: InlineRun[], baseSize: number): InlineRun[][] => {
    const lines: InlineRun[][] = [[]];
    let usedW = 0;
    for (const run of runs) {
      // split into words but keep spaces
      const tokens = run.text.split(/(\s+)/).filter((t) => t.length > 0);
      for (const tok of tokens) {
        const seg: InlineRun = { ...run, text: tok };
        const w = runWidth(seg, baseSize);
        if (usedW + w > maxW && /\S/.test(tok)) {
          lines.push([seg]);
          usedW = w;
        } else {
          lines[lines.length - 1].push(seg);
          usedW += w;
        }
      }
    }
    return lines.map((l) => {
      // trim leading whitespace runs from wrapped lines
      while (l.length && !/\S/.test(l[0].text)) l.shift();
      return l;
    }).filter((l) => l.length > 0);
  };

  // Draw a wrapped line at current y, given indent.
  const drawRunLine = (lineRuns: InlineRun[], size: number, indent: number) => {
    ensure(size + 6);
    let x = margin + indent;
    for (const r of lineRuns) {
      if (r.code) {
        doc.setFont("courier", "normal");
        doc.setFontSize(size - 1);
        const w = doc.getTextWidth(r.text);
        doc.setFillColor(...THEME.codeBg);
        doc.roundedRect(x - 1, y - size + 2, w + 2, size + 2, 2, 2, "F");
        doc.setTextColor(...THEME.ink);
        doc.text(r.text, x, y);
        x += w;
      } else {
        doc.setFont(
          "helvetica",
          r.bold ? (r.italic ? "bolditalic" : "bold") : r.italic ? "italic" : "normal",
        );
        doc.setFontSize(size);
        if (r.link) {
          doc.setTextColor(...THEME.brand);
          const w = doc.getTextWidth(r.text);
          doc.textWithLink(r.text, x, y, { url: r.link });
          // underline
          doc.setDrawColor(...THEME.brand);
          doc.setLineWidth(0.5);
          doc.line(x, y + 1.5, x + w, y + 1.5);
          x += w;
        } else {
          doc.setTextColor(...THEME.ink);
          doc.text(r.text, x, y);
          x += doc.getTextWidth(r.text);
        }
      }
    }
    y += size + 6;
  };

  const writeInline = (text: string, size: number, indent = 0) => {
    const runs = parseInline(text);
    const wrapped = wrapRuns(runs, size);
    for (const line of wrapped) drawRunLine(line, size, indent);
  };

  // Heading helpers
  const heading = (text: string, level: 1 | 2 | 3) => {
    const size = level === 1 ? 22 : level === 2 ? 16 : 13;
    y += level === 1 ? 8 : 10;
    ensure(size + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...(level === 1 ? THEME.brand : THEME.ink));
    const lines = doc.splitTextToSize(text, maxW);
    for (const l of lines) {
      ensure(size + 6);
      doc.text(l, margin, y);
      y += size + 4;
    }
    if (level === 1) {
      y += 4;
      doc.setDrawColor(...THEME.brand);
      doc.setLineWidth(1.2);
      doc.line(margin, y, margin + 40, y);
      y += 10;
    } else {
      y += 4;
    }
  };

  // ----- cover -----
  paintPaper();
  // Brand accent bar
  doc.setFillColor(...THEME.brand);
  doc.rect(margin, margin - 12, 36, 4, "F");
  y = margin + 6;

  heading(p.title || "Meeting", 1);

  // Meta card
  const meta: { label: string; value: string }[] = [];
  if (p.startsAt) meta.push({ label: "When", value: fmt(p.startsAt) });
  if (p.platform) meta.push({ label: "Platform", value: p.platform });
  if (p.joinUrl) meta.push({ label: "Join", value: p.joinUrl });
  if (p.attendees.length) meta.push({ label: "Attendees", value: p.attendees.join(", ") });

  if (meta.length) {
    const padX = 14;
    const padY = 12;
    const lineH = 14;
    const valW = maxW - 80 - padX * 2;
    // measure
    let needed = padY * 2;
    for (const m of meta) {
      const vLines = doc.splitTextToSize(m.value, valW);
      needed += Math.max(lineH, vLines.length * lineH);
    }
    ensure(needed + 6);
    doc.setFillColor(...THEME.brandSoft);
    doc.setDrawColor(...THEME.brand);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, maxW, needed, 6, 6, "FD");
    let yy = y + padY + 10;
    for (const m of meta) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.brand);
      doc.text(m.label.toUpperCase(), margin + padX, yy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...THEME.ink);
      const lines = doc.splitTextToSize(m.value, valW);
      for (const l of lines) {
        doc.text(l, margin + padX + 80, yy);
        yy += lineH;
      }
      yy += 2;
    }
    y += needed + 16;
  }

  // ----- Markdown body renderer -----
  const renderMarkdown = (md: string) => {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    let inCode = false;
    let codeBuf: string[] = [];
    let listCounters: number[] = []; // for nested ordered lists (not used; kept simple)

    const flushCode = () => {
      if (!codeBuf.length) return;
      const size = 10;
      const padX = 10;
      const padY = 8;
      const lineH = 13;
      // wrap each code line
      doc.setFont("courier", "normal");
      doc.setFontSize(size);
      const innerW = maxW - padX * 2;
      const wrapped: string[] = [];
      for (const c of codeBuf) {
        const parts = doc.splitTextToSize(c.length ? c : " ", innerW);
        wrapped.push(...parts);
      }
      const boxH = padY * 2 + wrapped.length * lineH;
      ensure(boxH + 6);
      doc.setFillColor(...THEME.codeBg);
      doc.roundedRect(margin, y, maxW, boxH, 4, 4, "F");
      doc.setTextColor(...THEME.ink);
      let yy = y + padY + lineH - 4;
      for (const l of wrapped) {
        doc.text(l, margin + padX, yy);
        yy += lineH;
      }
      y += boxH + 8;
      codeBuf = [];
    };

    for (const raw of lines) {
      const line = raw.replace(/\s+$/, "");
      if (line.startsWith("```")) {
        if (inCode) {
          flushCode();
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }
      if (!line.trim()) {
        y += 6;
        listCounters = [];
        continue;
      }
      if (line === "---" || line === "***") {
        ensure(14);
        y += 6;
        doc.setDrawColor(...THEME.rule);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + maxW, y);
        y += 10;
        continue;
      }
      if (line.startsWith("### ")) {
        heading(line.slice(4), 3);
        continue;
      }
      if (line.startsWith("## ")) {
        heading(line.slice(3), 2);
        continue;
      }
      if (line.startsWith("# ")) {
        heading(line.slice(2), 1);
        continue;
      }
      if (line.startsWith("> ")) {
        // blockquote
        ensure(20);
        const text = line.slice(2);
        const runs = parseInline(text);
        const wrapped = wrapRuns(runs, 11);
        const blockStart = y - 9;
        for (const w of wrapped) drawRunLine(w, 11, 14);
        doc.setDrawColor(...THEME.brand);
        doc.setLineWidth(2);
        doc.line(margin + 4, blockStart, margin + 4, y - 6);
        continue;
      }
      // task list
      const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const indent = Math.floor(taskMatch[1].length / 2) * 14;
        const done = /x/i.test(taskMatch[2]);
        const text = taskMatch[3];
        ensure(14);
        // checkbox
        doc.setDrawColor(...THEME.brand);
        doc.setLineWidth(0.8);
        const boxSize = 9;
        const boxY = y - boxSize + 2;
        doc.roundedRect(margin + indent, boxY, boxSize, boxSize, 1.5, 1.5, "S");
        if (done) {
          doc.setFillColor(...THEME.brand);
          doc.roundedRect(margin + indent + 1.5, boxY + 1.5, boxSize - 3, boxSize - 3, 1, 1, "F");
        }
        writeInline(text, 11, indent + 16);
        continue;
      }
      // unordered list
      const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (ulMatch) {
        const indent = Math.floor(ulMatch[1].length / 2) * 14;
        ensure(14);
        doc.setFillColor(...THEME.brand);
        doc.circle(margin + indent + 3, y - 3, 1.5, "F");
        writeInline(ulMatch[2], 11, indent + 12);
        continue;
      }
      // ordered list
      const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (olMatch) {
        const indent = Math.floor(olMatch[1].length / 2) * 14;
        const num = olMatch[2];
        ensure(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...THEME.brand);
        doc.text(`${num}.`, margin + indent, y);
        writeInline(olMatch[3], 11, indent + 18);
        continue;
      }
      writeInline(line, 11, 0);
    }
    if (inCode) flushCode();
  };

  if (p.summary?.trim()) {
    heading("AI Summary", 2);
    renderMarkdown(p.summary.trim());
    y += 8;
  }
  if (p.notes?.trim()) {
    heading("Notes", 2);
    renderMarkdown(p.notes.trim());
  }

  // Paint footers on all pages (cover footer already drawn; redo to ensure
  // numbers reflect final count).
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...THEME.rule);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - margin + 8, pageW - margin, pageH - margin + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...THEME.muted);
    doc.text(
      `${p.title || "Meeting"}  ·  Page ${i} of ${total}`,
      pageW / 2,
      pageH - margin + 22,
      { align: "center" },
    );
  }

  doc.save(`${sanitizeFilename(p.title)}.pdf`);
}
