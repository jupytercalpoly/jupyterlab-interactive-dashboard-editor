import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';

import { Cell } from '@jupyterlab/cells';

import { UUID } from '@lumino/coreutils';

import { ArrayExt, toArray } from '@lumino/algorithm';

/**
 * Adds a random, unique ID to a notebook's metadata.
 *
 * @param notebook - the notebook to add an ID to.
 *
 * @returns - the notebook's ID.
 */
export function addNotebookId(notebook: NotebookPanel): string {
  const metadata: any | undefined = notebook.model.metadata.get('presto');
  let id: string;

  if (metadata !== undefined) {
    if (metadata.id !== undefined) {
      return metadata.id;
    }
    id = UUID.uuid4();
    notebook.model.metadata.set('presto', { ...metadata, id });
  } else {
    id = UUID.uuid4();
    notebook.model.metadata.set('presto', { id });
  }

  return id;
}

/**
 * Gets the unique ID of a notebook.
 *
 * @returns - the ID of the notebook, or undefined if it has none.
 */
export function getNotebookId(notebook: NotebookPanel): string | undefined {
  const metadata: any | undefined = notebook?.model.metadata.get('presto');
  if (metadata === undefined || metadata.id === undefined) {
    return undefined;
  }
  return metadata.id;
}

/**
 * Gets a notebook given its ID.
 *
 * @param id - the ID of the notebook to retrieve.
 *
 * @param tracker - the notebook tracker to search for the notebook in.
 *
 * @returns - the Notebook, or undefined if no notebook with that ID exists.
 */
export function getNotebookById(
  id: string,
  tracker: INotebookTracker
): NotebookPanel | undefined {
  return tracker.find((notebook) => getNotebookId(notebook) === id);
}

/**
 * Adds a random, unique ID to a notebook cell's metadata.
 *
 * @param notebook - the cell to add an ID to.
 *
 * @returns - the cell's ID.
 */
export function addCellId(cell: Cell): string {
  const metadata: any | undefined = cell.model.metadata.get('presto');
  let id: string;

  if (metadata !== undefined) {
    if (metadata.id !== undefined) {
      return metadata.id;
    }
    id = UUID.uuid4();
    cell.model.metadata.set('presto', { ...metadata, id });
  } else {
    id = UUID.uuid4();
    cell.model.metadata.set('presto', { id });
  }

  return id;
}

/**
 * Gets the unique ID of a cell.
 *
 * @returns - the ID of the cell, or undefined if it has none.
 */
export function getCellId(cell: Cell): string | undefined {
  const metadata: any | undefined = cell?.model.metadata.get('presto');
  if (metadata === undefined || metadata.id === undefined) {
    return undefined;
  }
  return metadata.id;
}

/**
 * Gets a cell given its ID.
 *
 * @param id - the ID of the cell to retrieve.
 *
 * @param tracker - the notebook tracker to search for the cell in.
 *
 * @returns - the Cell, or undefined if no cell with that ID exists.
 */
export function getCellById(
  id: string,
  tracker: INotebookTracker
): Cell | undefined {
  const notebooks = toArray(tracker.filter(() => true));
  for (const notebook of notebooks) {
    const cells = notebook.content.widgets;
    const value = ArrayExt.findFirstValue(
      cells,
      (cell) => getCellId(cell) === id
    );
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * Gets the path to a notebook given its ID.
 *
 * @param id - the ID of the notebook whose path is desired.
 *
 * @param notebookTracker - the notebook tracker to search for the notebook in.
 *
 * @returns - the path to the notebook, or undefined if it doesn't exist.
 */
export function getPathFromNotebookId(
  id: string,
  notebookTracker: INotebookTracker
): string | undefined {
  const notebook = notebookTracker.find(
    (notebook) => getNotebookId(notebook) === id
  );
  if (notebook === undefined) {
    return undefined;
  }
  return notebook.context.path;
}
