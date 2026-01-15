// src/app/pro/components/SelectField.tsx

import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FormValues } from "../lib/types";

type SelectFieldProps = {
  name: keyof FormValues;
  label: React.ReactNode;
  placeholder?: string;
  className?: string;
  rules?: any;
  options: [string, string][];
};

export default function SelectField({
  name,
  label,
  placeholder = "選択してください",
  className,
  rules,
  options,
}: SelectFieldProps) {
  const { control } = useFormContext<FormValues>();
  return (
    <FormField
      control={control}
      name={name as any}
      rules={rules}
      render={({ field }) => (
        <FormItem className={`${className ?? ""}`}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {options.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
