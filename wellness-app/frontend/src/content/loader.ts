// MDX content registry. Each preset id may have a matching .mdx file under
// `./presets/`; the loader returns the React component lazily so unused
// articles aren't shipped in the initial JS bundle.

import type { ComponentType, LazyExoticComponent } from 'react';
import { lazy } from 'react';

// `import.meta.glob` is Vite's static-glob primitive — paths are resolved at
// build time so the keys here are the full URL paths from the project root.
const modules = import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>(
  '/src/content/presets/*.mdx'
);

/** Return a lazy React component for the given preset id, or null if no article exists. */
export function getPresetArticle(
  id: string
): LazyExoticComponent<ComponentType<Record<string, unknown>>> | null {
  const key = `/src/content/presets/${id}.mdx`;
  const importer = modules[key];
  if (!importer) return null;
  return lazy(importer);
}

/** Set of preset ids that currently have written articles. */
export function articleIds(): Set<string> {
  const ids = new Set<string>();
  for (const key of Object.keys(modules)) {
    const match = key.match(/\/([^/]+)\.mdx$/);
    if (match) ids.add(match[1]);
  }
  return ids;
}
