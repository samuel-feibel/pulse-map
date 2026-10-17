/**
 * ─── Stadium settings: tweak these freely ───────────────────────────────────────────────────────
 *
 * Save the file and the wall reloads by itself. Press D on the wall to preview each team
 * (live → Red Sox → Celtics → Bruins) while you adjust.
 */

/**
 * WHERE each stadium is drawn (its center). `lat` moves it up/down, `lng` moves it left/right.
 *   lat + 0.001 ≈ 110 m up        lat - 0.001 ≈ 110 m down
 *   lng + 0.001 ≈  80 m right     lng - 0.001 ≈  80 m left
 * The wall is about 13.4 km across, so 0.01 lng (~800 m) moves a stadium ~6% of the wall's width.
 * The Celtics and Bruins share one spot (they never play the same night).
 */
export const GARDEN_POSITION = { lng: -71.050, lat: 42.37 }
export const FENWAY_POSITION = { lng: -71.095, lat: 42.343 }

/**
 * HOW BIG each stadium is, in meters on the ground (1000 m ≈ 7.5% of the wall's width).
 * Real sizes for reference: NBA court 29 × 15 m, NHL rink 61 × 26 m, Fenway 128 m to center field.
 */
export const COURT_SIZE = { width: 860*1.0, height: 460*1.0 }
export const RINK_SIZE = { width: 915, height: 390, cornerRadius: 130 }
/** Fenway is drawn at this many times its real size. */
export const FENWAY_SCALE = 7

/** LOOK of the shapes. */
export const OUTLINE_WIDTH_PX = 3
/** 0 = hollow, 1 = solid team color. */
export const FILL_OPACITY = 0.45

/** Score text height, as a fraction of the wall's width (0.022 ≈ 22 px on a 1000 px wall). */
export const SCORE_TEXT_SIZE = 0.022

/** How far a score ping spreads, as a fraction of the wall's width (0.2 = a fifth of the wall). */
export const SCORE_PING_REACH = { redsox: 0.18, celtics: 0.07, bruins: 0.22 }
