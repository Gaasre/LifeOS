import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  LandmarkIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TargetIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { MoneyDashboard } from "@lifeos/rpc";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@lifeos/ui/components/field";
import { Input } from "@lifeos/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifeos/ui/components/select";
import { Spinner } from "@lifeos/ui/components/spinner";

import {
  formatMoney,
  formatShortDate,
  moneyInputValue,
  parseMoneyMinor,
} from "@/features/money/money-format";
import { moneyQueryKey } from "@/features/money/hooks/use-money";
import { rpcClient } from "@/lib/rpc-client";

function CalculationLine({
  icon: Icon,
  label,
  value,
  subtract = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtract?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="text-sm text-foreground/85">{label}</span>
      <span className="text-sm tabular-nums">
        {subtract ? "−" : ""}
        {value}
      </span>
    </div>
  );
}

export function CalculationDialog({
  dashboard,
  open,
  onOpenChange,
}: {
  dashboard: MoneyDashboard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { calculation, settings } = dashboard;
  const currency = settings.currency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,46rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>How safe-to-spend is calculated</DialogTitle>
          <DialogDescription>
            A conservative household estimate from{" "}
            {formatShortDate(calculation.periodStart)} through{" "}
            {formatShortDate(calculation.periodEnd)}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/20 px-4">
          <CalculationLine
            icon={LandmarkIcon}
            label="Included account balances"
            value={formatMoney(calculation.availableBalanceMinor, currency)}
          />
          <div className="border-t">
            <CalculationLine
              icon={ReceiptTextIcon}
            label="Committed before next income"
            value={formatMoney(calculation.committedPaymentsMinor, currency)}
            subtract={calculation.committedPaymentsMinor > 0}
            />
          </div>
          <div className="border-t">
            <CalculationLine
              icon={PiggyBankIcon}
            label="Planned savings"
            value={formatMoney(calculation.plannedSavingsMinor, currency)}
            subtract={calculation.plannedSavingsMinor > 0}
            />
          </div>
          <div className="border-t">
            <CalculationLine
              icon={TargetIcon}
            label="Reserved goal money"
            value={formatMoney(calculation.reservedGoalMoneyMinor, currency)}
            subtract={calculation.reservedGoalMoneyMinor > 0}
            />
          </div>
          <div className="border-t">
            <CalculationLine
              icon={ShieldCheckIcon}
            label="Safety buffer"
            value={formatMoney(calculation.safetyBufferMinor, currency)}
            subtract={calculation.safetyBufferMinor > 0}
            />
          </div>
          <div className="-mx-4 mt-1 flex items-center justify-between gap-4 border-t bg-money-accent/7 px-4 py-4">
            <span className="flex items-center gap-2 font-medium">
              <ArrowRightIcon className="size-4 text-money-accent" /> Safe to
              spend
            </span>
            <span className="text-lg tabular-nums text-money-accent">
              {formatMoney(calculation.safeToSpendMinor, currency)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Next known income</p>
            <p className="mt-1 text-sm">
              {calculation.nextIncome
                ? `${calculation.nextIncome.title} · ${formatShortDate(calculation.nextIncome.occursOn)}`
                : "Not set — using a 30-day window"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Upcoming income shown separately
            </p>
            <p className="mt-1 text-sm tabular-nums">
              {formatMoney(calculation.upcomingIncomeMinor, currency)}
            </p>
          </div>
        </div>

        {calculation.warnings.length > 0 ? (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CircleAlertIcon className="size-4 text-warning" /> Estimate notes
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {calculation.warnings.map((warning) => (
                <Badge
                  key={`${warning.code}-${warning.entityId ?? "general"}`}
                  variant="outline"
                >
                  {warning.message}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-sm text-muted-foreground">
            <ShieldCheckIcon className="size-4 text-emerald-300" /> All included
            balances are current and the next income date is known.
          </p>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Account balances are the source of truth. Activity helps explain
          movements but is not added to, or subtracted from, balances again.
        </p>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export function MoneySettingsDialog({
  dashboard,
  open,
  onOpenChange,
}: {
  dashboard: MoneyDashboard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState(dashboard.settings.currency);
  const [safetyBuffer, setSafetyBuffer] = useState(
    moneyInputValue(dashboard.settings.safetyBufferMinor),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrency(dashboard.settings.currency);
    setSafetyBuffer(moneyInputValue(dashboard.settings.safetyBufferMinor));
    setError(null);
  }, [dashboard.settings.currency, dashboard.settings.safetyBufferMinor, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.money.saveSettings({
        currency,
        safetyBufferMinor: Math.max(0, parseMoneyMinor(safetyBuffer)),
      });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success("Money settings updated.");
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Settings could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>Money settings</DialogTitle>
          <DialogDescription>
            Set the household currency and the cushion protected from
            safe-to-spend.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel>Household currency</FieldLabel>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {["EUR", "GBP", "USD", "CHF"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Accounts in other currencies stay visible but are excluded from
                the estimate.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="money-safety-buffer">
                Safety buffer
              </FieldLabel>
              <Input
                id="money-safety-buffer"
                inputMode="decimal"
                value={safetyBuffer}
                onChange={(event) => setSafetyBuffer(event.target.value)}
                required
              />
              <FieldDescription>
                A small amount kept out of reach for uncertainty.
              </FieldDescription>
            </Field>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
