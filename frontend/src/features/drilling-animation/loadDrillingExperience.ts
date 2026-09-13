let drillingExperienceModule: Promise<typeof import("./DrillingExperience")> | null = null;

export function loadDrillingExperience() {
  drillingExperienceModule ??= import("./DrillingExperience");
  return drillingExperienceModule;
}

export function preloadDrillingExperience(): void {
  void loadDrillingExperience().catch(() => {
    drillingExperienceModule = null;
  });
}
