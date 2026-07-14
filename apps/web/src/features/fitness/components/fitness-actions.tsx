import {
  CalendarPlusIcon,
  DumbbellIcon,
  FootprintsIcon,
  LayoutListIcon,
  PlusIcon,
  ScaleIcon,
  SearchIcon,
  TargetIcon,
  UtensilsIcon,
} from "lucide-react";

import type { FitnessSection } from "@lifeos/rpc";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@lifeos/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifeos/ui/components/dialog";

import type { FitnessEditorTarget } from "@/features/fitness/fitness-types";

const sections: Array<{
  value: FitnessSection;
  label: string;
  icon: typeof SearchIcon;
}> = [
  { value: "today", label: "Today", icon: CalendarPlusIcon },
  { value: "week", label: "Weekly plan", icon: LayoutListIcon },
  { value: "training", label: "Training", icon: DumbbellIcon },
  { value: "nutrition", label: "Nutrition", icon: UtensilsIcon },
  { value: "meals", label: "Meals", icon: UtensilsIcon },
  { value: "goals", label: "Goals", icon: TargetIcon },
  { value: "progress", label: "Progress", icon: FootprintsIcon },
];

export function FitnessActions({
  open,
  onOpenChange,
  canCreate,
  onEdit,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  onEdit: (target: FitnessEditorTarget) => void;
  onNavigate: (section: FitnessSection) => void;
}) {
  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[min(92dvh,42rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle>Fitness and nutrition actions</DialogTitle>
          <DialogDescription>
            Plan something, log something, or move to a section.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-hidden px-5 py-4">
          <Command className="fitness-command min-h-0">
            <CommandInput placeholder="Search actions…" />
            <CommandList className="max-h-none flex-1">
              <CommandEmpty>No matching action.</CommandEmpty>
              <CommandGroup heading="Plan and log">
                <CommandItem
                  disabled={!canCreate}
                  onSelect={() => run(() => onEdit({ kind: "workout" }))}
                >
                  <CalendarPlusIcon /> Plan workout
                  <CommandShortcut>W</CommandShortcut>
                </CommandItem>
                <CommandItem
                  disabled={!canCreate}
                  onSelect={() => run(() => onEdit({ kind: "training-plan" }))}
                >
                  <DumbbellIcon /> New training plan
                </CommandItem>
                <CommandItem
                  disabled={!canCreate}
                  onSelect={() => run(() => onEdit({ kind: "nutrition-plan" }))}
                >
                  <UtensilsIcon /> New nutrition plan
                </CommandItem>
                <CommandItem
                  disabled={!canCreate}
                  onSelect={() => run(() => onEdit({ kind: "meal" }))}
                >
                  <PlusIcon /> Create reusable meal
                  <CommandShortcut>M</CommandShortcut>
                </CommandItem>
                <CommandItem
                  disabled={!canCreate}
                  onSelect={() => run(() => onEdit({ kind: "weight" }))}
                >
                  <ScaleIcon /> Log weight
                </CommandItem>
                <CommandItem
                  disabled={!canCreate}
                  onSelect={() => run(() => onEdit({ kind: "goal" }))}
                >
                  <TargetIcon /> Add goal
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Go to">
                {sections.map(({ value, label, icon: Icon }, index) => (
                  <CommandItem
                    key={value}
                    onSelect={() => run(() => onNavigate(value))}
                  >
                    <Icon /> {label}
                    <CommandShortcut>{index + 1}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        <DialogFooter
          className="mx-0 mb-0 rounded-none rounded-b-xl px-6 py-4"
          showCloseButton
        />
      </DialogContent>
    </Dialog>
  );
}
