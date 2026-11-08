"use client";

import { useReducer, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { canRemoveEditor, editorDeleteLabels, editorFormReducer, type Editor } from "@/lib/editor";
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

const EditorForm = ({ initial }: { initial: Editor; }) => {
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

    if (initial.kind === "type" && draft.kind === "type" && initial.id) {
      const hasChanges = initial.name.trim() !== draft.name.trim() ||
        initial.start !== draft.start || initial.end !== draft.end ||
        initial.color !== draft.color;

      if (hasChanges && !window.confirm(
        `‘${initial.name}’ 근무 타입을 변경하면 선택한 월에 이미 배정된 일정의 이름·시간·색상에 반영됩니다. 다른 월은 변경되지 않습니다. 변경할까요?`,
      )) return;
    }

    const message = saveEditor(draft);
    if (message) dispatch({ type: "error", message });
  };

  const remove = () => {
    if (!canRemoveEditor(draft)) return;

    let message = "";

    if (initial.kind === "employee") {
      message = `‘${initial.name}’ 근무자를 삭제하면 다른 월을 포함한 모든 일정과 근무자 명단에서 해당 근무자의 정보가 삭제됩니다. 삭제할까요?`;
    }

    if (initial.kind === "type") {
      message = `‘${initial.name}’ 근무 타입을 삭제하면 선택한 월의 새 일정 배정에 사용할 수 없습니다. 다른 월에는 영향을 주지 않으며 이미 배정된 일정은 마지막 이름·시간·색상으로 유지됩니다. 삭제할까요?`;
    }

    if (message && window.confirm(message)) removeEditor(draft);
  };

  const canRemove = canRemoveEditor(draft);

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
            onClick={remove}
          >
            {editorDeleteLabels[draft.kind]}
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
