"use client";

import { EmployeeList } from "./employee-list";
import { StoreSettings } from "./store-settings";

export const OptionsSidebar = () => (
  <aside
    className="flex flex-col border-l border-line px-[18px] py-6 max-[1200px]:px-[13px] max-[1200px]:py-5 max-[960px]:col-span-full max-[960px]:grid max-[960px]:grid-cols-[220px_minmax(0,1fr)] max-[960px]:gap-6 max-[960px]:border-t max-[960px]:border-l-0 max-[640px]:flex max-[640px]:gap-5 max-[640px]:px-4 max-[640px]:py-5"
    aria-label="옵션 및 근무자"
  >
    <StoreSettings />
    <EmployeeList />
  </aside>
);
