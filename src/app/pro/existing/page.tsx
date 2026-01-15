// src/app/pro/page.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import FormWrapper from "../_components/FormWrapper";
import RoomTypesSection from "../_components/RoomTypesSection";
import { buildingAges } from "../lib/buildingAges";
import { buildingTypes } from "../lib/buildingTypes";
import { prefectures } from "../lib/prefectures";
import type { FormValues } from "../lib/types";
import AddressBuildingPlanSection from "./_components/AddressBuildingPlanSelection";

const STORAGE_KEY = "proData-existing";

// ローカルストレージから初期値を取得する関数
function getInitialValues(): FormValues {
  if (typeof window === "undefined") {
    // サーバーサイドの場合はデフォルト値を返す
    return {
      zipcode: "",
      prefecture: undefined,
      city: "",
      place: "",
      building: "",
      buildingType: undefined,
      isLaw: false,
      isRenewed: false,
      area: 0,
      coverage: 0,
      fsi: 0,
      commonAreaRatio: 0,
      exclusiveAreaRatio: 0,
      rent: 0,
      ageType: undefined,
      planName: "",
      roomTypes: [
        {
          name: "",
          ratio: 0,
          roomArea: 0,
          computedRooms: 0,
          capacity: 0,
          beds: 0,
          cleaningUnitPrice: 0,
          consumablesPerNight: 0,
          lodgingUnitPrice: 0,
          avgStayNights: 0,
        },
      ],
    };
  }

  // クライアントサイドの場合はローカルストレージから読み込む
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData) as FormValues;
      // デバッグ用：復元された部屋名をログ出力
      if (parsedData.roomTypes && parsedData.roomTypes.length > 0) {
        const roomNames = parsedData.roomTypes.map((rt) => rt?.name ?? "未入力").join(", ");
        console.log(`部屋名復元状況: [${roomNames}]`);
      }
      return parsedData;
    } catch (error) {
      console.error("Failed to parse saved data:", error);
    }
  }

  // 保存データがない場合はデフォルト値
  return {
    zipcode: "",
    prefecture: undefined,
    city: "",
    place: "",
    building: "",
    buildingType: undefined,
    isLaw: false,
    isRenewed: false,
    area: 0,
    coverage: 0,
    fsi: 0,
    commonAreaRatio: 0,
    exclusiveAreaRatio: 0,
    rent: 0,
    ageType: undefined,
    planName: "",
    roomTypes: [
      {
        name: "",
        ratio: 0,
        roomArea: 0,
        computedRooms: 0,
        capacity: 0,
        beds: 0,
        cleaningUnitPrice: 0,
        consumablesPerNight: 0,
        lodgingUnitPrice: 0,
        avgStayNights: 0,
      },
    ],
  };
}

export default function ProTop() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: getInitialValues(),
    mode: "onChange",
  });

  // クライアントサイドであることを確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  // フォームの変更をローカルストレージに保存
  useEffect(() => {
    if (!isClient) return;

    const subscription = form.watch((data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // デバッグ用：部屋名の保存状況をログ出力
        if (data.roomTypes && data.roomTypes.length > 0) {
          const roomNames = data.roomTypes.map((rt) => rt?.name ?? "未入力").join(", ");
          console.log(`部屋名保存状況: [${roomNames}]`);
        }
      } catch (error) {
        console.error("Failed to save data to localStorage:", error);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isClient]);

  const handleSave: SubmitHandler<FormValues> = (values) => {
    try {
      const cleaned = JSON.parse(JSON.stringify(values));
      // submittedAtを追加（送信日時を記録）
      (cleaned as any).submittedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      // ソースページを記録
      localStorage.setItem("proSourcePage", "existing");
      router.push("/pro/results");
    } catch (e) {
      console.error("Failed to save form:", e);
    }
  };

  const prefEntries = useMemo(() => Object.entries(prefectures), []);
  const buildingEntries = useMemo(() => Object.entries(buildingTypes), []);
  const ageEntries = useMemo(() => Object.entries(buildingAges), []);

  // クライアントサイドレンダリング完了まで待機
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="pb-15">
          <section className="mx-auto grid max-w-[1000px] grid-cols-2 justify-center gap-x-10 gap-y-20 pt-40">
            <FormWrapper
              title="1. 基本情報 / 建物 / プラン"
              desc="基本情報を入力してください"
              className="col-span-2"
            >
              <div className="grid w-full grid-cols-2 gap-[125px] rounded-[12px] border border-[#E4E4E7] bg-white p-10">
                <AddressBuildingPlanSection
                  prefEntries={prefEntries}
                  buildingEntries={buildingEntries}
                  ageEntries={ageEntries}
                />
              </div>
            </FormWrapper>

            <FormWrapper
              title="2. 部屋タイプ"
              desc="お部屋の情報を入力して下さい"
              className="col-span-2"
            >
              <RoomTypesSection />
            </FormWrapper>
          </section>
          <Button
            type="submit"
            className="mx-auto mt-10 flex h-auto cursor-pointer items-center gap-3 rounded-[30px] bg-[#BC002D] px-5 py-2 text-xl"
          >
            シミュレーション結果を見る
            <Image
              src="/button-arrow.svg"
              alt="Arrow"
              className="inline-block"
              width={24}
              height={24}
            />
          </Button>
        </form>
      </Form>
    </Suspense>
  );
}
