import { useState, type FormEvent, type ReactNode } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import type {
  OfficialRecord,
  OfficialRecordStatus,
  PersonalDate,
  PersonFact,
  PersonProfile,
  PersonSourceDocument,
} from "@lifeos/rpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lifeos/ui/components/alert-dialog";
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
  FieldContent,
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
import { Switch } from "@lifeos/ui/components/switch";
import { Textarea } from "@lifeos/ui/components/textarea";

import {
  officialRecordStatuses,
  officialRecordTypes,
  type UsefulFactField,
} from "@/features/me/me-config";
import { rpcClient } from "@/lib/rpc-client";

const noSourceDocument = "__none__";
const otherRecordType = "__other__";

type DialogControlProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

function useDialogControl(
  controlledOpen?: boolean,
  onControlledOpenChange?: (open: boolean) => void,
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onControlledOpenChange?.(nextOpen);
  }

  return [open, setOpen] as const;
}

function nullableText(value: string) {
  return value.trim() || null;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function parseLanguages(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean),
    ),
  ];
}

function isKnownRecordType(value: string) {
  return (officialRecordTypes as readonly string[]).includes(value);
}

export function PersonProfileDialog({
  profile,
  onChanged,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  profile: PersonProfile;
  onChanged: () => void | Promise<void>;
  trigger?: ReactNode;
} & DialogControlProps) {
  const [open, setOpen] = useDialogControl(controlledOpen, onOpenChange);
  const [preferredName, setPreferredName] = useState(profile.preferredName);
  const [legalName, setLegalName] = useState(profile.legalName ?? "");
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [placeOfBirth, setPlaceOfBirth] = useState(profile.placeOfBirth ?? "");
  const [nationality, setNationality] = useState(profile.nationality ?? "");
  const [currentCity, setCurrentCity] = useState(profile.currentCity ?? "");
  const [currentAddress, setCurrentAddress] = useState(
    profile.currentAddress ?? "",
  );
  const [maritalStatus, setMaritalStatus] = useState(
    profile.maritalStatus ?? "",
  );
  const [languages, setLanguages] = useState(profile.languages.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setPreferredName(profile.preferredName);
    setLegalName(profile.legalName ?? "");
    setBirthday(profile.birthday ?? "");
    setPlaceOfBirth(profile.placeOfBirth ?? "");
    setNationality(profile.nationality ?? "");
    setCurrentCity(profile.currentCity ?? "");
    setCurrentAddress(profile.currentAddress ?? "");
    setMaritalStatus(profile.maritalStatus ?? "");
    setLanguages(profile.languages.join(", "));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.me.updateProfile({
        personId: profile.id,
        preferredName: preferredName.trim(),
        legalName: nullableText(legalName),
        birthday: birthday || null,
        placeOfBirth: nullableText(placeOfBirth),
        nationality: nullableText(nationality),
        currentCity: nullableText(currentCity),
        currentAddress: nullableText(currentAddress),
        maritalStatus: nullableText(maritalStatus),
        languages: parseLanguages(languages),
      });
      toast.success(`${preferredName.trim()}’s overview was updated.`);
      setOpen(false);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught, "This overview could not be updated."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline" size="sm">
              <PencilIcon data-icon="inline-start" />
              Edit overview
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <form
          className="grid max-h-[90dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
          onSubmit={submit}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Edit personal overview</DialogTitle>
            <DialogDescription>
              Keep the identity details most often needed for forms and official
              processes in one clear summary.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="person-legal-name">
                  Full legal name
                </FieldLabel>
                <Input
                  id="person-legal-name"
                  value={legalName}
                  maxLength={140}
                  onChange={(event) => setLegalName(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-preferred-name">
                  Preferred name
                </FieldLabel>
                <Input
                  id="person-preferred-name"
                  value={preferredName}
                  maxLength={100}
                  onChange={(event) => setPreferredName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-birthday">Date of birth</FieldLabel>
                <Input
                  id="person-birthday"
                  type="date"
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-birth-place">
                  Place of birth
                </FieldLabel>
                <Input
                  id="person-birth-place"
                  value={placeOfBirth}
                  maxLength={140}
                  onChange={(event) => setPlaceOfBirth(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-nationality">
                  Nationality
                </FieldLabel>
                <Input
                  id="person-nationality"
                  value={nationality}
                  maxLength={120}
                  onChange={(event) => setNationality(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-current-city">
                  Current city
                </FieldLabel>
                <Input
                  id="person-current-city"
                  value={currentCity}
                  maxLength={140}
                  onChange={(event) => setCurrentCity(event.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="person-current-address">
                  Current address
                </FieldLabel>
                <Textarea
                  id="person-current-address"
                  value={currentAddress}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => setCurrentAddress(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-marital-status">
                  Marital status
                </FieldLabel>
                <Input
                  id="person-marital-status"
                  value={maritalStatus}
                  maxLength={80}
                  onChange={(event) => setMaritalStatus(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-languages">Languages</FieldLabel>
                <Input
                  id="person-languages"
                  value={languages}
                  maxLength={500}
                  placeholder="Arabic, English, French"
                  onChange={(event) => setLanguages(event.target.value)}
                />
                <FieldDescription>
                  Separate languages with commas.
                </FieldDescription>
              </Field>
              <FieldError className="sm:col-span-2">{error}</FieldError>
            </FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0 px-6 py-4">
            <Button type="submit" disabled={!preferredName.trim() || isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving ? "Saving…" : "Save overview"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PersonFactDialog({
  personId,
  fact,
  preset,
  onChanged,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  personId: string;
  fact?: PersonFact;
  preset?: UsefulFactField;
  onChanged: () => void | Promise<void>;
  trigger?: ReactNode;
} & DialogControlProps) {
  const [open, setOpen] = useDialogControl(controlledOpen, onOpenChange);
  const [label, setLabel] = useState(preset?.label ?? fact?.label ?? "");
  const [value, setValue] = useState(fact?.value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setLabel(preset?.label ?? fact?.label ?? "");
    setValue(fact?.value ?? "");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.me.saveFact({
        personId,
        ...(fact ? { id: fact.id } : {}),
        ...(!fact && preset ? { key: preset.key } : {}),
        kind: "preference",
        label: label.trim(),
        value: value.trim(),
        sourceDocumentId: fact?.sourceDocumentId ?? null,
      });
      toast.success(
        fact ? `${label.trim()} updated.` : `${label.trim()} added.`,
      );
      setOpen(false);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught, "This personal fact could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  const fieldName = preset?.label ?? fact?.label ?? "personal fact";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline" size="sm">
              <PlusIcon data-icon="inline-start" />
              Add custom field
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <form
          className="grid max-h-[90dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
          onSubmit={submit}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {fact ? `Edit ${fieldName}` : `Add ${fieldName}`}
            </DialogTitle>
            <DialogDescription>
              Save a stable fact that will be useful again. Notes and changing
              plans belong in their own modules.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            <FieldGroup>
              {!preset ? (
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="fact-label">Field name</FieldLabel>
                  <Input
                    id="fact-label"
                    value={label}
                    maxLength={80}
                    placeholder="Jacket size"
                    onChange={(event) => setLabel(event.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                </Field>
              ) : null}
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="fact-value">Value</FieldLabel>
                <Textarea
                  id="fact-value"
                  value={value}
                  maxLength={500}
                  rows={3}
                  placeholder={preset?.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </Field>
              <FieldError>{error}</FieldError>
            </FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0 px-6 py-4">
            <Button
              type="submit"
              disabled={!label.trim() || !value.trim() || isSaving}
            >
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving ? "Saving…" : "Save fact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OfficialRecordDialog({
  personId,
  record,
  sourceDocuments,
  onChanged,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  personId: string;
  record?: OfficialRecord;
  sourceDocuments: PersonSourceDocument[];
  onChanged: () => void | Promise<void>;
  trigger?: ReactNode;
} & DialogControlProps) {
  const initialType = record
    ? isKnownRecordType(record.recordType)
      ? record.recordType
      : otherRecordType
    : officialRecordTypes[0];
  const [open, setOpen] = useDialogControl(controlledOpen, onOpenChange);
  const [selectedType, setSelectedType] = useState(initialType);
  const [customType, setCustomType] = useState(
    record && !isKnownRecordType(record.recordType) ? record.recordType : "",
  );
  const [identifier, setIdentifier] = useState(record?.identifier ?? "");
  const [issuingAuthority, setIssuingAuthority] = useState(
    record?.issuingAuthority ?? "",
  );
  const [country, setCountry] = useState(record?.country ?? "");
  const [issueDate, setIssueDate] = useState(record?.issueDate ?? "");
  const [expiryDate, setExpiryDate] = useState(record?.expiryDate ?? "");
  const [status, setStatus] = useState<OfficialRecordStatus>(
    record?.status ?? "current",
  );
  const [sourceDocumentId, setSourceDocumentId] = useState(
    record?.sourceDocumentId ?? noSourceDocument,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setSelectedType(initialType);
    setCustomType(
      record && !isKnownRecordType(record.recordType) ? record.recordType : "",
    );
    setIdentifier(record?.identifier ?? "");
    setIssuingAuthority(record?.issuingAuthority ?? "");
    setCountry(record?.country ?? "");
    setIssueDate(record?.issueDate ?? "");
    setExpiryDate(record?.expiryDate ?? "");
    setStatus(record?.status ?? "current");
    setSourceDocumentId(record?.sourceDocumentId ?? noSourceDocument);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recordType =
      selectedType === otherRecordType ? customType.trim() : selectedType;
    if (!recordType) return;

    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.me.saveOfficialRecord({
        personId,
        ...(record ? { id: record.id } : {}),
        recordType,
        title: recordType,
        identifier: nullableText(identifier),
        issuingAuthority: nullableText(issuingAuthority),
        country: nullableText(country),
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        status,
        sourceDocumentId:
          sourceDocumentId === noSourceDocument ? null : sourceDocumentId,
      });
      toast.success(record ? `${recordType} updated.` : `${recordType} added.`);
      setOpen(false);
      await onChanged();
    } catch (caught) {
      setError(
        errorMessage(caught, "This official record could not be saved."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const recordType =
    selectedType === otherRecordType ? customType.trim() : selectedType;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline" size="sm">
              <PlusIcon data-icon="inline-start" />
              Add official record
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form
          className="grid max-h-[90dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
          onSubmit={submit}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {record
                ? `Edit ${record.recordType}`
                : "Add official information"}
            </DialogTitle>
            <DialogDescription>
              Store the reusable fields here. Link the original file from
              Documents instead of copying it into this profile.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="record-type">Record type</FieldLabel>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger
                    id="record-type"
                    className="w-full"
                    aria-invalid={Boolean(error)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {officialRecordTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      <SelectItem value={otherRecordType}>Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {selectedType === otherRecordType ? (
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="record-custom-type">
                    Record name
                  </FieldLabel>
                  <Input
                    id="record-custom-type"
                    value={customType}
                    maxLength={80}
                    placeholder="Professional licence"
                    onChange={(event) => setCustomType(event.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="record-identifier">Identifier</FieldLabel>
                <Input
                  id="record-identifier"
                  value={identifier}
                  maxLength={160}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="record-authority">
                  Issuing authority
                </FieldLabel>
                <Input
                  id="record-authority"
                  value={issuingAuthority}
                  maxLength={160}
                  onChange={(event) => setIssuingAuthority(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="record-country">Country</FieldLabel>
                <Input
                  id="record-country"
                  value={country}
                  maxLength={120}
                  onChange={(event) => setCountry(event.target.value)}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="record-issued">Issue date</FieldLabel>
                  <Input
                    id="record-issued"
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="record-expiry">Expiry date</FieldLabel>
                  <Input
                    id="record-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="record-status">Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(nextStatus) =>
                    setStatus(nextStatus as OfficialRecordStatus)
                  }
                >
                  <SelectTrigger id="record-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {officialRecordStatuses.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="record-source">Source document</FieldLabel>
                <Select
                  value={sourceDocumentId}
                  onValueChange={setSourceDocumentId}
                >
                  <SelectTrigger id="record-source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={noSourceDocument}>
                        No document linked
                      </SelectItem>
                      {sourceDocuments.map((document) => (
                        <SelectItem key={document.id} value={document.id}>
                          {document.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  The original file remains in Documents.
                </FieldDescription>
              </Field>
              <FieldError>{error}</FieldError>
            </FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0 px-6 py-4">
            <Button type="submit" disabled={!recordType || isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving ? "Saving…" : "Save record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PersonalDateDialog({
  personId,
  date,
  onChanged,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  personId: string;
  date?: PersonalDate;
  onChanged: () => void | Promise<void>;
  trigger?: ReactNode;
} & DialogControlProps) {
  const [open, setOpen] = useDialogControl(controlledOpen, onOpenChange);
  const [label, setLabel] = useState(date?.label ?? "");
  const [occursOn, setOccursOn] = useState(date?.occursOn ?? "");
  const [recursAnnually, setRecursAnnually] = useState(
    date?.recursAnnually ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setLabel(date?.label ?? "");
    setOccursOn(date?.occursOn ?? "");
    setRecursAnnually(date?.recursAnnually ?? false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.me.savePersonalDate({
        personId,
        ...(date ? { id: date.id } : {}),
        label: label.trim(),
        occursOn,
        recursAnnually,
      });
      toast.success(
        date ? `${label.trim()} updated.` : `${label.trim()} added.`,
      );
      setOpen(false);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught, "This date could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline" size="sm">
              <PlusIcon data-icon="inline-start" />
              Add personal date
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <form
          className="grid max-h-[90dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
          onSubmit={submit}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {date ? `Edit ${date.label}` : "Add a personal date"}
            </DialogTitle>
            <DialogDescription>
              Use this for a renewal or personal date that is not already
              supplied by the overview or an official record.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="personal-date-label">Name</FieldLabel>
                <Input
                  id="personal-date-label"
                  value={label}
                  maxLength={120}
                  placeholder="Professional licence renewal"
                  onChange={(event) => setLabel(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </Field>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="personal-date-value">Date</FieldLabel>
                <Input
                  id="personal-date-value"
                  type="date"
                  value={occursOn}
                  onChange={(event) => setOccursOn(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </Field>
              <Field orientation="horizontal" className="rounded-xl border p-3">
                <FieldContent>
                  <FieldLabel htmlFor="personal-date-repeat">
                    Repeat every year
                  </FieldLabel>
                  <FieldDescription>
                    Useful for annual registrations and recurring renewals.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="personal-date-repeat"
                  checked={recursAnnually}
                  onCheckedChange={setRecursAnnually}
                />
              </Field>
              <FieldError>{error}</FieldError>
            </FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0 px-6 py-4">
            <Button
              type="submit"
              disabled={!label.trim() || !occursOn || isSaving}
            >
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving ? "Saving…" : "Save date"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RemovablePersonItem =
  | { type: "fact"; id: string }
  | { type: "record"; id: string }
  | { type: "date"; id: string };

export function RemovePersonItemButton({
  personId,
  item,
  title,
  onChanged,
}: {
  personId: string;
  item: RemovablePersonItem;
  title: string;
  onChanged: () => void | Promise<void>;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  async function remove() {
    setIsRemoving(true);
    try {
      if (item.type === "fact") {
        await rpcClient.me.deleteFact({ personId, factId: item.id });
      } else if (item.type === "record") {
        await rpcClient.me.deleteOfficialRecord({
          personId,
          recordId: item.id,
        });
      } else {
        await rpcClient.me.deletePersonalDate({ personId, dateId: item.id });
      }
      toast.success(`${title} removed.`);
      await onChanged();
    } catch (caught) {
      toast.error(errorMessage(caught, `${title} could not be removed.`));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${title}`}
        >
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            {item.type === "record"
              ? "This removes the structured information. Any linked source file stays in Documents."
              : "This removes the structured information from this person’s profile."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isRemoving}
            onClick={() => void remove()}
          >
            {isRemoving ? <Spinner data-icon="inline-start" /> : null}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
