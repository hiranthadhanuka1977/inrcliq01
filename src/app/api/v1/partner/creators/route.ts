import { partnerJson, withPartner } from "@/lib/partner-api/http";
import { listPartnerCreators } from "@/lib/partner-api/posts";

export async function GET(request: Request) {
  return withPartner(request, "GET /api/v1/partner/creators", async (partner, requestId) =>
    partnerJson(requestId, { partner: partner.partnerName, creators: await listPartnerCreators(partner.partnerId) }),
  );
}
