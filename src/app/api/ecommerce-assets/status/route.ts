import { NextResponse } from "next/server";
import { refreshEcommerceAssetsJob } from "@/lib/ecommerce-assets-workflow";
import type { EcommerceAssetsJob } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { job?: EcommerceAssetsJob };
    if (!body.job) {
      return NextResponse.json({ error: "job is required." }, { status: 400 });
    }

    const job = await refreshEcommerceAssetsJob(body.job);

    return NextResponse.json({ success: true, jobId: job.id, job });
  } catch (error) {
    console.error("[ecommerce-assets/status]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check ecommerce assets status." },
      { status: 500 }
    );
  }
}
