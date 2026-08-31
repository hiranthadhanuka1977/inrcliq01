import BookingBalanceCheckoutView from "@/components/feed/bookings/BookingBalanceCheckoutView";
import { getBookingBalanceCheckout } from "@/lib/settings/bookings";
import { getSessionUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface BalanceCheckoutPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BalanceCheckoutPageProps) {
  const { id } = await params;
  return { title: `Balance payment · ${id.slice(0, 8)} · INRCLIQ` };
}

export default async function BookingBalanceCheckoutPage({ params }: BalanceCheckoutPageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const result = await getBookingBalanceCheckout(id, user.id);
  if (!result.ok) notFound();

  return (
    <BookingBalanceCheckoutView
      data={{
        id: result.id,
        reference: result.reference,
        requestLabel: result.requestLabel,
        totalFee: result.totalFee,
        currency: result.currency,
        depositPaid: result.depositPaid,
        balanceDue: result.balanceDue,
        creatorName: result.creatorName,
      }}
    />
  );
}
