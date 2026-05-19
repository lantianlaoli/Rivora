import Link from "next/link";
import { ArrowRight, Images, Layers3, Sparkles, Video } from "lucide-react";

const features = [
  {
    href: "/bulk-clone",
    title: "批量克隆照片",
    description: "从 XLSX 读取产品信息、参考图和行级要求，批量生成商品图并支持重生成与 ZIP 下载。",
    icon: Layers3,
    meta: "XLSX · 批量 · 图片",
  },
  {
    href: "/ecommerce-assets",
    title: "电商图片 + 视频素材一键生成",
    description: "上传一张产品照片，自动生成 3 张轮播图、3 张详情图和 1 条 1:1 广告短片。",
    icon: Sparkles,
    meta: "Image2 · Seedance 2 Fast · 1:1",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#10100f] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <p className="font-mono text-2xl font-semibold tracking-tight">Rivora</p>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            <Images size={15} aria-hidden="true" />
            <span>Commerce creative tools</span>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-100">
              <Video size={14} aria-hidden="true" />
              Product media generation
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              选择一个生成工作台
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              保留原有批量克隆照片流程，同时新增面向电商商品图和广告视频的一键生成入口。
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group flex min-h-[260px] flex-col justify-between rounded-lg border border-white/10 bg-white/[0.04] p-6 transition hover:border-lime-300/40 hover:bg-white/[0.07]"
                >
                  <div>
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-black/25 text-lime-100">
                      <Icon size={24} aria-hidden="true" />
                    </div>
                    <p className="mb-2 font-mono text-xs text-zinc-500">{feature.meta}</p>
                    <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{feature.description}</p>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-lime-100">
                    打开工作台
                    <ArrowRight size={17} aria-hidden="true" className="transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
