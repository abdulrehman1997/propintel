import { redirect } from "next/navigation";

// The standalone single-page calculator is superseded by the property portal:
// the input-panel + tabbed analysis now lives in PropertyView, reached via
// /property/[id]. Land users on search.
export default function Home() {
  redirect("/search");
}
