"use client";

import { Suspense } from "react";

import { ConsoleEntry } from "@/features/console/console-entry";

// useSearchParams 在静态导出下必须包在 Suspense 边界里。
export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <ConsoleEntry />
    </Suspense>
  );
}
