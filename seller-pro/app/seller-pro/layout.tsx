import { SellerToolProvider, sellerProToolPaths } from "@/components/seller/SellerToolPaths";
import Gate from "../../components/Gate";
import Shell from "../../components/Shell";
import { mainOrigin } from "../../lib/main";
import { getSellerProSession } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function SellerProLayout({ children }: { children: React.ReactNode }) {
  const session = await getSellerProSession();
  if (!session) return <Gate />;

  return (
    <SellerToolProvider paths={sellerProToolPaths} mainOrigin={mainOrigin()}>
      <Shell name={session.name}>{children}</Shell>
    </SellerToolProvider>
  );
}
