import type { NextRequest } from "next/server";
import { format } from "date-fns";
import { getSession } from "@/lib/session";
import { getBusinessProfile } from "@/lib/queries";
import { buildReport, isReportId } from "@/lib/reports";
import { reportToCsv, reportToPdf } from "@/lib/report-export";

// GET /api/reports/export?type=inventory-summary&format=csv|pdf
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const type = request.nextUrl.searchParams.get("type") ?? undefined;
  const fmt = request.nextUrl.searchParams.get("format");
  if (!isReportId(type)) return new Response("Unknown report", { status: 400 });
  if (fmt !== "csv" && fmt !== "pdf") return new Response("Format must be csv or pdf", { status: 400 });

  const report = await buildReport(type);
  const filename = `countbook-${report.id}-${format(new Date(), "yyyy-MM-dd")}.${fmt}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  if (fmt === "csv") {
    return new Response(reportToCsv(report), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const business = await getBusinessProfile();
  const pdf = reportToPdf(report, { businessName: business.name, generatedBy: session.name });
  return new Response(pdf, { headers: { ...headers, "Content-Type": "application/pdf" } });
}
