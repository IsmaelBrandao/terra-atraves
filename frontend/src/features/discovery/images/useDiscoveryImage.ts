import { useQuery } from "@tanstack/react-query";

import type { ImageSearchTerm } from "../discoveryContent";
import { withImageCache, type DiscoveryImageProvider } from "./imageProvider";
import { createWikimediaImageProvider } from "./wikimediaImageProvider";

export const defaultImageProvider: DiscoveryImageProvider = withImageCache(createWikimediaImageProvider());

/** Fetches only when the discovery is on screen; never blocks the result. */
export function useDiscoveryImage(
  terms: ImageSearchTerm[],
  enabled: boolean,
  provider: DiscoveryImageProvider = defaultImageProvider,
) {
  return useQuery({
    queryKey: ["discovery-image", provider.name, terms.map((term) => term.title)],
    queryFn: () => provider.findImage(terms),
    enabled: enabled && terms.length > 0,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
}
