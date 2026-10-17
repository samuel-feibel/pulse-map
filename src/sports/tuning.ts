/**
 * ─── Stadium look, shared by every city ─────────────────────────────────────────────────────────
 *
 * Each city's stadium positions and sizes live in src/cities/<city>/sports.ts.
 * Save and the wall reloads by itself; press D on the wall to preview each team.
 */

/** Edge thickness of the stadium shapes, in pixels. */
export const OUTLINE_WIDTH_PX = 3
/** 0 = hollow, 1 = solid team color. */
export const FILL_OPACITY = 0.45

/** Score text height, as a fraction of the wall's width (0.022 ≈ 22 px on a 1000 px wall). */
export const SCORE_TEXT_SIZE = 0.022
