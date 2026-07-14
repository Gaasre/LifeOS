import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  InboxIcon,
  LogOutIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@lifeos/ui/components/avatar";
import { Button } from "@lifeos/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lifeos/ui/components/dropdown-menu";
import { Badge } from "@lifeos/ui/components/badge";

import { LifeOsMark } from "@/components/lifeos-mark";
import {
  usePerspective,
  type LifePerspective,
} from "@/features/perspectives/perspective-context";
import { authClient } from "@/lib/auth-client";

type AppHeaderProps = {
  section?: string;
  showPerspective?: boolean;
};

function PerspectiveSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    people,
    perspective,
    selectedPerson,
    viewerPersonId,
    isPending,
    setPerspective,
  } = usePerspective();
  const isProfileRoute =
    location.pathname === "/me" ||
    location.pathname === "/family" ||
    location.pathname.startsWith("/people/");
  const value =
    perspective.kind === "family" ? "family" : `person:${perspective.personId}`;
  const label =
    perspective.kind === "family"
      ? "Family"
      : (selectedPerson?.preferredName ?? "Perspective");

  function choosePerspective(nextValue: string) {
    let next: LifePerspective;
    if (nextValue === "family") {
      next = { kind: "family" };
    } else {
      const personId = nextValue.replace(/^person:/, "");
      if (!people.some((person) => person.id === personId)) return;
      next = { kind: "person", personId };
    }

    setPerspective(next);
    if (!isProfileRoute) return;

    if (next.kind === "family") {
      navigate("/family");
    } else {
      navigate(
        next.personId === viewerPersonId ? "/me" : `/people/${next.personId}`,
      );
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 max-w-[9.5rem] justify-start sm:max-w-52"
          aria-label="Choose a LifeOS perspective"
        >
          {perspective.kind === "family" ? (
            <UsersRoundIcon data-icon="inline-start" />
          ) : (
            <UserRoundIcon data-icon="inline-start" />
          )}
          <span className="truncate">{label}</span>
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2">
        <DropdownMenuLabel>Perspective</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={choosePerspective}>
          <DropdownMenuRadioItem value="family">
            <UsersRoundIcon />
            <span className="flex-1">Family</span>
          </DropdownMenuRadioItem>
          {people.map((person) => (
            <DropdownMenuRadioItem
              key={person.id}
              value={`person:${person.id}`}
            >
              <UserRoundIcon />
              <span className="min-w-0 flex-1 truncate">
                {person.preferredName}
              </span>
              {person.id === viewerPersonId ? (
                <Badge variant="outline" className="mr-1">
                  You
                </Badge>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {isPending ? (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">
            Loading people…
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!session) {
    return null;
  }

  const displayName = session.user.name || session.user.email;
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        toast.error("We couldn’t sign you out. Try again.");
        return;
      }

      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="ml-auto h-10 gap-2 rounded-full pr-2 pl-1"
          aria-label={`Account for ${displayName}`}
        >
          <Avatar>
            <AvatarFallback>{initials || "L"}</AvatarFallback>
          </Avatar>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-sm text-foreground">
            {session.user.name}
          </span>
          <span className="mt-0.5 block truncate font-normal text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-2 py-2"
          onSelect={() => navigate("/invitations")}
        >
          <InboxIcon />
          Invitations
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-2 py-2"
          disabled={isSigningOut}
          onSelect={() => void handleSignOut()}
        >
          <LogOutIcon />
          {isSigningOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({ section, showPerspective = true }: AppHeaderProps) {
  return (
    <header
      className="flex min-h-11 min-w-0 items-center gap-2 sm:gap-3"
      aria-label="LifeOS"
    >
      <Link
        to="/"
        className="flex shrink-0 items-center gap-4 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-5"
        aria-label="LifeOS home"
      >
        <LifeOsMark />
        <span className="text-lg tracking-[0.08em] text-muted-foreground sm:text-xl">
          LifeOS
        </span>
      </Link>
      {showPerspective ? (
        <>
          <ChevronRightIcon
            className="size-4 shrink-0 text-muted-foreground/60"
            aria-hidden
          />
          <PerspectiveSwitcher />
        </>
      ) : null}
      {section ? (
        <>
          <ChevronRightIcon
            className="hidden size-4 shrink-0 text-muted-foreground/60 sm:block"
            aria-hidden
          />
          <span className="hidden truncate text-sm text-muted-foreground sm:block">
            {section}
          </span>
        </>
      ) : null}
      <UserMenu />
    </header>
  );
}
