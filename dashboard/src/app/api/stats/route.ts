import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

// GET /api/stats - Dashboard statistics
export async function GET() {
	try {
		await requireSession();

		const now = new Date();
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);

		const [
			totalMessages,
			todayMessages,
			pendingApprovals,
			autoRepliesSent,
			spamCaught,
			rejectedMessages,
			classificationBreakdown,
			recentActivity,
			priorityBreakdown,
		] = await Promise.all([
			// Total messages
			prisma.message.count(),
			// Today's messages
			prisma.message.count({
				where: { receivedAt: { gte: todayStart } },
			}),
			// Pending approvals
			prisma.message.count({
				where: { classification: "HUMAN_APPROVAL", status: "pending" },
			}),
			// Auto-replies sent (today)
			prisma.message.count({
				where: {
					classification: "AUTO_REPLY",
					status: "auto_sent",
					receivedAt: { gte: todayStart },
				},
			}),
			// Spam caught (today)
			prisma.message.count({
				where: {
					status: "spam",
					receivedAt: { gte: todayStart },
				},
			}),
			// Rejected messages
			prisma.message.count({
				where: { status: "rejected" },
			}),
			// Classification breakdown
			prisma.message.groupBy({
				by: ["classification"],
				_count: { classification: true },
			}),
			// Recent activity (last 10)
			prisma.activityLog.findMany({
				orderBy: { createdAt: "desc" },
				take: 10,
				include: {
					user: { select: { name: true } },
					message: { select: { subject: true, senderName: true } },
				},
			}),
			// Priority breakdown of pending approvals
			prisma.message.groupBy({
				by: ["priority"],
				where: { classification: "HUMAN_APPROVAL", status: "pending" },
				_count: { priority: true },
			}),
		]);

		return NextResponse.json({
			overview: {
				totalMessages,
				todayMessages,
				pendingApprovals,
				autoRepliesSent,
				spamCaught,
				rejectedMessages,
			},
			classificationBreakdown: classificationBreakdown.map((item) => ({
				name: item.classification,
				value: item._count.classification,
			})),
			priorityBreakdown: priorityBreakdown.map((item) => ({
				name: item.priority,
				value: item._count.priority,
			})),
			recentActivity,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("GET /api/stats error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
