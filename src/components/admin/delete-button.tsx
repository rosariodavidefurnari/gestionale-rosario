import * as React from "react";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { humanize, singularize } from "inflection";
import type { UseDeleteOptions, RedirectionSideEffect } from "ra-core";
import {
  useDeleteController,
  useEvent,
  useGetRecordRepresentation,
  useResourceTranslation,
  useRecordContext,
  useResourceContext,
  useTranslate,
} from "ra-core";

export type DeleteButtonProps = {
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: React.ReactEventHandler<HTMLButtonElement>;
  mutationOptions?: UseDeleteOptions;
  /**
   * Mutation mode for the delete.
   * - "undoable" (default): optimistic delete with an undo notification.
   * - "pessimistic": waits for the server; the error (e.g. a blocking foreign
   *   key) surfaces BEFORE any success, and no phantom "Undo" toast appears.
   *   Use for records protected by ON DELETE NO ACTION/RESTRICT (clients,
   *   projects) so the user gets a real error instead of a fake success.
   */
  mutationMode?: "undoable" | "pessimistic";
  redirect?: RedirectionSideEffect;
  resource?: string;
  successMessage?: string;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
};

/**
 * A button that deletes a record with undo capability.
 *
 * Renders a destructive button that deletes the current record and shows an undo notification.
 * Automatically redirects after deletion and works with the RecordContext.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/deletebutton/ DeleteButton documentation}
 *
 * @example
 * import { DeleteButton, Edit } from '@/components/admin';
 *
 * const PostEdit = () => (
 *     <Edit actions={<DeleteButton />}>
 *         ...
 *     </Edit>
 * );
 */
export const DeleteButton = (props: DeleteButtonProps) => {
  const {
    label: labelProp,
    onClick,
    size,
    mutationOptions,
    mutationMode = "undoable",
    redirect = "list",
    successMessage,
    variant = "outline",
    className = "cursor-pointer hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
  } = props;
  const record = useRecordContext(props);
  const resource = useResourceContext(props);

  // useDeleteController honours mutationMode (default "undoable" keeps the
  // existing optimistic+undo behaviour for all current consumers); when
  // "pessimistic" the server error surfaces before any success and the
  // success notification is non-undoable (no phantom "Undo" toast).
  const { isPending, handleDelete: controllerHandleDelete } =
    useDeleteController({
      record,
      resource,
      redirect,
      mutationMode,
      mutationOptions,
      successMessage,
    });
  const handleDelete = useEvent(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event?.stopPropagation) event.stopPropagation();
      controllerHandleDelete();
      if (typeof onClick === "function") onClick(event);
    },
  );
  const translate = useTranslate();
  const getRecordRepresentation = useGetRecordRepresentation(resource);
  let recordRepresentation = getRecordRepresentation(record);
  const resourceName = translate(`resources.${resource}.forcedCaseName`, {
    smart_count: 1,
    _: humanize(
      translate(`resources.${resource}.name`, {
        smart_count: 1,
        _: resource ? singularize(resource) : undefined,
      }),
      true,
    ),
  });
  // We don't support React elements for this
  if (React.isValidElement(recordRepresentation)) {
    recordRepresentation = `#${record?.id}`;
  }
  const label = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.action.delete`,
    baseI18nKey: "ra.action.delete",
    options: {
      name: resourceName,
      recordRepresentation,
    },
    userText: labelProp,
  });

  return (
    <Button
      variant={variant}
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={typeof label === "string" ? label : undefined}
      size={size}
      className={className}
    >
      <Trash />
      {label}
    </Button>
  );
};
