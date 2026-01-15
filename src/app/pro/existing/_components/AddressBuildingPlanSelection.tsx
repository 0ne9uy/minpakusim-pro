// src/app/pro/_components/AddressBuildingPlanSection.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toHalfWidth } from "@/lib/utils";
import SelectField from "../../_components/SelectField";
import { prefectures } from "../../lib/prefectures";
import type { FormValues } from "../../lib/types";

type Props = {
  prefEntries: [string, string][];
  buildingEntries: [string, string][];
  ageEntries: [string, string][];
};

export default function AddressBuildingPlanSection({
  prefEntries,
  buildingEntries,
  ageEntries,
}: Props) {
  const form = useFormContext<FormValues>();

  const prefectureKeyByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const [key, label] of Object.entries(prefectures)) map.set(label, key);
    return map;
  }, []);

  const zipcode = useWatch({ control: form.control, name: "zipcode" });
  const prefecture = useWatch({ control: form.control, name: "prefecture" });

  useEffect(() => {
    const raw = toHalfWidth((zipcode ?? "").toString());
    const zip = raw.replace(/[^\d]/g, "").slice(0, 7);
    if (raw !== zip) form.setValue("zipcode", zip);
    if (zip.length !== 7) return;

    // 既に都道府県が設定されている場合はAPI呼び出しをスキップ
    // （ページ読み込み時の上書きを防ぐ）
    if (prefecture) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`, {
          cache: "no-store",
        });
        const data: {
          status: number;
          results: Array<{ address1: string; address2: string; address3: string }> | null;
        } = await res.json();
        if (cancelled) return;

        if (data.status !== 200 || !data.results?.length) {
          // 郵便番号が無効な場合は何もしない（既存の値を保持）
          return;
        }

        const { address1, address2, address3 } = data.results[0];
        const prefKey = prefectureKeyByLabel.get(address1) ?? "";
        const clean3 = address3 === "以下に掲載がない場合" ? "" : address3;
        const combinedCity = clean3 ? `${address2}${clean3}` : address2;

        form.setValue("prefecture", prefKey, { shouldValidate: true, shouldDirty: true });
        form.setValue("city", combinedCity, { shouldValidate: true, shouldDirty: true });
      } catch {}
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [zipcode, prefecture, form, prefectureKeyByLabel]);

  return (
    <>
      {/* LEFT COLUMN */}
      <div className="grid grid-cols-2 gap-5">
        {/* 郵便番号 */}
        <FormField
          control={form.control}
          name="zipcode"
          rules={{ required: true, minLength: 7, maxLength: 7 }}
          render={({ field }) => (
            <FormItem className="col-span-1">
              <FormLabel>
                郵便番号<span className="text-[#DC2626]">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="1011100"
                  {...field}
                  onChange={(e) => {
                    // 全角を半角に変換
                    const halfWidth = toHalfWidth(e.target.value);
                    field.onChange(halfWidth);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 都道府県 */}
        <SelectField
          name="prefecture"
          label={
            <>
              都道府県<span className="text-[#DC2626]">*</span>
            </>
          }
          placeholder="選択してください"
          className="col-span-1"
          rules={{ required: true }}
          options={prefEntries}
        />

        {/* 市区町村 */}
        <FormField
          control={form.control}
          name="city"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>
                市区町村<span className="text-[#DC2626]">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  inputMode="text"
                  placeholder="港区〇〇"
                  {...field}
                  onChange={(e) => {
                    // 全角を半角に変換
                    const halfWidth = toHalfWidth(e.target.value);
                    field.onChange(halfWidth);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 番地 */}
        <FormField
          control={form.control}
          name="place"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>
                番地<span className="text-[#DC2626]">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  inputMode="text"
                  placeholder="0000番地"
                  {...field}
                  onChange={(e) => {
                    // 全角を半角に変換
                    const halfWidth = toHalfWidth(e.target.value);
                    field.onChange(halfWidth);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 建物名・部屋番号 */}
        <FormField
          control={form.control}
          name="building"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>
                建物名・部屋番号<span className="text-[#DC2626]">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  inputMode="text"
                  placeholder="コーポ〇〇〇"
                  {...field}
                  onChange={(e) => {
                    // 全角を半角に変換
                    const halfWidth = toHalfWidth(e.target.value);
                    field.onChange(halfWidth);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 稼働可能日数の基準 */}
        <FormField
          control={form.control}
          name="isLaw"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <span className="">稼働可能日数の基準</span>
              <FormLabel className="mt-2 flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="accent-primary"
                  />
                </FormControl>
                <span className="text-muted-foreground text-sm">民泊新法を適応する</span>
              </FormLabel>
            </FormItem>
          )}
        />
      </div>

      {/* RIGHT COLUMN */}
      <div className="grid h-fit grid-cols-2 items-start gap-5">
        {/* 物件種別 */}
        <SelectField
          name="buildingType"
          label={
            <>
              物件種別<span className="text-[#DC2626]">*</span>
            </>
          }
          placeholder="選択してください"
          className="col-span-2 h-fit"
          rules={{ required: true }}
          options={buildingEntries}
        />

        {/* 家賃 */}
        <FormField
          control={form.control}
          name="rent"
          rules={{ required: false }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>家賃</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="00,000円"
                  {...field}
                  value={field.value ? `${field.value.toLocaleString()}円` : ""}
                  onChange={(e) => {
                    // 全角を半角に変換してからカンマと単位を除去して数値のみを取得
                    const halfWidth = toHalfWidth(e.target.value);
                    const numericValue = halfWidth.replace(/[,円]/g, "");
                    // 数値のみの場合のみ更新
                    if (numericValue === "" || !Number.isNaN(Number(numericValue))) {
                      field.onChange(numericValue === "" ? undefined : Number(numericValue));
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 築年数 */}
        <SelectField
          name="ageType"
          label={
            <>
              築年数<span className="text-[#DC2626]">*</span>
            </>
          }
          placeholder="選択してください"
          className="col-span-1"
          rules={{ required: true }}
          options={ageEntries}
        />

        {/* リノベーション */}
        <FormField
          control={form.control}
          name="isRenewed"
          render={({ field }) => (
            <FormItem className="col-span-1">
              <span className="">リノベーション</span>
              <FormLabel className="mt-2 flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="accent-primary"
                  />
                </FormControl>
                <span className="text-muted-foreground text-sm">あり</span>
              </FormLabel>
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
