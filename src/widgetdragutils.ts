// import { each, IterableOrArrayLike } from '@lumino/algorithm';
import { Cell, ICodeCellModel } from '@jupyterlab/cells';
import { h, VirtualDOM } from '@lumino/virtualdom';
import * as nbformat from '@jupyterlab/nbformat';

/**
 * Constants for drag
 */

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;
/**
 * The class name added to drag images.
 */
const DRAG_IMAGE_CLASS = 'pr-dragImage';

/**
 * The class name added to singular drag images
 */
const SINGLE_DRAG_IMAGE_CLASS = 'pr-dragImage-singlePrompt';

/**
 * The class name added to the drag image cell content.
 */
const CELL_DRAG_CONTENT_CLASS = 'jp-dragImage-content';

/**
 * The class name added to the drag image cell content.
 */
const CELL_DRAG_PROMPT_CLASS = 'jp-dragImage-prompt';

/**
 * The class name added to the drag image cell content.
 */
const CELL_DRAG_MULTIPLE_BACK = 'jp-dragImage-multipleBack';

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

/**
 * Create an image for the cell(s) to be dragged
 *
 * @param activeCell - The cell from where the drag event is triggered
 * @param selectedCells - The cells to be dragged
 */
export function createCellDragImage(
  activeCell: Cell,
  selectedCells: nbformat.ICell[]
): HTMLElement {
  const count = selectedCells.length;
  let promptNumber: string;
  if (activeCell.model.type === 'code') {
    const executionCount = (activeCell.model as ICodeCellModel).executionCount;
    promptNumber = ' ';
    if (executionCount) {
      promptNumber = executionCount.toString();
    }
  } else {
    promptNumber = '';
  }

  const cellContent = activeCell.model.value.text.split('\n')[0].slice(0, 26);
  if (count > 1) {
    if (promptNumber !== '') {
      return VirtualDOM.realize(
        h.div(
          h.div(
            { className: DRAG_IMAGE_CLASS },
            h.span(
              { className: CELL_DRAG_PROMPT_CLASS },
              '[' + promptNumber + ']:'
            ),
            h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
          ),
          h.div({ className: CELL_DRAG_MULTIPLE_BACK }, '')
        )
      );
    } else {
      return VirtualDOM.realize(
        h.div(
          h.div(
            { className: DRAG_IMAGE_CLASS },
            h.span({ className: CELL_DRAG_PROMPT_CLASS }),
            h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
          ),
          h.div({ className: CELL_DRAG_MULTIPLE_BACK }, '')
        )
      );
    }
  } else {
    if (promptNumber !== '') {
      return VirtualDOM.realize(
        h.div(
          h.div(
            { className: `${DRAG_IMAGE_CLASS} ${SINGLE_DRAG_IMAGE_CLASS}` },
            h.span(
              { className: CELL_DRAG_PROMPT_CLASS },
              '[' + promptNumber + ']:'
            ),
            h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
          )
        )
      );
    } else {
      return VirtualDOM.realize(
        h.div(
          h.div(
            { className: `${DRAG_IMAGE_CLASS} ${SINGLE_DRAG_IMAGE_CLASS}` },
            h.span({ className: CELL_DRAG_PROMPT_CLASS }),
            h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
          )
        )
      );
    }
  }
}
