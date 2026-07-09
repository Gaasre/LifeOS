import { createElement, type ReactNode } from "react";

export function Stack({ children }: { children: ReactNode }) {
  return createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 24 } },
    children,
  );
}
