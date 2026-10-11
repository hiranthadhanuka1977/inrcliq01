import { Suspense } from "react";
import { AdminUnlockForm } from "@/components/admin/AdminUnlockForm";

export default function AdminUnlockPage() {
  return (
    <Suspense fallback={null}>
      <AdminUnlockForm />
    </Suspense>
  );
}
