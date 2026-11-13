export {
  schoolAuthAvailable,
  schoolAuthError,
  beginSchoolAuth,
  submitSchoolCredentials,
  submitSchoolImageCode,
  refreshSchoolImage,
  showSchoolChallenge,
  cancelSchoolAuth,
  completeSchoolConnection,
  disconnectSchoolAccount,
  type SchoolAuthState,
  type SchoolService,
  type SchoolAuthOperation,
} from "./bridge";
export { SchoolSignIn, type SchoolSignInProps } from "./components/school-sign-in";
export type {
  SchoolAuthCommands,
  SchoolAuthError,
  SchoolAuthState as SchoolSignInState,
} from "./types";
export { SignInPreview as SchoolSignInDevPreview } from "./components/sign-in-preview";
export { PreviewBanner as SchoolSignInPreviewBanner } from "./components/preview-banner";
