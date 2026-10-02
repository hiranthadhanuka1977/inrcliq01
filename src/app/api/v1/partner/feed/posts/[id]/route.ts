import { partnerError, partnerJson, withPartner } from "@/lib/partner-api/http";
import { deletePartnerPost, getPartnerPost, serializePartnerPost } from "@/lib/partner-api/posts";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return withPartner(request, "GET /api/v1/partner/feed/posts/[id]", async (partner, requestId) => {
    const { id } = await params;
    const post = await getPartnerPost(partner.partnerId, id);
    if (!post) return partnerError(requestId, 404, "not_found", "No post with this id was published by your API key.");
    return partnerJson(requestId, serializePartnerPost(post));
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return withPartner(request, "DELETE /api/v1/partner/feed/posts/[id]", async (partner, requestId) => {
    const { id } = await params;
    if (!(await deletePartnerPost(partner.partnerId, id))) {
      return partnerError(requestId, 404, "not_found", "No post with this id was published by your API key.");
    }
    return partnerJson(requestId, { id, deleted: true });
  });
}
