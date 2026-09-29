import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

// GET /api/notifications - List notifications
export async function GET(req: NextRequest) {
	try {
		await requireSession();

		const { searchParams } = new URL(req.url);
		const unreadOnly = searchParams.get("unread") === "true";
		const limit = parseInt(searchParams.get("limit") || "50");

		const where = unreadOnly ? { isRead: false } : {};

		const [notifications, unreadCount] = await Promise.all([
			prisma.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: limit,
				include: {
					message: {
						select: {
							id: true,
							subject: true,
							classification: true,
							priority: true,
						},
					},
				},
			}),
			prisma.notification.count({ where: { isRead: false } }),
		]);

		return NextResponse.json({ notifications, unreadCount });
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("GET /api/notifications error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
	try {
		await requireSession();
		const { ids, markAll } = await req.json();

		if (markAll) {
			await prisma.notification.updateMany({
				where: { isRead: false },
				data: { isRead: true },
			});
		} else if (ids && Array.isArray(ids)) {
			await prisma.notification.updateMany({
				where: { id: { in: ids } },
				data: { isRead: true },
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("PATCH /api/notifications error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
