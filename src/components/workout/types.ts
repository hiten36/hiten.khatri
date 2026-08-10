export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "hips"
  | "full-body"
  | "cardio";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "band"
  | "medicine-ball"
  | "pull-up-bar"
  | "bench"
  | "smith-machine"
  | "trap-bar"
  | "ez-bar"
  | "cardio-machine"
  | "other";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type TrainingGoal =
  | "strength"
  | "hypertrophy"
  | "fat-loss"
  | "endurance"
  | "mobility"
  | "general-fitness";

export type MovementPattern =
  | "push"
  | "pull"
  | "hinge"
  | "squat"
  | "lunge"
  | "carry"
  | "core"
  | "rotation"
  | "isolation"
  | "olympic"
  | "cardio"
  | "mobility";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PreferredStyle =
  | "full-body"
  | "upper-lower"
  | "push-pull-legs"
  | "body-part-split"
  | "circuit"
  | "home";

export type SetType =
  | "normal"
  | "warmup"
  | "drop"
  | "failure"
  | "amrap"
  | "timed";

export type ExerciseDemoKind = "gif" | "3d" | "diagram" | "none";

export type Exercise = {
  id: string;
  name: string;
  aliases?: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  movementPattern: MovementPattern;
  goals: TrainingGoal[];
  setup: string[];
  steps: string[];
  breathing: string;
  tempo: string;
  formCues: string[];
  commonMistakes: string[];
  safetyNotes: string[];
  regressions: string[];
  progressions: string[];
  substitutions: string[];
  demo: {
    kind: ExerciseDemoKind;
    modelPath?: string;
    animationName?: string;
    gifUrl?: string;
  };
  tags?: string[];
};

export type PrescribedSet = {
  id: string;
  type: SetType;
  targetReps?: number | string;
  targetWeight?: number | null;
  targetRpe?: number | null;
  targetRir?: number | null;
  targetSeconds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  notes?: string;
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  order: number;
  sets: PrescribedSet[];
  notes?: string;
  groupId?: string | null;
  groupType?: "superset" | "circuit" | "dropset" | null;
};

export type PlanDay = {
  id: string;
  name: string;
  order: number;
  focus?: string;
  isRestDay?: boolean;
  exercises: PlanExercise[];
  notes?: string;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  description: string;
  source: "custom" | "template" | "recommended";
  templateId?: string | null;
  goal: TrainingGoal;
  daysPerWeek: number;
  estimatedMinutes: number;
  experience: ExperienceLevel;
  equipment: Equipment[];
  days: PlanDay[];
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  deloadEveryWeeks?: number | null;
  notes?: string;
};

export type BuiltInTemplate = {
  id: string;
  name: string;
  description: string;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  estimatedMinutes: number;
  equipment: Equipment[];
  style: PreferredStyle;
  tags: string[];
  days: Omit<PlanDay, "id">[];
};

export type LoggedSet = {
  id: string;
  prescribedSetId?: string | null;
  type: SetType;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  rir: number | null;
  seconds: number | null;
  completed: boolean;
  skipped: boolean;
  notes?: string;
  completedAt?: number | null;
};

export type SessionExerciseLog = {
  id: string;
  exerciseId: string;
  planExerciseId?: string | null;
  order: number;
  sets: LoggedSet[];
  notes?: string;
  substitutedFromId?: string | null;
  skipped: boolean;
};

export type WorkoutSession = {
  id: string;
  planId?: string | null;
  planDayId?: string | null;
  name: string;
  status: "in-progress" | "paused" | "completed" | "abandoned";
  startedAt: number;
  endedAt?: number | null;
  pausedAt?: number | null;
  accumulatedMs: number;
  exercises: SessionExerciseLog[];
  notes?: string;
  rating?: number | null;
  feeling?: string | null;
};

export type PersonalRecord = {
  id: string;
  exerciseId: string;
  kind: "weight" | "reps" | "volume" | "estimated1rm" | "duration";
  value: number;
  secondaryValue?: number | null;
  sessionId: string;
  achievedAt: number;
  note?: string;
};

export type BodyMeasurement = {
  id: string;
  date: number;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  armsCm?: number | null;
  thighsCm?: number | null;
  notes?: string;
};

export type QuestionnaireAnswers = {
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
  preferredStyle: PreferredStyle;
  mobilityNeeds: boolean;
  limitations: string;
  completedAt: number;
};

export type Achievement = {
  id: string;
  unlockedAt: number;
};

export type Reminder = {
  id: string;
  label: string;
  timeLocal: string;
  daysOfWeek: number[];
  enabled: boolean;
};

export type WorkoutPreferences = {
  units: "kg" | "lb";
  defaultRestSeconds: number;
  loadIncrementKg: number;
  showRpe: boolean;
  showRir: boolean;
  theme: "dark" | "light";
  reducedMotion: boolean;
  plateBarWeightKg: number;
  availablePlatesKg: number[];
};

export type WorkoutStore = {
  version: number;
  plans: WorkoutPlan[];
  activePlanId: string | null;
  sessions: WorkoutSession[];
  activeSessionId: string | null;
  prs: PersonalRecord[];
  measurements: BodyMeasurement[];
  questionnaire: QuestionnaireAnswers | null;
  favorites: string[];
  recentlyViewed: string[];
  achievements: Achievement[];
  reminders: Reminder[];
  preferences: WorkoutPreferences;
  streakFreezeUsedAt: number | null;
};

export type HubTab =
  | "dashboard"
  | "plans"
  | "today"
  | "progress"
  | "exercises"
  | "coach";

export type RecommendationResult = {
  templateId: string;
  score: number;
  reasons: string[];
  adaptedDaysPerWeek: number;
  adaptedMinutes: number;
};
