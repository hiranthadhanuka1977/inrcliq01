import { NextResponse } from "next/server";
import {
  deleteDemoUsersSample,
  getDemoUsersStatus,
  restoreDemoUsersSample,
} from "@/lib/settings/demo-users";

const DELETE_CONFIRMATION = "delete-demo-users";

export async function GET() {
  try {
    return NextResponse.json(await getDemoUsersStatus());
  } catch (err) {
    console.error("settings/demo-users GET error", err);
    return NextResponse.json({ error: "Unable to read the demo users." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== DELETE_CONFIRMATION) {
    return NextResponse.json({ error: "Deletion was not confirmed." }, { status: 400 });
  }

  try {
    const { deleted } = await deleteDemoUsersSample();
    return NextResponse.json({ deleted, status: await getDemoUsersStatus() });
  } catch (err) {
    console.error("settings/demo-users DELETE error", err);
    return NextResponse.json({ error: "Unable to delete the demo users." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await restoreDemoUsersSample();
    return NextResponse.json({ ...result, status: await getDemoUsersStatus() });
  } catch (err) {
    console.error("settings/demo-users POST error", err);
    return NextResponse.json({ error: "Unable to restore the demo users." }, { status: 500 });
  }
}
