export { ConnectionSkeleton, SchoolTimetableConnection } from "./connection";
export { classCount, formatWeeks } from "./sync-status";
export {
  schoolTimetableAvailable,
  readSyncState,
  syncSchoolTimetable,
  forgetSchoolConnection,
  connectionError,
  type SyncState,
} from "./bridge";
