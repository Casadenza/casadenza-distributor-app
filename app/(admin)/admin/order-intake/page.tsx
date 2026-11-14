import { redirect } from "next/navigation";
export default function LegacyOrderIntakeRedirect() {
  redirect("/admin/operations");
}
