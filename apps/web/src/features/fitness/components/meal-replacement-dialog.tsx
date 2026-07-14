import { Clock3Icon, RefreshCcwIcon, UtensilsIcon } from "lucide-react";

import type { FitnessMeal, PlannedFitnessMeal } from "@lifeos/rpc";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lifeos/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifeos/ui/components/dialog";

export function MealReplacementDialog({
  plannedMeal,
  meals,
  isSaving,
  onOpenChange,
  onChoose,
}: {
  plannedMeal: PlannedFitnessMeal | null;
  meals: FitnessMeal[];
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (meal: FitnessMeal) => void;
}) {
  return (
    <Dialog open={Boolean(plannedMeal)} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[min(92dvh,42rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle>Replace planned meal</DialogTitle>
          <DialogDescription>
            {plannedMeal
              ? `Choose a reusable meal to replace ${plannedMeal.title}.`
              : "Choose a reusable meal."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-hidden px-5 py-4">
          <Command className="fitness-command min-h-0">
            <CommandInput placeholder="Find a meal…" />
            <CommandList className="max-h-none flex-1">
              <CommandEmpty>No reusable meal found.</CommandEmpty>
              <CommandGroup
                heading={plannedMeal ? `Replace ${plannedMeal.slot}` : "Meals"}
              >
                {meals.map((meal) => (
                  <CommandItem
                    key={meal.id}
                    disabled={isSaving || meal.id === plannedMeal?.mealId}
                    value={`${meal.title} ${meal.tags.join(" ")}`}
                    onSelect={() => onChoose(meal)}
                    className="items-start py-2.5"
                  >
                    {meal.id === plannedMeal?.mealId ? (
                      <UtensilsIcon className="mt-0.5" />
                    ) : (
                      <RefreshCcwIcon className="mt-0.5" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span>{meal.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>
                          {meal.caloriesPerServing === null
                            ? "Calories not entered"
                            : `${meal.caloriesPerServing} kcal`}
                        </span>
                        <span>
                          {meal.proteinPerServing === null
                            ? "Protein not entered"
                            : `${meal.proteinPerServing} g protein`}
                        </span>
                        {meal.preparationMinutes !== null ? (
                          <span className="flex items-center gap-1">
                            <Clock3Icon className="size-3" />
                            {meal.preparationMinutes} min
                          </span>
                        ) : null}
                      </span>
                    </span>
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
