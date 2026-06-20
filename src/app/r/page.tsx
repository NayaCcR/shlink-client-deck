import type { Metadata } from "next";
import { Suspense } from "react";

import { ProtectedLinkUnlockPage } from "@/features/protected-links/protected-link-unlock-page";

export const metadata: Metadata = {
  title: "Protected Link · Link Console",
  referrer: "no-referrer"
};

export default function ProtectedLinkPage() {
  return (
    <Suspense fallback={null}>
      <ProtectedLinkUnlockPage />
    </Suspense>
  );
}
