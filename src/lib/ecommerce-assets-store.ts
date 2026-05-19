import type { EcommerceAssetsJob } from "./types";

const ecommerceAssetsJobs = new Map<string, EcommerceAssetsJob>();

export function generateEcommerceAssetsJobId() {
  return `ecom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addEcommerceAssetsJob(job: EcommerceAssetsJob) {
  ecommerceAssetsJobs.set(job.id, job);
}

export function getEcommerceAssetsJob(jobId: string) {
  return ecommerceAssetsJobs.get(jobId);
}

export function updateEcommerceAssetsJob(jobId: string, updater: (job: EcommerceAssetsJob) => EcommerceAssetsJob) {
  const current = ecommerceAssetsJobs.get(jobId);
  if (!current) return undefined;
  const updated = updater({ ...current, updatedAt: Date.now() });
  ecommerceAssetsJobs.set(jobId, updated);
  return updated;
}
