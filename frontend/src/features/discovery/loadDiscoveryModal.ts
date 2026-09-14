let modalModule: Promise<typeof import("./DiscoveryModal")> | null = null;

/** The modal, sharing and image provider stay out of the entry bundle until a journey starts. */
export function loadDiscoveryModal() {
  modalModule ??= import("./DiscoveryModal").catch((error: unknown) => {
    modalModule = null;
    throw error;
  });
  return modalModule;
}
