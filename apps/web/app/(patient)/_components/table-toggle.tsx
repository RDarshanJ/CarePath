"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@carepath/ui";

/** Every chart has a table with the same values (AC-C7). The table is one button away, not hidden behind a hover. */
export function TableToggle({ children, label }: { children: ReactNode; label: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          iconRight={open ? "chevron-up" : "chevron-down"}
        >
          {open ? `Hide ${label} table` : `Show ${label} as a table`}
        </Button>
      </div>
      <div id={id} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
