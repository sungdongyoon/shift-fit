import { PlannerProvider } from "@/providers/planner-provider";
import { PlannerHeader } from "@/components/planner/planner-header";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { StorageAlert } from "@/components/planner/storage-alert";
import { ShiftTypeSidebar } from "@/components/planner/shift-type-sidebar";
import { CalendarPanel } from "@/components/planner/calendar-panel";
import { OptionsSidebar } from "@/components/planner/options-sidebar";
import { EditorDialog } from "@/components/planner/editor-dialog";
import { PlannerToast } from "@/components/planner/planner-toast";

const AuthenticatedPlanner = async () => {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return (
    <PlannerProvider>
      <div className="min-h-screen bg-canvas-subtle font-[family-name:Arial,'Apple_SD_Gothic_Neo','Noto_Sans_KR',sans-serif] text-[13px] tracking-[-0.02em] text-content">
        <PlannerHeader email={user.email} />
        <main className="mx-auto max-w-[1920px] px-8 pt-[34px] pb-4 max-[1200px]:px-[18px] max-[1200px]:pt-[25px] max-[640px]:px-3 max-[640px]:pt-[22px] max-[640px]:pb-[15px]">
          <StorageAlert />
          <div className="grid min-h-[760px] grid-cols-[210px_minmax(0,1fr)_270px] overflow-hidden rounded-panel border border-line bg-canvas shadow-[0_4px_20px_#17171903] min-[1600px]:grid-cols-[230px_minmax(0,1fr)_300px] max-[1200px]:grid-cols-[174px_minmax(0,1fr)_235px] max-[960px]:grid-cols-[170px_minmax(0,1fr)] max-[640px]:flex max-[640px]:flex-col max-[640px]:rounded-xl">
            <ShiftTypeSidebar />
            <CalendarPanel />
            <OptionsSidebar />
          </div>
        </main>
        <EditorDialog />
        <PlannerToast />
      </div>
    </PlannerProvider>
  );
};

const Home = () => {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="grid min-h-dvh place-items-center bg-canvas-subtle text-sm text-content-secondary"
        >
          로그인 정보를 확인하고 있어요…
        </div>
      }
    >
      <AuthenticatedPlanner />
    </Suspense>
  );
};

export default Home;
