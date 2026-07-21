import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Skeleton } from "@lifeos/ui/components/skeleton";
import { Toaster } from "@lifeos/ui/components/sonner";
import { TooltipProvider } from "@lifeos/ui/components/tooltip";

import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "@/features/auth/auth-route-gates";
import {
  ModulePageContainer,
  ModulePageContent,
} from "@/components/module-page-layout";

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

const AuthPage = lazy(() =>
  import("@/features/auth/auth-page").then((module) => ({
    default: module.AuthPage,
  })),
);

const FamilyPage = lazy(() =>
  import("@/features/family/family-page").then((module) => ({
    default: module.FamilyPage,
  })),
);

const MePage = lazy(() =>
  import("@/features/me/me-page").then((module) => ({
    default: module.MePage,
  })),
);

const ProjectsPage = lazy(() =>
  import("@/features/projects/projects-page").then((module) => ({
    default: module.ProjectsPage,
  })),
);

const MoneyPage = lazy(() =>
  import("@/features/money/money-page").then((module) => ({
    default: module.MoneyPage,
  })),
);

const FitnessPage = lazy(() =>
  import("@/features/fitness/fitness-page").then((module) => ({
    default: module.FitnessPage,
  })),
);

const FamilyInvitationsPage = lazy(() =>
  import("@/features/family/family-invitations-page").then((module) => ({
    default: module.FamilyInvitationsPage,
  })),
);

function AppLoading() {
  return (
    <main
      className="dark min-h-screen overflow-x-hidden bg-background text-foreground"
      aria-label="Loading LifeOS"
      aria-busy="true"
    >
      <ModulePageContainer>
        <Skeleton className="h-11 w-36" />

        <ModulePageContent>
          <section className="mb-8" aria-hidden="true">
            <Skeleton className="h-11 w-72 max-w-full" />
            <Skeleton className="mt-2.5 h-5 w-96 max-w-full" />
          </section>

          <section className="grid grid-cols-12 gap-4" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <Skeleton
                key={index}
                className="col-span-12 min-h-49 rounded-lg sm:col-span-6 xl:col-span-3 xl:min-h-60"
              />
            ))}
          </section>
        </ModulePageContent>
      </ModulePageContainer>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/forgot-password" element={<AuthPage />} />
              <Route path="/reset-password" element={<AuthPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="/people/:personId" element={<MePage />} />
              <Route path="/family" element={<FamilyPage />} />
              <Route path="/invitations" element={<FamilyInvitationsPage />} />
              <Route
                path="/family/invitations/:invitationId"
                element={<Navigate to="/invitations" replace />}
              />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/money" element={<MoneyPage />} />
              <Route path="/fitness" element={<FitnessPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </BrowserRouter>
  );
}
