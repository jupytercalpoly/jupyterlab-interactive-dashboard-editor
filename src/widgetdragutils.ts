/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * Detect if a drag event should be started. This is down if the
 * mouse is moved beyond a certain distance (DRAG_THRESHOLD).
 *
 * @param prevX - X Coordinate of the mouse pointer during the mousedown event
 * @param prevY - Y Coordinate of the mouse pointer during the mousedown event
 * @param nextX - Current X Coordinate of the mouse pointer
 * @param nextY - Current Y Coordinate of the mouse pointer
 */
export function shouldStartDrag(
  prevX: number,
  prevY: number,
  nextX: number,
  nextY: number
): boolean {
  const dx = Math.abs(nextX - prevX);
  const dy = Math.abs(nextY - prevY);
  return dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD;
}
