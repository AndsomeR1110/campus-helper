// Shared UI components — see docs/design/ui-ux-spec.md §4.
// Import from "@/components/ui".
export {
  Button,
  buttonStyles,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "./button";
export { Card, ListItem, cardStyles, type ListItemProps } from "./card";
export { Chip, ChipGroup, type ChipProps } from "./chip";
export { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";
export {
  ACADEMIC_PROJECT_DISCLAIMER,
  DemoDataNotice,
  type DemoDataNoticeProps,
} from "./demo-data-notice";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { ErrorState, type ErrorKind, type ErrorStateProps } from "./error-state";
export { FormField, useFormField, type FormFieldProps } from "./form-field";
export { IconButton, type IconButtonProps } from "./icon-button";
export { Input, type InputProps } from "./input";
export { Modal, type ModalProps } from "./modal";
export { Select, type SelectProps } from "./select";
export { Skeleton } from "./skeleton";
export { Spinner } from "./spinner";
export {
  STATUS_MAP,
  StatusBadge,
  type StatusBadgeProps,
  type StatusKind,
  type StatusOf,
} from "./status-badge";
export { Textarea, type TextareaProps } from "./textarea";
export { TimeSlotButton, type TimeSlotButtonProps } from "./time-slot-button";
export { Toaster, toast } from "./toast";
export { TypeTag, typeColorClasses, typeIcon, type TagType } from "./type-tag";
