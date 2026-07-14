import { useCallback, useEffect, useState } from "react";
import {
  CheckIcon,
  CalendarClockIcon,
  HeartHandshakeIcon,
  InboxIcon,
  XIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { FamilyInboxInvitation } from "@lifeos/rpc";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lifeos/ui/components/alert";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Skeleton } from "@lifeos/ui/components/skeleton";
import { Spinner } from "@lifeos/ui/components/spinner";

import { AppHeader } from "@/components/app-header";
import { authClient } from "@/lib/auth-client";
import { rpcClient } from "@/lib/rpc-client";

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export function FamilyInvitationsPage() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<FamilyInboxInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{
    invitationId: string;
    type: "accept" | "reject";
  } | null>(null);

  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rpcClient.family.listIncomingInvitations({});
      setInvitations(result);
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Your invitations could not be loaded."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function respond(
    invitation: FamilyInboxInvitation,
    type: "accept" | "reject",
  ) {
    setAction({ invitationId: invitation.id, type });
    setError(null);
    try {
      const { error: responseError } =
        type === "accept"
          ? await authClient.organization.acceptInvitation({
              invitationId: invitation.id,
            })
          : await authClient.organization.rejectInvitation({
              invitationId: invitation.id,
            });

      if (responseError) {
        throw new Error(
          responseError.message || "The invitation could not be updated.",
        );
      }

      if (type === "accept") {
        await authClient.organization.setActive({
          organizationId: invitation.organizationId,
        });
        toast.success(`Welcome to ${invitation.organizationName}.`);
        navigate("/family", { replace: true });
        return;
      }

      setInvitations((current) =>
        current.filter((item) => item.id !== invitation.id),
      );
      toast.success("Invitation declined.");
    } catch (caught) {
      setError(getErrorMessage(caught, "The invitation could not be updated."));
    } finally {
      setAction(null);
    }
  }

  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <AppHeader section="Invitations" />

        <div className="mt-12 flex flex-col gap-8 lg:mt-16">
          <section className="max-w-2xl">
            <div className="mb-4 inline-flex rounded-2xl border bg-muted/30 p-3">
              <InboxIcon className="size-6" />
            </div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Your Family inbox
            </p>
            <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
              Invitations, on your terms.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              A Family invitation connects your account to one household. Once
              joined, both people can open and manage the same information.
            </p>
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn’t update invitations</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                {error}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadInvitations()}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          ) : invitations.length === 0 ? (
            <Empty className="min-h-72 rounded-2xl border bg-card/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HeartHandshakeIcon />
                </EmptyMedia>
                <EmptyTitle>Your inbox is quiet</EmptyTitle>
                <EmptyDescription>
                  When someone invites your existing LifeOS account to their
                  Family, you can decide here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {invitations.map((invitation) => {
                const isAccepting =
                  action?.invitationId === invitation.id &&
                  action.type === "accept";
                const isRejecting =
                  action?.invitationId === invitation.id &&
                  action.type === "reject";
                const isBusy = isAccepting || isRejecting;

                return (
                  <Card
                    key={invitation.id}
                    className="flex min-h-72 flex-col bg-card/35"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-xl bg-muted p-2.5">
                          <HeartHandshakeIcon className="size-5" />
                        </div>
                        <Badge variant="secondary">Household invitation</Badge>
                      </div>
                      <CardTitle className="pt-4 text-2xl">
                        Join {invitation.organizationName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {`${invitation.inviterName || "Someone"} invited you to join their Family in LifeOS.`}
                      </p>
                      <p className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                        Person and Family spaces are computed views. Joining
                        does not create copies or item-level sharing settings.
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarClockIcon className="size-3.5" />
                        Expires {formatExpiry(invitation.expiresAt)}
                      </p>
                    </CardContent>
                    <CardFooter className="mt-auto justify-end gap-2 border-t bg-muted/15">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => void respond(invitation, "reject")}
                      >
                        {isRejecting ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <XIcon data-icon="inline-start" />
                        )}
                        Decline
                      </Button>
                      <Button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void respond(invitation, "accept")}
                      >
                        {isAccepting ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <CheckIcon data-icon="inline-start" />
                        )}
                        Join Family
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
