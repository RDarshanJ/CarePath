import type { CareTeamCard } from "@carepath/shared/contracts";
import type { BookingTherapist } from "../_components/booking-flow";

/** The people on the care team a patient can book with: those who have a practitioner record. Null when there are none. */
export function therapistsOf(team: CareTeamCard): BookingTherapist[] | null {
  const list = team.members.flatMap((m) =>
    m.practitionerId
      ? [
          {
            practitionerId: m.practitionerId,
            name: m.name,
            credentials: m.credentials,
            roleLabel: m.roleLabel,
            since: m.since,
          },
        ]
      : [],
  );
  return list.length > 0 ? list : null;
}
