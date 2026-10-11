/* dsh-theme-button -- DSH bundle, browser half.
 *
 * Draws a small floating square button at the top-right of the DSH Web UI and a
 * panel that opens on click. The panel mirrors the shape of the application menu
 * and carries the opacity slider.
 *
 * Delivered by the Host half over /dsh-theme-button/button.js, so a plain page
 * refresh re-runs this file -- no rebuild and no restart needed while iterating.
 *
 * Contract notes:
 *  - Click only. No pointer-drag handling anywhere, so the button cannot be
 *    dragged off its position.
 *  - All labels are written as \uXXXX escapes: the file stays pure ASCII, which
 *    makes it safe to move between encodings.
 */
;(function () {
  'use strict'

  var ROOT_ID = 'dsh-theme-button-root'
  // Bumped: the custom controls are now 0..10 steps instead of 0..100 percent, so
  // values written by the previous shape must not be reinterpreted.
  var STORAGE_KEY = 'dsh-theme-button.state.v2'

  // Remove any previous instance first: this file can be evaluated more than
  // once (hot reload, repeated boot rows), and every run must be idempotent.
  try {
    if (typeof window.__dshThemeButtonDispose === 'function') {
      try { window.__dshThemeButtonDispose() } catch (e) { noteIssue('l28', e) }
    }
  } catch (e) { noteIssue('l30', e) }
  try {
    var stale = document.getElementById(ROOT_ID)
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale)
  } catch (e) { noteIssue('l34', e) }

  // ---------------------------------------------------------------- styling

  var CSS = [
    '#' + ROOT_ID + ' {',
    '  position: fixed; bottom: 16px; right: 16px; z-index: 600;',
    // One place to tune the frosted glass shared by the panel and the colour picker. The alpha
    // stays high because both are control surfaces: the blur is what keeps what is behind them
    // from reading as content, not the transparency.
    '  --dstb-glass-blur: 12px;',
    '  --dstb-glass-alpha: 62%;',
    '  font-family: inherit; line-height: 1;',
    '  -webkit-user-select: none; user-select: none;',
    '}',
    '#' + ROOT_ID + '[data-dstb-pending] {',
    '  opacity: 0; pointer-events: none;',
    '}',
    '#' + ROOT_ID + ' .dstb-btn {',
    '  box-sizing: border-box; width: 36px; height: 36px; padding: 0;',
    '  display: flex; align-items: center; justify-content: center;',
    '  border-radius: 10px;',
    '  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.28));',
    '  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10));',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '  cursor: pointer; outline: none;',
    '  box-shadow: 0 1px 2px rgba(0,0,0,0.06);',
    '  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-btn:hover {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border-color: var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    '#' + ROOT_ID + ' .dstb-btn:focus-visible {',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    '#' + ROOT_ID + ' .dstb-btn[aria-expanded="true"] {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    '#' + ROOT_ID + ' .dstb-btn svg { display: block; width: 19px; height: 19px; }',
    '#' + ROOT_ID + ' .dstb-panel {',
    '  position: absolute; bottom: calc(100% + 8px); right: 0; width: 268px;',
    '  max-height: calc(100vh - 120px); overflow-y: auto;',
    '  box-sizing: border-box; padding: 6px;',
    '  border-radius: 12px;',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  background: var(--dsw-alias-bg-base, var(--dsw-alias-bg-layer-1, rgba(32,33,36,0.98)));',
    '  box-shadow: 0 10px 30px rgba(0,0,0,0.32);',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    '#' + ROOT_ID + ' .dstb-panel[hidden] { display: none; }',
    '#' + ROOT_ID + ' .dstb-sep {',
    '  height: 1px; margin: 7px 0;',
    '  background: var(--dsw-alias-border-l2, rgba(128,128,128,0.55));',
    '}',
    '#' + ROOT_ID + ' .dstb-switch {',
    '  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));',
    '  gap: 6px; padding: 2px 4px 6px;',
    '}',
    '/* Secondary heading with its switch, aligned with the panel heading above. */',
    '#' + ROOT_ID + ' .dstb-bghead {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 8px 10px 10px;',
    '  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '}',
    '#' + ROOT_ID + ' .dstb-bghead-label { flex: 1 1 auto; min-width: 0; }',
    '#' + ROOT_ID + ' .dstb-sw {',
    '  position: relative; flex: 0 0 auto; display: inline-block; width: 34px; height: 18px;',
    '  cursor: pointer;',
    '}',
    '#' + ROOT_ID + ' .dstb-sw input {',
    '  position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer;',
    '}',
    '#' + ROOT_ID + ' .dstb-swtrack {',
    '  display: block; box-sizing: border-box; width: 100%; height: 100%; border-radius: 9px;',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.28));',
    '  transition: background-color 140ms ease, border-color 140ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-swthumb {',
    '  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;',
    '  background: var(--dsw-alias-label-secondary, #8a8f99);',
    '  transition: transform 140ms ease, background-color 140ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-sw input:checked + .dstb-swtrack {',
    '  background: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    '#' + ROOT_ID + ' .dstb-sw input:checked + .dstb-swtrack .dstb-swthumb {',
    '  transform: translateX(16px); background: var(--dsw-alias-bg-base, #ffffff);',
    '}',
    '#' + ROOT_ID + ' .dstb-opt {',
    '  box-sizing: border-box; width: 100%; margin: 0; min-width: 0;',
    '  padding: 8px 2px; border-radius: 8px;',
    '  font-family: inherit; font-size: 11px; line-height: 1.2; text-align: center;',
    '  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.28));',
    '  background: transparent;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '  cursor: pointer; outline: none;',
    '  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-sw input:checked + .dstb-swtrack {',
    '  background: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    '#' + ROOT_ID + ' .dstb-sw input:checked + .dstb-swtrack .dstb-swthumb {',
    '  transform: translateX(16px); background: var(--dsw-alias-bg-base, #ffffff);',
    '}',
    '#' + ROOT_ID + ' .dstb-sw input:focus-visible + .dstb-swtrack {',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    '',
    // hover: light highlight
    '#' + ROOT_ID + ' .dstb-opt:hover {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border-color: var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    // pressed: a clear, momentary stronger state
    '#' + ROOT_ID + ' .dstb-opt:active {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.28));',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '  box-shadow: none;',
    '}',
    // selected: the persistent state, so the current choice is always readable
    '#' + ROOT_ID + ' .dstb-opt[data-selected="1"] {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  font-weight: 600;',
    '}',
    '#' + ROOT_ID + ' .dstb-opt[data-selected="1"]:hover {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.26));',
    '}',
    '#' + ROOT_ID + ' .dstb-block { padding: 6px 10px 10px; }',
    '#' + ROOT_ID + ' .dstb-row {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  gap: 8px; margin-bottom: 8px;',
    '  font-size: 12px; color: var(--dsw-alias-label-secondary, #8a8f99);',
    '}',
    '#' + ROOT_ID + ' .dstb-val {',
    '  font-variant-numeric: tabular-nums;',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    '#' + ROOT_ID + ' .dstb-slider {',
    '  -webkit-appearance: none; appearance: none;',
    '  display: block; width: 100%; height: 4px; border-radius: 2px;',
    '  background: var(--dsw-alias-border-l1, rgba(128,128,128,0.28));',
    '  outline: none; cursor: pointer;',
    '}',
    '#' + ROOT_ID + ' .dstb-slider::-webkit-slider-thumb {',
    '  -webkit-appearance: none; appearance: none;',
    '  width: 14px; height: 14px; border-radius: 50%;',
    '  background: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  border: 2px solid var(--dsw-alias-bg-base, #202124);',
    '  cursor: pointer;',
    '}',
    '#' + ROOT_ID + ' .dstb-slider::-moz-range-thumb {',
    '  width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--dsw-alias-bg-base, #202124);',
    '  background: var(--dsw-alias-brand-primary, #4d6bfe); cursor: pointer;',
    '}',
    '#' + ROOT_ID + ' .dstb-note {',
    '  margin-top: 8px; font-size: 11px; line-height: 1.5;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '}',
    // Applied only for the frame in which the chosen palette is re-asserted, so a
    // correction is never animated into a visible flash.
    'html[data-dstb-instant] *, html[data-dstb-instant] *::before, html[data-dstb-instant] *::after {',
    '  transition: none !important;',
    '}',
    '',
    '/* --- gating --- */',
    '/* There is exactly one way to say "this does not apply": attach data-off to the',
    '   block it covers. A block dims as a whole, its contents never carry a flag of',
    '   their own, and no two flags ever cover the same pixels -- so dimming is always',
    '   applied exactly once, at 0.45, and every unavailable area looks equally dim.',
    '   This rule only draws the state; whether a press is accepted is decided in the',
    '   script from the same attribute. */',
    '#' + ROOT_ID + ' [data-off=\"1\"] { opacity: 0.45; }',
    '/* --- custom theme controls --- */',
    '#' + ROOT_ID + ' .dstb-custom { display: block; }',
    '#' + ROOT_ID + ' .dstb-imagearea { display: block; }',
    '#' + ROOT_ID + ' .dstb-fitarea { display: block; }',
    '#' + ROOT_ID + ' .dstb-params { display: block; }',
    '#' + ROOT_ID + ' .dstb-custom input[disabled],',
    '#' + ROOT_ID + ' .dstb-custom button[disabled] {',
    '  cursor: default;',
    '}',
    '#' + ROOT_ID + ' .dstb-row + .dstb-slider { margin-bottom: 10px; }',
    '#' + ROOT_ID + ' .dstb-row:last-of-type + .dstb-slider { margin-bottom: 0; }',
    '#' + ROOT_ID + ' .dstb-strip {',
    '  display: flex; align-items: center; gap: 6px;',
    '  padding: 0 4px 10px; overflow-x: auto; overflow-y: hidden;',
    '}',
    '#' + ROOT_ID + ' .dstb-strip::-webkit-scrollbar { height: 6px; }',
    '#' + ROOT_ID + ' .dstb-strip::-webkit-scrollbar-thumb {',
    '  background: var(--dsw-alias-border-l1, rgba(128,128,128,0.28)); border-radius: 3px;',
    '}',
    '#' + ROOT_ID + ' .dstb-card {',
    '  position: relative; flex: 0 0 auto; box-sizing: border-box;',
    '  width: 64px; height: 48px; margin: 0; padding: 0; border-radius: 8px;',
    '  background-size: cover; background-position: center; cursor: pointer; outline: none;',
    '  border: 2px solid transparent;',
    '  transition: opacity 140ms ease, border-color 140ms ease;',
    '}',
    '/* Unselected images are dimmed; the selected one keeps its full brightness. */',
    '#' + ROOT_ID + ' .dstb-card { opacity: 0.45; }',
    '#' + ROOT_ID + ' .dstb-card[data-selected=\"1\"] {',
    '  opacity: 1; border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    '#' + ROOT_ID + ' .dstb-card:hover { opacity: 0.8; }',
    '#' + ROOT_ID + ' .dstb-card[data-selected=\"1\"]:hover { opacity: 1; }',
    '/* The remove badge only materialises after the pointer has settled on a card. */',
    '/* Kept inside the card: the strip clips horizontal overflow, so a badge that',
    '   hung outside the card would lose the part that sticks out. */',
    '#' + ROOT_ID + ' .dstb-cardrm {',
    '  position: absolute; top: 0; right: 0; width: 20px; height: 20px;',
    '  box-sizing: border-box; padding: 0; display: grid; place-items: center;',
    '  border-radius: 0 8px 0 8px;',
    '  font-family: inherit; font-size: 12px; line-height: 1;',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  background: var(--dsw-static-neutral-bluish-600, #6b6f76);',
    '  color: var(--dsw-alias-label-primary, #f1f3f5);',
    '  cursor: pointer; opacity: 0; pointer-events: none;',
    '  transition: opacity 120ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-card[data-armed=\"1\"] .dstb-cardrm {',
    '  opacity: 1; pointer-events: auto;',
    '}',
    '#' + ROOT_ID + ' .dstb-cardrm:hover {',
    '  background: var(--dsw-alias-state-error-primary, #ef4444);',
    '  border-color: var(--dsw-alias-state-error-primary, #ef4444);',
    '}',
    '#' + ROOT_ID + ' .dstb-addcard {',
    '  flex: 0 0 auto; box-sizing: border-box; width: 64px; height: 48px; margin: 0;',
    '  border-radius: 8px; cursor: pointer; outline: none;',
    '  font-family: inherit; font-size: 11px; line-height: 1.35; text-align: center;',
    '  white-space: pre-line;',
    '  border: 1px dashed var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  background: transparent;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-addcard:not(:disabled):hover {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    '#' + ROOT_ID + ' .dstb-addcard:disabled { cursor: default; }',
    '#' + ROOT_ID + ' .dstb-addcard:disabled:hover { background: transparent; border-color: var(--dsw-alias-border-l2, rgba(128,128,128,0.5)); color: var(--dsw-alias-label-secondary, #8a8f99); }',

    '#' + ROOT_ID + ' .dstb-fitseg {',
    '  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));',
    '  gap: 6px; padding: 0 4px 8px;',
    '}',
    '#' + ROOT_ID + ' .dstb-fitbtn {',
    '  box-sizing: border-box; width: 100%; margin: 0; min-width: 0;',
    '  padding: 8px 2px; border-radius: 8px; cursor: pointer; outline: none;',
    '  font-family: inherit; font-size: 11px; line-height: 1.2; text-align: center;',
    '  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.28));',
    '  background: transparent; color: var(--dsw-alias-label-secondary, #8a8f99);',
    '  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;',
    '}',
    '#' + ROOT_ID + ' .dstb-fitbtn:hover {',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  border-color: var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    '#' + ROOT_ID + ' .dstb-fitbtn[data-selected=\"1\"] {',
    '  border-color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18));',
    '  color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '  font-weight: 600;',
    '}',
    '',
    '/* --- parameter sliders --- */',

    '',
    '',
    '/* --- panel heading --- */',
    '#' + ROOT_ID + ' .dstb-head {',
    '  text-align: center; padding: 9px 10px 9px;',
    '  font-size: 15px; font-weight: 600; letter-spacing: 0.02em;',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '}',
    '#' + ROOT_ID + ' .dstb-headrule {',
    '  height: 1px; margin: 0 0 2px;',
    '  background: var(--dsw-alias-border-l2, rgba(128,128,128,0.55));',
    '}',
    '#' + ROOT_ID + ' .dstb-subhead {',
    '  padding: 8px 10px 6px;',
    '  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '}',
    '',
    '/* --- background route rows --- */',
    '#' + ROOT_ID + ' .dstb-moderow {',
    '  display: flex; align-items: center; justify-content: space-between; gap: 6px;',
    '  padding: 6px 10px 12px;',
    '}',
    '#' + ROOT_ID + ' .dstb-modelabel {',
    '  flex: 0 0 auto; margin: 0; padding: 2px 0; border: none; background: transparent;',
    '  font-family: inherit; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99); cursor: default; outline: none;',
    '}',
    // The heading is inert: no hover colour and no pointer cursor, so nothing about it
    // suggests it can be operated. Both routes are entered by their own contents.
    '#' + ROOT_ID + ' .dstb-modelabel[data-selected="1"] {',
    '  color: var(--dsw-alias-brand-primary, #4d6bfe);',
    '}',
    // The picture heading carries the count right after its text, so the row only has to
    // keep the two on one line with a small gap.
    '#' + ROOT_ID + ' .dstb-imagerow {',
    '  display: flex; align-items: center; gap: 6px; padding: 0 10px 8px;',
    '}',
    '#' + ROOT_ID + ' .dstb-imagecount {',
    '  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;',
    '  color: var(--dsw-alias-label-caption, #6b7280);',
    '}',
    '',
    '/* --- colour palette --- */',
    '#' + ROOT_ID + ' .dstb-swatches {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  gap: 6px; flex-wrap: nowrap;',
    '}',
    '#' + ROOT_ID + ' .dstb-swatch {',
    '  box-sizing: border-box; width: 17px; height: 17px; margin: 0; padding: 0;',
    '  border-radius: 4px; cursor: pointer; outline: none;',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '}',
    '#' + ROOT_ID + ' .dstb-swatch[data-selected=\"1\"] {',
    '  border-color: rgba(0, 0, 0, 0.35);',
    '  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.55);',
    '}',
    '#' + ROOT_ID + ' .dstb-colorpick {',
    '  box-sizing: border-box; width: 17px; height: 17px; margin: 0; padding: 0;',
    '  border-radius: 4px; cursor: pointer;',
    '  border: 1px dashed var(--dsw-alias-border-l2, rgba(128,128,128,0.5));',
    '  background: transparent;',
    '}',
    '',
    '/* The fit choices live under the thumbnails, sharing the theme row metrics. */',
    '#' + ROOT_ID + ' .dstb-fitrow {',
    '  padding: 10px 0 2px;',
    '}',
    '',
    '/* The add card sits directly under the thumbnails and keeps its own size. */',
    '#' + ROOT_ID + ' .dstb-addrow {',
    // The gap is what stops the rightmost thumbnail from looking sliced off by the card:
    // the strip now ends a little short of it instead of running flush into its edge.
    '  display: flex; gap: 6px; padding: 0 4px;',
    '}',
    '',
    '#' + ROOT_ID + ' .dstb-status {',
    '  margin-left: 8px; font-size: 10px; font-weight: 400;',
    '  color: var(--dsw-alias-state-error-primary, #ef4444);',
    '}',
    '',
    '/* --- the custom colour picker --- */',
    '#' + ROOT_ID + ' .dstb-cpick {',
    '  position: fixed; z-index: 40; box-sizing: border-box; width: 200px; padding: 10px;',
    '  display: flex; flex-direction: column; gap: 10px; font-family: inherit;',
    '  border-radius: var(--dsw-radius-lg, 12px);',
    '  background: var(--dsw-alias-bg-layer-1, #ffffff);',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35));',
    '  box-shadow: 0 10px 30px rgba(0,0,0,0.26);',
    '}',
    '#' + ROOT_ID + ' .dstb-cpick[hidden] { display: none; }',
    '#' + ROOT_ID + ' .dstb-cpick-sv {',
    '  position: relative; box-sizing: border-box; width: 100%; height: 110px;',
    '  border-radius: var(--dsw-radius-md, 8px); cursor: crosshair;',
    '  overflow: hidden; touch-action: none;',
    '}',
    '#' + ROOT_ID + ' .dstb-cpick-svdot {',
    '  position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px;',
    '  border-radius: 50%; border: 2px solid #fff;',
    '  box-shadow: 0 0 0 1px rgba(0,0,0,0.55); pointer-events: none;',
    '}',
    '#' + ROOT_ID + ' .dstb-cpick-hue {',
    '  position: relative; box-sizing: border-box; width: 100%; height: 12px;',
    '  border-radius: 6px; cursor: pointer; touch-action: none;',
    '  background-image: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);',
    '}',
    // A ring with the chosen colour in its middle. A bare outline sits on a bar that is itself
    // every colour, so it neither says which colour is chosen nor reads clearly against both
    // the light and the dark stretches of the bar.
    // A small ring: the chosen colour inside, a hairline rim, and one dark outline so it stays
    // legible over both the light and the dark stretches of the bar. The ring is a radial
    // gradient rather than a border, because at this size a border rasterises as a rounded
    // square: the gradient antialiases along the curve instead of tracing two concentric edges.
    '#' + ROOT_ID + ' .dstb-cpick-huedot {',
    '  position: absolute; top: -2px; width: 16px; height: 16px; margin-left: -8px;',
    '  box-sizing: border-box; border-radius: 50%;',
    '  background: radial-gradient(circle at 50% 50%,',
    '    var(--dstb-ring-fill, #ffffff) 0 calc(50% - 1.5px),',
    '    var(--dsw-alias-bg-layer-1, #ffffff) calc(50% - 1.5px) 100%);',
    '  box-shadow: 0 0 0 1px rgba(0,0,0,0.35);',
    '  pointer-events: none;',
    '}',


    '#' + ROOT_ID + ' .dstb-cpick-row { display: flex; align-items: stretch; gap: 6px; }',
    '#' + ROOT_ID + ' .dstb-cpick-input {',
    '  box-sizing: border-box; flex: 1 1 auto; min-width: 0; height: 26px; padding: 0 8px;',
    '  font-family: inherit; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;',
    '  color: var(--dsw-alias-label-primary, #e8eaed);',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.14));',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35));',
    '  border-radius: var(--dsw-radius-md, 8px); outline: none;',
    '}',
    '#' + ROOT_ID + ' .dstb-cpick-input:focus { border-color: var(--dsw-alias-brand-primary, #4d6bfe); }',
    // The widget is draggable, so it must not hand the drag to the window, and it must not
    // fight for the topmost layer: 600 sits above ordinary content but below the app's own
    // menus (1100) and overlays (900+), so those still cover it as they should.
    '#' + ROOT_ID + ' .dstb-btn { touch-action: none; cursor: pointer; -webkit-app-region: no-drag; }',
    // The button frosts behind the same gate and through the same two variables as the panel and
    // the picker. Two things make this one different: its surface is the light layer, which in
    // the light theme is the same colour as what sits behind it, so the tint alone would be
    // invisible -- and the rule below outranks the hover shade, so that shade has to be restated
    // here or the button would stop answering the pointer.
    'html[data-dstb-wallpaper] #' + ROOT_ID + ' .dstb-btn {',
    '  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10)) var(--dstb-glass-alpha, 62%), transparent);',
    '  -webkit-backdrop-filter: blur(var(--dstb-glass-blur, 12px));',
    '  backdrop-filter: blur(var(--dstb-glass-blur, 12px));',
    '}',
    'html[data-dstb-wallpaper] #' + ROOT_ID + ' .dstb-btn:hover {',
    '  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.18)) var(--dstb-glass-alpha, 62%), transparent);',
    '}',
    '#' + ROOT_ID + ' .dstb-btn[data-dragging="1"] { cursor: grabbing; }',

    '',
    '/* --- frosted glass, only while a custom background is on --- */',
    // Gated on the very attribute the effect itself uses. Over a flat app surface an opaque-ish
    // tint of that same surface is indistinguishable from a solid one, and blurring a flat
    // colour changes nothing -- so the glass only reads as glass once a picture is behind it.
    // With the switch off the panel keeps its official opaque surface.
    'html[data-dstb-wallpaper] #' + ROOT_ID + ' .dstb-panel,',
    'html[data-dstb-wallpaper] #' + ROOT_ID + ' .dstb-cpick {',
    '  -webkit-backdrop-filter: blur(var(--dstb-glass-blur, 12px));',
    '  backdrop-filter: blur(var(--dstb-glass-blur, 12px));',
    '}',
    'html[data-dstb-wallpaper] #' + ROOT_ID + ' .dstb-panel {',
    '  background: color-mix(in srgb, var(--dsw-alias-bg-base, var(--dsw-alias-bg-layer-1, rgba(32,33,36,0.98))) var(--dstb-glass-alpha, 62%), transparent);',
    '}',
    'html[data-dstb-wallpaper] #' + ROOT_ID + ' .dstb-cpick {',
    '  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #ffffff) var(--dstb-glass-alpha, 62%), transparent);',
    '}',
    '#' + ROOT_ID + ' .dstb-cpick-spin { display: flex; flex-direction: column; gap: 2px; flex: none; }',
    '#' + ROOT_ID + ' .dstb-cpick-step {',
    '  box-sizing: border-box; width: 26px; height: 12px; padding: 0; margin: 0;',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 8px; line-height: 1; cursor: pointer;',
    '  color: var(--dsw-alias-label-secondary, #8a8f99);',
    '  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.14));',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35));',
    '  border-radius: var(--dsw-radius-xs, 4px);',
    '}',
    '#' + ROOT_ID + ' .dstb-cpick-step:hover { color: var(--dsw-alias-label-primary, #e8eaed); }',

  ].join('\n')

  var WALLPAPER_ATTR = 'data-dstb-wallpaper'

  // ---- wallpaper effect styling ---------------------------------------------
  //
  // Two fixed layers are placed before the app own root, so every surface of the app
  // paints over them. DSH paints its own background on the frame and on each column, and
  // an opaque background cannot show anything behind it -- so while a wallpaper is
  // active those surfaces are told to give their colour up. That instruction rides on a
  // single attribute on the html element, so the whole effect is undone by removing one
  // attribute.
  //
  // The surfaces are matched by the trailing part of their generated class names. The
  // hash in front of that may change between builds; the trailing name is the meaning.
  var EFFECT_CSS = [
    '.dstb-backdrop {',
    '  position: fixed; inset: 0; z-index: 0; pointer-events: none;',
    '  background: var(--dsw-alias-bg-base, #ffffff);',
    '}',
    '.dstb-wallpaper {',
    '  position: fixed; inset: 0; z-index: 0; pointer-events: none;',
    '  background-position: center center;',
    '  background-repeat: no-repeat;',
    '  background-size: cover;',
    '  transform: translateZ(0);',
    '}',
    // The frame itself gives up its colour entirely: the columns below paint over it
    // anyway, and letting one layer of a nested pair keep a scrim would make the
    // scrim land twice.
    'html[data-dstb-wallpaper] [class*="_frame"] {',
    '  background-color: transparent !important;',
    '  background-image: none !important;',
    '}',
    // Each column keeps a fraction of its own colour and drops the rest, so the text sits
    // on a theme-tinted scrim instead of straight on the wallpaper. --dstb-scrim is the
    // one number that decides how much wallpaper survives; 100% would hide it completely.
    'html[data-dstb-wallpaper] [class*="_centerCol"],',
    'html[data-dstb-wallpaper] [class*="_rightbarCol"] {',
    '  background-color: color-mix(in srgb, var(--dsw-alias-bg-base) var(--dstb-scrim, 30%), transparent) !important;',
    '  background-image: none !important;',
    '}',
    // No backdrop-filter here. It would turn the column into the containing block for fixed
    // descendants, and the titlebar toggle that collapses the rail is exactly that: a fixed
    // element anchored to the viewport. The rail would drag it down by the titlebar height.
    'html[data-dstb-wallpaper] [class*="_sidebarCol"] {',
    '  background-color: color-mix(in srgb, var(--dsw-specific-sidebar-fill) var(--dstb-scrim-rail, 55%), transparent) !important;',
    '  background-image: none !important;',
    '}',
    // Whatever actually paints the background is tagged at runtime rather than matched
    // by name, so a renamed or a late-mounted container still gives its colour up.
    // The conversation root paints the surface colour and sits inside the chat column, so
    // making the column transparent is not enough on its own. It is identified by its own
    // shape rather than by a class name: the element that owns the chat region phase and
    // contains the conversation content. A code block or a message bubble also paints a
    // background, but it is content, and it must keep it.
    'html[data-dstb-wallpaper] [class*="_root"]:has([data-conversation-content]) {',
    '  background-color: transparent !important;',
    '  background-image: none !important;',
    '}',
    // Full-screen surfaces such as the settings page lose their opaque fill to the scrim,
    // so what is behind them reads straight through and collides with their own text. The
    // blur turns that into an illegible wash. Safe here because such an overlay is fixed to
    // the viewport, so becoming a containing block for its own fixed descendants does not
    // move anything: its box and the viewport are the same rectangle.
    'html[data-dstb-wallpaper] [data-dstb-surface="1"],',
    'html[data-dstb-wallpaper] [data-dstb-surface="rail"] {',
    '  -webkit-backdrop-filter: blur(var(--dstb-panel-blur, 6px)) !important;',
    '  backdrop-filter: blur(var(--dstb-panel-blur, 6px)) !important;',
    '}',
    'html[data-dstb-wallpaper] [data-dstb-surface="1"] {',
    '  background-color: color-mix(in srgb, var(--dsw-alias-bg-base) var(--dstb-scrim, 30%), transparent) !important;',
    '  background-image: none !important;',
    '}',
    // A rail reads as a separate panel: same treatment, more of its own colour kept.
    // An element that sits inside a surface which already carries a scrim gives its colour
    // up completely. A second scrim on the same stack darkens that area twice over, which
    // is what turned every light background colour grey.
    'html[data-dstb-wallpaper] [data-dstb-surface="clear"] {',
    '  background-color: transparent !important;',
    '  background-image: none !important;',
    '}',
    'html[data-dstb-wallpaper] [data-dstb-surface="rail"] {',
    '  background-color: color-mix(in srgb, var(--dsw-specific-sidebar-fill) var(--dstb-scrim-rail, 55%), transparent) !important;',
    '  background-image: none !important;',
    '}',
    // Two decorative overlays are gradients that end in a solid surface colour. They were
    // invisible while the surface behind them was that same colour; over a wallpaper they
    // read as a pale wash. Only the gradient image is dropped, and only while the
    // wallpaper is on, so nothing about them changes once it is switched off.
    'html[data-dstb-wallpaper] [class*="_fade"],',
    'html[data-dstb-wallpaper] [class*="_earlierHistory"] {',
    '  background-image: none !important;',
    '}',
    // The composer seat fades the message list out near the input by painting the surface
    // colour over it. That colour is what made the seam invisible while the surface was
    // opaque; over a custom background it becomes a pale band belonging to neither a
    // picture nor a colour. The seat stops painting instead, so the background runs
    // unbroken to the foot of the window.
    // Content surfaces keep their own colour but let a little of the background through, so
    // they read as panels sitting on the picture rather than holes punched in it. The fixed
    // strengths live in the two variables below and apply only while a background is on.
    'html[data-dstb-wallpaper] {',
    '  --dstb-code-alpha: 62%;',
    '  --dstb-bubble-alpha: 62%;',
    '  --dstb-card-alpha: 72%;',
    // Deliberately small: this is a full-viewport panel, and a backdrop blur that size is
    // recomputed every frame while the panel animates open.
    '  --dstb-panel-blur: 6px;',
    '}',
    // The card paints itself from this token and the app declares the token on the body, so
    // the override has to sit on the body as well. A declaration on the html element is
    // simply outranked by the one nearer the card, which is why this used to take effect in
    // the dark theme only: that variant happened to be written on the body.
    'html[data-dstb-wallpaper] body {',
    '  --dsw-specific-input-major: color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dstb-card-alpha, 72%), transparent) !important;',
    '}',
    'html[data-dstb-wallpaper] body[data-ds-dark-theme] {',
    '  --dsw-specific-input-major: color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dstb-card-alpha, 72%), transparent) !important;',
    '}',
    // A code block paints itself from a variable, and the rule that consumes it carries
    // !important, so overriding the element loses and overriding the variable wins. The
    // variable is redefined in terms of the token it already pointed at, so both themes
    // keep their own colour and only the strength changes.
    // The app declares this variable on the code block element itself, and a custom property
    // is inherited from the nearest ancestor that declares it, so a declaration on the html
    // element is never seen: the cascade only compares declarations on the same element, and
    // !important does not change that. The override therefore has to be written on every
    // element of the message area, which is where code blocks live.
    'html[data-dstb-wallpaper] [data-conversation-content] * {',
    '  --dsl-code-block-background: color-mix(in srgb, var(--dsw-alias-markdown-code-block) var(--dstb-code-alpha, 62%), transparent) !important;',
    '  --dsl-code-block-banner-background-color: color-mix(in srgb, var(--dsw-alias-markdown-code-block-banner) var(--dstb-code-alpha, 62%), transparent) !important;',
    '}',
    'html[data-dstb-wallpaper] [class*="_bubble"] {',
    '  background-color: color-mix(in srgb, var(--dsw-specific-bubble) var(--dstb-bubble-alpha, 62%), transparent) !important;',
    '}',
    // The block takes its colour from the variable above, so nothing is painted here. The
    // blur is what stops whatever is behind the block from showing through as sharp
    // content, which is what makes the translucency read without needing a higher opacity.
    // The frost goes on the card itself, located by what it contains rather than by a class
    // name that changes: the card is the element that holds the composer input.
    'html[data-dstb-wallpaper] [class*="_card"]:has([data-composer-input]) {',
    '  -webkit-backdrop-filter: blur(var(--dstb-card-blur, 12px)) !important;',
    '  backdrop-filter: blur(var(--dstb-card-blur, 12px)) !important;',
    '}',
    'html[data-dstb-wallpaper] [data-code-block-banner],',
    'html[data-dstb-wallpaper] [data-code-block-content],',
    'html[data-dstb-wallpaper] [data-conversation-content] pre {',
    '  -webkit-backdrop-filter: blur(10px) !important;',
    '  backdrop-filter: blur(10px) !important;',
    '}',

    // The seat itself stays out of the way completely: it spans the full width, so any fill
    // it paints reads as a band across the foot of the window. Only the input box inside it
    // is meant to carry a surface.
    // The seat spans the full width, so anything done to it is a band across the foot of the
    // window: a fill was a colour band, and a blur was a band of a different kind, because
    // the strip stayed soft while everything around it stayed sharp. It now does nothing at
    // all. The frost belongs on the card above, which is narrow and centred.
    'html[data-dstb-wallpaper] [data-composer-seat],',
    'html[data-dstb-wallpaper] [class*="_composerSeat"] {',
    '  background-image: none !important;',
    '}',
  ].join('\n')

  // Palette icon. One stroked path, so it follows currentColor and inherits both
  // the light and dark theme text colours without a second asset.
  var ICON_PALETTE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H13a2 2 0 0 1 0-4h3a5 5 0 0 0 0-9z"/>' +
    '<circle cx="7.5" cy="12" r="1.1" fill="currentColor" stroke="none"/>' +
    '<circle cx="9.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>' +
    '<circle cx="14" cy="7.5" r="1.1" fill="currentColor" stroke="none"/>' +
    '</svg>'

  // ------------------------------------------------------------- persistence

  // Every custom-theme control is a step scale of 11 positions (0..10). Opacity and
  // blur run 0..10; brightness is centred on 0 so 0..10 maps to -5..+5.
  var STEP_MAX = 10
  // Every parameter starts at the middle step. Middle is the only neutral value for
  // all three: brightness 5 leaves the image untouched, opacity 5 is visible but not
  // opaque, blur 5 is a moderate frost. 0 would mean "no effect at all" for opacity
  // and blur, which is not a useful starting point.
  var STEP_MID = 5
  // Images are a list: several can be kept and one of them is the active background.
  // A single oversized data URL can exhaust localStorage on its own, so the list is
  // capped and every stored image is downscaled first.
  // Kept low enough that the byte budget below is never the thing that fails first:
  // two limits that disagree just produce two confusing messages.
  var MAX_IMAGES = 6
  var MAX_EDGE = 1600
  var JPEG_QUALITY = 0.85
  // How one image step maps onto the window: 10 steps span 0..24px of blur.
  var BLUR_MAX_PX = 24
  // The four parameters, ordered by how often they are expected to be touched.
  var FIT_MODES = ['cover', 'contain', 'repeat', 'fill']
  var FIT_DEFAULT = 'cover'
  // The background has two mutually exclusive forms: a picture, or a flat colour.
  // Six presets: the three for the light appearance first, then the three for the dark one.
  // One colour cannot serve both, because each surface blends the choice with the theme base
  // through its scrim -- a pastel washes out to white in light and greys out in dark, while a
  // deep tone turns to mud in light. Every trio below is pitched to survive its own scrim.
  var COLOR_SWATCHES = ['#8FB3A5', '#9FB4CE', '#D6C3A8', '#3A4E56', '#4A4058', '#4E4232']
  // The default is the first preset rather than a colour of its own: a fresh install then opens
  // the picker on something readable under both appearances, and the first swatch already reads
  // as chosen instead of the row looking untouched. Taking it from the table also means the two
  // can never drift apart.
  var DEFAULT_COLOR = COLOR_SWATCHES[0]
  var DEFAULT_STATE = {
    background: false,
    mode: null,           // 'image' | 'color' | null (not chosen yet)
    color: DEFAULT_COLOR,
    opacity: STEP_MID,
    colorOpacity: STEP_MID,
    // Zero, not the middle: a full-screen blur is a standing GPU cost, so a first run stays
    // sharp and anyone who wants the soft look asks for it.
    blur: 0,
    brightness: STEP_MID,
    saturation: STEP_MID,
    fit: FIT_DEFAULT,
    images: [],
    selectedImage: null,
    posX: null,
    posY: null,
  }

  function clampInt(value, min, max, fallback) {
    // Only a real finite number is accepted. `Number(null)` is 0 and `Number('')`
    // is 0, so the previous guard turned a missing value into a valid-looking 0
    // instead of the intended fallback.
    if (typeof value === 'number') {
      if (!isFinite(value)) return fallback
    } else if (typeof value === 'string' && value.trim() !== '') {
      var parsed = Number(value)
      if (!isFinite(parsed)) return fallback
      value = parsed
    } else {
      return fallback
    }
    var n = Math.round(value)
    if (n < min) return min
    if (n > max) return max
    return n
  }

  function readState() {
    var out = {
      background: DEFAULT_STATE.background,
      mode: DEFAULT_STATE.mode,
      color: DEFAULT_STATE.color,
      opacity: DEFAULT_STATE.opacity,
      colorOpacity: DEFAULT_STATE.colorOpacity,
      blur: DEFAULT_STATE.blur,
      brightness: DEFAULT_STATE.brightness,
      saturation: DEFAULT_STATE.saturation,
      fit: FIT_DEFAULT,
      images: [],
      selectedImage: null,
      posX: null,
      posY: null,
    }
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return out
      var parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return out
      out.background = parsed.background === true
      out.opacity = clampInt(parsed.opacity, 0, STEP_MAX, DEFAULT_STATE.opacity)
      out.colorOpacity = clampInt(parsed.colorOpacity, 0, STEP_MAX, DEFAULT_STATE.colorOpacity)
      // null means 'never dragged', which keeps the default corner rather than a guessed pixel.
      out.posX = clampInt(parsed.posX, 0, 20000, null)
      out.posY = clampInt(parsed.posY, 0, 20000, null)
      out.blur = clampInt(parsed.blur, 0, BLUR_MAX_PX, DEFAULT_STATE.blur)
      out.brightness = clampInt(parsed.brightness, 0, STEP_MAX, DEFAULT_STATE.brightness)
      out.saturation = clampInt(parsed.saturation, 0, STEP_MAX, DEFAULT_STATE.saturation)
      if (typeof parsed.fit === 'string' && FIT_MODES.indexOf(parsed.fit) !== -1) out.fit = parsed.fit
      if (parsed.mode === 'image' || parsed.mode === 'color') out.mode = parsed.mode
      if (typeof parsed.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.color)) out.color = parsed.color
      var list = []
      if (Array.isArray(parsed.images)) {
        for (var i = 0; i < parsed.images.length && list.length < MAX_IMAGES; i++) {
          var item = parsed.images[i]
          if (typeof item === 'string' && item.indexOf('data:image/') === 0) list.push(item)
        }
      } else if (typeof parsed.image === 'string' && parsed.image.indexOf('data:image/') === 0) {
        // Older single-image state: carry it over instead of dropping it.
        list.push(parsed.image)
      }
      out.images = list
      if (list.length > 0) {
        var pick = clampInt(parsed.selectedImage, 0, list.length - 1, 0)
        out.selectedImage = pick
      }
      return out
    } catch (e) {
      return out
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      // Private mode or a locked-down origin: persistence is optional.
    }
  }

  // ------------------------------------------------------------------- build

  var state = readState()

  var styleEl = document.createElement('style')
  styleEl.setAttribute('data-dsh-theme-button', '')
  styleEl.textContent = CSS
  document.head.appendChild(styleEl)

  var effectStyle = document.createElement('style')
  effectStyle.setAttribute('data-dsh-theme-button-effect', '')
  effectStyle.textContent = EFFECT_CSS
  document.head.appendChild(effectStyle)

  // The backdrop stays opaque and carries the theme own base colour. It is what shows
  // through wherever the wallpaper is less than fully opaque, so lowering the opacity
  // parameter returns the plain interface instead of revealing nothing.
  var backdrop = document.createElement('div')
  backdrop.className = 'dstb-backdrop'
  backdrop.setAttribute('aria-hidden', 'true')
  var wallpaper = document.createElement('div')
  wallpaper.className = 'dstb-wallpaper'
  wallpaper.setAttribute('aria-hidden', 'true')
  try {
    document.body.insertBefore(backdrop, document.body.firstChild)
    document.body.insertBefore(wallpaper, backdrop.nextSibling)
  } catch (e) { noteIssue('l-effect-insert', e) }

  var root = document.createElement('div')
  root.id = ROOT_ID

  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'dstb-btn'
  button.setAttribute('aria-haspopup', 'true')
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-label', '\u4e3b\u9898')
  button.title = '\u4e3b\u9898'
  button.innerHTML = ICON_PALETTE

  var panel = document.createElement('div')
  panel.className = 'dstb-panel'
  panel.setAttribute('role', 'menu')
  panel.hidden = true

  var head = document.createElement('div')
  head.className = 'dstb-head'
  // The build tag makes it obvious whether the page is running the latest injected
  // script, which the reload guard can otherwise leave stale.
  // The title carries a status line beside it. While the add pipeline is being brought
  // up this is the only place a failure can surface, so it is deliberately visible.
  var headTitle = document.createElement('span')
  headTitle.textContent = '\u4e3b\u9898'
  head.appendChild(headTitle)
  panel.appendChild(head)
  var lastProblem = ''

  // The plugin's own title rule: heavier than the separators inside the panel.
  var headRule = document.createElement('div')
  headRule.className = 'dstb-headrule'
  panel.appendChild(headRule)

  var subHead = document.createElement('div')
  subHead.className = 'dstb-subhead'
  subHead.textContent = '\u5916\u89c2'
  panel.appendChild(subHead)

  // Theme switcher: three cards side by side, driving the Host application's own
  // appearance preference.
  //
  // The shipped mechanism, read off `@deepseek-ai/dsh-client-ui-theme` and
  // `@deepseek-ai/dsh-client-ui-layout`:
  //   * the choice lives in the `ui-theme` settings namespace and is persisted by
  //     the Host into the profile's cordis.patch.yml;
  //   * a resolved snapshot is projected onto the document by `ThemePresenter`:
  //     `html` gets `color-scheme` and `data-ds-theme-source`, `body` gets the
  //     boolean `data-ds-dark-theme` plus every token as an *inline* custom
  //     property.
  //
  // Because the presenter writes tokens inline, the body palette never follows a
  // bare attribute flip while those inline values are present. Flip the attribute
  // AND clear the inline tokens, then let the stylesheets resolve the palette from
  // `body[data-ds-dark-theme]`. A guard re-clears them if the presenter runs again.
  var DARK_ATTR = 'data-ds-dark-theme'
  var SOURCE_ATTR = 'data-ds-theme-source'
  var LEGACY_ATTR = 'data-ds-theme'
  var themeObserver = null
  var themeGuardOn = false
  // The preference that is currently in force on this page. It is seeded from the
  // Host's persisted value and only ever updated from that same source, so there is
  // exactly one writer (the official configuration) and no second state to drift.
  var lastApplied = null
  // What the official configuration said the last time it was read. Used to decide
  // whether the official runtime needs to re-initialise.
  var knownPreference = null
  var themeChoice = 'system'
  var themeReloadPending = false

  function systemChoice() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    } catch (e) { noteIssue('l615', e) }
    return 'light'
  }

  function resolveChoice(choice) {
    return choice === 'system' ? systemChoice() : choice
  }

  function stripInlineTokens() {
    var body = document.body
    if (!body || !body.style) return
    var names = []
    try {
      for (var i = 0; i < body.style.length; i++) names.push(body.style[i])
    } catch (e) {
      return
    }
    for (var j = 0; j < names.length; j++) {
      if (names[j].indexOf('--dsw-') === 0) {
        try { body.style.removeProperty(names[j]) } catch (e) { noteIssue('l634', e) }
      }
    }
  }

  function ensureThemeGuard() {
    if (themeGuardOn) return
    var Observer = null
    try { Observer = window.MutationObserver } catch (e) { noteIssue('l642', e) }
    if (typeof Observer !== 'function') return
    themeGuardOn = true
    try {
      themeObserver = new Observer(function () {
        // The presenter just rewrote the palette; re-assert the chosen one.
        stripInlineTokens()
        var wantDark = resolveChoice(themeChoice) === 'dark'
        var body = document.body
        if (!body) return
        if (wantDark && !body.hasAttribute(DARK_ATTR)) body.setAttribute(DARK_ATTR, '')
        else if (!wantDark && body.hasAttribute(DARK_ATTR)) body.removeAttribute(DARK_ATTR)
      })
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ['style', DARK_ATTR] })
    } catch (e) { noteIssue('l656', e) }
  }

  function releaseThemeGuard() {
    themeGuardOn = false
    try {
      if (themeObserver) themeObserver.disconnect()
    } catch (e) { noteIssue('l663', e) }
    themeObserver = null
  }

  var NO_TRANSITION_ATTR = 'data-dstb-instant'

  // Palette corrections must be instantaneous: if a surface animates its
  // background, re-asserting the chosen palette would otherwise be visible as a
  // flash. Suppress transitions for the current frame only.
  function suppressThemeTransition() {
    try {
      var el = document.documentElement
      el.setAttribute(NO_TRANSITION_ATTR, '')
      var clear = function () {
        try { el.removeAttribute(NO_TRANSITION_ATTR) } catch (e) { noteIssue('l677', e) }
      }
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(clear)
      else window.setTimeout(clear, 0)
    } catch (e) { noteIssue('l681', e) }
  }

  // Project the chosen preference onto the document with the same attributes the
  // official presenter uses. The guard then keeps it in force while the official
  // runtime still holds its previous preference.
  function applyTheme(pref) {
    var effective = resolveChoice(pref)
    suppressThemeTransition()
    try {
      var el = document.documentElement
      el.style.colorScheme = effective
      el.setAttribute(SOURCE_ATTR, pref === 'system' ? 'system' : effective)
      el.removeAttribute(LEGACY_ATTR)
      var body = document.body
      if (body) {
        if (effective === 'dark') body.setAttribute(DARK_ATTR, '')
        else body.removeAttribute(DARK_ATTR)
      }
    } catch (e) { noteIssue('l700', e) }
    stripInlineTokens()
    ensureThemeGuard()
    lastApplied = pref
    return effective
  }

  // Read the single source of truth and act on it. Returns the preference through
  // the callback so callers can refresh their own rendering.
  //
  // This never reloads the page. The official runtime owns the preference and
  // republishes it when it changes (the shipped settings row does not reload either),
  // so this half only has to keep the document in step while the official snapshot
  // catches up. When the change came from the official row, that snapshot is already
  // correct and this call is a no-op.
  function checkPreference(then) {
    var done = typeof then === 'function' ? then : function () {}
    try {
      if (typeof window.fetch !== 'function') { done(null); return }
      window.fetch('/dsh-theme-button/theme', { method: 'GET' }).then(function (res) {
        return res && res.json ? res.json() : null
      }).then(function (data) {
        var pref = data && data.preference
        if (pref !== 'light' && pref !== 'dark' && pref !== 'system') { done(null); return }
        themeChoice = pref
        knownPreference = pref
        panelChoice = pref
        if (lastApplied !== pref) applyTheme(pref)
        done(pref)
      }).catch(function () {
        done(null)
      })
    } catch (e) {
      done(null)
    }
  }

  var themeChoice = 'system'

  // The persisted preference is the only source of truth. It is read once at
  // startup and then kept under observation, so a change made in the official
  // Appearance row is reflected here without any second state to drift.
  // The host route is the source of truth, but its answer must not be the only way the row can
  // be filled in: if the request cannot be made the appearance row would otherwise highlight
  // nothing at all and read as broken. The document already carries the preference the runtime
  // is applying, so that is a faithful stand-in.
  function adoptDocumentPreference() {
    try {
      var src = document.documentElement.getAttribute('data-ds-theme-source')
      if (src !== 'light' && src !== 'dark' && src !== 'system') return
      knownPreference = src
      panelChoice = src
    } catch (e) { noteIssue('l-theme-fallback', e) }
  }

  function initTheme() {
    checkPreference(function (pref) {
      if (pref === null) adoptDocumentPreference()
      markSelected()
    })
    try {
      window.setInterval(function () {
        checkPreference(function () {
          markSelected()
        })
      }, 800)
    } catch (e) { noteIssue('l752', e) }
  }

  // What this panel currently shows as selected. It follows the official
  // preference, but the custom entry can override it locally without touching the
  // official value at all.
  var panelChoice = 'system'

  function markSelected() {
    for (var k = 0; k < cards.length; k++) {
      var isSel = cards[k].getAttribute('data-theme-choice') === panelChoice
      cards[k].setAttribute('data-selected', isSel ? '1' : '0')
      cards[k].setAttribute('aria-checked', isSel ? 'true' : 'false')
    }
  }

  // The three shipped preferences occupy the first row.
  var themes = [
    { key: 'light', label: '\u6d45\u8272' },
    { key: 'dark', label: '\u6df1\u8272' },
    { key: 'system', label: '\u8ddf\u968f\u7cfb\u7edf' },
  ]
  var switcher = document.createElement('div')
  switcher.className = 'dstb-switch'
  switcher.setAttribute('role', 'radiogroup')
  switcher.setAttribute('aria-label', '\u4e3b\u9898')
  var cards = []
  for (var i = 0; i < themes.length; i++) {
    var card = document.createElement('button')
    card.type = 'button'
    card.className = 'dstb-opt'
    card.setAttribute('role', 'radio')
    card.setAttribute('data-theme-choice', themes[i].key)
    card.setAttribute('data-selected', '0')
    card.setAttribute('title', themes[i].label)
    card.textContent = themes[i].label
    cards.push(card)
    switcher.appendChild(card)
  }
  panel.appendChild(switcher)

  function onCardClick(event) {
    event.preventDefault()
    event.stopPropagation()
    var host = event.currentTarget
    var choice = host && host.getAttribute ? host.getAttribute('data-theme-choice') : null
    if (!choice) return
    panelChoice = choice
    themeChoice = choice
    // Apply at once so the click is visible immediately...
    applyTheme(choice)
    markSelected()
    // ...then persist it as THE official preference. That file is the single source
    // of truth; the periodic reader notices the change and lets the official runtime
    // adopt it, so the settings row and this menu cannot end up describing
    // different values.
    try {
      if (typeof window.fetch === 'function') {
        var sent = window.fetch('/dsh-theme-button/theme?set=' + encodeURIComponent(choice), { method: 'GET' })
        if (sent && typeof sent.catch === 'function') sent.catch(function () {})
      }
    } catch (e) { noteIssue('l813', e) }
  }

  for (var c = 0; c < cards.length; c++) {
    cards[c].addEventListener('click', onCardClick)
  }
  initTheme()

  // Arm the self-reload watcher with the version this page was built from.
  try {
    if (typeof window.fetch === 'function') {
      window.fetch('/dsh-theme-button/version', { method: 'GET' }).then(function (res) {
        return res && res.json ? res.json() : null
      }).then(function (data) {
        startLiveReload(data && data.version ? String(data.version) : null)
      }).catch(function () {
        startLiveReload(null)
      })
    }
  } catch (e) { noteIssue('l832', e) }

  var mediaQuery = null
  function onSystemSchemeChange() {
    if (themeChoice !== 'system') return
    applyTheme('system')
  }
  try {
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onSystemSchemeChange)
      else if (mediaQuery.addListener) mediaQuery.addListener(onSystemSchemeChange)
    }
  } catch (e) { noteIssue('l845', e) }

  var sep2 = document.createElement('div')
  sep2.className = 'dstb-sep'
  panel.appendChild(sep2)

  // --- custom theme: image, opacity, brightness, blur ------------------------
  var bgHead = document.createElement('div')
  bgHead.className = 'dstb-bghead'
  var bgHeadLabel = document.createElement('span')
  bgHeadLabel.className = 'dstb-bghead-label'
  bgHeadLabel.textContent = '\u81ea\u5b9a\u4e49\u80cc\u666f'
  var switchLabel = document.createElement('label')
  switchLabel.className = 'dstb-sw'
  var switchInput = document.createElement('input')
  switchInput.type = 'checkbox'
  switchInput.setAttribute('aria-label', '\u81ea\u5b9a\u4e49\u80cc\u666f')
  var switchTrack = document.createElement('span')
  switchTrack.className = 'dstb-swtrack'
  var switchThumb = document.createElement('span')
  switchThumb.className = 'dstb-swthumb'
  switchTrack.appendChild(switchThumb)
  switchLabel.appendChild(switchInput)
  switchLabel.appendChild(switchTrack)
  bgHead.appendChild(bgHeadLabel)
  bgHead.appendChild(switchLabel)
  panel.appendChild(bgHead)

  var customGroup = document.createElement('div')
  customGroup.className = 'dstb-custom'

  // Hidden native file picker, driven by the dashed "add" card.
  var fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.multiple = true
  fileInput.style.display = 'none'
  customGroup.appendChild(fileInput)

  // One horizontal strip holds every thumbnail and scrolls on its own. The add card is a
  // sibling rather than a child: it stays put at the right edge, so reaching it never means
  // scrolling to the end of the row first.
  var imageStrip = document.createElement('div')
  imageStrip.className = 'dstb-strip'

  var addCard = document.createElement('button')
  addCard.type = 'button'
  addCard.className = 'dstb-addcard'
  addCard.textContent = '\u6dfb\u52a0\n\u56fe\u7247'

  // --- the flat-colour route -------------------------------------------------
  var modeButtons = []
  var colorModeRow = document.createElement('div')
  colorModeRow.className = 'dstb-moderow'
  // Both of these are headings, not controls. Each route is entered by its own contents --
  // a swatch, the picker, a thumbnail, the add card -- so nothing is lost by taking the
  // click away, and a heading that also behaved as a button read as a button.
  var colorHeading = document.createElement('div')
  colorHeading.className = 'dstb-modelabel'
  colorHeading.textContent = '\u81ea\u5b9a\u4e49\u989c\u8272'
  colorModeRow.appendChild(colorHeading)
  var imageRow = document.createElement('div')
  imageRow.className = 'dstb-imagerow'
  var imageHeading = document.createElement('div')
  imageHeading.className = 'dstb-modelabel'
  imageHeading.textContent = '\u81ea\u5b9a\u4e49\u56fe\u7247'
  var imageCount = document.createElement('span')
  imageCount.className = 'dstb-imagecount'
  imageRow.appendChild(imageHeading)
  imageRow.appendChild(imageCount)
  var swatchRow = document.createElement('div')
  swatchRow.className = 'dstb-swatches'
  var swatchButtons = []
  for (var ci = 0; ci < COLOR_SWATCHES.length; ci++) {
    var sw = document.createElement('button')
    sw.type = 'button'
    sw.className = 'dstb-swatch'
    sw.setAttribute('data-color', COLOR_SWATCHES[ci])
    sw.setAttribute('data-selected', '0')
    sw.setAttribute('aria-label', COLOR_SWATCHES[ci])
    sw.style.background = COLOR_SWATCHES[ci]
    swatchButtons.push(sw)
    swatchRow.appendChild(sw)
  }
  // The native input stays in the tree as the plain value holder that the state, the swatches
  // and the storage already read from, but it is never shown: the engine's own picker popup
  // is browser UI and cannot be styled, so the visible control is a button of our own.
  var customColorInput = document.createElement('input')
  customColorInput.type = 'color'
  customColorInput.className = 'dstb-colorpick-hidden'
  customColorInput.value = DEFAULT_COLOR
  customColorInput.setAttribute('aria-label', '\u81ea\u5b9a\u4e49\u989c\u8272')
  customColorInput.style.display = 'none'
  swatchRow.appendChild(customColorInput)
  var colorTrigger = document.createElement('button')
  colorTrigger.type = 'button'
  colorTrigger.className = 'dstb-colorpick'
  colorTrigger.setAttribute('aria-label', '\u81ea\u5b9a\u4e49\u989c\u8272')
  colorTrigger.setAttribute('aria-haspopup', 'dialog')
  colorTrigger.style.background = state.color
  swatchRow.appendChild(colorTrigger)
  colorModeRow.appendChild(swatchRow)

  // --- the image route: four fit choices, nothing else -----------------------
  var fitRow = document.createElement('div')
  fitRow.className = 'dstb-fitrow'
  var fitSeg = document.createElement('div')
  fitSeg.className = 'dstb-fitseg'
  var fitButtons = []
  var FIT_LABELS = { cover: '\u586b\u5145', contain: '\u9002\u5e94', repeat: '\u5e73\u94fa', fill: '\u62c9\u4f38' }
  for (var fm = 0; fm < FIT_MODES.length; fm++) {
    var fitMode = FIT_MODES[fm]
    var fitBtn = document.createElement('button')
    fitBtn.type = 'button'
    fitBtn.className = 'dstb-fitbtn'
    fitBtn.setAttribute('data-fit', fitMode)
    fitBtn.setAttribute('data-selected', '0')
    fitBtn.textContent = FIT_LABELS[fitMode]
    fitButtons.push(fitBtn)
    fitSeg.appendChild(fitBtn)
  }
  fitRow.appendChild(fitSeg)

  // Grouping. Each block carries exactly one reason for being unavailable, so a single
  // flag can cover it and nothing is ever dimmed twice:
  //
  //   customGroup   the master switch is off
  //   imageArea     the picture settings, which do not apply to a flat colour
  //   paramGroup    no background layer exists yet, so no parameter has a subject
  //   paramImage    the layer is not a picture, so it has no light or colour
  //
  // The swatch row carries no flag of its own: a swatch is not only a colour setting but
  // also the way into the colour route, so dimming it would take that way in away. Its
  // state shows through the selection ring alone, which is cleared outside that route.
  //
  // Entry points and settings are kept in separate blocks on purpose. Reaching the picture
  // route and describing a picture are two different jobs: the first must stay usable in
  // every mode (a dimmed way in is a way in that cannot be found), while the second applies
  // only once that route is active. Sharing one container would make them share one flag,
  // which dims the way in together with the settings.
  var fitArea = document.createElement('div')
  fitArea.className = 'dstb-fitarea'
  fitArea.appendChild(fitRow)
  var addRow = document.createElement('div')
  addRow.className = 'dstb-addrow'
  addRow.appendChild(imageStrip)
  addRow.appendChild(addCard)

  var imageArea = document.createElement('div')
  imageArea.className = 'dstb-imagearea'
  imageArea.appendChild(addRow)
  imageArea.appendChild(fitArea)
  customGroup.appendChild(colorModeRow)
  customGroup.appendChild(imageRow)
  customGroup.appendChild(imageArea)

  // The parameters read as one block. The last two answer to the route as well, so they
  // live in a sub-block of their own: "no layer" dims all four at once, while "not a
  // picture" dims just the two.
  var paramGroup = document.createElement('div')
  paramGroup.className = 'dstb-params'
  var paramImage = document.createElement('div')
  paramImage.className = 'dstb-params'
  // The colour route keeps a single slider of its own, right under the colour row.
  var colorParams = document.createElement('div')
  colorParams.className = 'dstb-params'

  var makeBlock = function (host) {
    var el = document.createElement('div')
    el.className = 'dstb-block'
    host.appendChild(el)
    return el
  }
  var opacityBlock = makeBlock(paramGroup)
  var blurBlock = makeBlock(paramGroup)
  var brightnessBlock = makeBlock(paramImage)
  var saturationBlock = makeBlock(paramImage)
  var colorOpacityBlock = makeBlock(colorParams)
  // Appended last on purpose: the subtree is ordered after the first two blocks, so the
  // panel reads opacity, blur, brightness, saturation from top to bottom.
  paramGroup.appendChild(paramImage)
  customGroup.appendChild(paramGroup)
  customGroup.insertBefore(colorParams, imageRow)

  panel.appendChild(customGroup)

  root.setAttribute('data-dstb-pending', '')
  root.appendChild(button)
  root.appendChild(panel)
  document.body.appendChild(root)

  // --------------------------------------------------------------- behaviour

  // One labelled slider with its own value readout and track fill. Used for the
  // three custom-theme controls, which share exactly this shape.
  function makeSlider(host, labelText, min, max, value, onInput, withUnit) {
    var row = document.createElement('div')
    row.className = 'dstb-row'
    var label = document.createElement('span')
    label.textContent = labelText
    var out = document.createElement('span')
    out.className = 'dstb-val'
    row.appendChild(label)
    row.appendChild(out)
    host.appendChild(row)

    var input = document.createElement('input')
    input.type = 'range'
    input.className = 'dstb-slider'
    input.min = String(min)
    input.max = String(max)
    input.step = '1'
    input.value = String(value)
    input.setAttribute('aria-label', labelText)
    host.appendChild(input)

    var api = {
      input: input,
      set: function (v) {
        input.value = String(v)
        api.sync()
      },
      sync: function () {
        var lo = Number(input.min) || 0
        var hi = Number(input.max) || 100
        var v = Number(input.value)
        var ratio = hi === lo ? 0 : (v - lo) / (hi - lo)
        var pct = Math.max(0, Math.min(100, ratio * 100))
        var brand = 'var(--dsw-alias-brand-primary, #4d6bfe)'
        var track = 'var(--dsw-alias-border-l1, rgba(128,128,128,0.28))'
        input.style.background =
          'linear-gradient(to right, ' + brand + ' 0%, ' + brand + ' ' + pct + '%, ' + track + ' ' + pct + '%, ' + track + ' 100%)'
        // Blur is measured in pixels, everything else is a bare step number.
        out.textContent = withUnit ? String(v) + 'px' : String(v)
      },
    }
    input.addEventListener('input', function () {
      if (!enabled(input)) return
      api.sync()
      if (typeof onInput === 'function') onInput(Number(input.value))
    })
    // One wheel notch is one step. The event is consumed so the panel underneath
    // does not scroll at the same time.
    try {
      input.addEventListener('wheel', function (event) {
        try {
          if (!enabled(input)) return
          var delta = event.deltaY || 0
          if (!delta) return
          if (typeof event.preventDefault === 'function') event.preventDefault()
          if (delta < 0) input.stepUp()
          else input.stepDown()
          api.sync()
          if (typeof onInput === 'function') onInput(Number(input.value))
        } catch (e) { noteIssue('l1060', e) }
      }, { passive: false })
    } catch (e) { noteIssue('l1062', e) }
    api.sync()
    return api
  }

  var sliders = {}
  var armTimer = null

  // Enables or dims the custom-background controls and keeps the switch in step.
  // Two stages of availability:
  //   stage 1 -- the switch: nothing below is operable until it is on;
  //   stage 2 -- the image: until one is chosen there is nothing to tune, so the
  //              parameter controls stay disabled and only picking an image is
  //              allowed.

  // The single place that decides what the panel shows and what may be pressed.
  //
  // Each gated control carries data-off="1" when it does not apply, and one CSS
  // rule per control turns that into the grey, non-interactive look. Nothing here
  // sets `disabled` any more: a control that looks usable is usable, because the
  // handlers themselves check the mode before acting.
  //
  // The thumbnails are deliberately never greyed by the route: they are the way
  // into the image route, so gating them on it would lock the user out of it.
  // Three flags cover every reason a control can be unavailable, and no two of them
  // ever cover the same element:
  //
  //   customGroup  the master switch is off
  //   imageArea    the colour route is active, so the picture settings do not apply
  //   paramImage   the background is not a picture, so it has no light or colour
  //
  // Because the flags never nest, a dimmed block is always dimmed exactly once and
  // every unavailable area looks equally unavailable.
  function markOff(el, off) {
    if (!el) return
    if (off) {
      if (el.getAttribute('data-off') !== '1') el.setAttribute('data-off', '1')
    } else if (el.getAttribute('data-off') !== null) {
      el.removeAttribute('data-off')
    }
  }

  // Whether a press is accepted. It reads the same attribute the stylesheet does, so
  // the look and the behaviour can never drift apart. A block that is dimmed as a
  // whole answers for everything inside it.
  function enabled(el) {
    var node = el
    while (node && typeof node.getAttribute === 'function') {
      if (node.getAttribute('data-off') === '1') return false
      node = node.parentNode
    }
    return true
  }

  // The title shows how many pictures are stored, so an empty list and a full one can
  // never be mistaken for each other.
  function updateTitleCount() {
    try {
      if (!headTitle) return
      var n = Array.isArray(state.images) ? state.images.length : 0
      headTitle.textContent = '\u4e3b\u9898'
      if (imageCount) imageCount.textContent = n + '/' + MAX_IMAGES
    syncAddCard()
    } catch (e) { noteIssue('l1123', e) }
  }

  // ------------------------------------------------------------- wallpaper effect
  //
  // Every parameter lands here, so no control has to remember which style it owns.
  //
  //   opacity     the wallpaper layer own opacity; the backdrop below it is opaque,
  //               so step 0 is the plain interface rather than an empty page
  //   blur        blur() -- left out entirely at 0, because a full-viewport blur is the
  //               one filter that costs real frames on Windows and Electron
  //   brightness  brightness(), centred on the middle step
  //   saturate    saturate(),   centred on the middle step
  //
  // The three filters are written as one declaration: replacing them as a set is both
  // cheaper for the compositor and the only correct way, since a filter list is not
  // merged property by property.
  var FIT_STYLE = {
    cover:   { size: 'cover',     repeat: 'no-repeat' },
    contain: { size: 'contain',   repeat: 'no-repeat' },
    repeat:  { size: 'auto',      repeat: 'repeat' },
    fill:    { size: '100% 100%', repeat: 'no-repeat' },
  }

  // The app renders long after this script runs, and a framework is free to re-create
  // the element our layers were inserted before. Both of these are cheap and idempotent,
  // so they run on every apply.
  function ensureEffectLayers() {
    try {
      var b = document.body
      if (!b || !backdrop || !wallpaper) return
      if (backdrop.parentNode !== b) b.insertBefore(backdrop, b.firstChild)
      if (wallpaper.parentNode !== b) b.insertBefore(wallpaper, backdrop.nextSibling)
    } catch (e) { noteIssue('l-fx-reassert', e) }
  }

  // Walking up from a point finds the element whose background is what one actually sees
  // there. The first opaque ancestor is therefore the one standing between the wallpaper
  // and the eye. Named containers are skipped: the rules above already cover them, and
  // tagging them again would apply two scrims to one element.
  var SURFACE_FLAG = 'data-dstb-surface'
  var NAMED_SURFACE = ['_frame', '_centerCol', '_sidebarCol', '_rightbarCol']

  // Whether an ancestor is already a scrimmed surface. Inside one, another scrim would be
  // applied to the same stack, so the element stands down completely instead.
  function insideScrimmedSurface(el) {
    var p = el.parentElement
    var guard = 0
    while (p && p !== document.body && guard < 40) {
      if (p.getAttribute(SURFACE_FLAG) !== null) return true
      var cls = typeof p.className === 'string' ? p.className : ''
      for (var k = 0; k < NAMED_SURFACE.length; k++) {
        if (cls.indexOf(NAMED_SURFACE[k]) !== -1) return true
      }
      p = p.parentElement
      guard++
    }
    return false
  }

  function tagBackgroundPainters() {
    try {
      if (!document.documentElement.hasAttribute(WALLPAPER_ATTR)) return
      var vw = window.innerWidth
      var vh = window.innerHeight
      var probes = [
        [Math.round(vw * 0.5), Math.round(vh * 0.35), '1'],
        [Math.round(vw * 0.5), Math.round(vh * 0.72), '1'],
        [Math.round(vw * 0.08), Math.round(vh * 0.5), 'rail'],
      ]
      for (var p = 0; p < probes.length; p++) {
        var el = document.elementFromPoint(probes[p][0], probes[p][1])
        var depth = 0
        while (el && el !== document.body && depth < 40) {
          var skip = false
          if (el === root || (el.closest && el.closest('#' + ROOT_ID))) skip = true
          if (!skip) {
            var cls = typeof el.className === 'string' ? el.className : ''
            for (var k = 0; k < NAMED_SURFACE.length; k++) {
              if (cls.indexOf(NAMED_SURFACE[k]) !== -1) { skip = true; break }
            }
          }
          if (!skip) {
            var cs = window.getComputedStyle(el)
            if (cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) !== 0) {
              var m = cs.backgroundColor.match(/[\d.]+/g)
              var alpha = m && m.length > 3 ? Number(m[3]) : 1
              var paints = alpha >= 0.95 || (cs.backgroundImage && cs.backgroundImage !== 'none')
              // Only a surface tall and wide enough to be part of the layout is handled. A
              // code block or a message bubble paints its own background on purpose and
              // must keep it, and neither is ever half the height of the window.
              var rect = el.getBoundingClientRect()
              var surface = rect.height >= vh * 0.5 && rect.width >= 120
              if (paints && surface) {
                el.setAttribute(SURFACE_FLAG, insideScrimmedSurface(el) ? 'clear' : probes[p][2])
                break
              }
            }
          }
          el = el.parentElement
          depth++
        }
      }
    } catch (e) { noteIssue('l-fx-paint', e) }
  }

  // The app keeps mounting after the first apply, so the probe is repeated a few times
  // and once more whenever the document grows. Bounded, and it stops as soon as the
  // wallpaper is switched off.
  var effectSettleTimer = null
  function scheduleEffectRefresh() {
    if (effectSettleTimer !== null) return
    // The document grows most while a large panel is opening, and that is exactly when it is
    // animating. Reading styles at that moment forces a recalculation inside the animation,
    // so an idle slot is used when the engine offers one. The sentinel keeps the guard above
    // working without ever cancelling an idle handle through clearTimeout.
    var run = function () {
      effectSettleTimer = null
      refreshEffect()
    }
    var idle = window.requestIdleCallback
    if (typeof idle === 'function') {
      effectSettleTimer = -1
      idle(run, { timeout: 900 })
    } else {
      effectSettleTimer = window.setTimeout(run, 300)
    }
  }
  function watchEffectSettle() {
    try {
      var delays = [400, 1200, 3000, 7000]
      for (var i = 0; i < delays.length; i++) window.setTimeout(refreshEffect, delays[i])
      var Obs = window.MutationObserver
      if (typeof Obs === 'function') {
        var obs = new Obs(function () { scheduleEffectRefresh() })
        obs.observe(document.body, { childList: true, subtree: true })
      }
    } catch (e) { noteIssue('l-fx-watch', e) }
  }

  // The parameter paths call applyEffect alone: they change what is painted, not what is
  // mounted. Working out which elements are surfaces is structural, and running it per frame
  // is what made dragging the colour picker stutter.
  function refreshEffect() {
    applyEffect()
    tagBackgroundPainters()
  }

  function applyEffect() {
    try {
      if (!wallpaper) return
      var on = state.background === true
      var images = Array.isArray(state.images) ? state.images : []
      var imageMode = state.mode === 'image'
      var colorMode = state.mode === 'color'
      var src = imageMode && state.selectedImage !== null ? images[state.selectedImage] : null
      // Each route keeps its own opacity, and the early exit has to read the same one.
      var activeOpacity = colorMode ? state.colorOpacity : state.opacity

      var hide = function () {
        wallpaper.style.backgroundImage = 'none'
        wallpaper.style.backgroundColor = 'transparent'
        wallpaper.style.filter = 'none'
        wallpaper.style.opacity = '0'
      }

      // Only a real layer earns the right to make the app surfaces transparent.
      if (!on || (!src && !colorMode) || !(activeOpacity > 0)) {
        document.documentElement.removeAttribute(WALLPAPER_ATTR)
        hide()
        return
      }
      document.documentElement.setAttribute(WALLPAPER_ATTR, '')

      if (src) {
        var fit = FIT_STYLE[state.fit] || FIT_STYLE.cover
        wallpaper.style.backgroundImage = 'url("' + src + '")'
        wallpaper.style.backgroundColor = 'transparent'
        wallpaper.style.backgroundSize = fit.size
        wallpaper.style.backgroundRepeat = fit.repeat
      } else {
        // A flat colour has nothing to lay out, so the fit choice does not apply.
        wallpaper.style.backgroundImage = 'none'
        wallpaper.style.backgroundColor = state.color
        wallpaper.style.backgroundSize = 'auto'
        wallpaper.style.backgroundRepeat = 'no-repeat'
      }

      var filters = []
      // Every filter belongs to the picture route. The colour route is described by the
      // colour and its own opacity alone, so stored picture values must not leak into it.
      if (imageMode) {
        if (state.blur > 0) filters.push('blur(' + state.blur + 'px)')
        filters.push('brightness(' + (50 + state.brightness * 10) + '%)')
        filters.push('saturate(' + (state.saturation * 20) + '%)')
      }
      wallpaper.style.filter = filters.join(' ')
      wallpaper.style.opacity = String(activeOpacity / 10)
      ensureEffectLayers()
    } catch (e) { noteIssue('l-effect', e) }
  }

  // A drag emits far more input events than the compositor needs frames; one apply per
  // frame keeps a blur drag smooth without dropping the final value.
  var effectFrame = null
  function scheduleEffect() {
    if (effectFrame !== null) return
    if (typeof window.requestAnimationFrame !== 'function') { applyEffect(); return }
    effectFrame = window.requestAnimationFrame(function () {
      effectFrame = null
      applyEffect()
    })
  }

  function applyBackgroundState() {
    var on = state.background === true
    var images = Array.isArray(state.images) ? state.images : []
    var hasImage = images.length > 0
    // With the background off nothing is in use, so the route is cleared too. The same
    // holds once the last picture is gone: the picture route has nothing left to
    // describe, so it cannot stay the active one. Stated here rather than only where a
    // picture is removed, so no path into an empty list can leave the panel in a route
    // that the list no longer supports.
    if (!on) state.mode = null
    if (state.mode === 'image' && images.length === 0) state.mode = null
    var imageMode = state.mode === 'image'
    var colorMode = state.mode === 'color'

    try { root.setAttribute('data-mode', state.mode || '') } catch (e) { noteIssue('l1135', e) }
    try { switchInput.checked = on } catch (e) { noteIssue('l1136', e) }

    markOff(customGroup, !on)
    // The thumbnail-and-add row is an entry point, so the route never dims it; only the
    // master switch above it can. It sits inside customGroup, so that is already covered.
    markOff(fitArea, on && !imageMode)
    // Parameter ownership is split by route. The four-slider block belongs to the picture
    // route alone, and the colour route keeps one slider of its own. Each block carries
    // exactly one flag, so nothing is ever dimmed twice.
    markOff(paramGroup, on && !imageMode)
    markOff(colorParams, on && !colorMode)

    // A dimmed range input would still accept a drag, which would leave its thumb moved
    // while its value was ignored. Disabling it is the only way to stop that, and it is
    // derived from the very same flag, so the look and the behaviour cannot disagree.
    try {
      var allSliders = [sliders.opacity, sliders.colorOpacity, sliders.blur, sliders.brightness, sliders.saturation]
      for (var si = 0; si < allSliders.length; si++) {
        var sl = allSliders[si]
        if (sl && sl.input) sl.input.disabled = !enabled(sl.input)
      }
    } catch (e) { noteIssue('l1159', e) }

    // The fit choices belong to the picture route and to nothing else: they describe how a
    // picture is laid out, so in the colour route none of them is the current choice and
    // all four read as unchosen. Entering the picture route is what puts the stored fit
    // back on screen -- fill by default, so the route always opens with a visible choice.
    for (var sf = 0; sf < fitButtons.length; sf++) {
      var fitOn = imageMode && fitButtons[sf].getAttribute('data-fit') === state.fit
      fitButtons[sf].setAttribute('data-selected', fitOn ? '1' : '0')
    }
    var stripKids = imageStrip ? imageStrip.children : []
    for (var sk = 0; sk < stripKids.length; sk++) {
      if (stripKids[sk].getAttribute('data-card-index') === null) continue
      var cardOn = imageMode && String(state.selectedImage) === stripKids[sk].getAttribute('data-card-index')
      stripKids[sk].setAttribute('data-selected', cardOn ? '1' : '0')
    }
    syncModeUI()
    updateTitleCount()

    try {
      if (sliders.opacity) sliders.opacity.set(state.opacity)
      if (sliders.blur) sliders.blur.set(state.blur)
      if (sliders.brightness) sliders.brightness.set(state.brightness)
      if (sliders.saturation) sliders.saturation.set(state.saturation)
    } catch (e) { noteIssue('l1181', e) }
    applyEffect()
    persist()
  }
  function currentImageSrc() {
    if (!Array.isArray(state.images) || state.selectedImage === null) return null
    return state.images[state.selectedImage] || null
  }

  // Rebuild the strip from state. The add card is always kept last, and only the
  // selected thumbnail is shown at full brightness.
  function paintImages() {
    try {
      var list = Array.isArray(state.images) ? state.images : []
      while (imageStrip.firstChild) imageStrip.removeChild(imageStrip.firstChild)

      for (var idx = 0; idx < list.length; idx++) {
        var card = document.createElement('div')
        card.className = 'dstb-card'
        card.setAttribute('role', 'button')
        card.setAttribute('data-card-index', String(idx))
        card.setAttribute('data-selected', state.selectedImage === idx ? '1' : '0')
        card.setAttribute('data-armed', '0')
        card.setAttribute('title', '\u70b9\u51fb\u8bbe\u4e3a\u80cc\u666f\uff0c\u60ac\u505c\u540e\u53ef\u5220\u9664')
        card.style.backgroundImage = 'url("' + list[idx] + '")'
        var removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.className = 'dstb-cardrm'
        removeBtn.setAttribute('data-remove-index', String(idx))
        removeBtn.setAttribute('aria-label', '\u5220\u9664\u8fd9\u5f20\u56fe\u7247')
        removeBtn.textContent = '\u00d7'
        removeBtn.addEventListener('click', (function (position) {
          return function (event) {
            event.preventDefault()
            event.stopPropagation()
            removeImageAt(position)
          }
        })(idx))
        card.appendChild(removeBtn)
        card.addEventListener('click', (function (position) {
          return function (event) {
            event.preventDefault()
            event.stopPropagation()
            // No availability check: pressing a picture is one of the two ways into the
            // image route, so it has to work while the colour route is active.
            selectImageAt(position)
          }
        })(idx))
        armOnHover(card)
        imageStrip.appendChild(card)
      }
      applyBackgroundState()
    } catch (err) {
      // A failure while drawing the gallery must never be silent: this is exactly how
      // the strip stayed empty without a trace.
      noteProblem('draw failed: ' + (err && err.message ? err.message : err))
    }
  }

  // Choosing an image only moves the selection; the parameters are shared by every
  // image and therefore stay exactly where the user left them.
  // Choosing a picture both selects it and makes the image route the active one; the
  // colour route's highlight is dropped by the state pass.
  // Picking a different picture of the current set.
  // Choosing a picture both selects it and makes the picture route the active one, so a
  // press on a thumbnail switches modes; the colour highlight is dropped by the same pass.
  function selectImageAt(index) {
    if (!Array.isArray(state.images) || index < 0 || index >= state.images.length) return
    state.selectedImage = index
    state.mode = 'image'
    paintImages()
    persist()
  }

  function removeImageAt(index) {
    // The master switch dims this row, and a control that reads as switched off must not
    // still act. Only that switch is consulted: the route flag deliberately never dims the
    // thumbnail row, because the row is also the way into the picture route.
    if (!enabled(customGroup)) return
    if (!Array.isArray(state.images) || index < 0 || index >= state.images.length) return
    state.images.splice(index, 1)
    // Removing the last picture also drops the picture route; the state pass would
    // normalise it anyway, but leaving it set here would keep a stale route in storage.
    if (state.images.length === 0) {
      state.selectedImage = null
      state.mode = null
    }
    else if (state.selectedImage === index) state.selectedImage = Math.min(index, state.images.length - 1)
    else if (state.selectedImage > index) state.selectedImage -= 1
    paintImages()
    persist()
  }

  function clearArmTimer() {
    if (armTimer !== null) {
      try { window.clearTimeout(armTimer) } catch (e) { noteIssue('l1262', e) }
      armTimer = null
    }
  }

  // The remove badge appears only after the pointer has rested on a card, and only
  // then becomes clickable, so aiming at a thumbnail cannot delete it by accident.
  function armOnHover(card) {
    card.addEventListener('mouseenter', function () {
      clearArmTimer()
      armTimer = window.setTimeout(function () { card.setAttribute('data-armed', '1') }, 260)
    })
    card.addEventListener('mouseleave', function () {
      clearArmTimer()
      card.setAttribute('data-armed', '0')
    })
  }

  // Scrolling the strip sideways.
  //
  // A mouse wheel only reports vertical movement while this strip has no vertical
  // overflow, so that delta is redirected onto the horizontal axis. Assigning it to
  // scrollLeft in one go would move a whole wheel notch per frame, which reads as
  // dropped frames; instead the target is approached over several frames, giving the
  // movement a continuous feel. Touchpads already send horizontal deltas natively --
  // those are left alone, because the browser's own scrolling is smoother than
  // anything re-implemented here.
  var stripTarget = null
  var stripFrame = null

  function stripTick() {
    try {
      if (stripTarget === null) { stripFrame = null; return }
      var current = imageStrip.scrollLeft
      var remaining = stripTarget - current
      if (Math.abs(remaining) < 0.5) {
        imageStrip.scrollLeft = stripTarget
        stripTarget = null
        stripFrame = null
        return
      }
      // Ease towards the target, but never move more than a few pixels per frame.
      // These two numbers set the pace: a smaller fraction and a smaller cap both
      // make the glide slower and gentler.
      var stepSize = remaining * 0.15
      if (stepSize > 12) stepSize = 12
      else if (stepSize < -12) stepSize = -12
      imageStrip.scrollLeft = current + stepSize
      stripFrame = window.requestAnimationFrame(stripTick)
    } catch (e) {
      stripFrame = null
      stripTarget = null
    }
  }

  function stripScrollBy(delta) {
    var max = imageStrip.scrollWidth - imageStrip.clientWidth
    if (max <= 0) return
    // Without an animation frame there is nothing to ease towards, so fall back to
    // moving directly rather than doing nothing at all.
    if (typeof window.requestAnimationFrame !== 'function') {
      var next = imageStrip.scrollLeft + delta
      if (next < 0) next = 0
      if (next > max) next = max
      imageStrip.scrollLeft = next
      return
    }
    if (stripTarget === null) stripTarget = imageStrip.scrollLeft
    stripTarget += delta
    if (stripTarget < 0) stripTarget = 0
    if (stripTarget > max) stripTarget = max
    if (stripFrame === null) stripFrame = window.requestAnimationFrame(stripTick)
  }

  // Dragging the scrollbar sets scrollLeft outside the animation; that would leave
  // the eased target stale and yank the strip back, so the pending target is dropped.
  function attachStripScrollGuard() {
    try {
      imageStrip.addEventListener('scroll', function () {
        try {
          if (stripTarget === null || stripFrame === null) return
          var remaining = stripTarget - imageStrip.scrollLeft
          if (Math.abs(remaining) > 140) stripTarget = null
        } catch (e) { noteIssue('l1343', e) }
      })
    } catch (e) { noteIssue('l1345', e) }
  }

  function attachStripWheel() {
    try {
      addRow.addEventListener('wheel', function (event) {
        try {
          if (imageStrip.scrollWidth <= imageStrip.clientWidth + 1) return
          var dx = event.deltaX || 0
          var dy = event.deltaY || 0
          // A genuine sideways gesture (touchpad) is left to the browser.
          if (Math.abs(dx) > Math.abs(dy)) return
          if (!dy) return
          // A notch is damped so one flick does not shoot past several thumbnails.
          stripScrollBy(dy * 0.6)
          if (typeof event.preventDefault === 'function') event.preventDefault()
        } catch (e) { noteIssue('l1361', e) }
      }, { passive: false })
    } catch (e) { noteIssue('l1363', e) }
  }

  // Keep the stored data URLs inside a safe budget; a full localStorage silently
  // rejects writes, which would look like "the image vanished after a restart".
  var STORAGE_BUDGET = 4 * 1024 * 1024
  function storedBytes() {
    var total = 0
    var list = Array.isArray(state.images) ? state.images : []
    for (var i = 0; i < list.length; i++) total += String(list[i]).length
    return total
  }

  // Decode, downscale and re-encode. An image that is already small enough is kept
  // untouched so it does not lose quality to a needless re-encode.
  function compressImage(file, done) {
    var finish = function (dataUrl) {
      try { done(String(dataUrl)) } catch (e) { noteIssue('l1380', e) }
    }
    try {
      var reader = new FileReader()
      reader.onload = function () {
        var raw = String(reader.result)
        if (raw.length <= 400 * 1024) { finish(raw); return }
        try {
          var probe = new Image()
          probe.onload = function () {
            try {
              var w = probe.naturalWidth || probe.width
              var h = probe.naturalHeight || probe.height
              var scale = Math.min(1, MAX_EDGE / Math.max(w || 1, h || 1))
              if (scale >= 1 && raw.length <= 400 * 1024) { finish(raw); return }
              var targetW = Math.max(1, Math.round((w || 1) * scale))
              var targetH = Math.max(1, Math.round((h || 1) * scale))
              var canvas = document.createElement('canvas')
              canvas.width = targetW
              canvas.height = targetH
              var ctx = canvas.getContext('2d')
              if (!ctx) { finish(raw); return }
              ctx.drawImage(probe, 0, 0, targetW, targetH)
              var out = ''
              try { out = canvas.toDataURL('image/jpeg', JPEG_QUALITY) } catch (e) { out = '' }
              finish(out && out.length > 32 ? out : raw)
            } catch (e) {
              finish(raw)
            }
          }
          probe.onerror = function () { finish(raw) }
          probe.src = raw
        } catch (e) {
          finish(raw)
        }
      }
      reader.onerror = function () { try { done(null) } catch (e) { noteIssue('l1416', e) } }
      reader.readAsDataURL(file)
    } catch (e) {
      noteIssue('l1418', e)
      try { done(null) } catch (inner) { noteIssue('l1419b', inner) }
    }
  }

  var addQueue = []
  var addBusy = false

  // Where a failure is written so it can be seen in the UI instead of vanishing.
  // Everything that used to disappear into an empty catch lands here instead. The
  // behaviour is unchanged -- a failed call is still tolerated -- but it leaves a trail,
  // so a silent breakage can be told apart from something that never ran.
  var ISSUE_LIMIT = 12
  var issues = []
  function noteIssue(where, err) {
    try {
      var text = where + ': ' + (err && err.message ? err.message : String(err))
      if (issues.indexOf(text) !== -1) return
      issues.push(text)
      if (issues.length > ISSUE_LIMIT) issues.shift()
      window.__dshThemeButtonIssues = issues.slice()
    } catch (e) { noteIssue('l1440', e) }
  }

  // The add card reports being full by looking unavailable, not by printing a message: the red
  // line beside the title was a leftover from bringing the add pipeline up. Only a real failure
  // still marks the card.
  function syncAddCard() {
    try {
      var list = Array.isArray(state.images) ? state.images : []
      var full = list.length >= MAX_IMAGES
      if (addCard) addCard.disabled = full
      markOff(addCard, full)
    } catch (e) { noteIssue('l-addcard', e) }
  }

  function noteProblem(text) {
    try {
      lastProblem = String(text)
      if (addCard) addCard.setAttribute('data-problem', lastProblem)
    } catch (e) { noteIssue('l1448', e) }
  }


  function processAddQueue() {
    if (addBusy) return
    if (addQueue.length === 0) return
    var file = addQueue.shift()
    addBusy = true
    var settled = false
    var finish = function (dataUrl) {
      if (settled) return
      settled = true
      addBusy = false
      handleAddResult(dataUrl)
    }
    // If the browser never reports back, release the queue rather than wedging it.
    try {
      window.setTimeout(function () {
        if (!settled) { noteProblem('read timed out'); finish(null) }
      }, 15000)
    } catch (e) { noteIssue('l1468', e) }
    compressImage(file, finish)
  }

  function handleAddResult(dataUrl) {
    if (!dataUrl) noteProblem('could not read the file')
    else {
      try {
        var list = Array.isArray(state.images) ? state.images : []
        if (list.length >= MAX_IMAGES) {
          // Nothing to announce: the add card is already switched off, and a picture can only
          // reach here through a file dialog that was left open.
        } else if (storedBytes() + dataUrl.length > STORAGE_BUDGET) {
          noteProblem('no room left - remove one first')
        } else {
          list.push(dataUrl)
          state.images = list
          state.selectedImage = list.length - 1
          // Only a picture that actually arrived promotes the image route. Cancelling
          // the picker leaves everything exactly as it was.
          state.mode = 'image'
          applyBackgroundState()
          paintImages()
          persist()
          noteProblem('ok')
        }
      } catch (err) {
        // Never swallow this one: it is the difference between working and silence.
        noteProblem('failed: ' + (err && err.message ? err.message : err))
      }
    }
    processAddQueue()
  }

  // Place a freshly decoded image: appended at the end and immediately selected, so
  // the newest choice is the one on screen. Refused when the list is full or when it
  // would push the stored data past the budget.
  function takeImage(dataUrl) {
    if (!dataUrl) return
    try {
      var list = Array.isArray(state.images) ? state.images : []
      if (list.length >= MAX_IMAGES) return
      if (storedBytes() + dataUrl.length > STORAGE_BUDGET) return
      list.push(dataUrl)
      state.images = list
      state.selectedImage = list.length - 1
      paintImages()
      persist()
    } catch (e) { noteIssue('l1515', e) }
  }

  function paintImageRow() {
    paintImages()
  }

  // The picker and the sliders fire on every pointer move, and a write serialises the stored
  // pictures along with everything else, so writes are coalesced. A direct persist still wins
  // and cancels whatever was pending.
  var persistTimer = null
  function schedulePersist() {
    if (persistTimer) return
    persistTimer = window.setTimeout(function () {
      persistTimer = null
      persist()
    }, 400)
  }

  function persist() {
    if (persistTimer) {
      try { window.clearTimeout(persistTimer) } catch (e) {}
      persistTimer = null
    }
    writeState(state)
  }

  function initSliders() {
    var syncAll = function () { for (var k in sliders) sliders[k].sync() }
    // Every edit is written straight into the current image's memory, so the value
    // survives the background being switched off and back on.
    var onInput = function () { syncAll(); scheduleEffect(); schedulePersist() }
    sliders.opacity = makeSlider(opacityBlock, '\u4e0d\u900f\u660e\u5ea6', 0, STEP_MAX, state.opacity, function (v) {
      state.opacity = v; onInput()
    }, false)
    sliders.colorOpacity = makeSlider(colorOpacityBlock, '\u4e0d\u900f\u660e\u5ea6', 0, STEP_MAX, state.colorOpacity, function (v) {
      state.colorOpacity = v; onInput()
    }, false)
    sliders.blur = makeSlider(blurBlock, '\u6a21\u7cca', 0, BLUR_MAX_PX, state.blur, function (v) {
      state.blur = v; onInput()
    }, true)
    sliders.brightness = makeSlider(brightnessBlock, '\u4eae\u5ea6', 0, STEP_MAX, state.brightness, function (v) {
      state.brightness = v; onInput()
    }, false)
    sliders.saturation = makeSlider(saturationBlock, '\u9971\u548c\u5ea6', 0, STEP_MAX, state.saturation, function (v) {
      state.saturation = v; onInput()
    }, false)
    paintImageRow()
  }

  switchInput.addEventListener('change', function () {
    state.background = switchInput.checked === true
    applyBackgroundState()
    persist()
  })

  attachStripWheel()
  attachStripScrollGuard()

  // The two route rows are always tappable (that is how a route is picked); only the
  // contents below them answer to the current route and to the master switch.
  function syncModeUI() {
    try {
      for (var i = 0; i < modeButtons.length; i++) {
        var name = modeButtons[i].getAttribute('data-mode')
        modeButtons[i].setAttribute('data-selected', name === state.mode ? '1' : '0')
      }
      customColorInput.value = state.color
      try { colorTrigger.style.background = state.color } catch (e) {}
      for (var c = 0; c < swatchButtons.length; c++) {
        // A swatch only reads as chosen while the colour route is the active one.
        var isSel = state.mode === 'color' && swatchButtons[c].getAttribute('data-color').toLowerCase() === String(state.color).toLowerCase()
        swatchButtons[c].setAttribute('data-selected', isSel ? '1' : '0')
      }
    } catch (e) { noteIssue('l1569', e) }
  }

  // The two routes are mutually exclusive: choosing one clears the other simply
  // because `mode` holds a single value, and both the swatches and the thumbnails
  // redraw from it. Each control is bound directly rather than through a captured
  // array, so nothing can silently drop the handler.
  // The colour heading has no click handler: it is a label. Choosing a colour is what
  // switches the route, which the swatch and picker handlers below already do.

  for (var sc = 0; sc < swatchButtons.length; sc++) {
    swatchButtons[sc].addEventListener('click', (function (button) {
      return function (event) {
        try {
          event.preventDefault()
          event.stopPropagation()
        } catch (e) { noteIssue('l1593', e) }
        if (!enabled(button)) return
        var picked = button.getAttribute('data-color')
        if (picked) {
          state.color = picked
          // Picking a colour also declares the colour route.
          state.mode = 'color'
          applyBackgroundState()
          persist()
        }
      }
    })(swatchButtons[sc]))
  }

  // This fires on every pointer move while the picker is dragged, so it must stay cheap. The
  // full panel pass runs only the once that entering the colour route changes what the panel
  // flags; afterwards just the selection ring, the frame-throttled effect and the coalesced
  // write follow.
  // --- the custom colour picker -----------------------------------------------
  // Replaces the engine popup, which cannot be reached by CSS. A hue strip and a
  // saturation/value field, both driven by pointer capture so a drag keeps reporting even
  // when the pointer leaves the surface.
  var cpick = document.createElement('div')
  cpick.className = 'dstb-cpick'
  cpick.hidden = true
  cpick.setAttribute('role', 'dialog')
  cpick.setAttribute('aria-label', '\u81ea\u5b9a\u4e49\u989c\u8272')
  var cpickSv = document.createElement('div')
  cpickSv.className = 'dstb-cpick-sv'
  var cpickSvDot = document.createElement('div')
  cpickSvDot.className = 'dstb-cpick-svdot'
  cpickSv.appendChild(cpickSvDot)
  var cpickHue = document.createElement('div')
  cpickHue.className = 'dstb-cpick-hue'
  var cpickHueDot = document.createElement('div')
  cpickHueDot.className = 'dstb-cpick-huedot'
  cpickHue.appendChild(cpickHueDot)
  var cpickRow = document.createElement('div')
  cpickRow.className = 'dstb-cpick-row'
  var cpickInput = document.createElement('input')
  cpickInput.type = 'text'
  cpickInput.className = 'dstb-cpick-input'
  cpickInput.spellcheck = false
  cpickInput.setAttribute('aria-label', '\u989c\u8272\u503c')
  var cpickSpin = document.createElement('div')
  cpickSpin.className = 'dstb-cpick-spin'
  var cpickUp = document.createElement('button')
  cpickUp.type = 'button'
  cpickUp.className = 'dstb-cpick-step'
  cpickUp.textContent = '\u25b4'
  cpickUp.setAttribute('aria-label', '\u4e0a\u4e00\u79cd\u683c\u5f0f')
  var cpickDown = document.createElement('button')
  cpickDown.type = 'button'
  cpickDown.className = 'dstb-cpick-step'
  cpickDown.textContent = '\u25be'
  cpickDown.setAttribute('aria-label', '\u4e0b\u4e00\u79cd\u683c\u5f0f')
  cpickSpin.appendChild(cpickUp)
  cpickSpin.appendChild(cpickDown)
  cpickRow.appendChild(cpickInput)
  cpickRow.appendChild(cpickSpin)
  cpick.appendChild(cpickSv)
  cpick.appendChild(cpickHue)
  cpick.appendChild(cpickRow)
  try { root.appendChild(cpick) } catch (e) { noteIssue('l-cpick', e) }

  var pick = { h: 0, s: 1, v: 1 }
  function hsvToHex(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
    var r = 0, g = 0, b = 0
    if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
    else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
    else if (h < 300) { r = x; b = c } else { r = c; b = x }
    var to = function (n) {
      var q = Math.round((n + m) * 255)
      q = q < 0 ? 0 : q > 255 ? 255 : q
      var s2 = q.toString(16)
      return s2.length === 1 ? '0' + s2 : s2
    }
    return '#' + to(r) + to(g) + to(b)
  }
  function hexToHsv(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
    if (!m) return { h: 0, s: 0, v: 1 }
    var n = parseInt(m[1], 16)
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0
    if (d > 0) {
      if (mx === r) h = 60 * (((g - b) / d) % 6)
      else if (mx === g) h = 60 * ((b - r) / d + 2)
      else h = 60 * ((r - g) / d + 4)
    }
    if (h < 0) h += 360
    return { h: h, s: mx === 0 ? 0 : d / mx, v: mx }
  }
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
    if (!m) return { r: 0, g: 0, b: 0 }
    var n = parseInt(m[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  function rgbToHex(r, g, b) {
    var to = function (x) {
      var q = Math.round(x < 0 ? 0 : x > 255 ? 255 : x)
      var s = q.toString(16)
      return s.length === 1 ? '0' + s : s
    }
    return '#' + to(r) + to(g) + to(b)
  }
  function rgbToHsl(r, g, b) {
    r = r / 255; g = g / 255; b = b / 255
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0
    if (d > 0) {
      if (mx === r) h = 60 * (((g - b) / d) % 6)
      else if (mx === g) h = 60 * ((b - r) / d + 2)
      else h = 60 * ((r - g) / d + 4)
    }
    if (h < 0) h += 360
    var l = (mx + mn) / 2
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    return { h: h, s: s * 100, l: l * 100 }
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360
    s = Math.max(0, Math.min(100, s)) / 100
    l = Math.max(0, Math.min(100, l)) / 100
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
    var r = 0, g = 0, b = 0
    if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
    else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
    else if (h < 300) { r = x; b = c } else { r = c; b = x }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
  }
  // Only the three shapes people actually type.
  var PICK_FORMATS = ['hex', 'rgb', 'hsl']
  var pickFormat = 0
  function formatColor(hex, fmt) {
    if (fmt === 'rgb') {
      var c = hexToRgb(hex)
      return 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')'
    }
    if (fmt === 'hsl') {
      var c2 = hexToRgb(hex)
      var q = rgbToHsl(c2.r, c2.g, c2.b)
      return 'hsl(' + Math.round(q.h) + ', ' + Math.round(q.s) + '%, ' + Math.round(q.l) + '%)'
    }
    return String(hex).toUpperCase()
  }
  function parseColor(text, fmt) {
    var s = String(text).replace(/\s+/g, ' ').trim()
    // A labelled value is read as labelled whatever the selector happens to show, so typing
    // an rgb(...) while the field displays hex is still obeyed, and an hsl(...) is never
    // mistaken for three bare numbers.
    if (/^rgb/i.test(s)) fmt = 'rgb'
    else if (/^hsl/i.test(s)) fmt = 'hsl'
    else if (/^#?[0-9a-f]{3,6}$/i.test(s)) fmt = 'hex'
    var m
    if (fmt === 'rgb') {
      m = /(\d{1,3})[ ,]+(\d{1,3})[ ,]+(\d{1,3})/.exec(s)
      if (!m) return null
      return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]))
    }
    if (fmt === 'hsl') {
      m = /(\d{1,3})[ ,]+(\d{1,3})%?[ ,]+(\d{1,3})%?/.exec(s)
      if (!m) return null
      var c = hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]))
      return rgbToHex(c.r, c.g, c.b)
    }
    m = /^#?([0-9a-f]{6})$/i.exec(s)
    if (m) return ('#' + m[1]).toLowerCase()
    m = /^#?([0-9a-f]{3})$/i.exec(s)
    if (m) return ('#' + m[1][0] + m[1][0] + m[1][1] + m[1][1] + m[1][2] + m[1][2]).toLowerCase()
    return null
  }
  function paintPicker() {
    var hex = hsvToHex(pick.h, pick.s, pick.v)
    cpickSv.style.backgroundImage = 'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(' + Math.round(pick.h) + ',100%,50%))'
    cpickSvDot.style.left = (pick.s * 100) + '%'
    cpickSvDot.style.top = ((1 - pick.v) * 100) + '%'
    cpickHueDot.style.left = ((pick.h / 360) * 100) + '%'
    cpickHueDot.style.setProperty('--dstb-ring-fill', hex)
    // Never rewrite the field while it is being typed in: that would fight the caret.
    if (document.activeElement !== cpickInput) cpickInput.value = formatColor(hex, PICK_FORMATS[pickFormat])
    return hex
  }
  // Switching the route is a panel-wide change: it re-flags the parameter blocks and enables
  // or disables sliders. Doing it once here keeps every path into the picker honest, including
  // the one that opens from a stored colour while the picture route was still active.
  function ensureColorRoute() {
    if (state.mode === 'color') return
    state.mode = 'color'
    applyBackgroundState()
  }
  function emitColor() {
    var hex = paintPicker()
    state.color = hex
    ensureColorRoute()
    try { customColorInput.value = hex } catch (e) {}
    try { colorTrigger.style.background = hex } catch (e) {}
    syncModeUI()
    scheduleEffect()
    schedulePersist()
  }
  function dragSurface(el, apply) {
    var move = function (event) {
      var r = el.getBoundingClientRect()
      var fx = r.width ? (event.clientX - r.left) / r.width : 0
      var fy = r.height ? (event.clientY - r.top) / r.height : 0
      apply(fx < 0 ? 0 : fx > 1 ? 1 : fx, fy < 0 ? 0 : fy > 1 ? 1 : fy)
      emitColor()
    }
    el.addEventListener('pointerdown', function (event) {
      try { event.preventDefault(); event.stopPropagation() } catch (e) {}
      try { el.setPointerCapture(event.pointerId) } catch (e) {}
      move(event)
    })
    el.addEventListener('pointermove', function (event) {
      if (el.hasPointerCapture && !el.hasPointerCapture(event.pointerId)) return
      move(event)
    })
  }
  dragSurface(cpickSv, function (fx, fy) { pick.s = fx; pick.v = 1 - fy })
  dragSurface(cpickHue, function (fx) { pick.h = fx * 359.9 })
  function onDocDown(event) {
    if (cpick.contains(event.target) || event.target === colorTrigger) return
    closePicker()
  }
  function onDocKey(event) { if (event.key === 'Escape') closePicker() }
  function closePicker() {
    cpick.hidden = true
    try {
      document.removeEventListener('pointerdown', onDocDown, true)
      document.removeEventListener('keydown', onDocKey, true)
    } catch (e) {}
  }
  function openPicker() {
    var hsv = hexToHsv(state.color)
    pick.h = hsv.h; pick.s = hsv.s; pick.v = hsv.v
    paintPicker()
    cpick.hidden = false
    var r = colorTrigger.getBoundingClientRect()
    var w = cpick.offsetWidth || 200
    var h = cpick.offsetHeight || 176
    var left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width - w))
    var top = r.top - h - 8
    if (top < 6) top = r.bottom + 8
    cpick.style.left = Math.round(left) + 'px'
    cpick.style.top = Math.round(top) + 'px'
    try {
      document.addEventListener('pointerdown', onDocDown, true)
      document.addEventListener('keydown', onDocKey, true)
    } catch (e) {}
  }
  colorTrigger.addEventListener('click', function (event) {
    try { event.preventDefault(); event.stopPropagation() } catch (e) { noteIssue('l-cpick2', e) }
    if (!enabled(colorTrigger)) return
    if (cpick.hidden) {
      // Entering the colour route before the popup opens settles the panel in one pass, so the
      // drag that follows only has to repaint and a stored colour can never leave the picture
      // route's sliders looking live.
      ensureColorRoute()
      schedulePersist()
      openPicker()
    } else {
      closePicker()
    }
  })

  function cycleFormat(dir) {
    var n = PICK_FORMATS.length
    pickFormat = ((pickFormat + dir) % n + n) % n
    cpickInput.value = formatColor(state.color, PICK_FORMATS[pickFormat])
  }
  cpickUp.addEventListener('click', function (event) {
    try { event.preventDefault(); event.stopPropagation() } catch (e) {}
    cycleFormat(-1)
  })
  cpickDown.addEventListener('click', function (event) {
    try { event.preventDefault(); event.stopPropagation() } catch (e) {}
    cycleFormat(1)
  })
  cpickInput.addEventListener('input', function () {
    var hex = parseColor(cpickInput.value, PICK_FORMATS[pickFormat])
    if (!hex) return
    var hsv = hexToHsv(hex)
    pick.h = hsv.h; pick.s = hsv.s; pick.v = hsv.v
    state.color = hex
    ensureColorRoute()
    try { customColorInput.value = hex } catch (e) {}
    try { colorTrigger.style.background = hex } catch (e) {}
    paintPicker()
    syncModeUI()
    scheduleEffect()
    schedulePersist()
  })
  cpickInput.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return
    try { event.preventDefault() } catch (e) {}
    cpickInput.value = formatColor(state.color, PICK_FORMATS[pickFormat])
  })
  cpickInput.addEventListener('blur', function () {
    cpickInput.value = formatColor(state.color, PICK_FORMATS[pickFormat])
  })

  customColorInput.addEventListener('input', function () {
    if (!enabled(customColorInput)) return
    var routeChanged = state.mode !== 'color'
    state.color = String(customColorInput.value)
    state.mode = 'color'
    if (routeChanged) {
      applyBackgroundState()
    } else {
      syncModeUI()
      scheduleEffect()
    }
    schedulePersist()
  })


  ;(function attachFitButtons() {
    for (var i = 0; i < fitButtons.length; i++) {
      fitButtons[i].addEventListener('click', (function (button) {
        return function (event) {
          // The row itself selects the image route, so a fit press must not bubble
          // into it.
          try {
            event.preventDefault()
            event.stopPropagation()
          } catch (e) { noteIssue('l1625', e) }
          // A fit choice belongs to the image route: it does nothing anywhere else.
          if (!enabled(button)) return
          var mode = button.getAttribute('data-fit')
          if (mode && FIT_MODES.indexOf(mode) !== -1) {
            state.fit = mode
            applyBackgroundState()
            persist()
          }
        }
      })(fitButtons[i]))
    }
  })()

  addCard.addEventListener('click', function (event) {
    event.preventDefault()
    event.stopPropagation()
    // Only the master switch gates this. The add card lives inside the picture block,
    // yet it is also the way OUT of the colour route, so it must not answer to that
    // block's flag -- guarding it there would lock the user in.
    if (state.background !== true) return
    // Opening the picker deliberately leaves the route alone: the route follows what is
    // actually selected, so cancelling the dialog must change nothing. The swap happens
    // in the add pipeline, once a picture has really been taken in.
    try { fileInput.click() } catch (e) { noteIssue('l1649', e) }
  })

  fileInput.addEventListener('change', function () {
    var files = fileInput.files ? Array.prototype.slice.call(fileInput.files) : []
    try { fileInput.value = '' } catch (e) { noteIssue('l1654', e) }
    for (var i = 0; i < files.length; i++) addQueue.push(files[i])
    processAddQueue()
  })

  function setOpen(next) {
    panel.hidden = !next
    button.setAttribute('aria-expanded', next ? 'true' : 'false')
    // Opening the panel re-reads the persisted preference, so the highlighted cube
    // always matches what the official Appearance row currently holds.
    if (next) {
      checkPreference(function () {
        markSelected()
      })
    }
  }

  function isOpen() {
    return panel.hidden === false
  }

  // --- the widget can be moved ------------------------------------------------
  // A drag is told apart from a click by distance, not by time: the widget rides the pointer
  // once it has travelled a few pixels, and a press that never travels still opens the panel.
  // The pointer is captured so it keeps following when it leaves the button, and the position
  // is clamped to the window on every move and on every resize.
  var widgetDrag = null
  var widgetJustDragged = false

  // The window controls (minimise, maximise, close) are painted over a reserved strip along the
  // top of the window. A widget parked there is buried under them with no way to grab it back,
  // so that strip is out of bounds whenever it exists. In fullscreen the strip is gone and the
  // plain margin applies, which is why the value is read rather than hard-coded.
  function widgetTopBound() {
    var strip = titlebarClearance()
    return (strip === null ? 0 : strip) + 4
  }

  function applyWidgetPosition() {
    try {
      // Positioning is also what makes the widget visible: the button starts hidden so a fresh
      // launch never shows it at a guessed spot, and nothing else clears that state now that
      // the measuring pass is gone.
      revealButton()
      var w = root.offsetWidth || 36
      var h = root.offsetHeight || 36
      if (state.posX === null || state.posY === null) {
        root.style.left = ''
        root.style.top = ''
        root.style.right = '16px'
        root.style.bottom = '16px'
        return
      }
      var x = Math.max(4, Math.min(window.innerWidth - w - 4, state.posX))
      var y = Math.max(widgetTopBound(), Math.min(window.innerHeight - h - 4, state.posY))
      root.style.right = 'auto'
      root.style.bottom = 'auto'
      root.style.left = Math.round(x) + 'px'
      root.style.top = Math.round(y) + 'px'
    } catch (e) { noteIssue('l-widget', e) }
  }

  // The panel follows the widget, so where it opens has to be decided rather than assumed.
  // Three things adapt: the side (whichever has more room), the height (clamped to that room,
  // so it scrolls instead of leaving the window) and the horizontal offset (kept inside the
  // window when the widget has been dragged near an edge).
  function placePanel() {
    try {
      if (!panel) return
      var margin = 8
      var r = root.getBoundingClientRect()
      var pw = panel.offsetWidth || 268
      var ph = panel.offsetHeight || 0
      var below = window.innerHeight - r.bottom - margin
      var above = r.top - margin
      var openUp = above > below
      if (ph > 0) {
        if (below >= ph) openUp = false
        else if (above >= ph) openUp = true
      }
      if (openUp) {
        panel.style.top = 'auto'
        panel.style.bottom = 'calc(100% + ' + margin + 'px)'
        panel.style.maxHeight = Math.max(140, Math.round(above)) + 'px'
      } else {
        panel.style.top = 'calc(100% + ' + margin + 'px)'
        panel.style.bottom = 'auto'
        panel.style.maxHeight = Math.max(140, Math.round(below)) + 'px'
      }
      var shift = 0
      if (r.right - pw < margin) shift = margin - (r.right - pw)
      if (r.right + shift > window.innerWidth - margin) shift = window.innerWidth - margin - r.right
      panel.style.right = -Math.round(shift) + 'px'
    } catch (e) { noteIssue('l-panel-place', e) }
  }

  function onButtonClick(event) {
    event.preventDefault()
    event.stopPropagation()
    // A press that travelled was a drag, not a press: moving the widget must not also toggle
    // the panel. The flag is cleared here and again on the next press, so a drag that ends
    // without a click cannot swallow a later one.
    if (widgetJustDragged) {
      widgetJustDragged = false
      return
    }
    setOpen(!isOpen())
    if (isOpen()) placePanel()
  }

  // Only real pointer drags start on the button; a click that moved more than a
  // few pixels is treated as a drag and does not toggle the panel. The button
  // itself is never repositioned, so nothing can move it.
  var downX = 0
  var downY = 0
  function onPointerDown(event) {
    downX = event.clientX
    downY = event.clientY
    widgetJustDragged = false
    try {
      var r = root.getBoundingClientRect()
      widgetDrag = { id: event.pointerId, dx: event.clientX - r.left, dy: event.clientY - r.top, w: r.width, h: r.height }
      if (button.setPointerCapture) button.setPointerCapture(event.pointerId)
    } catch (e) { noteIssue('l-widget2', e) }
  }

  function onPointerMove(event) {
    if (widgetDrag === null || event.pointerId !== widgetDrag.id) return
    if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) <= 4) return
    if (button.getAttribute('data-dragging') !== '1') {
      // The grab cursor appears only once a drag has really started: hovering the widget usually
      // means someone is about to open the panel, not about to move it. The body-level cursor
      // keeps it a grabbing hand even when the pointer travels off the button, and closing the
      // panel here is what makes the gesture read as moving the widget rather than dragging the
      // panel around with it.
      try { button.setAttribute('data-dragging', '1') } catch (e) {}
      try { document.body.style.cursor = 'grabbing' } catch (e) {}
      if (isOpen()) setOpen(false)
    }
    var x = event.clientX - widgetDrag.dx
    var y = event.clientY - widgetDrag.dy
    state.posX = Math.round(Math.max(4, Math.min(window.innerWidth - widgetDrag.w - 4, x)))
    state.posY = Math.round(Math.max(widgetTopBound(), Math.min(window.innerHeight - widgetDrag.h - 4, y)))
    applyWidgetPosition()
  }

  function onPointerUp(event) {
    var moved = Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY)
    if (widgetDrag !== null && event.pointerId === widgetDrag.id) {
      try { if (button.releasePointerCapture) button.releasePointerCapture(event.pointerId) } catch (e) {}
      try { button.removeAttribute('data-dragging') } catch (e) {}
      try { document.body.style.cursor = '' } catch (e) {}
      widgetDrag = null
      if (moved > 4) {
        widgetJustDragged = true
        schedulePersist()
      }
    }
    if (moved > 4) {
      event.preventDefault()
      event.stopPropagation()
    }
  }


  function onDocMouseDown(event) {
    if (!isOpen()) return
    if (root.contains(event.target)) return
    setOpen(false)
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return
    if (!isOpen()) return
    setOpen(false)
    button.focus()
  }

  
  // -------------------------------------------------------- live reload
  //
  // The desktop shell has no address bar and no refresh affordance, so this half
  // reloads the page itself when a new build of this file appears on the Host.
  // That is what makes iterating on the plugin possible without quitting the whole
  // application every time.
  //
  // Guarded so a bug in the version feed can never turn into a reload loop: an
  // unreasonably recent reload count disarms the watcher instead of reloading.
  var RELOAD_COUNT_KEY = 'dsh-theme-button.reload-count.v1'
  var RELOAD_WINDOW_MS = 10000
  var RELOAD_MAX = 3

  function startLiveReload(currentVersion) {
    var known = currentVersion
    var check = function () {
      try {
        if (typeof window.fetch !== 'function') return
        window.fetch('/dsh-theme-button/version', { method: 'GET' }).then(function (res) {
          return res && res.json ? res.json() : null
        }).then(function (data) {
          var version = data && data.version
          if (!version || typeof version !== 'string') return
          if (known === null) { known = version; return }
          if (version === known) return
          // Back off if we have already reloaded several times very recently.
          var count = 0
          try {
            var raw = window.localStorage.getItem(RELOAD_COUNT_KEY)
            if (raw) {
              var parsed = JSON.parse(raw)
              if (parsed && typeof parsed.at === 'number' && Date.now() - parsed.at < RELOAD_WINDOW_MS) {
                count = Number(parsed.count) || 0
              }
            }
          } catch (e) { noteIssue('l1748', e) }
          if (count >= RELOAD_MAX) return
          try {
            window.localStorage.setItem(RELOAD_COUNT_KEY, JSON.stringify({ at: Date.now(), count: count + 1 }))
          } catch (e) { noteIssue('l1752', e) }
          known = version
          try { window.location.reload() } catch (e) { noteIssue('l1754', e) }
        }).catch(function () {})
      } catch (e) { noteIssue('l1756', e) }
    }
    window.setInterval(check, 2500)
  }

  // ---------------------------------------------------------------- probe
  //

  // ------------------------------------------------- title-bar anchoring
  //
  // The button belongs in the conversation column's title bar, and its top edge
  // is the line that separates that title from the conversation. Rather than
  // hard-coding a pixel offset or guessing at generated class names, measure the
  // real layout: find the conversation-title text row near the top of the right
  // region, then walk up to the container that is the title bar itself. The
  // container's bottom edge IS that divider line.
  //
  // Measured 10px below it, so the button sits under the line instead of
  // colliding with the window controls in the top-right corner.

  // Vertical clearance kept between the line and the button's top edge. Kept
  // comfortably above a hairline so the button never reads as sitting on the line.
  // ---------------------------------------------------------------- placement
  //
  // The requirement, in the words it was given: the conversation column shows the
  // conversation name at its top, and a line separates that title from the
  // conversation. The button's TOP EDGE is that line, plus a suitable distance.
  //
  // So placement is a single, deterministic rule:
  //     button top = bottom edge of the line + GAP
  // with GAP equal to the button's horizontal distance from the right edge, so the
  // button reads as sitting in the top-right corner with even margins.
  //
  // The line is identified by geometry alone (a hairline that spans the
  // conversation column in the upper part of the viewport); the lowest such
  // candidate wins, so the button can never end up on top of the line. Until the
  // line has been located, the button stays invisible rather than showing at a
  // guessed position and visibly jumping afterwards -- that is what makes a fresh
  // launch look stationary.

  var GAP_BELOW_DIVIDER = 18

  function isVis(rect) {
    return rect.width > 0 && rect.height > 0
  }

  function isElementVisible(el) {
    try {
      var cs = window.getComputedStyle(el)
      if (!cs) return true
      if (cs.visibility === 'hidden' || cs.display === 'none') return false
      if (Number(cs.opacity) === 0) return false
      return true
    } catch (e) {
      return true
    }
  }

  // The divider line: a hairline that separates the conversation title from the
  // conversation content. Found geometrically, never by class name.
  // Locate the top of the conversation column's content, which is the line the
  // button's top edge follows. Three attempts, most reliable first:
  //   1. an explicit hairline element that spans the column;
  //   2. the top edge of the conversation content container;
  //   3. a constant derived from the reserved window-control strip.
  // A value is always returned, so the button is never left hidden.
  // The divider line: a hairline that separates the conversation title from the
  // conversation content. Found geometrically, never by class name.
  //
  // Picking the lowest hairline on the page is not safe: any other rule that happens to
  // be wider than 30% of the window becomes a candidate too, and whichever of them sits
  // lowest wins -- which drags the button down the page. The divider is instead pinned
  // to the content container it introduces: only rules that stop at or above that
  // container, and span it, are considered at all. Everything below it is content.
  // Three attempts, most reliable first:
  //   1. a rule that spans the conversation column and does not start below its content;
  //   2. the top edge of that content container;
  //   3. a constant derived from the reserved window-control strip.
  // A value is always returned, so the button is never left hidden.
  function findDividerBottom() {
    var lines = []
    var contentTops = []
    var vw = window.innerWidth
    var vh = window.innerHeight
    try {
      var strip = titlebarClearance()
      var lower = Math.max(20, (strip === null ? 0 : strip) - 6)
      var nodes = document.querySelectorAll('body div, body section, body hr')
      var cap = Math.min(nodes.length, 4000)
      for (var i = 0; i < cap; i++) {
        var el = nodes[i]
        var rect = el.getBoundingClientRect()
        if (!isVis(rect)) continue
        if (rect.width < vw * 0.3) continue
        if (rect.bottom <= 0 || rect.top > vh * 0.6) continue
        var cs = null
        try { cs = window.getComputedStyle(el) } catch (e) { noteIssue('l2133', e) }
        if (!cs) continue
        if (!isElementVisible(el)) continue
        if (rect.height <= 6) {
          var bg = cs.backgroundColor
          var hasFill = !!bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)'
          var bwTop = parseFloat(cs.borderTopWidth) || 0
          var bwBottom = parseFloat(cs.borderBottomWidth) || 0
          var hasTopBorder = bwTop >= 0.5 && cs.borderTopStyle && cs.borderTopStyle !== 'none'
          var hasBottomBorder = bwBottom >= 0.5 && cs.borderBottomStyle && cs.borderBottomStyle !== 'none'
          if ((hasFill || hasTopBorder || hasBottomBorder) && rect.top >= lower) {
            lines.push({
              left: rect.left, right: rect.right, top: rect.top,
              at: hasTopBorder ? rect.top : rect.bottom,
            })
          }
          continue
        }
        // Where the conversation content starts. Recorded, never chosen directly:
        // the content container can begin above the rule it sits below.
        if (el.children && el.children.length > 0) {
          if (rect.height >= 200 && rect.width >= vw * 0.4) {
            if (rect.left >= vw * 0.15 && rect.top >= lower && rect.top <= vh * 0.6) {
              contentTops.push({ top: rect.top, left: rect.left, right: rect.right })
            }
          }
        }
      }
    } catch (e) { noteIssue('l2157', e) }
    // The container that the chosen rule introduces: its top must lie strictly below the
    // rule, otherwise it is an ancestor that merely spans it and its top is not the line
    // the button should hang from.
    var anchor = null
    for (var t = 0; t < contentTops.length; t++) {
      var box = contentTops[t]
      if (anchor === null) {
        anchor = box
        continue
      }
      if (box.top > anchor.top) anchor = box
    }
    if (anchor && lines.length > 0) {
      var tol = 8
      var best = null
      for (var n = 0; n < lines.length; n++) {
        var ln = lines[n]
        if (ln.left > anchor.left + tol || ln.right < anchor.right - tol) continue
        if (ln.at > anchor.top + tol) continue
        if (best === null || ln.at > best) best = ln.at
      }
    }
    if (anchor) return Math.round(anchor.top)
    if (lines.length > 0) {
      var low = lines[0].at
      for (var m = 1; m < lines.length; m++) { if (lines[m].at > low) low = lines[m].at }
      return low
    }
    var clearance = titlebarClearance()
    return clearance === null ? FALLBACK_TOP : Math.round(clearance + 44)
  }
  // The shell publishes the strip it reserved for the window controls
  // (`--dsh-windows-titlebar-height`). It is only meaningful while that strip is
  // actually reserved: in fullscreen the shell drops `data-windows-titlebar`.
  var TITLEBAR_ATTRIBUTE = 'data-windows-titlebar'
  var FALLBACK_TOP = 76


  function titlebarClearance() {
    try {
      if (!document.documentElement.hasAttribute(TITLEBAR_ATTRIBUTE)) return null
      var cs = window.getComputedStyle(document.documentElement)
      if (!cs) return null
      var px = parseFloat(cs.getPropertyValue('--dsh-windows-titlebar-height'))
      if (!(px > 0)) return null
      return px
    } catch (e) {
      return null
    }
  }

  function applyTop(anchor) {
    var dividerTop = anchor && anchor.dividerTop !== null && anchor.dividerTop !== undefined
      ? anchor.dividerTop
      : null
    var top
    if (dividerTop !== null) {
      top = Math.round(dividerTop + GAP_BELOW_DIVIDER)
    } else {
      // findDividerBottom always reports a value, so this only guards a future
      // regression. It still places the button clear of the window controls.
      var clearance = titlebarClearance()
      top = clearance === null ? FALLBACK_TOP : Math.round(clearance + 44)
    }
    try {
      root.style.setProperty('--dstb-top', top + 'px')
      root.setAttribute('data-dstb-place', JSON.stringify({
        dividerTop: dividerTop,
        top: top,
        gap: GAP_BELOW_DIVIDER,
        vh: window.innerHeight,
      }))
    } catch (e) { noteIssue('l2211', e) }
    return true
  }

  // The button stays out of sight until the line has been located, so a fresh
  // launch never shows it at a guessed position that then corrects itself.
  function revealButton() {
    try { root.removeAttribute('data-dstb-pending') } catch (e) { noteIssue('l2218', e) }
  }

  var anchorTimer = null
  var scheduled = false

  // Drop any pending measurement so the next one re-reads the current layout.
  function resetAnchor() {
    if (anchorTimer !== null) {
      try { window.clearTimeout(anchorTimer) } catch (e) { noteIssue('l2227', e) }
      anchorTimer = null
    }
    scheduled = false
    scheduleAnchorMeasure()
  }

  // The line is not always painted on the very first frame, so it is probed for a
  // short while. The button stays hidden until the line has been located, and once
  // that happens it is left alone -- no repeated re-measuring that could make it
  // drift. If the line never shows up, the button is revealed at the fallback
  // position rather than staying invisible forever.
  function scheduleAnchorMeasure() {
    if (scheduled) return
    scheduled = true
    var attempts = 0
    var maxAttempts = 30
    var settle = function () {
      // Always reveal: a placement with a good-enough anchor beats an invisible
      // button, and findDividerBottom always reports something.
      revealButton()
      scheduled = false
    }
    var measure = function () {
      var dividerTop = findDividerBottom()
      if (dividerTop !== null && dividerTop !== undefined) {
        applyTop({ dividerTop: dividerTop })
        settle()
        return
      }
      attempts += 1
      if (attempts < maxAttempts) {
        anchorTimer = window.setTimeout(measure, 50)
        return
      }
      applyTop(null)
      settle()
    }
    anchorTimer = window.setTimeout(measure, 30)
  }

  function onWindowResize() {
    // Re-clamping is all a resize needs: the widget keeps its spot unless the window shrank
    // past it. Nothing is measured, so nothing can drift.
    applyWidgetPosition()
  }

  // Window mode changes (fullscreen in and out) drop the reserved title-bar strip,
  // so the previous measurement is stale: drop it and measure again.
  function onFullscreenChange() {
    applyWidgetPosition()
  }

  button.addEventListener('click', onButtonClick)
  button.addEventListener('pointerdown', onPointerDown)
  button.addEventListener('pointerup', onPointerUp)
  button.addEventListener('pointermove', onPointerMove)
  document.addEventListener('mousedown', onDocMouseDown, true)
  document.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('resize', onWindowResize, true)
  try {
    document.addEventListener('fullscreenchange', onFullscreenChange, true)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange, true)
  } catch (e) { noteIssue('l2287', e) }

  initSliders()
  applyBackgroundState()
  watchEffectSettle()
  applyWidgetPosition()

  // -------------------------------------------------------------- teardown

  function dispose() {
    releaseThemeGuard()
    if (anchorTimer !== null) {
      try { window.clearTimeout(anchorTimer) } catch (e) { noteIssue('l2298', e) }
      anchorTimer = null
    }
    document.removeEventListener('mousedown', onDocMouseDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('resize', onWindowResize, true)
    try {
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', onSystemSchemeChange)
        else if (mediaQuery.removeListener) mediaQuery.removeListener(onSystemSchemeChange)
      }
    } catch (e) { noteIssue('l2309', e) }
    try { document.documentElement.removeAttribute(WALLPAPER_ATTR) } catch (e) { noteIssue('l-disp-wp', e) }
    try { backdrop.parentNode && backdrop.parentNode.removeChild(backdrop) } catch (e) { noteIssue('l-disp-bd', e) }
    try { wallpaper.parentNode && wallpaper.parentNode.removeChild(wallpaper) } catch (e) { noteIssue('l-disp-wl', e) }
    try { effectStyle.parentNode && effectStyle.parentNode.removeChild(effectStyle) } catch (e) { noteIssue('l-disp-es', e) }
    try { root.parentNode && root.parentNode.removeChild(root) } catch (e) { noteIssue('l2310', e) }
    try { styleEl.parentNode && styleEl.parentNode.removeChild(styleEl) } catch (e) { noteIssue('l2311', e) }
    try {
      if (window.__dshThemeButtonDispose === dispose) delete window.__dshThemeButtonDispose
    } catch (e) { noteIssue('l2314', e) }
    return true
  }

  window.__dshThemeButtonDispose = dispose
  return dispose
})()