import type { ImageSearchTerm } from "../discoveryContent";

export interface DiscoveryImage {
  src: string;
  width: number;
  height: number;
  /** Article the image illustrates, e.g. "Biak". */
  subject: string;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface DiscoveryImageProvider {
  readonly name: string;
  findImage: (terms: ImageSearchTerm[], signal?: AbortSignal) => Promise<DiscoveryImage | null>;
}

/**
 * Caches results per ordered term list so repeating a drilling never refetches, and swallows
 * provider failures: the discovery must keep working without an image.
 * The shared request deliberately ignores per-caller abort signals: a remount (or React
 * StrictMode) must never receive a promise that an earlier, unmounted caller already cancelled.
 */
export function withImageCache(provider: DiscoveryImageProvider): DiscoveryImageProvider {
  const cache = new Map<string, Promise<DiscoveryImage | null>>();
  return {
    name: provider.name,
    findImage(terms) {
      const key = terms.map((term) => term.title.toLocaleLowerCase("pt-BR")).join("|");
      const cached = cache.get(key);
      if (cached) return cached;
      const request = provider.findImage(terms).catch(() => {
        cache.delete(key);
        return null;
      });
      cache.set(key, request);
      return request;
    },
  };
}
