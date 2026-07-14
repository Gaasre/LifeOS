import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import type {
  FinancialDecisionRecord,
  FinancialGoalRecord,
  MoneyAccountRecord,
  MoneyDashboard,
  PersonSummary,
  RecurringMoneyItemRecord,
} from "@lifeos/rpc";
import { Button } from "@lifeos/ui/components/button";
import { Checkbox } from "@lifeos/ui/components/checkbox";
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
  FieldLegend,
  FieldSet,
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
import { Switch } from "@lifeos/ui/components/switch";
import { Textarea } from "@lifeos/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lifeos/ui/components/toggle-group";

import { useDocuments } from "@/features/documents/hooks/use-documents";
import {
  moneyInputValue,
  parseMoneyMinor,
  todayDateInput,
  titleCase,
} from "@/features/money/money-format";
import { moneyQueryKey } from "@/features/money/hooks/use-money";
import type { MoneyEditorTarget } from "@/features/money/money-types";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { rpcClient } from "@/lib/rpc-client";

const householdAudienceValue = "household";
const noSelectionValue = "none";
const recurringCategoryOptions: Record<
  RecurringMoneyItemRecord["group"],
  readonly string[]
> = {
  income: [
    "Salary",
    "Freelance",
    "Benefits",
    "Rental income",
    "Investment income",
    "Other income",
  ],
  essential: [
    "Housing",
    "Utilities",
    "Groceries",
    "Insurance",
    "Transport",
    "Health",
    "Childcare",
    "Education",
    "Debt repayment",
    "Taxes",
    "Other essential",
  ],
  subscription: [
    "Phone & internet",
    "Software",
    "Entertainment",
    "Membership",
    "News & media",
    "Cloud storage",
    "Other subscription",
  ],
  savings: [
    "Emergency fund",
    "General savings",
    "Investments",
    "Retirement",
    "Travel",
    "Major purchase",
    "Other savings",
  ],
};

