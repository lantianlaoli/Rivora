import JSZip from "jszip";
import { NextResponse } from "next/server";
import type { EcommerceAssetsJob } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function safeName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "asset";
}

function extensionFromContentType(contentType: string | null, fallback: "png" | "mp4") {
  if (contentType?.includes("jpeg")) return "jpg";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("mp4")) return "mp4";
  if (contentType?.includes("quicktime")) return "mov";
  return fallback;
}

async function addRemoteFile(zip: JSZip, folder: string, name: string, url: string, fallback: "png" | "mp4") {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const contentType = response.headers.get("content-type");
    const bytes = await response.arrayBuffer();
    zip.file(`${folder}/${safeName(name)}.${extensionFromContentType(contentType, fallback)}`, bytes);
  } catch (error) {
    zip.file(
      `errors/${safeName(name)}.txt`,
      `Failed to fetch ${url}\n${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { job?: EcommerceAssetsJob };
    if (!body.job) {
      return NextResponse.json({ error: "job is required." }, { status: 400 });
    }

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ exportedAt: new Date().toISOString(), job: body.job }, null, 2));

    for (const slot of body.job.carouselImages) {
      if (slot.resultUrl) await addRemoteFile(zip, "carousel", `${slot.index}-${slot.title}`, slot.resultUrl, "png");
    }
    for (const slot of body.job.detailImages) {
      if (slot.resultUrl) await addRemoteFile(zip, "detail", `${slot.index}-${slot.title}`, slot.resultUrl, "png");
    }
    if (body.job.video.resultUrl) {
      await addRemoteFile(zip, "video", "ecommerce-ad-video", body.job.video.resultUrl, "mp4");
    }

    const archive = await zip.generateAsync({ type: "arraybuffer" });
    return new Response(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="ecommerce-assets.zip"',
      },
    });
  } catch (error) {
    console.error("[ecommerce-assets/zip]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export ecommerce assets zip." },
      { status: 500 }
    );
  }
}
