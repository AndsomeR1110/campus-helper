/**
 * Admin module public interface (safe for client components).
 * Pages use `@/features/admin`; server code uses `@/features/admin/server`.
 */
export {
  auditActionFor,
  canDecideReport,
  type AuditEntry,
  type AuditTarget,
  type ModerateResult,
  type ModerationReport,
  type ReportDecision,
} from "./moderation";

export { ReportActions } from "./components/report-actions";
