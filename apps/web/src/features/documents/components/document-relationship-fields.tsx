import type { PersonSummary } from "@lifeos/rpc";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@lifeos/ui/components/field";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lifeos/ui/components/toggle-group";

import {
  documentModuleOptions,
  type DocumentModuleValue,
} from "@/features/documents/document-relationships";

type DocumentRelationshipFieldsProps = {
  people: PersonSummary[];
  personIds: string[];
  onPersonIdsChange: (personIds: string[]) => void;
  modules: DocumentModuleValue[];
  onModulesChange: (modules: DocumentModuleValue[]) => void;
  peopleDescription?: string;
};

export function DocumentRelationshipFields({
  people,
  personIds,
  onPersonIdsChange,
  modules,
  onModulesChange,
  peopleDescription = "Choose one person, both people, or neither for a household-level document.",
}: DocumentRelationshipFieldsProps) {
  return (
    <>
      <Field>
        <FieldLabel>People</FieldLabel>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={personIds}
          onValueChange={onPersonIdsChange}
          className="w-full flex-wrap justify-start"
          aria-label="People this document belongs to"
        >
          {people.map((person) => (
            <ToggleGroupItem key={person.id} value={person.id}>
              {person.preferredName}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>{peopleDescription}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Modules</FieldLabel>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={modules}
          onValueChange={(values) =>
            onModulesChange(values as DocumentModuleValue[])
          }
          className="w-full flex-wrap justify-start"
          aria-label="Modules where this document appears"
        >
          {documentModuleOptions.map((module) => (
            <ToggleGroupItem key={module.value} value={module.value}>
              {module.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>
          Choose any additional modules where this document should surface. The
          original always stays in Documents.
        </FieldDescription>
      </Field>
    </>
  );
}
