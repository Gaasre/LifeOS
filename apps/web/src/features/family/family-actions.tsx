import {
  CalendarHeartIcon,
  CircleDollarSignIcon,
  FilesIcon,
  FolderKanbanIcon,
  InboxIcon,
  MailPlusIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@lifeos/ui/components/command";

export function FamilyActions({
  open,
  onOpenChange,
  canInvite,
  onInvite,
  profileHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canInvite: boolean;
  onInvite: () => void;
  profileHref: string;
}) {
  const navigate = useNavigate();

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Family actions"
      description="Open a Family area or invite your partner."
      showCloseButton
    >
      <Command>
        <CommandInput placeholder="Find a Family action…" />
        <CommandList>
          <CommandEmpty>No matching Family action.</CommandEmpty>
          <CommandGroup heading="Family">
            <CommandItem disabled={!canInvite} onSelect={() => run(onInvite)}>
              <MailPlusIcon />
              Invite partner
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate(profileHref))}>
              <CalendarHeartIcon />
              Manage personal dates
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate("/invitations"))}>
              <InboxIcon />
              Invitation inbox
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Open a shared area">
            <CommandItem onSelect={() => run(() => navigate("/documents"))}>
              <FilesIcon />
              Documents
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate("/projects"))}>
              <FolderKanbanIcon />
              Projects
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate("/money"))}>
              <CircleDollarSignIcon />
              Money
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
