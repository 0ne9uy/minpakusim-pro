"use client";

import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import SelectField from "../../_components/SelectField";
import type { FormValues } from "../../lib/types";

type Props = { buildingEntries: [string, string][] };

export default function BuildingSection({ buildingEntries }: Props) {
  const form = useFormContext<FormValues>();

  return (
    <>
      {/* 建物名・部屋番号 */}
      <FormField
        control={form.control}
        name="building"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem className="col-span-6">
            <FormLabel>
              建物名・部屋番号<span className="text-[#DC2626]">*</span>
            </FormLabel>
            <FormControl>
              <Input
                inputMode="text"
                placeholder="コーポ〇〇"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* 物件種別 */}
      <SelectField
        name="buildingType"
        label={
          <>
            物件種別<span className="text-[#DC2626]">*</span>
          </>
        }
        placeholder="選択してください"
        className="col-span-6"
        rules={{ required: true }}
        options={buildingEntries}
      />

      {/* 稼働可能日数の基準 */}
      <FormField
        control={form.control}
        name="isLaw"
        render={({ field }) => (
          <FormItem className={"col-span-6"}>
            <span className="">稼働可能日数の基準</span>
            <FormLabel className="mt-2 flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="accent-primary"
                />
              </FormControl>
              <span className="text-muted-foreground text-sm">民泊新法を適応する</span>
            </FormLabel>
          </FormItem>
        )}
      />
    </>
  );
}
