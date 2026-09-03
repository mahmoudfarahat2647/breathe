# Breathe

A single-page breathing exercise app: a user picks a preset, watches a synchronized visual guide, and breathes along with it while phases advance automatically.

## Language

**Phase**:
One of the four beats of a breath cycle: Inhale, Hold, Exhale, Rest. Phases advance in fixed order and repeat; Hold and Rest may be set to 0 seconds to skip them.
_Avoid_: Step, stage (see Stage below — different concept, same word collides), side.

**Preset**:
A named set of phase durations a user can select as a starting point (Current Calm, Triangle, Box, 4-7-8 Relaxation, Coherence), or Custom once durations are hand-adjusted.
_Avoid_: Pattern, breathing pattern.

**Ramp**:
An optional rule that changes phase durations from cycle to cycle during a Session, stepping from the active Preset's durations toward a target. Off by default. Two ramps ship: Wind Down and Slow Down. Like a Session Goal, the Ramp selected at Start is the one that applies for that whole Session.
_Avoid_: taper, ladder, progression.

**Stage**:
The area of the screen holding the live breathing visual (the Square or Triangle) that the user watches and breathes along with. Distinct from Phase.
_Avoid_: Visual, animation, shape (informal; use Stage for the region, Square/Triangle for what's drawn in it).

**Control Deck**:
The region below the Stage holding everything the user operates or reviews: transport (Start/Pause/Reset), duration steppers, Preset Picker, Session Goal picker, sound toggle, and session history. One region at the domain level, regardless of how many sub-panels or sections it's composed of visually.
_Avoid_ in prose: Controls, control panel, footer — use "Control Deck". Exempt: the region's accessible name (`aria-label="Breathing exercise controls"`) and the "Skip to controls" skip link / `#controls` anchor, which keep the conventional word.

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

