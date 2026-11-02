# Layout components

Owner: **Member 1**. Rules: [docs/design/ui-ux-spec.md §3](../../../docs/design/ui-ux-spec.md).

`AppShell` is already applied to every page under `src/app/(main)/` (BottomNav on phones and tablets, SideNav from 1024px). Your page only renders its own header and body:

```tsx
import { PageContainer, StickyActionBar, TopBar } from "@/components/layout";
import { Button } from "@/components/ui";

// List page (level 2): bottom nav stays visible.
export default function SpacesPage() {
  return (
    <>
      <TopBar title="Find a space" backHref="/services" />
      <PageContainer>{/* filters + list */}</PageContainer>
    </>
  );
}

// Detail / form page (level 3): bottom nav is hidden, main action sticks to the bottom.
export default function SpaceDetailPage() {
  return (
    <>
      <TopBar title="Seat B-12" backHref="/spaces" />
      <PageContainer width="content">
        {/* details */}
        <StickyActionBar summary="Mon 3 Nov · 14:00–16:00">
          <Button size="lg" fullWidth>
            Book seat
          </Button>
        </StickyActionBar>
      </PageContainer>
    </>
  );
}
```

| Component          | Use for                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `TopBar`           | First element of every page. `backHref` adds a back button (history first, href as fallback). `variant="large"` only for the four tab pages. |
| `PageContainer`    | Page body with standard gutters. `width="content"` (640px) for details and forms, default `"list"` (960px).                                  |
| `StickyActionBar`  | Primary action on detail / form pages. Fixed on phones/tablets, inline on desktop.                                                           |
| `SERVICES`, `TABS` | Navigation data shared by Home, Services and the nav bars.                                                                                   |

**Adding a detail or form route?** Add its pattern to `FOCUSED_ROUTES` in `nav-config.ts` so the bottom nav is hidden there, and add a test case in `nav-config.test.ts`. Mention Member 1 in the PR.

**Dynamic routes (`[id]`)** need a `loading.tsx` with a Skeleton — see docs/frontend-architecture.md §5.1.
