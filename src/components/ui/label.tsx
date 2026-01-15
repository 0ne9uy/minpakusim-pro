import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children?: React.ReactNode;
  htmlFor?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, htmlFor, ...props }, ref) => {
    return (
      // biome-ignore lint/a11y/noLabelWithoutControl: This is a reusable Label component
      <label
        className={cn(
          "flex-shrink-0 font-medium leading-none text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        ref={ref}
        htmlFor={htmlFor}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-required">*</span>}
      </label>
    );
  },
);
Label.displayName = "Label";

export { Label };