function nullableText(value: string) {
  return value.trim() || null;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sourceDocumentId(record?: {
  documents: Array<{ id: string; role: string }>;
}) {
  return (
    record?.documents.find((document) =>
      ["source", "statement", "receipt"].includes(document.role),
    )?.id ?? null
  );
}

function relatedDocumentIds(
  record: { documents: Array<{ id: string }> } | undefined,
  sourceId: string | null,
) {
  return (
    record?.documents
      .filter((document) => document.id !== sourceId)
      .map((document) => document.id) ?? []
  );
}

function AudienceField({
  people,
  value,
  onChange,
}: {
  people: PersonSummary[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selectedValues = value.length === 0 ? [householdAudienceValue] : value;

  function update(values: string[]) {
    const selectedPeople = values.filter(
      (entry) => entry !== householdAudienceValue,
    );
    if (values.includes(householdAudienceValue) && selectedPeople.length > 0) {
      onChange(value.length === 0 ? selectedPeople : []);
      return;
    }
    onChange(selectedPeople);
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">Applies to</FieldLegend>
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={selectedValues}
        onValueChange={update}
        className="flex-wrap justify-start"
      >
        <ToggleGroupItem value={householdAudienceValue}>
          Household
        </ToggleGroupItem>
        {people.map((person) => (
          <ToggleGroupItem key={person.id} value={person.id}>
            {person.preferredName}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldDescription>
        This is a filter for shared context, not a permission setting.
      </FieldDescription>
    </FieldSet>
  );
}

function DocumentField({
  label,
  personId,
  value,
  onChange,
}: {
  label: string;
  personId?: string | undefined;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const documentsQuery = useDocuments(personId);
  const documents = documentsQuery.data ?? [];
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={value ?? noSelectionValue}
        onValueChange={(next) =>
          onChange(next === noSelectionValue ? null : next)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No document linked" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={noSelectionValue}>No document linked</SelectItem>
            {documents.map((document) => (
              <SelectItem key={document.id} value={document.id}>
                {document.title}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription>
        Documents stay in the Documents module; Money stores only the link.
      </FieldDescription>
    </Field>
  );
}

function ProjectField({
  personId,
  value,
  onChange,
}: {
  personId?: string | undefined;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const projectsQuery = useProjects(personId);
  const projects = projectsQuery.data ?? [];
  return (
    <Field>
      <FieldLabel>Related project</FieldLabel>
      <Select
        value={value ?? noSelectionValue}
        onValueChange={(next) =>
          onChange(next === noSelectionValue ? null : next)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No project linked" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={noSelectionValue}>No project linked</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function CurrencyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>Currency</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {["EUR", "GBP", "USD", "CHF"].map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

type CommonEditorProps = {
  dashboard: MoneyDashboard;
  people: PersonSummary[];
  defaultPersonIds: string[];
  personId?: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AccountEditorDialog({
  dashboard,
  people,
  defaultPersonIds,
  personId,
  open,
  onOpenChange,
  record,
}: CommonEditorProps & { record?: MoneyAccountRecord }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<MoneyAccountRecord["type"]>("bank");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [currency, setCurrency] = useState(dashboard.settings.currency);
  const [included, setIncluded] = useState(true);
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(record?.name ?? "");
    setType(record?.type ?? "bank");
    setInstitution(record?.institution ?? "");
    setBalance(moneyInputValue(record?.balanceMinor ?? 0));
    setCurrency(record?.currency ?? dashboard.settings.currency);
    setIncluded(record?.includeInAvailableBalance ?? true);
    setPersonIds(
      record ? record.people.map((person) => person.id) : defaultPersonIds,
    );
    setDocumentId(sourceDocumentId(record));
    setNotes(record?.notes ?? "");
    setError(null);
  }, [dashboard.settings.currency, defaultPersonIds, open, record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.money.saveAccount({
        ...(record ? { accountId: record.id } : {}),
        name: name.trim(),
        type,
        institution: nullableText(institution),
        balanceMinor: parseMoneyMinor(balance),
        currency,
        includeInAvailableBalance: included,
        notes: nullableText(notes),
        personIds,
        sourceDocumentId: documentId,
        relatedDocumentIds: relatedDocumentIds(record, documentId),
        relatedEntityIds:
          record?.relatedEntities.map((entity) => entity.id) ?? [],
      });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(record ? "Account updated." : "Account added.");
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "The account could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,48rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{record ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            Balances here are the source of truth for available money.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="account-name">Name</FieldLabel>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Household current account"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={type}
                  onValueChange={(value) =>
                    setType(value as MoneyAccountRecord["type"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {["bank", "savings", "cash", "investment", "other"].map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {titleCase(value)}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="account-institution">
                  Institution
                </FieldLabel>
                <Input
                  id="account-institution"
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-balance">
                  Current balance
                </FieldLabel>
                <Input
                  id="account-balance"
                  inputMode="decimal"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  required
                />
              </Field>
              <CurrencyField value={currency} onChange={setCurrency} />
            </div>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="account-included">
                Include in available balance
              </FieldLabel>
              <Switch
                id="account-included"
                checked={included}
                onCheckedChange={setIncluded}
              />
            </Field>
            <AudienceField
              people={people}
              value={personIds}
              onChange={setPersonIds}
            />
            <DocumentField
              label="Source statement"
              personId={personId}
              value={documentId}
              onChange={setDocumentId}
            />
            <Field>
              <FieldLabel htmlFor="account-notes">Notes</FieldLabel>
              <Textarea
                id="account-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context"
              />
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
              ) : record ? (
                "Save changes"
              ) : (
                "Add account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActivityEditorDialog({
  dashboard,
  people,
  defaultPersonIds,
  personId,
  open,
  onOpenChange,
}: CommonEditorProps) {
  const queryClient = useQueryClient();
  const accounts = useMemo(
    () => dashboard.accounts.filter((account) => !account.archived),
    [dashboard.accounts],
  );
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"income" | "expense">("expense");
  const [occurredAt, setOccurredAt] = useState(todayDateInput());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [recurringItemId, setRecurringItemId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setAmount("");
    setDirection("expense");
    setOccurredAt(todayDateInput());
    setAccountId(accounts[0]?.id ?? "");
    setRecurringItemId(null);
    setCategory("");
    setPersonIds(defaultPersonIds);
    setDocumentId(null);
    setNotes("");
    setError(null);
  }, [accounts, defaultPersonIds, open]);

  const selectedAccount = accounts.find((account) => account.id === accountId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAccount) {
      setError("Choose an account.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.money.createEntry({
        title: title.trim(),
        amountMinor: Math.abs(parseMoneyMinor(amount)),
        currency: selectedAccount.currency,
        direction,
        occurredAt,
        accountId,
        recurringItemId,
        category: nullableText(category),
        notes: nullableText(notes),
        personIds,
        sourceDocumentId: documentId,
        relatedDocumentIds: [],
        relatedEntityIds: [],
      });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(
        "Activity recorded. Update the account balance separately if needed.",
      );
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "The activity could not be recorded."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,48rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Add activity</DialogTitle>
          <DialogDescription>
            Record an inflow or outflow for context. This does not change the
            account balance automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel>Direction</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={direction}
                onValueChange={(value) => {
                  if (value === "income" || value === "expense")
                    setDirection(value);
                }}
              >
                <ToggleGroupItem value="income">Income</ToggleGroupItem>
                <ToggleGroupItem value="expense">Expense</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="activity-title">Title</FieldLabel>
                <Input
                  id="activity-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Groceries"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="activity-amount">Amount</FieldLabel>
                <Input
                  id="activity-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="activity-date">Date</FieldLabel>
                <Input
                  id="activity-date"
                  type="date"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Account</FieldLabel>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="activity-category">Category</FieldLabel>
                <Input
                  id="activity-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Related recurring item</FieldLabel>
                <Select
                  value={recurringItemId ?? noSelectionValue}
                  onValueChange={(value) =>
                    setRecurringItemId(
                      value === noSelectionValue ? null : value,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={noSelectionValue}>None</SelectItem>
                      {dashboard.recurring.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <AudienceField
              people={people}
              value={personIds}
              onChange={setPersonIds}
            />
            <DocumentField
              label="Receipt or evidence"
              personId={personId}
              value={documentId}
              onChange={setDocumentId}
            />
            <Field>
              <FieldLabel htmlFor="activity-notes">Notes</FieldLabel>
              <Textarea
                id="activity-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context"
              />
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
            <Button type="submit" disabled={isSaving || accounts.length === 0}>
              {isSaving ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                "Add activity"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecurringEditorDialog({
  dashboard,
  people,
  defaultPersonIds,
  personId,
  open,
  onOpenChange,
  record,
}: CommonEditorProps & { record?: RecurringMoneyItemRecord }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [group, setGroup] =
    useState<RecurringMoneyItemRecord["group"]>("essential");
  const [frequency, setFrequency] =
    useState<RecurringMoneyItemRecord["frequency"]>("monthly");
  const [nextOccurrence, setNextOccurrence] = useState(todayDateInput());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [isVariable, setIsVariable] = useState(false);
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const categoryOptions = recurringCategoryOptions[group];
  const hasLegacyCategory =
    Boolean(category) && !categoryOptions.includes(category);

  useEffect(() => {
    if (!open) return;
    setTitle(record?.title ?? "");
    setAmount(record ? moneyInputValue(record.amountMinor) : "");
    setGroup(record?.group ?? "essential");
    setFrequency(record?.frequency ?? "monthly");
    setNextOccurrence(record?.nextOccurrence ?? todayDateInput());
    setStartDate(record?.startDate ?? "");
    setEndDate(record?.endDate ?? "");
    setAccountId(record?.accountId ?? null);
    setCategory(record?.category ?? "");
    setIsVariable(record?.isVariable ?? false);
    setPersonIds(
      record ? record.people.map((person) => person.id) : defaultPersonIds,
    );
    setDocumentId(sourceDocumentId(record));
    setNotes(record?.notes ?? "");
    setError(null);
  }, [defaultPersonIds, open, record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.money.saveRecurring({
        ...(record ? { itemId: record.id } : {}),
        title: title.trim(),
        amountMinor: Math.abs(parseMoneyMinor(amount)),
        currency: record?.currency ?? dashboard.settings.currency,
        direction: group === "income" ? "income" : "expense",
        group,
        frequency,
        nextOccurrence,
        startDate: startDate || null,
        endDate: endDate || null,
        accountId,
        category: nullableText(category),
        isVariable,
        notes: nullableText(notes),
        personIds,
        sourceDocumentId: documentId,
        relatedDocumentIds: relatedDocumentIds(record, documentId),
        relatedEntityIds:
          record?.relatedEntities.map((entity) => entity.id) ?? [],
      });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(
        record ? "Recurring item updated." : "Recurring item added.",
      );
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "The recurring item could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,52rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>
            {record ? "Edit recurring item" : "Add recurring item"}
          </DialogTitle>
          <DialogDescription>
            Regular income, commitments, subscriptions, and savings shape the
            upcoming window.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="recurring-title">Title</FieldLabel>
                <Input
                  id="recurring-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Rent"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-amount">Amount</FieldLabel>
                <Input
                  id="recurring-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Group</FieldLabel>
                <Select
                  value={group}
                  onValueChange={(value) => {
                    const nextGroup =
                      value as RecurringMoneyItemRecord["group"];
                    setGroup(nextGroup);
                    if (
                      !recurringCategoryOptions[nextGroup].includes(category)
                    ) {
                      setCategory("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="essential">
                        Essential commitment
                      </SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="savings">Planned savings</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Frequency</FieldLabel>
                <Select
                  value={frequency}
                  onValueChange={(value) =>
                    setFrequency(value as RecurringMoneyItemRecord["frequency"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {["weekly", "monthly", "quarterly", "yearly"].map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {titleCase(value)}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-next">
                  Next occurrence
                </FieldLabel>
                <Input
                  id="recurring-next"
                  type="date"
                  value={nextOccurrence}
                  onChange={(event) => setNextOccurrence(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-start">Start date</FieldLabel>
                <Input
                  id="recurring-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-end">End date</FieldLabel>
                <Input
                  id="recurring-end"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Account</FieldLabel>
                <Select
                  value={accountId ?? noSelectionValue}
                  onValueChange={(value) =>
                    setAccountId(value === noSelectionValue ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={noSelectionValue}>
                        No account
                      </SelectItem>
                      {dashboard.accounts
                        .filter((account) => !account.archived)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={category || noSelectionValue}
                  onValueChange={(value) =>
                    setCategory(value === noSelectionValue ? "" : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={noSelectionValue}>
                        Uncategorized
                      </SelectItem>
                      {hasLegacyCategory ? (
                        <SelectItem value={category}>{category}</SelectItem>
                      ) : null}
                      {categoryOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Choices follow the selected recurring group.
                </FieldDescription>
              </Field>
            </div>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="recurring-variable">
                Amount can vary
              </FieldLabel>
              <Switch
                id="recurring-variable"
                checked={isVariable}
                onCheckedChange={setIsVariable}
              />
            </Field>
            <AudienceField
              people={people}
              value={personIds}
              onChange={setPersonIds}
            />
            <DocumentField
              label="Source document"
              personId={personId}
              value={documentId}
              onChange={setDocumentId}
            />
            <Field>
              <FieldLabel htmlFor="recurring-notes">Notes</FieldLabel>
              <Textarea
                id="recurring-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context"
              />
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
              ) : record ? (
                "Save changes"
              ) : (
                "Add recurring item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalEditorDialog({
  dashboard,
  people,
  defaultPersonIds,
  personId,
  open,
  onOpenChange,
  record,
}: CommonEditorProps & { record?: FinancialGoalRecord }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0.00");
  const [targetDate, setTargetDate] = useState("");
  const [contribution, setContribution] = useState("0.00");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [reserved, setReserved] = useState(true);
  const [status, setStatus] = useState<FinancialGoalRecord["status"]>("active");
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(record?.title ?? "");
    setTargetAmount(record ? moneyInputValue(record.targetAmountMinor) : "");
    setCurrentAmount(moneyInputValue(record?.currentAmountMinor ?? 0));
    setTargetDate(record?.targetDate ?? "");
    setContribution(moneyInputValue(record?.recurringContributionMinor ?? 0));
    setAccountId(record?.relatedAccountId ?? null);
    setProjectId(record?.relatedProjectId ?? null);
    setReserved(record?.excludeFromSafeToSpend ?? true);
    setStatus(record?.status ?? "active");
    setPersonIds(
      record ? record.people.map((person) => person.id) : defaultPersonIds,
    );
    setDocumentId(sourceDocumentId(record));
    setNotes(record?.notes ?? "");
    setError(null);
  }, [defaultPersonIds, open, record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.money.saveGoal({
        ...(record ? { goalId: record.id } : {}),
        title: title.trim(),
        targetAmountMinor: Math.abs(parseMoneyMinor(targetAmount)),
        currentAmountMinor: Math.max(0, parseMoneyMinor(currentAmount)),
        currency: record?.currency ?? dashboard.settings.currency,
        targetDate: targetDate || null,
        recurringContributionMinor: Math.max(0, parseMoneyMinor(contribution)),
        relatedAccountId: accountId,
        relatedProjectId: projectId,
        excludeFromSafeToSpend: reserved,
        status,
        notes: nullableText(notes),
        personIds,
        sourceDocumentId: documentId,
        relatedDocumentIds: relatedDocumentIds(record, documentId),
        relatedEntityIds:
          record?.relatedEntities.map((entity) => entity.id) ?? [],
      });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(record ? "Goal updated." : "Goal added.");
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "The goal could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,52rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>
            {record ? "Edit financial goal" : "Add financial goal"}
          </DialogTitle>
          <DialogDescription>
            Track progress and choose whether saved money is protected from
            safe-to-spend.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="goal-title">Title</FieldLabel>
                <Input
                  id="goal-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Emergency fund"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-target">Target amount</FieldLabel>
                <Input
                  id="goal-target"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-current">Already saved</FieldLabel>
                <Input
                  id="goal-current"
                  inputMode="decimal"
                  value={currentAmount}
                  onChange={(event) => setCurrentAmount(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-date">Target date</FieldLabel>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-contribution">
                  Regular contribution
                </FieldLabel>
                <Input
                  id="goal-contribution"
                  inputMode="decimal"
                  value={contribution}
                  onChange={(event) => setContribution(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Related account</FieldLabel>
                <Select
                  value={accountId ?? noSelectionValue}
                  onValueChange={(value) =>
                    setAccountId(value === noSelectionValue ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={noSelectionValue}>
                        No account
                      </SelectItem>
                      {dashboard.accounts
                        .filter((account) => !account.archived)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as FinancialGoalRecord["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {["active", "paused", "completed"].map((value) => (
                        <SelectItem key={value} value={value}>
                          {titleCase(value)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field orientation="horizontal">
              <div>
                <FieldLabel htmlFor="goal-reserved">
                  Reserve this money
                </FieldLabel>
                <FieldDescription>
                  Subtract saved money from safe-to-spend unless it is already
                  isolated in an excluded account.
                </FieldDescription>
              </div>
              <Switch
                id="goal-reserved"
                checked={reserved}
                onCheckedChange={setReserved}
              />
            </Field>
            <ProjectField
              personId={personId}
              value={projectId}
              onChange={setProjectId}
            />
            <AudienceField
              people={people}
              value={personIds}
              onChange={setPersonIds}
            />
            <DocumentField
              label="Source document"
              personId={personId}
              value={documentId}
              onChange={setDocumentId}
            />
            <Field>
              <FieldLabel htmlFor="goal-notes">Notes</FieldLabel>
              <Textarea
                id="goal-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context"
              />
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
              ) : record ? (
                "Save changes"
              ) : (
                "Add goal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DecisionOptionDraft = {
  key: string;
  id?: string;
  title: string;
  monthlyImpact: string;
  upfrontCost: string;
  annualImpact: string;
  currency: string;
  notes: string;
};

function blankDecisionOption(currency: string): DecisionOptionDraft {
  return {
    key: crypto.randomUUID(),
    title: "",
    monthlyImpact: "0.00",
    upfrontCost: "0.00",
    annualImpact: "0.00",
    currency,
    notes: "",
  };
}

function DecisionEditorDialog({
  dashboard,
  people,
  defaultPersonIds,
  personId,
  open,
  onOpenChange,
  record,
}: CommonEditorProps & { record?: FinancialDecisionRecord }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] =
    useState<FinancialDecisionRecord["status"]>("considering");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [options, setOptions] = useState<DecisionOptionDraft[]>([]);
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(record?.title ?? "");
    setDescription(record?.description ?? "");
    setStatus(record?.status ?? "considering");
    setProjectId(record?.relatedProjectId ?? null);
    setSelectedOptionId(
      record?.options.find((option) => option.selected)?.id ?? null,
    );
    setOptions(
      record
        ? record.options.map((option) => ({
            key: option.id,
            id: option.id,
            title: option.title,
            monthlyImpact: moneyInputValue(option.monthlyImpactMinor),
            upfrontCost: moneyInputValue(option.upfrontCostMinor),
            annualImpact: moneyInputValue(option.annualImpactMinor),
            currency: option.currency,
            notes: option.notes ?? "",
          }))
        : [blankDecisionOption(dashboard.settings.currency)],
    );
    setPersonIds(
      record ? record.people.map((person) => person.id) : defaultPersonIds,
    );
    setDocumentId(sourceDocumentId(record));
    setNotes(record?.notes ?? "");
    setError(null);
  }, [dashboard.settings.currency, defaultPersonIds, open, record]);

  function updateOption(
    key: string,
    field: keyof Omit<DecisionOptionDraft, "key" | "id">,
    value: string,
  ) {
    setOptions((current) =>
      current.map((option) =>
        option.key === key ? { ...option, [field]: value } : option,
      ),
    );
  }

  function removeOption(key: string) {
    setOptions((current) => current.filter((option) => option.key !== key));
    const option = options.find((entry) => entry.key === key);
    if (option?.id === selectedOptionId) setSelectedOptionId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "decided" && !selectedOptionId) {
      setError("Choose a saved option before marking the decision as decided.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.money.saveDecision({
        ...(record ? { decisionId: record.id } : {}),
        title: title.trim(),
        description: nullableText(description),
        status,
        relatedProjectId: projectId,
        selectedOptionId,
        notes: nullableText(notes),
        options: options.map((option) => ({
          ...(option.id ? { id: option.id } : {}),
          title: option.title.trim(),
          monthlyImpactMinor: parseMoneyMinor(option.monthlyImpact),
          upfrontCostMinor: Math.max(0, parseMoneyMinor(option.upfrontCost)),
          annualImpactMinor: parseMoneyMinor(option.annualImpact),
          currency: option.currency,
          notes: nullableText(option.notes),
        })),
        personIds,
        sourceDocumentId: documentId,
        relatedDocumentIds: relatedDocumentIds(record, documentId),
        relatedEntityIds:
          record?.relatedEntities.map((entity) => entity.id) ?? [],
      });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(record ? "Decision updated." : "Decision added.");
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "The decision could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(94dvh,56rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle>
            {record ? "Edit financial decision" : "Add financial decision"}
          </DialogTitle>
          <DialogDescription>
            Compare scenarios without changing real accounts or recurring
            commitments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="decision-title">Decision</FieldLabel>
              <Input
                id="decision-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Switch health insurance"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="decision-description">
                What are you deciding?
              </FieldLabel>
              <Textarea
                id="decision-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A short description of the trade-off"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as FinancialDecisionRecord["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="considering">Considering</SelectItem>
                      {record ? (
                        <>
                          <SelectItem value="decided">Decided</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </>
                      ) : null}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {!record ? (
                  <FieldDescription>
                    Save the comparison first, then choose an option.
                  </FieldDescription>
                ) : null}
              </Field>
              {record ? (
                <Field>
                  <FieldLabel>Chosen option</FieldLabel>
                  <Select
                    value={selectedOptionId ?? noSelectionValue}
                    onValueChange={(value) =>
                      setSelectedOptionId(
                        value === noSelectionValue ? null : value,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No option chosen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={noSelectionValue}>
                          No option chosen
                        </SelectItem>
                        {options.flatMap((option) =>
                          option.id
                            ? [
                                <SelectItem key={option.id} value={option.id}>
                                  {option.title || "Untitled option"}
                                </SelectItem>,
                              ]
                            : [],
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>

            <FieldSet className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <FieldLegend>Options</FieldLegend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={options.length >= 6}
                  onClick={() =>
                    setOptions((current) => [
                      ...current,
                      blankDecisionOption(dashboard.settings.currency),
                    ])
                  }
                >
                  <PlusIcon data-icon="inline-start" /> Add option
                </Button>
              </div>
              <div className="space-y-4">
                {options.map((option, index) => (
                  <div
                    key={option.key}
                    className="rounded-lg border bg-muted/15 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Option {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={options.length === 1}
                        onClick={() => removeOption(option.key)}
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <MinusIcon />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <FieldLabel
                          htmlFor={`decision-option-title-${option.key}`}
                        >
                          Title
                        </FieldLabel>
                        <Input
                          id={`decision-option-title-${option.key}`}
                          value={option.title}
                          onChange={(event) =>
                            updateOption(
                              option.key,
                              "title",
                              event.target.value,
                            )
                          }
                          placeholder="Keep current plan"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor={`decision-option-monthly-${option.key}`}
                        >
                          Monthly impact
                        </FieldLabel>
                        <Input
                          id={`decision-option-monthly-${option.key}`}
                          inputMode="decimal"
                          value={option.monthlyImpact}
                          onChange={(event) =>
                            updateOption(
                              option.key,
                              "monthlyImpact",
                              event.target.value,
                            )
                          }
                        />
                        <FieldDescription>
                          Negative means a saving.
                        </FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor={`decision-option-upfront-${option.key}`}
                        >
                          Upfront cost
                        </FieldLabel>
                        <Input
                          id={`decision-option-upfront-${option.key}`}
                          inputMode="decimal"
                          value={option.upfrontCost}
                          onChange={(event) =>
                            updateOption(
                              option.key,
                              "upfrontCost",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor={`decision-option-annual-${option.key}`}
                        >
                          Annual impact
                        </FieldLabel>
                        <Input
                          id={`decision-option-annual-${option.key}`}
                          inputMode="decimal"
                          value={option.annualImpact}
                          onChange={(event) =>
                            updateOption(
                              option.key,
                              "annualImpact",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                      <CurrencyField
                        value={option.currency}
                        onChange={(value) =>
                          updateOption(option.key, "currency", value)
                        }
                      />
                      <Field className="sm:col-span-2">
                        <FieldLabel
                          htmlFor={`decision-option-notes-${option.key}`}
                        >
                          Notes
                        </FieldLabel>
                        <Input
                          id={`decision-option-notes-${option.key}`}
                          value={option.notes}
                          onChange={(event) =>
                            updateOption(
                              option.key,
                              "notes",
                              event.target.value,
                            )
                          }
                          placeholder="Optional trade-offs"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </FieldSet>

            <ProjectField
              personId={personId}
              value={projectId}
              onChange={setProjectId}
            />
            <AudienceField
              people={people}
              value={personIds}
              onChange={setPersonIds}
            />
            <DocumentField
              label="Source document"
              personId={personId}
              value={documentId}
              onChange={setDocumentId}
            />
            <Field>
              <FieldLabel htmlFor="decision-notes">Notes</FieldLabel>
              <Textarea
                id="decision-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context"
              />
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
              ) : record ? (
                "Save changes"
              ) : (
                "Add decision"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoneyEditorDialogs({
  target,
  onClose,
  dashboard,
  people,
  defaultPersonIds,
  personId,
}: {
  target: MoneyEditorTarget | null;
  onClose: () => void;
  dashboard: MoneyDashboard;
  people: PersonSummary[];
  defaultPersonIds: string[];
  personId?: string;
}) {
  if (!target) return null;
  const commonProps = {
    dashboard,
    people,
    defaultPersonIds,
    ...(personId ? { personId } : {}),
    open: true,
    onOpenChange: (nextOpen: boolean) => {
      if (!nextOpen) onClose();
    },
  };

  if (target.kind === "account") {
    return (
      <AccountEditorDialog
        {...commonProps}
        {...(target.record ? { record: target.record } : {})}
      />
    );
  }
  if (target.kind === "activity") {
    return <ActivityEditorDialog {...commonProps} />;
  }
  if (target.kind === "recurring") {
    return (
      <RecurringEditorDialog
        {...commonProps}
        {...(target.record ? { record: target.record } : {})}
      />
    );
  }
  if (target.kind === "goal") {
    return (
      <GoalEditorDialog
        {...commonProps}
        {...(target.record ? { record: target.record } : {})}
      />
    );
  }
  return (
    <DecisionEditorDialog
      {...commonProps}
      {...(target.record ? { record: target.record } : {})}
    />
  );
}
