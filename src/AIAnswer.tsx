import { useEffect, useState } from "react";
import { executePython } from "./python-sandbox";

export type AISource = { lessonKey: string; title: string; courseTitle: string; references?: string[] };

export function PythonRun({ code }: { code: string }) {
  const [state, setState] = useState<{ loading: boolean; output?: string; error?: string }>({ loading: true });
  useEffect(() => {
    let live = true;
    executePython(code).then(result => { if (live) setState({ loading: false, output: result.output }); })
      .catch(error => { if (live) setState({ loading: false, error: error instanceof Error ? error.message : "اجرای مثال انجام نشد." }); });
    return () => { live = false; };
  }, [code]);
  return <div className="ai-code-example" dir="rtl"><span>مثال پایتون</span><pre dir="ltr"><code>{code}</code></pre><div className={state.error ? "sandbox-output error" : "sandbox-output"}><b>خروجی واقعی محیط</b><code dir="ltr">{state.loading ? "در حال آماده‌سازی و اجرای پایتون؛ بارگذاری نخست ممکن است چند ثانیه طول بکشد…" : state.error || state.output || "این مثال چیزی در خروجی چاپ نمی‌کند."}</code></div></div>;
}

function formatEnglishExamples(text: string) {
  const lines = text.split("\n");
  const result: Array<{ type: "text" | "example"; text: string; english?: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const fa = lines[i].match(/^\s*(?:ترجمه(?:ٔ|ی)? فارسی|فارسی|Persian translation)\s*[:：]\s*(.*)$/i);
    const en = lines[i + 1]?.match(/^\s*(?:English|انگلیسی)\s*[:：]\s*(.*)$/i);
    if (fa && en) { result.push({ type: "example", text: fa[1], english: en[1] }); i++; }
    else result.push({ type: "text", text: lines[i] });
  }
  return result;
}

export function SourceBadge({ source }: { source?: AISource }) {
  if (!source) return null;
  return <div className="ai-source" dir="rtl"><span>مبنای پاسخ</span><b>{source.title}</b><small>{source.courseTitle}{source.references?.length ? ` · منابع: ${source.references.join("، ")}` : ""}</small></div>;
}

export function AIAnswer({ text, subject, source }: { text: string; subject: "python" | "english"; source?: AISource }) {
  const chunks = text.split(/```(?:python)?\s*\n([\s\S]*?)```/gi);
  if (subject === "python") return <div className="ai-answer"><SourceBadge source={source}/>{chunks.map((chunk, index) => {
    if (index % 2) return <PythonRun key={index} code={chunk.trimEnd()}/>;
    const lines = chunk.split("\n");
    return lines.map((line, row) => <span key={`${index}-${row}`}>{line}{row < lines.length - 1 && <br/>}</span>);
  })}</div>;
  const plain = text.replace(/```[\s\S]*?```/g, "[برای درس انگلیسی از بلوک کد استفاده نمی‌شود.]");
  return <div className="ai-answer"><SourceBadge source={source}/>{formatEnglishExamples(plain).map((item, index) => item.type === "example" ? <div className="ai-english-example" key={index}><span>ترجمه فارسی</span><b>{item.text}</b><span>English</span><strong dir="ltr">{item.english}</strong></div> : <span key={index}>{item.text}{index < plain.split("\n").length - 1 && <br/>}</span>)}</div>;
}
