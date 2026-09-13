import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { clearSharedOriginFromAddressBar } from "./features/discovery/share/shareLink";
import { parseSharedOrigin } from "./map/initialView";
import { useExplorationStore } from "./store/exploration.store";
import "./styles.css";

// A shared link marks its origin before the first render; invalid parameters are simply dropped.
const sharedOrigin = parseSharedOrigin(window.location.search);
if (sharedOrigin) useExplorationStore.getState().selectPoint(sharedOrigin);
else clearSharedOriginFromAddressBar();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
