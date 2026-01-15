"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 z-10 flex w-screen border-[#c33529] border-b-2 bg-white px-10 py-4">
      <Image
        className="max-w-[290px]"
        src="/inbound-holdings.svg"
        alt="Inbound Holdings"
        width={275}
        height={35}
      />
    </header>
  );
}
