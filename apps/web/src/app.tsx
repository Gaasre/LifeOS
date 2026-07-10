import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Skeleton } from "@lifeos/ui/components/skeleton";
import { Toaster } from "@lifeos/ui/components/sonner";
import { TooltipProvider } from "@lifeos/ui/components/tooltip";

const HomePage = lazy(() =>
  import("@/features/home/home-page").then((module) => ({
    default: module.HomePage,
  })),
);

const DocumentsPage = lazy(() =>
  import("@/features/documents/documents-page").then((module) => ({
    default: module.DocumentsPage,
  })),
);

const DocumentReviewPage = lazy(() =>
  import("@/features/documents/review/document-review-page").then((module) => ({
    default: module.DocumentReviewPage,
  })),
);

function AppLoading() {
  return (
    <main className="dark min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-14">
        <Skeleton className="h-10 w-36" />
        <div className="flex flex-col gap-4 lg:pl-32">
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:pl-32">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-60 rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route
              path="/documents/rental-agreement/review"
              element={<DocumentReviewPage />}
            />
          </Routes>
        </Suspense>
        <Toaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </BrowserRouter>
  );
}
