// Shared shapes for content (characters, levels), runs and the save.

export const MOODS = ['neutral', 'happy', 'laugh', 'flirty', 'interested', 'surprised', 'flustered', 'annoyed', 'sad', 'thinking'] as const;
export type Mood = (typeof MOODS)[number];

export const MOVE_QUALITIES = ['none', 'smooth', 'okay', 'clumsy', 'inappropriate'] as const;
export type MoveQuality = (typeof MOVE_QUALITIES)[number];

export type Pronouns = 'he' | 'she' | 'they';

// ---- characters ---------------------------------------------------------------

export interface OutfitSpec {
  style: string;
  colors?: Record<string, string>;
  extras?: string[];
}

export interface Look {
  skin: string;
  eyes: string;
  hair: { style: string; color: string };
  lips?: string;
  blush?: string;
  lash?: string;
  accent?: string;
  glasses?: string;
  headphones?: string;
  outfit: OutfitSpec;
  outfits?: Record<string, OutfitSpec>;
  extras?: string[];
}

export interface Character {
  id: string;
  displayName: string;
  fullName: string;
  age: number;
  role: string;
  tagline: string;
  color: string;
  judge: { summary: string; loves: string[]; hates: string[] };
  look: Look;
}

// ---- levels -------------------------------------------------------------------

export type ObjectiveType = 'ask' | 'reach' | 'endure';

export interface Objective {
  type: ObjectiveType;
  label: string;
  /** Director's note when she says yes / the goal is reached / she's held up. */
  success: string;
  /** ask + reach: interest needed. */
  threshold?: number;
  /** ask: what the judge looks for. */
  move?: string;
  /** ask: pushy refusals allowed before she's done (default 3). */
  maxAttempts?: number;
  /** ask: director's note for a refusal. */
  refuse?: string;
  /** endure: exchanges to survive, and the floor. */
  turns?: number;
  floor?: number;
  /** endure: director's note when she drops below the floor. */
  collapse?: string;
}

export interface Secret {
  id: string;
  label: string;
  trigger: string;
  minInterest: number;
  reveal: string;
  journal: string;
  flag: string;
  memory?: string;
}

export interface Condition {
  if?: string[];
  ifNot?: string[];
}

export interface FlavorCard extends Condition {
  from: string;
  text: string;
}

export interface OutcomeBlock {
  flags?: string[];
  characterFlags?: Record<string, string[]>;
  affection?: Record<string, number>;
  memory?: string;
  ending?: string;
}

export interface SceneSpec {
  id: string;
  time?: string;
  weather?: string;
}

export interface Level {
  id: string;
  chapter: number;
  title: string;
  characters: string[];
  scene: SceneSpec;
  outfit?: string;
  when: string;
  location: string;
  card: string;
  flavor?: FlavorCard[];
  intro: string[];
  situation: string;
  situationIf?: (Condition & { text: string })[];
  opening: string;
  startInterest: number;
  maxTurns?: number;
  exit: string;
  walkout?: string;
  objective: Objective;
  secrets?: Secret[];
  tips?: string[];
  judgeNotes?: string;
  prerequisites?: {
    levels?: string[];
    flags?: string[];
    flagHints?: Record<string, string>;
    affection?: Record<string, number>;
  };
  exclusiveGroup?: string;
  onComplete?: OutcomeBlock;
  onFail?: OutcomeBlock;
  outro?: { win: string; lose: string };
}

/** A level as it plays for a particular save (conditional lines applied). */
export interface ResolvedLevel extends Level {
  flavorCard: FlavorCard | null;
}

export interface Chapter {
  id: number;
  title: string;
  when: string;
  note: string;
}

// ---- runs -------------------------------------------------------------------

export interface Message {
  role: 'user' | 'model';
  text: string;
  /** Synthetic turns the player never sees (Gemini wants a user turn first). */
  hidden?: boolean;
}

export interface TurnLog {
  turn: number;
  delta: number;
  raw: number;
  mood: Mood;
  feedback: string;
  interest: number;
  asked: boolean;
  refused: boolean;
  revealed: string | null;
}

export type RunStatus = 'playing' | 'win' | 'lose';
export type EndReason = 'goal' | 'walkout' | 'time' | 'asks' | 'floor';

export interface TurnEvents {
  delta: number;
  rawDelta: number;
  mood: Mood;
  feedback: string;
  revealed: Secret | null;
  deflected: Secret | null;
  asked: boolean;
  refused: boolean;
  strike: boolean;
  penalty: number;
}

export interface Run {
  levelId: string;
  characterId: string;
  interest: number;
  startInterest: number;
  turn: number;
  maxTurns: number;
  failedAsks: number;
  revealed: string[];
  status: RunStatus;
  endReason: EndReason | null;
  messages: Message[];
  log: TurnLog[];
  /** Set between the rules step and her reply, so a refresh can re-request it. */
  pending?: { direction: string; events: TurnEvents };
}

export interface JudgeResult {
  read: string;
  delta: number;
  mood: Mood;
  feedback: string;
  made_move: boolean;
  move_quality: MoveQuality;
  triggers: string[];
}

export interface RunSummary {
  outcome: 'win' | 'lose';
  endReason: EndReason | null;
  finalInterest: number;
  turns: number;
  revealed: Secret[];
  secretsTotal: number;
  bestLine: { text: string; delta: number; feedback: string } | null;
}

// ---- save -------------------------------------------------------------------

export interface CharacterState {
  /** 0–100 lasting bond; changes only when a scene ends. */
  affection: number;
  met: boolean;
  flags: string[];
  /** Authored one-liners about past scenes. */
  memories: string[];
  /** Facts she learned about the player. */
  notes: string[];
}

export interface LevelState {
  completed: boolean;
  attempts: number;
  wins: number;
  bestInterest: number;
  lastOutcome: 'win' | 'lose' | null;
}

/** Everything that syncs to the cloud. */
export interface Progress {
  version: number;
  updatedAt: number;
  player: { name: string; pronouns: Pronouns };
  characters: Record<string, CharacterState>;
  levels: Record<string, LevelState>;
  storyFlags: string[];
  endings: string[];
  notices: string[];
}

export const emptyCharacterState = (): CharacterState => ({ affection: 0, met: false, flags: [], memories: [], notes: [] });
export const emptyLevelState = (): LevelState => ({ completed: false, attempts: 0, wins: 0, bestInterest: 0, lastOutcome: null });
