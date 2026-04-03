import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

const DASHBOARD_ALERT_KEY = "NEW_ARRIVALS_DASHBOARD_ALERT";
const POPUP_ALERT_KEY = "NEW_ARRIVALS_POPUP_ALERT";

async function readSettings() {
  const rows = await prisma.announcement.findMany({
    where: {
      title: {
        in: [DASHBOARD_ALERT_KEY, POPUP_ALERT_KEY],
      },
    },
    select: {
      id: true,
      title: true,
      isActive: true,
    },
  });

  const dashboardRow = rows.find((row) => row.title === DASHBOARD_ALERT_KEY);
  const popupRow = rows.find((row) => row.title === POPUP_ALERT_KEY);

  return {
    dashboardAlertEnabled: dashboardRow ? dashboardRow.isActive : true,
    popupAlertEnabled: popupRow ? popupRow.isActive : true,
  };
}

async function saveSingleSetting(params: {
  title: string;
  message: string;
  isActive: boolean;
}) {
  const existing = await prisma.announcement.findFirst({
    where: { title: params.title },
    select: { id: true },
  });

  if (existing) {
    return await prisma.announcement.update({
      where: { id: existing.id },
      data: {
        message: params.message,
        isActive: params.isActive,
      },
    });
  }

  return await prisma.announcement.create({
    data: {
      title: params.title,
      message: params.message,
      isActive: params.isActive,
    },
  });
}

export async function GET() {
  try {
    const settings = await readSettings();

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const dashboardAlertEnabled = Boolean(body?.dashboardAlertEnabled);
    const popupAlertEnabled = Boolean(body?.popupAlertEnabled);

    await saveSingleSetting({
      title: DASHBOARD_ALERT_KEY,
      message: "Controls distributor dashboard new arrivals alert bar visibility",
      isActive: dashboardAlertEnabled,
    });

    await saveSingleSetting({
      title: POPUP_ALERT_KEY,
      message: "Controls distributor dashboard new arrivals popup visibility",
      isActive: popupAlertEnabled,
    });

    const settings = await readSettings();

    return NextResponse.json({
      ok: true,
      ...settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to save settings",
      },
      { status: 500 }
    );
  }
}