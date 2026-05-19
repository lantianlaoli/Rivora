import { NextResponse } from "next/server";
import { refreshEcommerceAssetsJob } from "@/lib/ecommerce-assets-workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });
    }

    const job = await refreshEcommerceAssetsJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, jobId, job });
  } catch (error) {
    console.error("[ecommerce-assets/status]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check ecommerce assets status." },
      { status: 500 }
    );
  }
}
