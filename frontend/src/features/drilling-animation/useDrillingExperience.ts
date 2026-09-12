import { useContext } from "react";

import {
  DrillingExperienceContext,
  type DrillingExperienceContextValue,
} from "./drillingExperience.context";

export function useDrillingExperience(): DrillingExperienceContextValue {
  const context = useContext(DrillingExperienceContext);
  if (!context) throw new Error("DrillingExperienceProvider não encontrado");
  return context;
}
