"use client";
import { PanelHeading } from "./panel-heading";
import { useState } from "react";
import { useMonthSchedule } from "@/hooks/use-month-schedule";
import { colors, labels, type Category } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

export const EmployeeList = () => {
  const { employees, stats, target } = useMonthSchedule();
  const [search, setSearch] = useState("");
  const selected = usePlannerStore((state) => state.view.selected);
  const setSelected = usePlannerStore((state) => state.selectEmployee);
  const ready = usePlannerStore((state) => state.storageStatus !== "loading");
  const open = usePlannerStore((state) => state.openEditor);

  return (
    <div className="pt-[22px] max-[960px]:pt-0">
      <PanelHeading title="근무자" count={employees.length}>
        <button
          className="size-[26px] rounded-md border border-line bg-canvas text-xl/normal leading-5 text-content-secondary hover:bg-surface-hover"
          aria-label="근무자 추가"
          disabled={!ready}
          onClick={() =>
            open({
              kind: "employee",
              name: "",
              color: colors[employees.length % colors.length],
            })
          }
        >
          +
        </button>
      </PanelHeading>
      <p className="mt-[9px] mb-[19px] text-[10px] leading-[1.6] text-content-tertiary">
        이름을 누르면 개인 일정이 강조돼요.
      </p>
      <label className="mb-2 flex items-center gap-[7px] rounded-[7px] border border-line px-2.5 py-2">
        <span className="text-xl/normal leading-4 text-content-tertiary">
          ⌕
        </span>
        <input
          aria-label="근무자 검색"
          placeholder="근무자 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 w-full border-0 bg-transparent text-[11px] text-content outline-offset-[6px] placeholder:text-content-disabled"
        />
      </label>
      <div className="flex max-h-[510px] flex-col gap-[3px] overflow-y-auto p-[3px] max-[960px]:grid max-[960px]:max-h-[360px] max-[960px]:grid-cols-2">
        {stats
          .filter((e) => e.name.includes(search.trim()))
          .map((employee) => (
            <div
              key={employee.id}
              className="rounded-control border border-transparent px-[7px] py-[13px] data-[selected=true]:border-brand data-[selected=true]:bg-brand-subtle [&:not(:first-child)]:border-t-line max-[960px]:[&:not(:first-child)]:border-t-transparent"
              data-selected={selected === employee.id}
            >
              <div className="flex items-center gap-[5px]">
                <button
                  className="flex min-w-0 flex-1 items-center gap-[9px] border-0 bg-transparent text-left"
                  aria-pressed={selected === employee.id}
                  onClick={() =>
                    setSelected(selected === employee.id ? "" : employee.id)
                  }
                >
                  <span
                    className="grid size-[29px] shrink-0 place-items-center rounded-[10px] text-xs/normal font-semibold"
                    style={{
                      background: `${employee.color}18`,
                      color: employee.color,
                    }}
                  >
                    {employee.name.slice(0, 1)}
                  </span>
                  <strong className="text-xs/normal font-semibold [overflow-wrap:anywhere]">
                    {employee.name}
                  </strong>
                  {employee.until && (
                    <small className="text-[9px] text-content-tertiary">
                      비활성
                    </small>
                  )}
                </button>
                <button
                  className="ml-auto h-[26px] w-6 border-0 bg-transparent text-xl/normal text-content-tertiary"
                  aria-label={`${employee.name} 정보 수정`}
                  onClick={() =>
                    open({
                      kind: "employee",
                      id: employee.id,
                      name: employee.name,
                      color: employee.color,
                    })
                  }
                >
                  ⋯
                </button>
              </div>
              <div className="mt-[13px] ml-[38px] grid grid-cols-4 gap-[5px] max-[1200px]:ml-0 max-[960px]:ml-[38px] max-[640px]:ml-0">
                {(Object.keys(labels) as Category[]).map((category) => (
                  <div
                    key={category}
                    className="group/count flex flex-col gap-[5px]"
                    data-warning={
                      category === "off" && employee.counts.off !== target
                    }
                  >
                    <span className="text-[9px] text-content-tertiary min-[1600px]:text-[10px]">
                      {labels[category]}
                    </span>
                    <b className="text-xs/normal font-semibold whitespace-nowrap group-data-[warning=true]/count:font-bold group-data-[warning=true]/count:text-danger">
                      {employee.counts[category]}
                      <small className="text-[9px] font-normal text-content-tertiary group-data-[warning=true]/count:font-bold group-data-[warning=true]/count:text-danger">
                        {category === "off" ? ` / ${target}` : ""}
                      </small>
                    </b>
                  </div>
                ))}
              </div>
            </div>
          ))}
        {!employees.length && (
          <div className="py-6 text-center text-[11px] leading-[1.9] text-content-tertiary">
            아직 등록된 근무자가 없어요.
            <br />+ 버튼으로 팀원을 추가하세요.
          </div>
        )}
        {employees.length > 0 &&
          !stats.some((e) => e.name.includes(search.trim())) && (
            <p className="py-6 text-center text-[11px] leading-[1.9] text-content-tertiary">
              검색 결과가 없어요.
            </p>
          )}
      </div>
      <button
        className="mt-3 min-h-9 w-full rounded-[7px] border border-dashed border-line bg-transparent text-[11px] text-content-secondary hover:bg-canvas-subtle"
        disabled={!ready}
        onClick={() =>
          open({
            kind: "employee",
            name: "",
            color: colors[employees.length % colors.length],
          })
        }
      >
        + 근무자 추가
      </button>
    </div>
  );
};
