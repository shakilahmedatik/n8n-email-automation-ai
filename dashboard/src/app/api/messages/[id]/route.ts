import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

// GET /api/messages/[id] - Get single message detail
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireSession();
		const { id } = await params;

		const message = await prisma.message.findUnique({
			where: { id },
			include: {
				reviewedBy: {
					select: { id: true, name: true, email: true },
				},
				activities: {
					orderBy: { createdAt: "desc" },
					include: {
						user: { select: { id: true, name: true } },
					},
				},
			},
		});

		if (!message) {
			return NextResponse.json({ error: "Message not found" }, { status: 404 });
		}

		return NextResponse.json(message);
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("GET /api/messages/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PATCH /api/messages/[id] - Update message (approve, reject, mark as spam, etc.)
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await requireSession();
		const { id } = await params;
		const body = await req.json();

		const { action, finalResponse, reviewerNotes } = body;

		const message = await prisma.message.findUnique({ where: { id } });
		if (!message) {
			return NextResponse.json({ error: "Message not found" }, { status: 404 });
		}

		let updateData: Record<string, unknown> = {};
		let notificationType: string | null = null;
		let notificationTitle = "";
		let notificationBody = "";

		switch (action) {
			case "approve":
				updateData = {
					status: "approved",
					finalResponse: finalResponse || message.aiDraftResponse,
					reviewedById: session.user.id,
					reviewedAt: new Date(),
					reviewerNotes,
				};
				notificationType = "system";
				notificationTitle = `Reply approved: ${message.subject}`;
				notificationBody = `${session.user.name} approved the reply to ${message.senderName}`;
				break;

			case "reject":
				updateData = {
					status: "rejected",
					reviewedById: session.user.id,
					reviewedAt: new Date(),
					reviewerNotes,
				};
				notificationType = "message_rejected";
				notificationTitle = `Reply rejected: ${message.subject}`;
				notificationBody = `${session.user.name} rejected the reply to ${message.senderName}`;
				break;

			case "mark_spam":
				updateData = {
					status: "spam",
					classification: "SPAM",
				};
				break;

			case "unmark_spam":
				updateData = {
					status: "ignored",
					classification: "NO_REPLY",
				};
				break;

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		const updated = await prisma.message.update({
			where: { id },
			data: updateData,
		});

		// Create notification
		if (notificationType) {
			await prisma.notification.create({
				data: {
					type: notificationType as "system" | "message_rejected",
					title: notificationTitle,
					body: notificationBody,
					messageId: id,
				},
			});
		}

		// Log activity
		await prisma.activityLog.create({
			data: {
				action: `message_${action}`,
				messageId: id,
				userId: session.user.id,
				details: { action, reviewerNotes },
			},
		});

		// If approved or edited, notify n8n to send the email
		if (action === "approve" && process.env.N8N_WEBHOOK_URL) {
			try {
				await fetch(
					`${process.env.N8N_WEBHOOK_URL}/webhook/dashboard-response`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							messageId: id,
							gmailMessageId: message.gmailMessageId,
							gmailThreadId: message.gmailThreadId,
							senderEmail: message.senderEmail,
							action,
							finalResponse:
								updateData.finalResponse || message.aiDraftResponse,
							reviewerNotes,
						}),
					},
				);
			} catch (e) {
				console.error("Failed to notify n8n:", e);
				// Don't fail the request if n8n is unreachable
			}
		}

		return NextResponse.json(updated);
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("PATCH /api/messages/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
