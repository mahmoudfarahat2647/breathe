# Breathe

A single-page breathing exercise app: a user picks a preset, watches a synchronized visual guide, and breathes along with it while phases advance automatically.

## Language

**Phase**:
One of the four beats of a breath cycle: Inhale, Hold, Exhale, Rest. Phases advance in fixed order and repeat; Hold and Rest may be set to 0 seconds to skip them.
_Avoid_: Step, stage (see Stage below — different concept, same word collides), side.

**Preset**:
A named set of phase durations a user can select as a starting point via the Preset Picker, or Custom once durations are hand-adjusted. The catalog holds five science-backed protocols: Acute De-Stress (physiological sigh), Mood Elevation (alternate-nostril / Nadi Shodhana), Resonance Coherence (the default), Sleep Shift (4-7-8), and Executive Focus (box breathing).
_Avoid_: Pattern, breathing pattern.

**Dosage**:
A Preset's recommended cycle count. Selecting a Preset from the Preset Picker applies its dosage as the Session Goal automatically; the Goal picker can still override it afterward. Picking nothing leaves a fresh user's Session Goal unset (None).

**Top-off**:
The physiological sigh's second, shorter inhale segment, layered onto the tail of Acute De-Stress's inhale phase. A tone, an announced hint ("Inhale again."), and a Stage tick mark the boundary where it begins; the boundary tracks the live (Ramp-adjusted) inhale length, not the Preset's base duration.

**Nostril cue**:
The left/right hint shown during inhale and exhale for Presets with alternate-nostril breathing (Mood Elevation), alternating every completed cycle. Absent during Hold and Rest, which carry no nostril side.

**Ramp**:
An optional rule that changes phase durations from cycle to cycle during a Session, stepping from the active Preset's durations toward a target. Off by default. Two ramps ship: Wind Down and Slow Down. Like a Session Goal, the Ramp selected at Start is the one that applies for that whole Session.
_Avoid_: taper, ladder, progression.

**Stage**:
The area of the screen holding the live breathing visual (the Square) that the user watches and breathes along with. Distinct from Phase.
_Avoid_: Visual, animation, shape (informal; use Stage for the region, Square for what's drawn in it).

**Control Deck**:
The region below the Stage holding everything the user operates or reviews: transport (Start/Pause/Reset), duration steppers, Preset Picker, Session Goal picker, sound toggle, and session history. One region at the domain level, regardless of how many sub-panels or sections it's composed of visually.
_Avoid_ in prose: Controls, control panel, footer — use "Control Deck". Exempt: the region's accessible name (`aria-label="Breathing exercise controls"`) and the "Skip to controls" skip link / `#controls` anchor, which keep the conventional word.

**Square**:
The single shape the Stage renders — a rounded-perimeter square with one side per Phase, each filling in as that phase progresses. A Phase set to 0 seconds (Hold or Rest) shows its side as immediately complete. (Historical note: a `rest = 0` preset used to swap the Stage to a Triangle; that second shape was removed 2026-09-06 and the Square is now the only shape.)

**Session**:
One complete run from Start to Reset/completion, tracked as cycle count and elapsed seconds. Persisted as a history record on save.
_Avoid_: Run, exercise.

**Session Goal**:
An optional target for the current Session, expressed as either a minute count or a cycle count. Session Goal is compared against live progress to know when it's met; it is not itself a Session.

**Streak**:
The count of consecutive calendar days (through today or yesterday) containing at least one saved Session, computed from session history.
_Avoid_: Consistency, days active.

