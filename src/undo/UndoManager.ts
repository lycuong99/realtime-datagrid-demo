import { serialAsyncExecutor } from "@/undo/serialAsyncExecutor";
import { createStore } from "@/undo/simplePubSub";

export type UndoEntry = {
  operation: () => void;
  reverseOperation: () => void;
  //check conflict
  hasUndoConflict?: () => boolean | Promise<boolean>;
  hasRedoConflict?: () => boolean | Promise<boolean>;
  // determines what gets removed when there are conflicts
  scopeName: string;
  // will be returned from subscribeToCanUndoRedoChange so you can display it in a tooltip next to the buttons (e.g "un-create item")
  description: string;
  reverseDescription: string;
};

export enum CHANGE_REASON {
  Do = "Do",
  Undo = "Undo",
  Redo = "Redo",
  NoChange = "NoChange",
  Conflict = "Conflict",
}

export type UndoRedoStatus = {
  canUndo: false | string;
  canRedo: false | string;
  canUndoChangeReason: CHANGE_REASON;
  canRedoChangeReason: CHANGE_REASON;
};
export type UndoManager = {
  do: (undoEntry: UndoEntry) => void;
  undo: () => void;
  redo: () => void;
  getStatus: () => UndoRedoStatus;
};

export function createUndoRedoManager(): UndoManager {
  const _pastStack: UndoEntry[] = [];
  const _futureStack: UndoEntry[] = [];

  const pubSubStore = createStore<UndoRedoStatus>(
    {
      canRedo: false,
      canUndo: false,
      canRedoChangeReason: CHANGE_REASON.NoChange,
      canUndoChangeReason: CHANGE_REASON.NoChange,
    },
    (a, b) =>
      a.canUndo === b.canUndo &&
      a.canRedo === b.canRedo &&
      a.canUndoChangeReason === b.canUndoChangeReason &&
      a.canRedoChangeReason === b.canRedoChangeReason
  );

  const executorQueue = serialAsyncExecutor();

  function updateStatus(changeReason = CHANGE_REASON.NoChange) {
    pubSubStore.set({
      canRedo: _futureStack.length > 0 ? _futureStack[_futureStack.length - 1].description : false,
      canUndo: _pastStack.length > 0 ? _pastStack[_pastStack.length - 1].description : false,
      canRedoChangeReason: changeReason,
      canUndoChangeReason: changeReason,
    });
  }

  return {
    do(undoEntry: UndoEntry) {
      undoEntry.operation();
      _pastStack.push(undoEntry);

      updateStatus(CHANGE_REASON.Do);
    },

    undo() {
      const entry = _pastStack.pop();
      console.log("UNDO", entry);
      if (!entry) return;

      entry.reverseOperation();
      _futureStack.push(entry);
      updateStatus(CHANGE_REASON.Undo);
    },

    redo() {
      const entry = _futureStack.pop();
      if (!entry) return;

      entry.operation();
      _pastStack.push(entry);
      updateStatus(CHANGE_REASON.Redo);
    },

    getStatus() {
      return pubSubStore.get();
    },
  };
}
