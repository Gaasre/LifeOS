import { useState, type FormEvent, type ReactNode } from "react";
import { MailPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@lifeos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lifeos/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@lifeos/ui/components/field";
import { Input } from "@lifeos/ui/components/input";
import { Spinner } from "@lifeos/ui/components/spinner";

import { authClient } from "@/lib/auth-client";

function errorMessage(error: unknown, fallback: string) {
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

export function CreateFamilyDialog({
  trigger,
  onCreated,
}: {
  trigger: ReactNode;
  onCreated: (organizationId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setError(null);
    setIsSaving(true);
    const slugBase = cleanName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 42);
    const slug = `${slugBase || "family"}-${crypto.randomUUID().slice(0, 6)}`;

    try {
      const { data, error: createError } = await authClient.organization.create(
        {
          name: cleanName,
          slug,
          metadata: { kind: "family" },
        },
      );

      if (createError || !data) {
        setError(createError?.message || "We couldn’t create your Family.");
        return;
      }

      await authClient.organization.setActive({ organizationId: data.id });
      toast.success(`${data.name} is ready.`);
      setOpen(false);
      setName("");
      await onCreated(data.id);
    } catch (caught) {
      setError(errorMessage(caught, "We couldn’t create your Family."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create your Family</DialogTitle>
          <DialogDescription>
            This creates one household for your people and data. Personal and
            Family spaces are views over that same information.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="family-name">Family name</FieldLabel>
              <Input
                id="family-name"
                value={name}
                maxLength={80}
                autoFocus
                placeholder="Our family"
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              <FieldDescription>
                You can keep this simple; it is only household context.
              </FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving ? "Creating…" : "Create Family"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InviteFamilyDialog({
  organizationId,
  disabled,
}: {
  organizationId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setError(null);
    setIsSending(true);
    try {
      const { data, error: inviteError } =
        await authClient.organization.inviteMember({
          organizationId,
          email: cleanEmail,
          role: "member",
        });

      if (inviteError || !data) {
        setError(inviteError?.message || "The invitation could not be sent.");
        return;
      }

      toast.success("Invitation added to their LifeOS inbox.");
      setOpen(false);
      setEmail("");
    } catch (caught) {
      setError(errorMessage(caught, "The invitation could not be sent."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          <MailPlusIcon data-icon="inline-start" />
          Invite partner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite your partner</DialogTitle>
          <DialogDescription>
            This is a one-time household invitation. After joining, both of you
            can open and manage the same information.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={handleInvite}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                value={email}
                placeholder="partner@example.com"
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              <FieldDescription>
                They can accept from the LifeOS invitations page.
              </FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={!email.trim() || isSending}>
              {isSending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <MailPlusIcon data-icon="inline-start" />
              )}
              {isSending ? "Inviting…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
