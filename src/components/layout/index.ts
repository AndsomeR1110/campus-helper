// App frame components — see docs/design/ui-ux-spec.md §3 and §4.11–4.13.
// Import from "@/components/layout".
export { AppShell, type AppShellProps } from "./app-shell";
export {
  getActiveTab,
  SERVICES,
  shouldShowBottomNav,
  TABS,
  type ServiceEntry,
  type TabId,
} from "./nav-config";
export { PageContainer, type PageContainerProps } from "./page-container";
export { StickyActionBar, type StickyActionBarProps } from "./sticky-action-bar";
export { TopBar, type TopBarProps } from "./top-bar";
