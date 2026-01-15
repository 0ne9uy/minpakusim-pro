"use client";

import { Suspense } from "react";
import Header from "../_components/Header";
import Sidebar from "../_components/Sidebar";

const ProLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="h-screen bg-[#FAFAFA]">
      <Header />
      <div className="flex max-h-screen gap-12 overflow-scroll overflow-y-scroll">
        <Suspense fallback={<div className="w-64 bg-white">Loading...</div>}>
          <Sidebar />
        </Suspense>
        {children}
      </div>
    </section>
  );
};

export default ProLayout;
