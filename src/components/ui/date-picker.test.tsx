import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { addMonths, clampDay, DatePicker, DateTimePicker, monthGrid } from "./date-picker";
import { FormField } from "./form-field";

describe("calendar helpers", () => {
  it("builds a Monday-first 6-week grid", () => {
    const grid = monthGrid("2026-11-12");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-10-26"); // 1 Nov 2026 is a Sunday
    expect(grid).toContain("2026-11-30");
  });

  it("clamps month jumps to the month's length", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("clamps a day into range", () => {
    expect(clampDay("2026-11-20", undefined, "2026-11-12")).toBe("2026-11-12");
    expect(clampDay("2026-11-01", "2026-11-05")).toBe("2026-11-05");
  });
});

describe("DatePicker", () => {
  it("is labelled by its FormField and picks a day from the calendar", () => {
    const onChange = vi.fn();
    render(
      <FormField label="Lost on">
        <DatePicker value="2026-11-03" onChange={onChange} />
      </FormField>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Lost on" }));
    fireEvent.click(screen.getByRole("button", { name: "Saturday, 7 November 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-07");
  });

  it("disables days after max (cannot pick the future)", () => {
    render(<DatePicker aria-label="Date" value="2026-01-10" max="2026-01-12" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    expect(screen.getByRole("button", { name: "Tuesday, 13 January 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Monday, 12 January 2026" })).toBeEnabled();
  });

  it("moves focus with the arrow keys", () => {
    render(<DatePicker aria-label="Date" value="2026-11-12" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    const day = screen.getByRole("button", { name: "Thursday, 12 November 2026" });
    fireEvent.keyDown(day, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Thursday, 19 November 2026" })).toHaveFocus();
  });
});

describe("DateTimePicker", () => {
  function Harness({ onChange }: { onChange: (v: string) => void }) {
    const [value, setValue] = useState("");
    return (
      <FormField label="When">
        <DateTimePicker
          value={value}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
          min="2026-11-01"
          max="2026-11-30"
        />
      </FormField>
    );
  }

  it("emits a datetime-local string only once date and time are both chosen", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Time" }), {
      target: { value: "14:30" },
    });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "When" }));
    fireEvent.click(screen.getByRole("button", { name: "Friday, 6 November 2026" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-06T14:30");
  });
});
