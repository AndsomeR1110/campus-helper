/**
 * Lost & Found public interface, safe to import from client components.
 * Pages and other features use `@/features/lost-found`; server code uses
 * `@/features/lost-found/server` (frontend-architecture §4).
 */
export * from "./types";

export {
  ALLOWED_IMAGE_TYPES,
  CATEGORY_LABELS,
  CLAIM_STATUS_LABELS,
  formatDisplayName,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_REPORT_REASON_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_CLAIM_MESSAGE_LENGTH,
  POST_CATEGORIES,
  POST_KIND_LABELS,
  POST_STATUS_LABELS,
} from "./constants";

export {
  DEFAULT_FILTERS,
  filterPosts,
  hasActiveFilters,
  matchesFilters,
  parsePostFilters,
  sortPostsByNewest,
  toSearchString,
  type SearchParamsLike,
} from "./filters";

export {
  canClaimPost,
  canClosePost,
  canDecideClaim,
  canDeletePost,
  canEditPost,
  canHidePost,
  canModerate,
  canReadClaims,
  canReportPost,
  canViewPost,
  isAdmin,
  isAuthor,
} from "./rules";

export {
  validateClaimInput,
  validateImageMeta,
  validatePostInput,
  validateReportInput,
} from "./validation";

export { PostCard } from "./components/post-card";
export { PostFilterBar } from "./components/post-filter-bar";
export { PostForm } from "./components/post-form";
export { ClaimPanel } from "./components/claim-panel";
export { PostOwnerActions } from "./components/post-owner-actions";
export { ReportDialog } from "./components/report-dialog";
