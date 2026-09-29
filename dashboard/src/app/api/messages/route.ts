import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

// GET /api/messages - List messages with filters
export async function GET(req: NextRequest) {
	try {
		await requireSession();

		const { searchParams } = new URL(req.url);
		const classification = searchParams.get("classification");
		const status = searchParams.get("status");
		const priority = searchParams.get("priority");
		const search = searchParams.get("search");
		const page = parseInt(searchParams.get("page") || "1", 10);
		const limit = parseInt(searchParams.get("limit") || "20", 10);
		const skip = (page - 1) * limit;

		// Build where clause
		const where: Record<string, unknown> = {};

		if (classification) {
			where.classification = classification;
		} else if (status !== "spam") {
			where.classification = { not: "SPAM" };
		}
		if (status) {
			where.status = status;
		}
		if (priority) {
			where.priority = priority;
		}
		if (search) {
			where.OR = [
				{ subject: { contains: search, mode: "insensitive" } },
				{ senderName: { contains: search, mode: "insensitive" } },
				{ senderEmail: { contains: search, mode: "insensitive" } },
				{ body: { contains: search, mode: "insensitive" } },
			];
		}

		const [messages, total] = await Promise.all([
			prisma.message.findMany({
				where,
				orderBy: { receivedAt: "desc" },
				skip,
				take: limit,
				include: {
					reviewedBy: {
						select: { id: true, name: true, email: true },
					},
				},
			}),
			prisma.message.count({ where }),
		]);

		return NextResponse.json({
			messages,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("GET /api/messages error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/messages - Delete messages
export async function DELETE(req: NextRequest) {
	try {
		await requireSession();
		const { id } = await req.json();

		if (!id) {
			return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
		}

		await prisma.message.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		console.error("DELETE /api/messages error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
