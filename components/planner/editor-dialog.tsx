"use client";
import { useReducer, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { editorFormReducer, type Editor } from "@/lib/editor";
import { usePlannerStore } from "@/providers/planner-provider";
import { AssignmentFields } from "./assignment-fields";
import { IdentityFields } from "./identity-fields";

const editorTitle = (editor: Editor | null) => {
  if (editor?.kind === "type")
    return editor.id ? "근무 타입 수정" : "새 근무 타입";
  if (editor?.kind === "employee")
    return editor.id ? "근무자 정보" : "새 근무자";
  return "일정 배정";
};

const EditorForm = ({ initial }: { initial: Editor }) => {
  const [{ draft, error }, dispatch] = useReducer(editorFormReducer, {
    draft: initial,
    error: "",
  });
  const saveEditor = usePlannerStore((state) => state.saveEditor);
  const removeEditor = usePlannerStore((state) => state.removeEditor);
  const close = usePlannerStore((state) => state.closeEditor);

  const changeDraft = (next: Editor) =>
    dispatch({ type: "change", draft: next });

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = saveEditor(draft);
    if (message) dispatch({ type: "error", message });
  };

  const canRemove =
    draft.kind === "assignment"
      ? draft.original && draft.category !== "off"
      : !!draft.id;

  return (
    <form
      className="flex flex-col gap-5 [&_input]:text-sm/normal [&_select]:text-sm/normal"
      onSubmit={save}
    >
      {draft.kind === "assignment" ? (
        <AssignmentFields editor={draft} onChange={changeDraft} />
      ) : (
        <IdentityFields editor={draft} onChange={changeDraft} />
      )}
      {error && (
        <p className="text-xs/normal text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="mt-0.5 flex items-center justify-end gap-2 max-[640px]:flex-wrap">
        {canRemove && (
          <button
            type="button"
            className="mr-auto border-0 bg-transparent text-[11px] text-danger max-[640px]:text-[10px]"
            onClick={() => removeEditor(draft)}
          >
            {draft.kind === "employee"
              ? "삭제 / 비활성화"
              : draft.kind === "assignment"
                ? "삭제 → 휴무"
                : "타입 삭제"}
          </button>
        )}
        <Button
          appearance="outline"
          size="sm"
          onClick={close}
          className="text-xs/normal"
        >
          취소
        </Button>
        <Button type="submit" size="sm" className="text-xs/normal">
          저장
        </Button>
      </div>
    </form>
  );
};

export const EditorDialog = () => {
  const editor = usePlannerStore((state) => state.editor);
  const close = usePlannerStore((state) => state.closeEditor);
  return (
    <Dialog
      open={!!editor}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={editorTitle(editor)}
      footer={<></>}
    >
      {editor && <EditorForm initial={editor} />}
    </Dialog>
  );
};
