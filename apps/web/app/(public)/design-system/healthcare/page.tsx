import type { Metadata } from "next";
import { FamilyPage, HealthcareIndex } from "./families";

export const metadata: Metadata = {
  title: "Healthcare components | CarePath",
  description: "The healthcare layer of the CarePath design system, one page per family.",
};

export default function HealthcareIndexPage() {
  return (
    <FamilyPage
      heading="Healthcare components"
      intro="Presentation components for clinical screens. Each family page shows every state on synthetic content, in the theme the component is used in."
    >
      <HealthcareIndex />
    </FamilyPage>
  );
}
