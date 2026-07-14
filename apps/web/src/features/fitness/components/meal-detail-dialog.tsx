import { Clock3Icon, HeartIcon, PlusIcon, UtensilsIcon } from "lucide-react";

import type { FitnessMeal } from "@lifeos/rpc";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifeos/ui/components/dialog";
import { Separator } from "@lifeos/ui/components/separator";

export function MealDetailDialog({
  meal,
  onOpenChange,
  onAddToDay,
}: {
  meal: FitnessMeal | null;
  onOpenChange: (open: boolean) => void;
  onAddToDay: (meal: FitnessMeal) => void;
}) {
  if (!meal) return null;

  return (
    <Dialog open={Boolean(meal)} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {meal.favourite ? (
              <Badge variant="outline">
                <HeartIcon /> Favourite
              </Badge>
            ) : null}
            {meal.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <DialogTitle className="text-2xl font-normal tracking-[-0.02em]">
            {meal.title}
          </DialogTitle>
          <DialogDescription>
            {meal.description ?? "A simple reusable meal."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/25 p-3 ring-1 ring-foreground/[0.05]">
              <p className="m-0 text-xs text-muted-foreground">Calories</p>
              <p className="mt-1 mb-0 text-base">
                {meal.caloriesPerServing ?? "—"} kcal
              </p>
            </div>
            <div className="rounded-xl bg-muted/25 p-3 ring-1 ring-foreground/[0.05]">
              <p className="m-0 text-xs text-muted-foreground">Protein</p>
              <p className="mt-1 mb-0 text-base">
                {meal.proteinPerServing ?? "—"} g
              </p>
            </div>
            <div className="rounded-xl bg-muted/25 p-3 ring-1 ring-foreground/[0.05]">
              <p className="m-0 text-xs text-muted-foreground">Preparation</p>
              <p className="mt-1 mb-0 flex items-center gap-1 text-base">
                <Clock3Icon className="size-3.5" />
                {meal.preparationMinutes ?? "—"} min
              </p>
            </div>
            <div className="rounded-xl bg-muted/25 p-3 ring-1 ring-foreground/[0.05]">
              <p className="m-0 text-xs text-muted-foreground">Servings</p>
              <p className="mt-1 mb-0 text-base">{meal.servings}</p>
            </div>
          </div>

          <Separator />

          <section aria-labelledby="fitness-meal-ingredients-title">
            <h3
              id="fitness-meal-ingredients-title"
              className="m-0 flex items-center gap-2 text-base font-normal"
            >
              <UtensilsIcon className="size-4 text-fitness-accent" />{" "}
              Ingredients
            </h3>
            {meal.ingredients.length === 0 ? (
              <p className="mt-3 mb-0 text-sm text-muted-foreground">
                No ingredient list has been added yet.
              </p>
            ) : (
              <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0">
                {meal.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <span>
                      {ingredient.name}
                      {ingredient.optional ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · optional
                        </span>
                      ) : null}
                    </span>
                    {ingredient.quantity !== null ? (
                      <span className="shrink-0 text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit ?? ""}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="fitness-meal-steps-title">
            <h3
              id="fitness-meal-steps-title"
              className="m-0 text-base font-normal"
            >
              Preparation
            </h3>
            {meal.steps.length === 0 ? (
              <p className="mt-3 mb-0 text-sm text-muted-foreground">
                No preparation steps have been added yet.
              </p>
            ) : (
              <ol className="mt-3 mb-0 flex flex-col gap-3 pl-5 text-sm leading-relaxed">
                {meal.steps.map((step) => (
                  <li key={step.id} className="pl-1">
                    {step.instruction}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {meal.dietaryNotes ? (
            <div className="rounded-xl border border-dashed border-fitness-accent/35 bg-fitness-accent/[0.045] p-4">
              <p className="m-0 text-xs font-medium tracking-[0.12em] text-fitness-accent uppercase">
                Dietary note and substitutions
              </p>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-muted-foreground">
                {meal.dietaryNotes}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-xl px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onAddToDay(meal)}>
            <PlusIcon data-icon="inline-start" /> Add to selected day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
