// Pro版専用のルートページ
// Pro版にリダイレクト

import { redirect } from "next/navigation";

export default function Home() {
  // Pro版にリダイレクト
  redirect("/pro");
}
