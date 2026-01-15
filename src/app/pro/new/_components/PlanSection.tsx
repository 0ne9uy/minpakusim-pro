"use client";

import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toHalfWidth } from "@/lib/utils";
import SelectField from "../../_components/SelectField";
import type { FormValues } from "../../lib/types";

type Props = { ageEntries: [string, string][] };

export default function PlanSection({ ageEntries }: Props) {
  const form = useFormContext<FormValues>();

  return (
    <>
      {/* 土地面積 */}
      <FormField
        control={form.control}
        name="area"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              土地面積<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="〇〇〇〇㎡(平米)"
                {...field}
                onFocus={(e) => e.target.select()}
                value={field.value ? `${field.value}㎡` : ""}
                onChange={(e) => {
                  // 全角を半角に変換してから単位を除去して数値のみを取得
                  const halfWidth = toHalfWidth(e.target.value);
                  const numericValue = halfWidth.replace(/[㎡]/g, "");
                  field.onChange(numericValue === "" ? undefined : Number(numericValue));
                  // 部屋数再計算のトリガー
                  setTimeout(() => {
                    const roomTypes = form.getValues("roomTypes") || [];
                    roomTypes.forEach((_, idx) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const rt = form.getValues(`roomTypes.${idx}` as any);
                      if (rt?.ratio && rt?.roomArea) {
                        const landArea = Number(e.target.value) || 0;
                        const coverage = form.getValues("coverage") || 0;
                        const fsi = form.getValues("fsi") || 0;
                        const exclusiveAreaRatio = form.getValues("exclusiveAreaRatio") || 0;

                        if (landArea && coverage && fsi && exclusiveAreaRatio) {
                          const floorArea = landArea * (fsi / 100);
                          const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);
                          const rooms = Math.max(
                            1,
                            Math.floor((exclusiveArea * (rt.ratio / 100)) / rt.roomArea),
                          );
                          form.setValue(`roomTypes.${idx}.computedRooms`, rooms);
                        }
                      }
                    });
                  }, 100);
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {/* 建ペい率 */}
      <FormField
        control={form.control}
        name="coverage"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              建ペい率<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="〇〇％"
                {...field}
                onFocus={(e) => e.target.select()}
                value={field.value ? `${field.value}%` : ""}
                onChange={(e) => {
                  // 全角を半角に変換してから単位を除去して数値のみを取得
                  const halfWidth = toHalfWidth(e.target.value);
                  const numericValue = halfWidth.replace(/[%]/g, "");
                  field.onChange(numericValue === "" ? undefined : Number(numericValue));
                  // 部屋数再計算のトリガー
                  setTimeout(() => {
                    const roomTypes = form.getValues("roomTypes") || [];
                    roomTypes.forEach((_, idx) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const rt = form.getValues(`roomTypes.${idx}` as any);
                      if (rt?.ratio && rt?.roomArea) {
                        const landArea = form.getValues("area") || 0;
                        const coverage = Number(numericValue) || 0;
                        const fsi = form.getValues("fsi") || 0;
                        const exclusiveAreaRatio = form.getValues("exclusiveAreaRatio") || 0;

                        if (landArea && coverage && fsi && exclusiveAreaRatio) {
                          const floorArea = landArea * (fsi / 100);
                          const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);
                          const rooms = Math.max(
                            1,
                            Math.floor((exclusiveArea * (rt.ratio / 100)) / rt.roomArea),
                          );
                          form.setValue(`roomTypes.${idx}.computedRooms`, rooms);
                        }
                      }
                    });
                  }, 100);
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {/* 容積率 */}
      <FormField
        control={form.control}
        name="fsi"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              容積率<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="〇〇％"
                {...field}
                onFocus={(e) => e.target.select()}
                value={field.value ? `${field.value}%` : ""}
                onChange={(e) => {
                  // 全角を半角に変換してから単位を除去して数値のみを取得
                  const halfWidth = toHalfWidth(e.target.value);
                  const numericValue = halfWidth.replace(/[%]/g, "");
                  field.onChange(numericValue === "" ? undefined : Number(numericValue));
                  // 部屋数再計算のトリガー
                  setTimeout(() => {
                    const roomTypes = form.getValues("roomTypes") || [];
                    roomTypes.forEach((_, idx) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const rt = form.getValues(`roomTypes.${idx}` as any);
                      if (rt?.ratio && rt?.roomArea) {
                        const landArea = form.getValues("area") || 0;
                        const coverage = form.getValues("coverage") || 0;
                        const fsi = Number(numericValue) || 0;
                        const exclusiveAreaRatio = form.getValues("exclusiveAreaRatio") || 0;

                        if (landArea && coverage && fsi && exclusiveAreaRatio) {
                          const floorArea = landArea * (fsi / 100);
                          const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);
                          const rooms = Math.max(
                            1,
                            Math.floor((exclusiveArea * (rt.ratio / 100)) / rt.roomArea),
                          );
                          form.setValue(`roomTypes.${idx}.computedRooms`, rooms);
                        }
                      }
                    });
                  }, 100);
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {/* 共有部率 */}
      <FormField
        control={form.control}
        name="commonAreaRatio"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              共有部率<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="〇〇％"
                {...field}
                onFocus={(e) => e.target.select()}
                value={field.value ? `${field.value}%` : ""}
                onChange={(e) => {
                  // 全角を半角に変換してから単位を除去して数値のみを取得
                  const halfWidth = toHalfWidth(e.target.value);
                  const numericValue = halfWidth.replace(/[%]/g, "");
                  const newValue = numericValue === "" ? undefined : Number(numericValue);
                  field.onChange(newValue);

                  // 専有部率を自動計算 (専有部率 = 100 - 共有部率)
                  if (newValue !== undefined && newValue >= 0 && newValue <= 100) {
                    form.setValue("exclusiveAreaRatio", 100 - newValue);

                    // 部屋数再計算のトリガー
                    setTimeout(() => {
                      const roomTypes = form.getValues("roomTypes") || [];
                      roomTypes.forEach((_, idx) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const rt = form.getValues(`roomTypes.${idx}` as any);
                        if (rt?.ratio && rt?.roomArea) {
                          const landArea = form.getValues("area") || 0;
                          const coverage = form.getValues("coverage") || 0;
                          const fsi = form.getValues("fsi") || 0;
                          const exclusiveAreaRatio = 100 - newValue;

                          if (landArea && coverage && fsi && exclusiveAreaRatio) {
                            const floorArea = landArea * (fsi / 100);
                            const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);
                            const rooms = Math.max(
                              1,
                              Math.floor((exclusiveArea * (rt.ratio / 100)) / rt.roomArea),
                            );
                            form.setValue(`roomTypes.${idx}.computedRooms`, rooms);
                          }
                        }
                      });
                    }, 100);
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {/* 専有部率 */}
      <FormField
        control={form.control}
        name="exclusiveAreaRatio"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>
              専有部率<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="〇〇％"
                {...field}
                onFocus={(e) => e.target.select()}
                value={field.value ? `${field.value}%` : ""}
                onChange={(e) => {
                  // 全角を半角に変換してから単位を除去して数値のみを取得
                  const halfWidth = toHalfWidth(e.target.value);
                  const numericValue = halfWidth.replace(/[%]/g, "");
                  const newValue = numericValue === "" ? undefined : Number(numericValue);
                  field.onChange(newValue);

                  // 共有部率を自動計算 (共有部率 = 100 - 専有部率)
                  if (newValue !== undefined && newValue >= 0 && newValue <= 100) {
                    form.setValue("commonAreaRatio", 100 - newValue);
                  }

                  // 部屋数再計算のトリガー
                  setTimeout(() => {
                    const roomTypes = form.getValues("roomTypes") || [];
                    roomTypes.forEach((_, idx) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const rt = form.getValues(`roomTypes.${idx}` as any);
                      if (rt?.ratio && rt?.roomArea) {
                        const landArea = form.getValues("area") || 0;
                        const coverage = form.getValues("coverage") || 0;
                        const fsi = form.getValues("fsi") || 0;
                        const exclusiveAreaRatio = newValue || 0;

                        if (landArea && coverage && fsi && exclusiveAreaRatio) {
                          const floorArea = landArea * (fsi / 100);
                          const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);
                          const rooms = Math.max(
                            1,
                            Math.floor((exclusiveArea * (rt.ratio / 100)) / rt.roomArea),
                          );
                          form.setValue(`roomTypes.${idx}.computedRooms`, rooms);
                        }
                      }
                    });
                  }, 100);
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {/* 家賃 */}
      <FormField
        control={form.control}
        name="rent"
        rules={{ required: false }}
        render={({ field }) => (
          <FormItem className="col-span-3">
            <FormLabel>家賃</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="〇〇,〇〇〇円"
                {...field}
                onFocus={(e) => e.target.select()}
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
        className="col-span-3"
        rules={{ required: true }}
        options={ageEntries}
      />

      {/* チェック */}
      <FormField
        control={form.control}
        name="isRenewed"
        render={({ field }) => (
          <FormItem className={"col-span-3"}>
            <span className="">リノベーション</span>
            <FormLabel className="mt-2 flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="accent-primary"
                />
              </FormControl>
              <span className="text-muted-foreground text-sm">あり</span>
            </FormLabel>
          </FormItem>
        )}
      />
    </>
  );
}
