"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePlannerStore } from "@/providers/planner-provider";

type StoreNameFormProps = { savedName: string };

const StoreNameForm = ({ savedName }: StoreNameFormProps) => {
  const [name, setName] = useState(savedName);

  const save = usePlannerStore((state) => state.saveStoreName);
  const saveState = usePlannerStore((state) => state.storeNameSave);
  const status = usePlannerStore((state) => state.storageStatus);
  const conflict = usePlannerStore((state) => state.conflict);
  const changed = name.trim() !== savedName;
  const disabled = status === "loading" || status === "blocked" || status === "saving" || saveState.saving;

  useEffect(() => {
    if (!changed) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);

    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [changed]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save(name);
  };

  return (
    <form onSubmit={submit} className="border-b border-line pb-5">
      <label className="mb-2 block text-[11px] text-content-secondary" htmlFor="store-name">
        매장 이름
      </label>
      <input
        id="store-name"
        value={name}
        required
        maxLength={80}
        disabled={disabled}
        placeholder="예: 00매장 00점"
        onChange={(event) => setName(event.target.value)}
        className="h-10 w-full rounded-[7px] border border-line bg-transparent px-3 text-xs text-content"
      />
      <button
        type="submit"
        disabled={disabled || conflict || !changed || !name.trim()}
        aria-busy={saveState.saving}
        className="mt-2 w-full rounded-md border border-line bg-canvas py-2 text-[11px] font-semibold text-content-secondary enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saveState.saving ? "저장 중…" : "매장 이름 저장"}
      </button>
      {saveState.error && <p role="alert" className="mt-2 text-[11px] text-danger">{saveState.error}</p>}
    </form>
  );
};

export const StoreSettings = () => {
  const savedName = usePlannerStore((state) => state.data.storeName ?? "나의 매장");

  return <StoreNameForm key={savedName} savedName={savedName} />;
};
