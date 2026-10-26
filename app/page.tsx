import { PlannerProvider } from "@/providers/planner-provider";
import { PlannerHeader } from "@/components/planner/planner-header";
import { PageHeading } from "@/components/planner/page-heading";
import { StorageAlert } from "@/components/planner/storage-alert";
import { ShiftTypeSidebar } from "@/components/planner/shift-type-sidebar";
import { CalendarPanel } from "@/components/planner/calendar-panel";
import { OptionsSidebar } from "@/components/planner/options-sidebar";
import { EditorDialog } from "@/components/planner/editor-dialog";
import { PlannerToast } from "@/components/planner/planner-toast";

const Home = () => (
  <PlannerProvider>
    <div className="min-h-screen bg-canvas-subtle font-[family-name:Arial,'Apple_SD_Gothic_Neo','Noto_Sans_KR',sans-serif] text-[13px] tracking-[-0.02em] text-content">
      <PlannerHeader />
      <main className="mx-auto max-w-[1920px] px-8 pt-[34px] pb-4 max-[1200px]:px-[18px] max-[1200px]:pt-[25px] max-[640px]:px-3 max-[640px]:pt-[22px] max-[640px]:pb-[15px]">
        <PageHeading />
        <StorageAlert />
        <div className="grid min-h-[760px] grid-cols-[210px_minmax(0,1fr)_270px] overflow-hidden rounded-panel border border-line bg-canvas shadow-[0_4px_20px_#17171903] min-[1600px]:grid-cols-[230px_minmax(0,1fr)_300px] max-[1200px]:grid-cols-[174px_minmax(0,1fr)_235px] max-[960px]:grid-cols-[170px_minmax(0,1fr)] max-[640px]:flex max-[640px]:flex-col max-[640px]:rounded-xl">
          <ShiftTypeSidebar />
          <CalendarPanel />
          <OptionsSidebar />
        </div>
        <div className="mt-[15px] flex justify-between text-[9px] text-content-tertiary max-[640px]:gap-3 max-[640px]:text-[8px]">
          <span className="first:text-[8px] first:tracking-[1.3px]">
            SHIFT FIT. TEAM HAPPY.
          </span>
          <span className="first:text-[8px] first:tracking-[1.3px]">
            데이터는 현재 브라우저에 저장돼요.
          </span>
        </div>
      </main>
      <EditorDialog />
      <PlannerToast />
    </div>
  </PlannerProvider>
);

export default Home;
