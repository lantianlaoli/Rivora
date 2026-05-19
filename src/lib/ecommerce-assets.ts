import { callOpenRouter } from "./openrouter";
import type {
  EcommerceCreativeBrief,
  EcommerceImageSlot,
  EcommerceTextLanguage,
} from "./types";

type PromptSlot = Pick<EcommerceImageSlot, "kind" | "index" | "title" | "prompt">;

function languageInstruction(textLanguage: EcommerceTextLanguage) {
  if (textLanguage === "zh") {
    return "使用简洁中文可见文案。文字必须少、短、易读，不要大段说明，不要中英混排。";
  }
  return "Use concise English text only. Keep visible text minimal, short, readable, and accurately spelled.";
}

function sellingPointText(brief: EcommerceCreativeBrief) {
  return brief.sellingPoints.filter(Boolean).slice(0, 5).join("; ") || "clean product presentation";
}

export function fallbackEcommerceBrief(textLanguage: EcommerceTextLanguage): EcommerceCreativeBrief {
  return {
    productCategory: textLanguage === "zh" ? "电商产品" : "ecommerce product",
    productIdentity:
      textLanguage === "zh"
        ? "用户上传照片中的真实产品，保持外观、比例、材质、颜色和可识别细节"
        : "the real product from the uploaded photo, preserving appearance, proportions, materials, colors, and recognizable details",
    materialsAndColors: textLanguage === "zh" ? "根据产品照片判断" : "infer from the product photo",
    sellingPoints:
      textLanguage === "zh"
        ? ["真实产品外观", "干净高级视觉", "突出核心卖点"]
        : ["true product appearance", "clean premium visuals", "clear selling points"],
    designLanguage:
      textLanguage === "zh"
        ? "干净、高级、留白充足的电商视觉，少文字，统一字体和柔和光影"
        : "clean premium ecommerce visuals with generous whitespace, minimal text, one font family, and soft studio lighting",
    carouselDirection:
      textLanguage === "zh"
        ? "统一风格的 1:1 轮播图，先白底主图，再展示场景和卖点"
        : "consistent 1:1 carousel images: white-background main image first, then hero and benefit visuals",
    detailDirection:
      textLanguage === "zh"
        ? "统一风格的 1:1 详情图，展示卖点、材质、使用场景和信任感"
        : "consistent 1:1 detail images showing benefits, materials, use cases, and trust cues",
    videoDirection:
      textLanguage === "zh"
        ? "15 秒 1:1 电商广告短片，产品展示、细节、卖点和最终英雄镜头"
        : "15-second 1:1 ecommerce ad with product reveal, macro details, benefits, and final hero shot",
  };
}

function normalizeBrief(value: Partial<EcommerceCreativeBrief> | null, textLanguage: EcommerceTextLanguage) {
  const fallback = fallbackEcommerceBrief(textLanguage);
  return {
    productCategory: value?.productCategory || fallback.productCategory,
    productIdentity: value?.productIdentity || fallback.productIdentity,
    materialsAndColors: value?.materialsAndColors || fallback.materialsAndColors,
    sellingPoints: Array.isArray(value?.sellingPoints) && value.sellingPoints.length ? value.sellingPoints : fallback.sellingPoints,
    designLanguage: value?.designLanguage || fallback.designLanguage,
    carouselDirection: value?.carouselDirection || fallback.carouselDirection,
    detailDirection: value?.detailDirection || fallback.detailDirection,
    videoDirection: value?.videoDirection || fallback.videoDirection,
  };
}

export async function analyzeProductForEcommerceAssets(
  productImageUrl: string,
  textLanguage: EcommerceTextLanguage
): Promise<EcommerceCreativeBrief> {
  const response = await callOpenRouter<Partial<EcommerceCreativeBrief>>(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Analyze the uploaded product photo for an ecommerce image and video asset generator.",
              "Return only JSON with these fields:",
              "productCategory, productIdentity, materialsAndColors, sellingPoints, designLanguage, carouselDirection, detailDirection, videoDirection.",
              "The creative direction must be clean, premium, low-text, product-led, and suitable for marketplace carousel/detail images.",
              `Visible text language for generated assets: ${textLanguage === "zh" ? "Chinese" : "English"}.`,
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: productImageUrl } },
        ],
      },
    ],
    { type: "json_object" }
  );
  return normalizeBrief(response, textLanguage);
}

function baseImagePrompt(brief: EcommerceCreativeBrief, textLanguage: EcommerceTextLanguage) {
  return [
    "Create one finished ecommerce product image using the uploaded product photo as the identity reference.",
    "Canvas/aspect ratio: 1:1.",
    "Preserve the exact product identity, proportions, materials, colors, structure, logo placement if present, and recognizable details.",
    "Use one unified design language across the full carousel and detail image set.",
    `Product category: ${brief.productCategory}.`,
    `Product identity: ${brief.productIdentity}.`,
    `Materials and colors: ${brief.materialsAndColors}.`,
    `Selling points: ${sellingPointText(brief)}.`,
    `Design language: ${brief.designLanguage}.`,
    languageInstruction(textLanguage),
    "Keep the overall image clean, premium, spacious, and product-led.",
    "Do not add fake brand logos, dense copy, clutter, watermarks, QR codes, pricing, badges, or unrelated props.",
  ].join("\n");
}

