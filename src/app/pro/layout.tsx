"use client";

import { usePathname } from "next/navigation";
import Header from "./_components/Header";

const ProLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const showHeader = pathname !== "/pro";

  return (
    <section>
      {showHeader && <Header />}
      {children}
    </section>
  );
};

export default ProLayout;
