export type FitnessEditorTarget =
  | {
      kind: "workout";
      date?: string;
      replaceWorkoutId?: string | null;
    }
  | { kind: "training-plan" }
  | { kind: "nutrition-plan" }
  | { kind: "meal" }
  | { kind: "weight" }
  | { kind: "goal" };
