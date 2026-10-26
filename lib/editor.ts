import type { Category } from "./schedule";

export type AssignmentEditor = {
  kind: "assignment";
  date: string;
  employee: string;
  category: Category;
  typeId: string;
  original?: boolean;
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

type EditorFormState = { draft: Editor; error: string };
type EditorFormAction =
  { type: "change"; draft: Editor } | { type: "error"; message: string };

export const editorFormReducer = (
  state: EditorFormState,
  action: EditorFormAction,
): EditorFormState =>
  action.type === "change"
    ? { draft: action.draft, error: "" }
    : { ...state, error: action.message };