export function buildEcommerceImagePrompts(
  brief: EcommerceCreativeBrief,
  textLanguage: EcommerceTextLanguage
): PromptSlot[] {
  const base = baseImagePrompt(brief, textLanguage);
  return [
    {
      kind: "carousel",
      index: 1,
      title: textLanguage === "zh" ? "轮播图 1：白底主图" : "Carousel 1: White Main Image",
      prompt: [
        base,
        "Image role: carousel image 1.",
        "Use a pure white background, centered product, realistic soft shadow, accurate product scale, marketplace-ready composition.",
        "No headline, no decorative scene, no lifestyle background, and no large text.",
      ].join("\n"),
    },
    {
      kind: "carousel",
      index: 2,
      title: textLanguage === "zh" ? "轮播图 2：英雄卖点" : "Carousel 2: Hero Benefit",
      prompt: [
        base,
        `Carousel direction: ${brief.carouselDirection}.`,
        "Image role: carousel image 2. Create a premium hero composition that introduces the strongest selling point with very short text.",
      ].join("\n"),
    },
    {
      kind: "carousel",
      index: 3,
      title: textLanguage === "zh" ? "轮播图 3：场景氛围" : "Carousel 3: Lifestyle Context",
      prompt: [
        base,
        `Carousel direction: ${brief.carouselDirection}.`,
        "Image role: carousel image 3. Show the product in a clean use-context or studio scene that matches the same design system.",
      ].join("\n"),
    },
    {
      kind: "detail",
      index: 1,
      title: textLanguage === "zh" ? "详情图 1：核心卖点" : "Detail 1: Core Benefits",
      prompt: [
        base,
        `Detail direction: ${brief.detailDirection}.`,
        "Image role: detail image 1. Highlight the top benefits with minimal callouts and strong product focus.",
      ].join("\n"),
    },
    {
      kind: "detail",
      index: 2,
      title: textLanguage === "zh" ? "详情图 2：材质细节" : "Detail 2: Material Detail",
      prompt: [
        base,
        `Detail direction: ${brief.detailDirection}.`,
        "Image role: detail image 2. Use macro/detail composition to explain materials, craftsmanship, texture, or functional structure.",
      ].join("\n"),
    },
    {
      kind: "detail",
      index: 3,
      title: textLanguage === "zh" ? "详情图 3：使用信任" : "Detail 3: Use and Trust",
      prompt: [
        base,
        `Detail direction: ${brief.detailDirection}.`,
        "Image role: detail image 3. Show a clean scenario, scale, reliability, or purchase-confidence message without clutter.",
      ].join("\n"),
    },
  ];
}

export function buildEcommerceStoryboardPrompt(
  brief: EcommerceCreativeBrief,
  textLanguage: EcommerceTextLanguage
) {
  return [
    "Create a square 15-second ecommerce ad storyboard image for the uploaded product.",
    "Canvas/aspect ratio: 1:1.",
    "Use the product photo as the strict identity reference and preserve the exact product.",
    `Visible text language: ${textLanguage === "zh" ? "中文" : "English"}.`,
    "Storyboard structure: 6 clean beats in a grid: product reveal, macro detail, core benefit, use context, premium hero motion, final hero shot.",
    `Product category: ${brief.productCategory}.`,
    `Product identity: ${brief.productIdentity}.`,
    `Selling points: ${sellingPointText(brief)}.`,
    `Design language: ${brief.designLanguage}.`,
    `Video direction: ${brief.videoDirection}.`,
    "Keep typography sparse and polished. Do not add fake logos, dense text, prices, watermarks, or unrelated props.",
  ].join("\n");
}

export function buildEcommerceVideoPrompt(brief: EcommerceCreativeBrief, textLanguage: EcommerceTextLanguage) {
  const prompt = [
    "Create a 15-second square ecommerce product advertisement using the provided product photo and storyboard image as visual references.",
    "Use reference-image generation mode. Preserve the exact product appearance, proportions, materials, color, and recognizable details.",
    "Animate through these beats: product reveal, macro detail, core selling point, clean use context, premium hero motion, final hero shot.",
    `Visible text and any generated audio language: ${textLanguage === "zh" ? "Chinese" : "English"}.`,
    `Product category: ${brief.productCategory}.`,
    `Selling points: ${sellingPointText(brief)}.`,
    `Design language: ${brief.designLanguage}.`,
    `Video direction: ${brief.videoDirection}.`,
    "Use clean studio lighting, smooth camera motion, premium ecommerce pacing, and minimal on-screen text.",
    "Do not invent a different product, fake logo, price, watermark, or unrelated props.",
  ].join(" ");

  return prompt.length > 1800 ? `${prompt.slice(0, 1797)}...` : prompt;
}
