import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { xml } from "@codemirror/lang-xml";
import { javascript } from "@codemirror/lang-javascript";
import { basicDark, basicLight } from "@uiw/codemirror-theme-basic";
import { useMemo } from "react";
import type { ApiTheme } from "../types";
import { cn } from "../../../utils/cn";

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  theme = "light",
  minHeight = "180px",
  fill = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: "json" | "html" | "xml" | "javascript" | "text";
  readOnly?: boolean;
  theme?: ApiTheme;
  minHeight?: string;
  fill?: boolean;
  className?: string;
}) {
  const extensions = useMemo(() => {
    switch (language) {
      case "json":
        return [json()];
      case "html":
        return [html()];
      case "xml":
        return [xml()];
      case "javascript":
        return [javascript()];
      default:
        return [];
    }
  }, [language]);

  return (
    <div className={cn("ac-code", fill && "ac-code--fill", className)}>
      <CodeMirror
        value={value}
        height={fill ? "100%" : minHeight}
        theme={theme === "dark" ? basicDark : basicLight}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !readOnly,
        }}
        onChange={onChange}
      />
    </div>
  );
}

export function detectLanguage(mimeType: string, body: string): "json" | "html" | "xml" | "text" {
  const lower = mimeType.toLowerCase();
  if (lower.includes("json")) return "json";
  if (lower.includes("html")) return "html";
  if (lower.includes("xml") || lower.includes("svg")) return "xml";
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) return "html";
  if (trimmed.startsWith("<")) return "xml";
  return "text";
}

export function prettyPrint(body: string, language: string): string {
  if (language !== "json") return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
