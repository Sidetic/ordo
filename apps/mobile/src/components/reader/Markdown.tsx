/**
 * Lightweight Markdown renderer styled with theme tokens.
 *
 * Handles the common subset produced by the server's Readability→Turndown
 * pipeline: ATX headings, ordered/unordered lists, blockquotes, fenced/inline
 * code, images, links, horizontal rules, and inline bold/italic/code.
 *
 * No external dependency → fully themeable, including AMOLED.
 */
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { fontSize, resolveFont, spacing } from "../../theme/tokens";
import type { TextVariant } from "../ui/Text";

/* ----------------------------- inline parsing ----------------------------- */

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

// Matches bold, italic, inline code, or links — whichever comes first.
const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

function parseInline(raw: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(raw)) !== null) {
    if (m.index > last) segments.push({ text: raw.slice(last, m.index) });
    if (m[2] != null) segments.push({ text: m[2], bold: true });
    else if (m[4] != null) segments.push({ text: m[4], bold: true });
    else if (m[6] != null) segments.push({ text: m[6], italic: true });
    else if (m[8] != null) segments.push({ text: m[8], italic: true });
    else if (m[10] != null) segments.push({ text: m[10], code: true });
    else if (m[12] != null) segments.push({ text: m[12], link: m[13] });
    last = INLINE_RE.lastIndex;
  }
  if (last < raw.length) segments.push({ text: raw.slice(last) });
  return segments;
}

function InlineText({ segments }: { segments: Segment[] }) {
  const { palette } = useTheme();
  return (
    <React.Fragment>
      {segments.map((s, i) => {
        if (s.link) {
          return (
            <Text
              key={i}
              variant="body"
              color="accent"
              onPress={() => Linking.openURL(s.link!).catch(() => {})}
              style={{ textDecorationLine: "underline" }}
            >
              {s.text}
            </Text>
          );
        }
        const weight = s.bold ? "600" : "400";
        const style = s.code
          ? {
              fontFamily: resolveFont("mono", "400"),
              backgroundColor: palette.surfaceSecondary,
              paddingHorizontal: 4,
              borderRadius: 4,
              fontStyle: "normal" as const,
            }
          : { fontStyle: (s.italic ? "italic" : "normal") as "italic" | "normal" };
        return (
          <Text key={i} variant="body" style={{ fontWeight: weight as any, ...style }}>
            {s.text}
          </Text>
        );
      })}
    </React.Fragment>
  );
}

/* ----------------------------- block parsing ------------------------------ */

type Block =
  | { type: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; lang?: string; text: string }
  | { type: "img"; src: string; alt?: string }
  | { type: "hr" };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const flushPara = (buf: string[]) => {
    if (buf.length) {
      blocks.push({ type: "p", text: buf.join(" ").trim() });
      buf.length = 0;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", lang: fence[1], text: buf.join("\n") });
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ type: "h", level: h[1].length as 1, text: h[2].trim() });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote (consecutive)
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: buf.join(" ").trim() });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Image on its own line
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
    if (img) {
      blocks.push({ type: "img", alt: img[1], src: img[2] });
      i++;
      continue;
    }

    // Blank line ends a paragraph
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (accumulate consecutive non-empty, non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    flushPara(buf);
  }

  return blocks;
}

/* ------------------------------ rendering --------------------------------- */

export interface MarkdownProps {
  children: string;
}

const headingVariant: Record<number, TextVariant> = {
  1: "title1",
  2: "title2",
  3: "title3",
  4: "headline",
  5: "headline",
  6: "subhead",
};

export function Markdown({ children }: MarkdownProps) {
  const { palette } = useTheme();
  const blocks = React.useMemo(() => parseBlocks(children ?? ""), [children]);

  return (
    <View>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case "h":
            return (
              <Text key={idx} variant={headingVariant[b.level]} style={{ marginTop: idx ? spacing[24] : 0, marginBottom: spacing[8] }}>
                {b.text}
              </Text>
            );
          case "p":
            return (
              <Text key={idx} variant="body" style={{ marginTop: spacing[12], lineHeight: fontSize.md * 1.65 }}>
                <InlineText segments={parseInline(b.text)} />
              </Text>
            );
          case "ul":
            return (
              <View key={idx} style={{ marginTop: spacing[12] }}>
                {b.items.map((it, j) => (
                  <View key={j} style={[styles.liRow, { marginBottom: spacing[6] }]}>
                    <View style={[styles.bullet, { backgroundColor: palette.textTertiary }]} />
                    <Text variant="body" style={{ flex: 1, lineHeight: fontSize.md * 1.6 }}>
                      <InlineText segments={parseInline(it)} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case "ol":
            return (
              <View key={idx} style={{ marginTop: spacing[12] }}>
                {b.items.map((it, j) => (
                  <View key={j} style={[styles.liRow, { marginBottom: spacing[6] }]}>
                    <Text variant="bodyStrong" color="accent" style={{ width: 20 }}>{j + 1}.</Text>
                    <Text variant="body" style={{ flex: 1, lineHeight: fontSize.md * 1.6 }}>
                      <InlineText segments={parseInline(it)} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case "quote":
            return (
              <View key={idx} style={[styles.quote, { borderLeftColor: palette.accent, backgroundColor: palette.surfaceSecondary }]}>
                <Text variant="body" color="secondary" style={{ lineHeight: fontSize.md * 1.6 }}>
                  <InlineText segments={parseInline(b.text)} />
                </Text>
              </View>
            );
          case "code":
            return (
              <View key={idx} style={[styles.code, { backgroundColor: palette.surfaceSecondary }]}>
                <Text variant="mono" style={{ lineHeight: fontSize.sm * 1.55 }}>
                  {b.text}
                </Text>
              </View>
            );
          case "hr":
            return <View key={idx} style={[styles.hr, { backgroundColor: palette.border }]} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  liRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[10] },
  bullet: { width: 5, height: 5, borderRadius: 2.5, marginTop: 9 },
  quote: { borderLeftWidth: 3, paddingHorizontal: spacing[14], paddingVertical: spacing[10], borderRadius: 6, marginTop: spacing[12] },
  code: { paddingHorizontal: spacing[14], paddingVertical: spacing[12], borderRadius: 10, marginTop: spacing[12] },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: spacing[20] },
});
