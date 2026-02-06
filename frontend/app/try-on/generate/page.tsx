import { Suspense } from "react";
import { TryOnGenerateClient } from "./try-on-generate-client";

export default function TryOnGeneratePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <TryOnGenerateClient />
    </Suspense>
  );
}
