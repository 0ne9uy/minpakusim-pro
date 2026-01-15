// src/app/pro/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";

function ProTopContent() {
  const router = useRouter();

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#f3f3f3] p-6">
      <div className="max-w-md space-y-8 text-center">
        {/* ロゴ */}
        <div className="flex items-center justify-center">
          <img src="/inbound-holdings.svg" alt="Inbound Holdings" className="h-9" />
        </div>

        {/* メッセージ */}
        <div className="space-y-2 text-gray-700">
          <p className="text-base">ご利用いただきありがとうございます。</p>
          <p className="text-base">物件の状態をお教えください。</p>
        </div>

        {/* ボタン群 - 横並び、色#18181B */}
        <div className="flex flex-row items-center justify-center gap-8">
          <button
            type="button"
            className="rounded text-sm font-medium text-white transition-colors"
            style={{
              height: "36px",
              padding: "0px 16px",
              backgroundColor: "#18181B",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2a2a2d"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#18181B"; }}
            onClick={() => {
              localStorage.setItem("proSourcePage", "new");
              router.push("/pro/new");
            }}
          >
            これから建築
          </button>

          <button
            type="button"
            className="rounded text-sm font-medium text-white transition-colors"
            style={{
              height: "36px",
              padding: "0px 16px",
              backgroundColor: "#18181B",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2a2a2d"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#18181B"; }}
            onClick={() => {
              localStorage.setItem("proSourcePage", "existing");
              router.push("/pro/existing");
            }}
          >
            既存の物件
          </button>

          <button
            type="button"
            className="rounded text-sm font-medium text-white transition-colors"
            style={{
              height: "36px",
              padding: "0px 16px",
              backgroundColor: "#18181B",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2a2a2d"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#18181B"; }}
            onClick={() => {
              localStorage.setItem("proSourcePage", "import");
              router.push("/pro/import");
            }}
          >
            CSVをインポート
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ProTop() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProTopContent />
    </Suspense>
  );
}
