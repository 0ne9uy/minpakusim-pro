"use client";

import { useEffect, useMemo } from "react";

import { useFormContext, useWatch } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toHalfWidth } from "@/lib/utils";
import SelectField from "../../_components/SelectField";
import { prefectures } from "../../lib/prefectures";
import type { FormValues } from "../../lib/types";

type Props = { prefEntries: [string, string][] };

export default function AddressSection({ prefEntries }: Props) {
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
      {/* 郵便番号 */}
      <FormField
        control={form.control}
        name="zipcode"
        rules={{ required: true, minLength: 7, maxLength: 7 }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              郵便番号<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="1010001"
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
        className="col-span-3"
        rules={{ required: true }}
        options={prefEntries}
      />

      {/* 市区町村（address2 + address3） */}
      <FormField
        control={form.control}
        name="city"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              市区町村<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="text"
                placeholder="例）港区芝公園"
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

      {/* 番地（手入力） */}
      <FormField
        control={form.control}
        name="place"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              番地<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="text"
                placeholder="4-2-8 など"
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
    </>
  );
}
