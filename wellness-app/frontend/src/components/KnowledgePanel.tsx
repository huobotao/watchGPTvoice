import { Suspense, useMemo, type ComponentType, type ReactNode } from 'react';
import { MDXProvider as MDXProviderRaw } from '@mdx-js/react';
import { useSimStore } from '@/store/useSimStore';
import { getPresetArticle, articleIds } from '@/content/loader';
import { getPreset } from '@/simulator/presets';

// @mdx-js/react 3's MDXProvider has a JSX-type incompatibility with React 18's
// ReactNode constraint; cast to a permissive React component type.
const MDXProvider = MDXProviderRaw as unknown as ComponentType<{
  components?: Record<string, ComponentType<any>>;
  children?: ReactNode;
}>;

const mdxComponents = {
  h2: (props: any) => (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-100 mt-1 mb-2" {...props} />
  ),
  h3: (props: any) => <h3 className="text-xs font-semibold uppercase text-slate-300 mt-3 mb-1" {...props} />,
  p: (props: any) => <p className="text-xs leading-relaxed text-slate-300 mb-2" {...props} />,
  strong: (props: any) => <strong className="text-slate-100" {...props} />,
  em: (props: any) => <em className="text-slate-200" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300 mb-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300 mb-2" {...props} />,
  li: (props: any) => <li className="text-xs leading-relaxed" {...props} />,
  blockquote: (props: any) => (
    <blockquote
      className="border-l-2 border-rose-500/60 bg-rose-950/30 pl-3 py-2 text-xs text-rose-100 mb-2 rounded-r"
      {...props}
    />
  ),
  code: (props: any) => (
    <code className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-amber-200 font-mono" {...props} />
  )
};

export function KnowledgePanel() {
  const presetId = useSimStore(s => s.presetId);
  const Article = useMemo(() => (presetId ? getPresetArticle(presetId) : null), [presetId]);
  const preset = presetId ? getPreset(presetId) : null;
  const hasAny = articleIds().size;

  return (
    <div className="h-full overflow-y-auto px-3 py-3">
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Knowledge</div>
        <div className="text-sm font-semibold text-slate-100">{preset?.name ?? '—'}</div>
        {preset && (
          <div className="text-[10px] text-slate-500 mt-0.5">
            {preset.category} · {preset.tags.join(' · ')}
          </div>
        )}
      </div>

      {!presetId && (
        <div className="text-xs text-slate-500">Select a preset to see its kinesiology notes.</div>
      )}

      {presetId && !Article && (
        <div className="text-xs text-slate-500 space-y-2">
          <p>
            No written article for <span className="text-slate-300 font-mono">{presetId}</span> yet.
          </p>
          <p className="text-slate-600">
            {hasAny} of {/* lazy: just use preset count */} the library currently has notes.
            Articles live in <span className="font-mono">src/content/presets/{presetId}.mdx</span>;
            contributions welcome.
          </p>
        </div>
      )}

      {Article && (
        <MDXProvider components={mdxComponents}>
          <Suspense fallback={<div className="text-xs text-slate-500">Loading…</div>}>
            <article className="prose prose-invert max-w-none">
              <Article />
            </article>
          </Suspense>
        </MDXProvider>
      )}
    </div>
  );
}
