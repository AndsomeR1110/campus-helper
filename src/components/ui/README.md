# Shared UI components

Owner: **Member 1**. Visual and behaviour rules: [docs/design/ui-ux-spec.md §4](../../../docs/design/ui-ux-spec.md).
Live preview: run `npm run dev` and open <http://localhost:3000/design-system>.

Always import from the barrel:

```tsx
import { Button, FormField, Input, StatusBadge, toast } from "@/components/ui";
```

| Component                                     | Use for                                                                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`, `buttonStyles()`                    | Actions. `loading` disables and shows a spinner. Use `buttonStyles()` on a `<Link>`.                                                                                   |
| `IconButton`                                  | Icon-only actions (44px target, `aria-label` required).                                                                                                                |
| `FormField` + `Input` / `Textarea` / `Select` | Every form control. FormField wires label, hint, error and `aria-*` automatically.                                                                                     |
| `Card`, `cardStyles()`, `ListItem`            | List rows and content blocks. `cardStyles({ interactive: true })` on a `<Link>` for tappable cards. `variant="widget"` = liquid glass, for a few headline blocks only. |
| `StatusBadge`                                 | Any business status: `<StatusBadge kind="booking" status="CONFIRMED" />`. Never pick colours yourself.                                                                 |
| `TypeTag`, `TypeIcon`, `typeColorClasses()`   | Class / Office Hour / Study Space / Lost / Found labels and colours.                                                                                                   |
| `Chip`, `ChipGroup`                           | Filter rows.                                                                                                                                                           |
| `TimeSlotButton`                              | Office hour and study space slot pickers. Pass `unavailableReason` instead of hiding a slot.                                                                           |
| `Modal`                                       | Bottom sheet on phones, dialog on tablet/desktop.                                                                                                                      |
| `ConfirmDialog`                               | Every cancel / delete. `onConfirm` may be async; the dialog locks while it runs.                                                                                       |
| `toast`                                       | Short feedback from client code: `toast.success("Booking cancelled")`. `<Toaster />` is in the root layout.                                                            |
| `Skeleton`, `Spinner`                         | Loading states.                                                                                                                                                        |
| `EmptyState`, `ErrorState`                    | No data / no results, and failures (`kind`: offline, forbidden, not-found, server).                                                                                    |
| `OfflineBanner`, `useOffline`                 | The banner is already inside `TopBar`. Use `useOffline()` to disable submit buttons offline and say why (PWA-AC-04).                                                   |
| `AppLogo`                                     | The CAMPUS HELPER mark (same art as `src/app/icon.svg`). Fixed brand colours.                                                                                          |
| `DateStrip`, `TimeSelect`                     | Date chips for the next days and a 24h time dropdown — use instead of native date/time inputs.                                                                         |
| `LocationText`, `BuildingPin`, `DateTile`     | Locations with campus-map building markers; calendar-leaf date tile for booking/event cards.                                                                           |
| `CampusIllustration`                          | Decorative flat campus-map illustration (Home hero). Theme-aware, `aria-hidden`.                                                                                       |
| `DemoDataNotice`                              | Required on Office Hour and Study Space pages (SP-AC-07). `variant="footer"` on Login / Profile.                                                                       |

Theme: `ThemeSwitcher` lives in `@/components/theme`. Use only semantic tokens and dark mode works automatically; floating layers use the `glass` / `glass-strong` utilities.

Dates and times: use the helpers in `@/lib/time` (`formatDate`, `formatTimeRange`, `formatDateTimeRange`, `formatRelativeTime`…). They always output Asia/Shanghai time.

Need a component that isn't here? Open an issue or mention Member 1 in your PR. Until it lands, build it inside your feature's `components/` folder.
