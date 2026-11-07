import { pdf } from "@react-pdf/renderer";
import { registerSchedulePdfFonts, SchedulePdf } from "@/components/pdf/schedule-pdf";
import type { SchedulePdfData } from "./schedule-pdf-data";

export const downloadSchedulePdf = async (data: SchedulePdfData) => {
  registerSchedulePdfFonts();

  const blob = await pdf(<SchedulePdf data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = data.filename;
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    // Give browsers time to consume the Blob before releasing its object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
};
