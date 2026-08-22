import type { Metadata } from "next";
import AboutLayout from "../about/AboutLayout";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "Updates log",
};

export default function UpdatesPage() {
  return (
    <AboutLayout backHref="/about" backLabel="Back to About page">
      <Content />
    </AboutLayout>
  );
}
