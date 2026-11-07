import type { Category } from "./schedule";

export type AssignmentEditor = {
  kind: "assignment";
  date: string;
  employee: string;
  category: Category;
  typeId: string;
  original?: boolean;
  memo?: string;
};

export type EmployeeEditor = {
  kind: "employee";
  id?: string;
  name: string;
  color: string;
};

export type ShiftTypeEditor = {
  kind: "type";
  id?: string;
  name: string;
  start: string;
  end: string;
  color: string;
};

export type Editor = AssignmentEditor | EmployeeEditor | ShiftTypeEditor;

type EditorFormState = {
  draft: Editor;
  error: string;
};

type EditorFormAction =
  | { type: "change"; draft: Editor; }
  | { type: "error"; message: string; };

export const editorFormReducer = (
  state: EditorFormState,
  action: EditorFormAction,
): EditorFormState => {
  if (action.type === "change") {
    return { draft: action.draft, error: "" };
  }

  return { ...state, error: action.message };
};

export const canRemoveEditor = (editor: Editor) => {
  if (editor.kind === "assignment") {
    return false;
  }

  return Boolean(editor.id);
};

export const editorDeleteLabels: Record<Editor["kind"], string> = {
  employee: "삭제",
  assignment: "삭제 → 휴무",
  type: "타입 삭제",
};
