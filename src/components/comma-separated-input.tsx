"use client";

import { useEffect, useRef, useState } from "react";
import { formatCommaList, parseCommaList } from "@/lib/comma-list";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string[];
  onChange: (next: string[]) => void;
};

export function CommaSeparatedInput({ value, onChange, className, ...props }: Props) {
  const [draft, setDraft] = useState(() => formatCommaList(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(formatCommaList(value));
    }
  }, [value]);

  return (
    <input
      {...props}
      className={className ? `form-input ${className}` : "form-input"}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        props.onFocus?.(e);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        focused.current = false;
        const parsed = parseCommaList(draft);
        onChange(parsed);
        setDraft(formatCommaList(parsed));
        props.onBlur?.(e);
      }}
    />
  );
}
