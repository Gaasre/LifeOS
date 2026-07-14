import {
  FilePlus2Icon,
  ListRestartIcon,
  MilestoneIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@lifeos/ui/components/command";

export function ProjectsActions({
  open,
  onOpenChange,
  hasProject,
  onNewProject,
  onNewStep,
  onEditProject,
  onManagePath,
  onProjectDocuments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasProject: boolean;
  onNewProject: () => void;
  onNewStep: () => void;
  onEditProject: () => void;
  onManagePath: () => void;
  onProjectDocuments: () => void;
}) {
  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Project actions"
      description="Create or adjust a project path."
      showCloseButton
    >
      <Command>
        <CommandInput placeholder="Find an action…" />
        <CommandList>
          <CommandEmpty>No matching project action.</CommandEmpty>
          <CommandGroup heading="Create">
            <CommandItem onSelect={() => run(onNewProject)}>
              <PlusIcon />
              New project
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem disabled={!hasProject} onSelect={() => run(onNewStep)}>
              <MilestoneIcon />
              New step
              <CommandShortcut>S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Selected project">
            <CommandItem
              disabled={!hasProject}
              onSelect={() => run(onEditProject)}
            >
              <PencilIcon />
              Edit project
            </CommandItem>
            <CommandItem
              disabled={!hasProject}
              onSelect={() => run(onManagePath)}
            >
              <ListRestartIcon />
              Manage path
            </CommandItem>
            <CommandItem
              disabled={!hasProject}
              onSelect={() => run(onProjectDocuments)}
            >
              <FilePlus2Icon />
              Project documents
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
