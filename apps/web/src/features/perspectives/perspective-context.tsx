import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import type { FamilyDashboard, PersonSummary } from "@lifeos/rpc";

import { rpcClient } from "@/lib/rpc-client";

const storedPerspectiveKey = "lifeos.perspective.v1";

export const perspectiveFamilyQueryKey = ["family", "perspective"] as const;

export type LifePerspective =
  { kind: "family" } | { kind: "person"; personId: string };

type PerspectiveContextValue = {
  dashboard: FamilyDashboard | null;
  people: PersonSummary[];
  perspective: LifePerspective;
  selectedPerson: PersonSummary | null;
  viewerPersonId: string | null;
  isPending: boolean;
  isError: boolean;
  setPerspective: (perspective: LifePerspective) => void;
  refetch: () => Promise<unknown>;
};

const PerspectiveContext = createContext<PerspectiveContextValue | null>(null);

function readStoredPerspective(): LifePerspective | null {
  try {
    const value = window.localStorage.getItem(storedPerspectiveKey);
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<LifePerspective>;
    if (parsed.kind === "family") return { kind: "family" };
    if (parsed.kind === "person" && typeof parsed.personId === "string") {
      return { kind: "person", personId: parsed.personId };
    }
  } catch {
    // A stale browser preference should never prevent LifeOS from opening.
  }
  return null;
}

function samePerspective(left: LifePerspective | null, right: LifePerspective) {
  return (
    left?.kind === right.kind &&
    (right.kind === "family" ||
      (left?.kind === "person" && left.personId === right.personId))
  );
}

export function PerspectiveProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [storedPerspective, setStoredPerspective] =
    useState<LifePerspective | null>(readStoredPerspective);
  const familyQuery = useQuery({
    queryKey: perspectiveFamilyQueryKey,
    queryFn: () => rpcClient.family.bootstrap({}),
  });

  const dashboard = familyQuery.data ?? null;
  const people = dashboard?.people ?? [];
  const viewerPersonId = dashboard?.viewer.personId ?? null;

  const routePerspective = useMemo<LifePerspective | null>(() => {
    if (location.pathname === "/family") return { kind: "family" };
    if (location.pathname === "/me" && viewerPersonId) {
      return { kind: "person", personId: viewerPersonId };
    }
    if (location.pathname.startsWith("/people/")) {
      const personId = location.pathname.slice("/people/".length).split("/")[0];
      if (personId && people.some((person) => person.id === personId)) {
        return { kind: "person", personId };
      }
    }
    return null;
  }, [location.pathname, people, viewerPersonId]);

  const validStoredPerspective = useMemo<LifePerspective | null>(() => {
    if (storedPerspective?.kind === "family") return storedPerspective;
    if (
      storedPerspective?.kind === "person" &&
      people.some((person) => person.id === storedPerspective.personId)
    ) {
      return storedPerspective;
    }
    return null;
  }, [people, storedPerspective]);

  const perspective =
    routePerspective ??
    validStoredPerspective ??
    (viewerPersonId
      ? ({ kind: "person", personId: viewerPersonId } as const)
      : ({ kind: "family" } as const));

  const setPerspective = useCallback((next: LifePerspective) => {
    setStoredPerspective(next);
    try {
      window.localStorage.setItem(storedPerspectiveKey, JSON.stringify(next));
    } catch {
      // The current session still works when browser persistence is unavailable.
    }
  }, []);

  useEffect(() => {
    if (
      routePerspective &&
      !samePerspective(storedPerspective, routePerspective)
    ) {
      setPerspective(routePerspective);
      return;
    }

    if (
      dashboard &&
      !routePerspective &&
      !validStoredPerspective &&
      viewerPersonId
    ) {
      setPerspective({ kind: "person", personId: viewerPersonId });
    }
  }, [
    dashboard,
    routePerspective,
    setPerspective,
    storedPerspective,
    validStoredPerspective,
    viewerPersonId,
  ]);

  const selectedPerson =
    perspective.kind === "person"
      ? (people.find((person) => person.id === perspective.personId) ?? null)
      : null;

  return (
    <PerspectiveContext.Provider
      value={{
        dashboard,
        people,
        perspective,
        selectedPerson,
        viewerPersonId,
        isPending: familyQuery.isPending,
        isError: familyQuery.isError,
        setPerspective,
        refetch: familyQuery.refetch,
      }}
    >
      {children}
    </PerspectiveContext.Provider>
  );
}

export function usePerspective() {
  const context = useContext(PerspectiveContext);
  if (!context) {
    throw new Error("usePerspective must be used inside PerspectiveProvider.");
  }
  return context;
}
