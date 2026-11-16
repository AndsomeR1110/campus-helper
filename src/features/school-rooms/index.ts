export {
  NotConnected as RoomsNotConnected,
  RoomsSkeleton,
  RoomsView,
} from "./components/rooms-view";
export type { RoomsStatus, RoomsViewProps } from "./components/rooms-view";
export type * from "./types";
export {
  schoolRoomsAvailable,
  resumeRoomsSession,
  readRoomFloors,
  readRoomAvailability,
  readRoomReservations,
  prepareRoomBooking,
  bookRoom,
  cancelRoom,
  readRoomsCapabilities,
  readPendingRoomWrite,
  reconcileRoomWrite,
} from "./bridge";
export { SchoolRoomsConnection } from "./connection";
/** DEVELOPMENT PREVIEW with fictional data — only for /services/rooms/preview. */
export { RoomsPreview as RoomsDevPreview } from "./components/rooms-preview";
