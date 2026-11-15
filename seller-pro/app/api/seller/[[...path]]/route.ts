import { NextResponse } from "next/server";
import { mainOrigin } from "../../../../lib/main";
import { getSellerProSession } from "../../../../lib/session";

export const dynamic = "force-dynamic";

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const session = await getSellerProSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path = [] } = await context.params;
  const url = new URL(request.url);
  const target = `${mainOrigin()}/api/seller/${path.join("/")}${url.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cookie", `inrcliq_session=${session.token}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? Buffer.from(await request.arrayBuffer()) : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "InrCliq is not running." }, { status: 502 });
  }

  const body = await response.arrayBuffer();
  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) responseHeaders.set("content-type", responseType);
  return new NextResponse(body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
