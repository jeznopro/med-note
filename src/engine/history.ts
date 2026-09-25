import type { Stroke } from '../types/document';

export type HistoryAction =
  | { type: 'ADD_STROKE'; stroke: Stroke }
  | { type: 'REMOVE_STROKES'; strokes: Stroke[] }
  | { type: 'CLEAR_PAGE'; previousStrokes: Stroke[] };

export class PageHistory {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];

  push(action: HistoryAction) {
    this.undoStack.push(action);
    this.redoStack = [];
    if (this.undoStack.length > 80) {
      this.undoStack.shift();
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(currentStrokes: Stroke[]): Stroke[] | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    let newStrokes = [...currentStrokes];

    if (action.type === 'ADD_STROKE') {
      newStrokes = newStrokes.filter((s) => s.id !== action.stroke.id);
    } else if (action.type === 'REMOVE_STROKES') {
      newStrokes.push(...action.strokes);
    } else if (action.type === 'CLEAR_PAGE') {
      newStrokes = [...action.previousStrokes];
    }

    this.redoStack.push(action);
    return newStrokes;
  }

  redo(currentStrokes: Stroke[]): Stroke[] | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    let newStrokes = [...currentStrokes];

    if (action.type === 'ADD_STROKE') {
      newStrokes.push(action.stroke);
    } else if (action.type === 'REMOVE_STROKES') {
      const removedIds = new Set(action.strokes.map((s) => s.id));
      newStrokes = newStrokes.filter((s) => !removedIds.has(s.id));
    } else if (action.type === 'CLEAR_PAGE') {
      newStrokes = [];
    }

    this.undoStack.push(action);
    return newStrokes;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
