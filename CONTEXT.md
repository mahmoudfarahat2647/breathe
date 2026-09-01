# Breathe

A single-page breathing exercise app: a user picks a preset, watches a synchronized visual guide, and breathes along with it while phases advance automatically.

## Language

**Phase**:
One of the four beats of a breath cycle: Inhale, Hold, Exhale, Rest. Phases advance in fixed order and repeat; Hold and Rest may be set to 0 seconds to skip them.
_Avoid_: Step, stage (see Stage below — different concept, same word collides), side.

**Preset**:
A named set of phase durations a user can select as a starting point (Current Calm, Triangle, Box, 4-7-8 Relaxation, Coherence), or Custom once durations are hand-adjusted.
_Avoid_: Pattern, breathing pattern.

**Stage**:
The area of the screen holding the live breathing visual (the Square or Triangle) that the user watches and breathes along with. Distinct from Phase.
_Avoid_: Visual, animation, shape (informal; use Stage for the region, Square/Triangle for what's drawn in it).

**Square / Triangle**:
The two shapes the Stage can render, chosen automatically by whether the active preset has a nonzero Rest phase (Square when Rest > 0, Triangle when Rest = 0). Each side of the shape corresponds to one Phase and fills in as that phase progresses.

**Session**:
One complete run from Start to Reset/completion, tracked as cycle count and elapsed seconds. Persisted as a history record on save.
_Avoid_: Run, exercise.

**Session Goal**:
An optional target for the current Session, expressed as either a minute count or a cycle count. Session Goal is compared against live progress to know when it's met; it is not itself a Session.

**Streak**:
The count of consecutive calendar days (through today or yesterday) containing at least one saved Session, computed from session history.
_Avoid_: Consistency, days active.

