import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  StatusBadge,
  TimeSlotButton,
  Toaster,
  toast,
} from ".";
import { resetToasts } from "./toast";

describe("Button", () => {
  it("is disabled and busy while loading, so it cannot be submitted twice", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Book slot
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Book slot" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("FormField", () => {
  it("connects label, hint and error to the control", () => {
    render(
      <FormField label="Course code" hint="e.g. CPT203" error="Course code is required" required>
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText(/Course code/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Course code is required/);
    expect(input).toHaveAccessibleDescription(/e\.g\. CPT203/);
  });

  it("does not mark a valid field invalid", () => {
    render(
      <FormField label="Room">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("Room")).not.toHaveAttribute("aria-invalid");
  });
});

describe("StatusBadge", () => {
  it("uses the label for the given entity, not just the raw status", () => {
    render(
      <>
        <StatusBadge kind="booking" status="CANCELLED" />
        <StatusBadge kind="slot" status="CANCELLED" />
        <StatusBadge kind="post" status="CLAIM_PENDING" />
      </>,
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
    expect(screen.getByText("Claim pending")).toBeInTheDocument();
  });
});

describe("TimeSlotButton", () => {
  it("shows the reason and ignores clicks when unavailable", async () => {
    const onClick = vi.fn();
    render(<TimeSlotButton label="14:00–14:30" unavailableReason="Booked" onClick={onClick} />);
    const button = screen.getByRole("button", { name: /14:00–14:30/ });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveTextContent("Booked");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("exposes the selected state", () => {
    render(<TimeSlotButton label="15:00–15:30" selected />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ConfirmDialog", () => {
  it("disables both actions while the confirm action is pending", async () => {
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        title="Cancel this booking?"
        description="The seat will be released to others."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("alertdialog", { name: "Cancel this booking?" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Cancel booking" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep booking" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();

    await act(async () => finish());
    expect(screen.getByRole("button", { name: "Cancel booking" })).toBeEnabled();
  });
});

describe("toast", () => {
  afterEach(() => {
    vi.useRealTimers();
    act(() => resetToasts());
  });

  it("announces errors as alerts and dismisses after 4 seconds", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.error("This slot has just been booked.");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("This slot has just been booked.");
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
