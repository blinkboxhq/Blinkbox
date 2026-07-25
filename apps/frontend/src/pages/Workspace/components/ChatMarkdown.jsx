import { useState, useCallback, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy}
      className={`flex items-center gap-1 text-[10px] transition-colors ${copied ? 'text-emerald-400' : 'text-neutral-600 hover:text-neutral-300'} ${className}`}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ lang, code }) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#252525] my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-[#252525]">
        <span className="text-[10px] font-mono text-neutral-600">{lang || 'code'}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="px-3 py-3 bg-[#0a0a0c] overflow-x-auto">
        <code className="text-[11px] font-mono text-neutral-300 leading-[1.7]">{code}</code>
      </pre>
    </div>
  );
}

function parseInline(text, key = 0) {
  const parts = [];
  let rem = text;
  let i = key * 1000;
  while (rem.length > 0) {
    const codeM = rem.match(/^`([^`]+)`/);
    if (codeM) {
      parts.push(
        <code key={i++} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[11px] font-mono text-neutral-300">
          {codeM[1]}
        </code>
      );
      rem = rem.slice(codeM[0].length);
      continue;
    }
    const boldM = rem.match(/^\*\*([^*]+)\*\*/);
    if (boldM) {
      parts.push(<strong key={i++} className="font-semibold text-neutral-100">{boldM[1]}</strong>);
      rem = rem.slice(boldM[0].length);
      continue;
    }
    const italM = rem.match(/^\*([^*]+)\*/);
    if (italM) {
      parts.push(<em key={i++} className="italic text-neutral-400">{italM[1]}</em>);
      rem = rem.slice(italM[0].length);
      continue;
    }
    const imgM = rem.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgM) {
      parts.push(<img key={i++} src={imgM[2].split(/\s+/)[0]} alt={imgM[1]} className="max-w-full rounded-lg border border-[#252525] my-1" />);
      rem = rem.slice(imgM[0].length);
      continue;
    }
    const linkM = rem.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkM) {
      parts.push(
        <a key={i++} href={linkM[2].split(/\s+/)[0]} target="_blank" rel="noopener noreferrer"
          className="text-[var(--bb-accent-hot)] underline decoration-white/20 hover:decoration-white/60 break-words">
          {linkM[1]}
        </a>
      );
      rem = rem.slice(linkM[0].length);
      continue;
    }
    const next = rem.search(/[`*[!]/);
    if (next === -1) { parts.push(rem); break; }
    if (next > 0) { parts.push(rem.slice(0, next)); rem = rem.slice(next); continue; }
    parts.push(rem[0]);
    rem = rem.slice(1);
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export function MarkdownRenderer({ text, streaming }) {
  const segments = useMemo(() => text.split(/(```[\s\S]*?```)/g), [text]);
  return (
    <div className="space-y-2 text-[12.5px] text-neutral-300 leading-relaxed">
      {segments.map((seg, si) => {
        if (seg.startsWith('```')) {
          const m = seg.match(/```(\w*)\n?([\s\S]*?)```/);
          return <CodeBlock key={si} lang={m?.[1] || ''} code={m?.[2]?.trim() || seg} />;
        }
        const lines = seg.split('\n');
        const out = [];
        let listBuf = [];
        const flushList = (idx) => {
          if (!listBuf.length) return;
          out.push(
            <ul key={`list-${idx}`} className="pl-1 space-y-1">
              {listBuf.map((item, ii) => (
                <li key={ii} className="flex gap-2">
                  <span className="text-neutral-600 shrink-0 mt-px">{item.ordered ? `${item.n}.` : '·'}</span>
                  <span>{parseInline(item.content, ii)}</span>
                </li>
              ))}
            </ul>
          );
          listBuf = [];
        };
        let quoteBuf = [];
        const flushQuote = (idx) => {
          if (!quoteBuf.length) return;
          out.push(
            <blockquote key={`q-${idx}`} className="border-l-2 border-neutral-700 pl-3 my-1.5 space-y-1 text-neutral-400 italic">
              {quoteBuf.map((q, qi) => <p key={qi}>{parseInline(q, qi)}</p>)}
            </blockquote>
          );
          quoteBuf = [];
        };
        const isTableSep = (s) => /^[\s|:-]+$/.test(s) && s.includes('-') && s.includes('|');
        const splitRow = (s) => s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

        let li = 0;
        while (li < lines.length) {
          const line = lines[li];

          if (line.includes('|') && li + 1 < lines.length && isTableSep(lines[li + 1])) {
            flushList(li); flushQuote(li);
            const headers = splitRow(line);
            const rows = [];
            let ti = li + 2;
            while (ti < lines.length && lines[ti].includes('|') && lines[ti].trim()) {
              rows.push(splitRow(lines[ti]));
              ti++;
            }
            out.push(
              <div key={`t-${li}`} className="my-2 overflow-x-auto rounded-lg border border-[#252525]">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-neutral-900">
                      {headers.map((h, hi) => (
                        <th key={hi} className="text-left font-semibold text-neutral-200 px-2.5 py-1.5 border-b border-[#252525]">{parseInline(h, hi)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} className="border-b border-[#1c1c1c] last:border-0">
                        {headers.map((_, ci) => (
                          <td key={ci} className="px-2.5 py-1.5 text-neutral-300 align-top">{parseInline(r[ci] ?? '', ci)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            li = ti;
            continue;
          }

          const quoteM = line.match(/^>\s?(.*)/);
          if (quoteM) { flushList(li); quoteBuf.push(quoteM[1]); li++; continue; }
          flushQuote(li);

          if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
            flushList(li);
            out.push(<hr key={`hr-${li}`} className="border-0 border-t border-[#252525] my-3" />);
            li++; continue;
          }

          const bulletM = line.match(/^[-*]\s+(.+)/);
          const numM    = line.match(/^(\d+)\.\s+(.+)/);
          if (bulletM) { listBuf.push({ ordered: false, content: bulletM[1] }); li++; continue; }
          if (numM)    { listBuf.push({ ordered: true, n: numM[1], content: numM[2] }); li++; continue; }
          flushList(li);

          if (line.startsWith('### ')) {
            out.push(<p key={li} className="font-semibold text-neutral-100 text-[13px] mt-1">{parseInline(line.slice(4), li)}</p>);
          } else if (line.startsWith('## ')) {
            out.push(<p key={li} className="font-bold text-neutral-100 text-[14px] mt-2">{parseInline(line.slice(3), li)}</p>);
          } else if (line.startsWith('# ')) {
            out.push(<p key={li} className="font-bold text-white text-[15px] mt-2">{parseInline(line.slice(2), li)}</p>);
          } else if (line.trim()) {
            out.push(<p key={li}>{parseInline(line, li)}</p>);
          } else if (li > 0 && out.length > 0) {
            out.push(<div key={`sp-${li}`} className="h-1" />);
          }
          li++;
        }
        flushList('end');
        flushQuote('end');
        return <div key={si} className="space-y-1">{out}</div>;
      })}
      {streaming && (
        <span className="inline-block w-[2px] h-3.5 bg-white/40 align-middle animate-pulse ml-0.5" style={{ borderRadius: 1 }} />
      )}
    </div>
  );
}
