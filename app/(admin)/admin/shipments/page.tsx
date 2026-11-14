import { redirect } from "next/navigation";
export default function LegacyShipmentFinderRedirect() {
  redirect("/admin/operations");
}
