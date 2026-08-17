/** Raw ANSI/VT sequences used to paint and reserve the sticky box. */

const ESC = '\x1b';
const CSI = `${ESC}[`;

export const RESET = `${CSI}0m`;
export const RED = `${CSI}31m`;
export const DIM = `${CSI}2m`;
export const BOLD = `${CSI}1m`;
export const CYAN = `${CSI}36m`;
export const GREEN = `${CSI}32m`;

/** Palette of the box itself; 256-color so it stays readable on either terminal theme. */
export const COLOR = {
  border: `${CSI}38;5;39m`,
  title: `${CSI}1;38;5;45m`,
  head: `${CSI}38;5;250m`,
  leader: `${CSI}38;5;240m`,
  tail: `${CSI}4;38;5;79m`,
} as const;

export const SAVE_CURSOR = `${ESC}7`;
export const RESTORE_CURSOR = `${ESC}8`;
export const CLEAR_LINE = `${CSI}2K`;
export const RESET_SCROLL_REGION = `${CSI}r`;

/** Move the cursor to an absolute 1-based position. */
export function cursorTo(row: number, column = 1): string {
  return `${CSI}${row};${column}H`;
}

/** Shrink the scrollable area to `top`..`bottom`, freeing the lines below it. */
export function setScrollRegion(top: number, bottom: number): string {
  return `${CSI}${top};${bottom}r`;
}
