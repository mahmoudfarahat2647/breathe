/**
 * PROTOTYPE (mockup restyle) — icon re-exports for the redesign candidate.
 * Lives in src/components/ because the enforced boundary config only lets the
 * components layer import `lucide-react`; src/presentation/ imports icons from
 * here instead of reaching for the library directly.
 *
 * Throwaway: delete with the rest of the `mockup-variant` plumbing once the
 * redesign is folded into the real code (and the fold-in decides whether the
 * production screen adopts icons at all).
 */
export {
  AudioLines as SoundIcon,
  Circle as MarkIcon,
  Clock as ElapsedIcon,
  History as HistoryGlyph,
  Play as PlayIcon,
  RefreshCw as CycleIcon,
  RotateCcw as ResetIcon,
} from "lucide-react";
