export type DrillingVisualState =
  | "idle"
  | "preparing"
  | "zooming_out"
  | "showing_route"
  | "entering_earth"
  | "crossing_crust"
  | "crossing_mantle"
  | "crossing_outer_core"
  | "crossing_inner_core"
  | "crossing_center"
  | "ascending"
  | "exiting_earth"
  | "revealing_destination"
  | "paused"
  | "completed"
  | "cancelled";

export type DrillingMachineEvent =
  | { type: "ADVANCE"; target: DrillingVisualState }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "CANCEL" }
  | { type: "RESET" };

const ORDERED_STATES: DrillingVisualState[] = [
  "idle",
  "preparing",
  "zooming_out",
  "showing_route",
  "entering_earth",
  "crossing_crust",
  "crossing_mantle",
  "crossing_outer_core",
  "crossing_inner_core",
  "crossing_center",
  "ascending",
  "exiting_earth",
  "revealing_destination",
  "completed",
];

const ACTIVE_STATES = new Set<DrillingVisualState>(ORDERED_STATES.slice(1, -1));

export interface DrillingMachineSnapshot {
  state: DrillingVisualState;
  resumeState: DrillingVisualState | null;
}

export const INITIAL_DRILLING_MACHINE: DrillingMachineSnapshot = {
  state: "idle",
  resumeState: null,
};

export function isDrillingSequenceActive(state: DrillingVisualState): boolean {
  return ACTIVE_STATES.has(state) || state === "paused";
}

export function transitionDrillingMachine(
  snapshot: DrillingMachineSnapshot,
  event: DrillingMachineEvent,
): DrillingMachineSnapshot {
  if (event.type === "RESET") return INITIAL_DRILLING_MACHINE;
  if (event.type === "CANCEL") return { state: "cancelled", resumeState: null };
  if (event.type === "PAUSE" && ACTIVE_STATES.has(snapshot.state)) {
    return { state: "paused", resumeState: snapshot.state };
  }
  if (event.type === "RESUME" && snapshot.state === "paused" && snapshot.resumeState) {
    return { state: snapshot.resumeState, resumeState: null };
  }
  if (event.type !== "ADVANCE" || snapshot.state === "paused") return snapshot;

  const currentIndex = ORDERED_STATES.indexOf(snapshot.state);
  const targetIndex = ORDERED_STATES.indexOf(event.target);
  if (targetIndex > currentIndex || event.target === snapshot.state) {
    return { state: event.target, resumeState: null };
  }
  return snapshot;
}
