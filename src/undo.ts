export interface IUndoableAction<T> {
  do: T;
  undo: T;
}

export class UndoRedoList<T> {
  constructor(size: number, content: IUndoableAction<T>[] = []) {
    this._size = size;

    if (content.length > size) {
      console.warn(
        `Size of provided content (${content.length}) is larger than the maximum provided size (${size}).`,
        'Initializing content as empty.'
      );
      this._content = [];
    } else {
      this._content = content;
    }
  }

  toString(): string {
    return this._content.toString();
  }

  get size(): number {
    return this._size;
  }

  get length(): number {
    return this._content.length;
  }

  clear(): void {
    this._content = [];
  }

  push(actions: IUndoableAction<T>): void {
    if (this.length >= this.size) {
      this._content.pop();
    }
    this._content.push(actions);
  }

  pop(): IUndoableAction<T> | undefined {
    if (this.length === 0) {
      return undefined;
    }
    return this._content.pop();
  }

  shift(): IUndoableAction<T> | undefined {
    if (this.length === 0) {
      return undefined;
    }
    return this._content.shift();
  }

  private _content: IUndoableAction<T>[];
  private _size: number;
}

export class UndoManager<T> {
  constructor(actionHandler: (action: T) => void, memory = 10) {
    this._actionHandler = actionHandler;
    this._memory = memory;
    this._undoList = new UndoRedoList(memory);
    this._redoList = new UndoRedoList(memory);
  }

  do(action: IUndoableAction<T>): void {
    this._actionHandler(action.do);
    this._redoList.clear();
    this._undoList.push(action);
  }

  undo(): void {
    if (!this.hasUndo) {
      return;
    }
    const lastDoneAction = this._undoList.shift();
    this._redoList.push(lastDoneAction);
    this._actionHandler(lastDoneAction.undo);
  }

  redo(): void {
    if (!this.hasRedo) {
      return;
    }
    const lastUndoneAction = this._redoList.shift();
    this._undoList.push(lastUndoneAction);
    this._actionHandler(lastUndoneAction.do);
  }

  get memory(): number {
    return this._memory;
  }

  get hasUndo(): boolean {
    return this._undoList.length > 0;
  }

  get hasRedo(): boolean {
    return this._redoList.length > 0;
  }

  private _undoList: UndoRedoList<T>;
  private _redoList: UndoRedoList<T>;
  private _actionHandler: (action: T) => void;
  private _memory: number;
}

export default UndoManager;
