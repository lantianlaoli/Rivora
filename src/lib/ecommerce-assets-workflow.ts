import {
  analyzeProductForEcommerceAssets,
  buildEcommerceImagePrompts,
  buildEcommerceStoryboardPrompt,
  buildEcommerceVideoPrompt,
  fallbackEcommerceBrief,
} from "./ecommerce-assets";
import {
  addEcommerceAssetsJob,
  generateEcommerceAssetsJobId,
  getEcommerceAssetsJob,
  updateEcommerceAssetsJob,
} from "./ecommerce-assets-store";
import {
  createKieImageTask,
  createKieSeedanceVideoTask,
  getKieTaskStatus,
  uploadKieImage,
} from "./kie";
import type {
  EcommerceAssetsJob,
  EcommerceCreativeBrief,
  EcommerceImageSlot,
  EcommerceSlotStatus,
  EcommerceTextLanguage,
} from "./types";

function normalizeTextLanguage(value: unknown): EcommerceTextLanguage {
  return value === "zh" ? "zh" : "en";
}

function isTerminal(status: EcommerceSlotStatus) {
  return status === "success" || status === "fail";
}

function overallStatus(job: EcommerceAssetsJob): EcommerceAssetsJob["status"] {
  const imageSlots = [...job.carouselImages, ...job.detailImages];
  const allDone = imageSlots.every((slot) => isTerminal(slot.status)) && isTerminal(job.video.status);
  if (allDone) return imageSlots.some((slot) => slot.status === "fail") || job.video.status === "fail" ? "failed" : "completed";
  if (job.error) return "failed";
  return "processing";
}

async function createImageSlots(input: {
  brief: EcommerceCreativeBrief;
  productImageUrl: string;
  textLanguage: EcommerceTextLanguage;
}) {
  const promptSlots = buildEcommerceImagePrompts(input.brief, input.textLanguage);
  const slots: EcommerceImageSlot[] = [];

  for (const promptSlot of promptSlots) {
    const taskId = await createKieImageTask({
      prompt: promptSlot.prompt,
      inputUrls: [input.productImageUrl],
      aspectRatio: "1:1",
      resolution: "2K",
    });
    slots.push({
      id: `${promptSlot.kind}-${promptSlot.index}`,
      kind: promptSlot.kind,
      index: promptSlot.index,
      title: promptSlot.title,
      taskId,
      status: "waiting",
      prompt: promptSlot.prompt,
    });
  }

  return {
    carouselImages: slots.filter((slot) => slot.kind === "carousel"),
    detailImages: slots.filter((slot) => slot.kind === "detail"),
  };
}

export async function createEcommerceAssetsJob(input: {
  productPhotoDataUrl: string;
  textLanguage?: unknown;
}) {
  const textLanguage = normalizeTextLanguage(input.textLanguage);
  const jobId = generateEcommerceAssetsJobId();
  const now = Date.now();
  let job: EcommerceAssetsJob = {
    id: jobId,
    status: "preparing",
    textLanguage,
    carouselImages: [],
    detailImages: [],
    video: {
      status: "waiting",
      prompt: "",
    },
    createdAt: now,
    updatedAt: now,
  };
  addEcommerceAssetsJob(job);

  try {
    const productImageUrl = await uploadKieImage(
      input.productPhotoDataUrl,
      `ecommerce-product-${jobId}.jpg`,
      "rivora/ecommerce-assets"
    );
    let brief: EcommerceCreativeBrief;
    try {
      brief = await analyzeProductForEcommerceAssets(productImageUrl, textLanguage);
    } catch (error) {
      console.error("[ecommerce-assets] Falling back after product analysis failed:", error);
      brief = fallbackEcommerceBrief(textLanguage);
    }

    const imageSlots = await createImageSlots({ brief, productImageUrl, textLanguage });
    const storyboardPrompt = buildEcommerceStoryboardPrompt(brief, textLanguage);
    const storyboardTaskId = await createKieImageTask({
      prompt: storyboardPrompt,
      inputUrls: [productImageUrl],
      aspectRatio: "1:1",
      resolution: "2K",
    });

    job = {
      ...job,
      status: "processing",
      productImageUrl,
      brief,
      ...imageSlots,
      video: {
        storyboardTaskId,
        status: "waiting",
        prompt: buildEcommerceVideoPrompt(brief, textLanguage),
      },
      updatedAt: Date.now(),
    };
    addEcommerceAssetsJob(job);
    return job;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create ecommerce assets job.";
    const failedJob = {
      ...job,
      status: "failed" as const,
      error: message,
      updatedAt: Date.now(),
    };
    addEcommerceAssetsJob(failedJob);
    throw error;
  }
}

async function refreshImageSlot(slot: EcommerceImageSlot): Promise<EcommerceImageSlot> {
  if (isTerminal(slot.status) || !slot.taskId) return slot;
  const status = await getKieTaskStatus(slot.taskId);
  if (status.status === "success") {
    return { ...slot, status: "success", resultUrl: status.resultUrl };
  }
  if (status.status === "fail") {
    return { ...slot, status: "fail", error: status.error || "Image generation failed." };
  }
  return { ...slot, status: status.status };
}

export async function refreshEcommerceAssetsJob(jobId: string) {
  const currentJob = getEcommerceAssetsJob(jobId);
  if (!currentJob) return undefined;

  const carouselImages = await Promise.all(currentJob.carouselImages.map(refreshImageSlot));
  const detailImages = await Promise.all(currentJob.detailImages.map(refreshImageSlot));
  let video = { ...currentJob.video };

  if (video.storyboardTaskId && !video.storyboardUrl && video.status !== "fail") {
    const storyboardStatus = await getKieTaskStatus(video.storyboardTaskId);
    if (storyboardStatus.status === "success" && storyboardStatus.resultUrl) {
      video = { ...video, storyboardUrl: storyboardStatus.resultUrl, status: "processing" };
    } else if (storyboardStatus.status === "fail") {
      video = { ...video, status: "fail", error: storyboardStatus.error || "Storyboard generation failed." };
    } else {
      video = { ...video, status: storyboardStatus.status };
    }
  }

  if (
    video.storyboardUrl &&
    !video.taskId &&
    video.status !== "fail" &&
    currentJob.productImageUrl
  ) {
    const taskId = await createKieSeedanceVideoTask({
      prompt: video.prompt,
      referenceImageUrls: [currentJob.productImageUrl, video.storyboardUrl],
      aspectRatio: "1:1",
      resolution: "720p",
      duration: 15,
    });
    video = { ...video, taskId, status: "processing" };
  } else if (video.taskId && !isTerminal(video.status)) {
    const videoStatus = await getKieTaskStatus(video.taskId);
    if (videoStatus.status === "success" && videoStatus.resultUrl) {
      video = { ...video, status: "success", resultUrl: videoStatus.resultUrl };
    } else if (videoStatus.status === "fail") {
      video = { ...video, status: "fail", error: videoStatus.error || "Video generation failed." };
    } else {
      video = { ...video, status: videoStatus.status };
    }
  }

  return updateEcommerceAssetsJob(jobId, (job) => {
    const updated = {
      ...job,
      carouselImages,
      detailImages,
      video,
    };
    return { ...updated, status: overallStatus(updated) };
  });
}

export { getEcommerceAssetsJob, normalizeTextLanguage };
