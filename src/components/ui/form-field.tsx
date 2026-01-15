import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
  tooltip?: React.ReactNode;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, required, error, className, children, htmlFor, tooltip, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 w-20 flex-shrink-0">
            <Label htmlFor={htmlFor} required={required}>
              {label}
            </Label>
            {tooltip && <div>{tooltip}</div>}
          </div>
          <div className="w-full">{children}</div>
        </div>
        {error && (
          <p className="text-sm text-required ml-32" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = "FormField";

export { FormField };
