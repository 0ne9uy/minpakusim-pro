// src/app/pro/_components/Sidebar.tsx
"use client";

import { AtSign, BookOpen, ChevronDown, ChevronRight, LineChart } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Tab = "overview" | "sales" | "expenses" | "profit";

const HOVER = "hover:bg-[#C33529] hover:text-white";
const ACTIVE = "bg-[#C33529] text-white";
const BASE = "block rounded px-2 py-1 text-sm transition-colors";

const RESULTS_ITEMS: { tab: Tab; label: string }[] = [
  { tab: "overview", label: "概要" },
  { tab: "sales", label: "売上" },
  { tab: "expenses", label: "支出" },
  { tab: "profit", label: "利益" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const [open, setOpen] = useState(true);

  const activeTab = (search.get("tab") as Tab) || "overview";
  const isResults = pathname === "/pro/results";

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(search.toString());
    params.set("tab", tab);
    router.replace(`/pro/results?${params.toString()}`, { scroll: false });
  };

  const navItem = (tab: Tab, label: string) => {
    const current = isResults && activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setTab(tab)}
        className={`${BASE} w-full text-left ${current ? ACTIVE : HOVER}`}
      >
        {label}
      </button>
    );
  };

  return (
    <aside className="flex h-full w-full max-w-[240px] flex-col px-4 pt-30 text-sm">
      {/* 建築プラン */}
      <Link
        href="/pro"
        className={`flex items-center justify-between rounded px-2 py-1.5 ${
          pathname === "/pro" ? ACTIVE : HOVER
        }`}
      >
        建築プラン
      </Link>

      {/* 売上シミュレーション */}
      <div className="mt-1">
        <Button
          variant="ghost"
          className={`w-full items-center justify-between px-2 text-left ${HOVER}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="sales-sim-submenu"
        >
          <span className="inline-flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            売上シミュレーション
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>

        {open && (
          <div id="sales-sim-submenu" className="mt-2 ml-2 space-y-1 border-l pl-3">
            {RESULTS_ITEMS.map((it) => (
              <div key={it.tab}>{navItem(it.tab, it.label)}</div>
            ))}
          </div>
        )}
      </div>

      {/* その他 */}
      <div className="mt-1 space-y-1">
        <Link
          href="/contact"
          className={`flex items-center justify-between rounded px-2 py-1.5 ${
            pathname === "/contact" ? ACTIVE : HOVER
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <AtSign className="h-4 w-4" />
            お問い合わせ
          </span>
          <ChevronRight className="h-4 w-4" />
        </Link>

        <Link
          href="/manual"
          className={`flex items-center rounded px-2 py-1.5 ${
            pathname === "/manual" ? ACTIVE : HOVER
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            マニュアル
          </span>
        </Link>
      </div>
    </aside>
  );
}
