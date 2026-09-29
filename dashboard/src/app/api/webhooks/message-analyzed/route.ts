import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// n8n sends analyzed message data here after AI Email Analyzer runs
export async function POST(req: NextRequest) {
	try {
		const webhookSecret = req.headers.get("x-webhook-secret");
		if (webhookSecret !== process.env.WEBHOOK_SECRET) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const data = await req.json();

		const {
			gmailMessageId,
			gmailThreadId,
			senderName,
			senderEmail,
			subject,
			body,
			snippet,
			receivedAt,
			classification,
			priority,
			aiReason,
			aiSummary,
			aiDraftResponse,
		} = data;

		// Map classification to status
		let status: "pending" | "auto_sent" | "spam" | "ignored" = "pending";
		let mappedClassification = classification;

		if (classification === "AUTO_REPLY") {
			status = "auto_sent";
		} else if (classification === "NO_REPLY") {
			status = "ignored";
		} else if (classification === "SPAM") {
			status = "spam";
			mappedClassification = "SPAM";
		}

		// Map priority
		const validPriorities = ["High", "Medium", "Low"];
		const formattedPriority = priority
			? priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
			: "Low";
		const mappedPriority = validPriorities.includes(formattedPriority)
			? formattedPriority
			: "Low";

		// Create message record
		const message = await prisma.message.create({
			data: {
				gmailMessageId,
				gmailThreadId,
				senderName: senderName || "Unknown",
				senderEmail: senderEmail || "unknown@unknown.com",
				subject: subject || "(No Subject)",
				body: body || "",
				snippet: snippet || "",
				receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
				classification: mappedClassification,
				priority: mappedPriority,
				aiReason,
				aiSummary,
				aiDraftResponse,
				status,
				finalResponse: classification === "AUTO_REPLY" ? aiDraftResponse : null,
			},
		});

		// Create notification for HUMAN_APPROVAL messages
		if (classification === "HUMAN_APPROVAL") {
			await prisma.notification.create({
				data: {
					type: "approval_needed",
					title: `Approval needed: ${subject}`,
					body: `Message from ${senderName || senderEmail} requires human review. Priority: ${priority}`,
					messageId: message.id,
				},
			});
		}

		// Create notification for auto-replies
		if (classification === "AUTO_REPLY") {
			await prisma.notification.create({
				data: {
					type: "auto_reply_sent",
					title: `Auto-reply sent: ${subject}`,
					body: `AI automatically replied to ${senderName || senderEmail}`,
					messageId: message.id,
				},
			});
		}



		// Create activity log
		await prisma.activityLog.create({
			data: {
				action: `message_${classification.toLowerCase()}`,
				messageId: message.id,
				details: { classification, priority, aiSummary },
			},
		});

		return NextResponse.json(
			{ success: true, messageId: message.id },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Webhook message-analyzed error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
