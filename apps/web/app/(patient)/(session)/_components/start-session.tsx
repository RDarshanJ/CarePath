"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { exerciseSessionDetailSchema } from "@carepath/shared/contracts";
import { Banner, Button } from "@carepath/ui";
import { api } from "../../../../lib/api/client";
import { ApiError } from "../../../../lib/api/errors";

/** Creates the session on the current published version, then opens the player on its own address so a reload resumes it. */
export function StartSession({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const session = await api.post(
        `/patients/${patientId}/sessions`,
        exerciseSessionDetailSchema,
        {},
      );
      router.replace(`/session/${session.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "session_open") {
        // Another tab or device already started one; Today knows which.
        router.replace("/today");
        return;
      }
      setPending(false);
      setError(
        e instanceof ApiError && e.code === "plan_not_published"
          ? "There is no published plan to start from. Ask your care team."
          : "The session did not start. Nothing was recorded. Try again.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Banner tone="error" title="Session not started">
          {error}
        </Banner>
      ) : null}
      <Button
        onClick={start}
        loading={pending}
        loadingLabel="Starting"
        className="w-full sm:w-auto"
      >
        Begin session
      </Button>
    </div>
  );
}
