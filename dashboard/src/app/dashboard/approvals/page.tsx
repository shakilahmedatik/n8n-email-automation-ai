"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	ArrowRight,
	Check,
	Clock,
	Loader2,
	Mail,
	Pencil,
	ShieldAlert,
	User,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface Message {
	id: string;
	senderName: string;
	senderEmail: string;
	subject: string;
	body: string;
	classification: string;
	priority: string;
	status: string;
	aiReason: string | null;
	aiSummary: string | null;
	aiDraftResponse: string | null;
	receivedAt: string;
}

const PRIORITY_CONFIG: Record<
	string,
	{ color: string; bgColor: string; borderColor: string }
> = {
	High: {
		color: "text-red-500",
		bgColor: "bg-red-500/10",
		borderColor: "border-red-500/30",
	},
	Medium: {
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
		borderColor: "border-amber-500/30",
	},
	Low: {
		color: "text-slate-500",
		bgColor: "bg-slate-500/10",
		borderColor: "border-slate-500/30",
	},
};

export default function ApprovalsPage() {
	const router = useRouter();
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	// Edit dialog
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editMessage, setEditMessage] = useState<Message | null>(null);
	const [editedResponse, setEditedResponse] = useState("");

	// Reject dialog
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
	const [rejectMessage, setRejectMessage] = useState<Message | null>(null);
	const [rejectNotes, setRejectNotes] = useState("");

	const fetchMessages = useCallback(async () => {
		try {
			const res = await fetch(
				"/api/messages?classification=HUMAN_APPROVAL&status=pending&limit=50",
			);
			if (res.ok) {
				const data = await res.json();
				setMessages(data.messages);
			}
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMessages();
		const interval = setInterval(fetchMessages, 20000);
		return () => clearInterval(interval);
	}, [fetchMessages]);

	async function handleAction(
		messageId: string,
		action: "approve" | "reject",
		finalResponse?: string,
		reviewerNotes?: string,
	) {
		setActionLoading(messageId);
		try {
			const res = await fetch(`/api/messages/${messageId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action, finalResponse, reviewerNotes }),
			});

			if (res.ok) {
				toast.success(
					action === "approve" ? "Reply approved and sent!" : "Draft rejected",
				);
				setMessages((prev) => prev.filter((m) => m.id !== messageId));
				setEditDialogOpen(false);
				setRejectDialogOpen(false);
			} else {
				const data = await res.json();
				toast.error(data.error || "Action failed");
			}
		} catch {
			toast.error("Something went wrong");
		} finally {
			setActionLoading(null);
		}
	}

	if (loading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-5 w-64" />
							<Skeleton className="h-4 w-48" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-20" />
							<Skeleton className="h-32" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (messages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-24">
				<div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
					<Check className="h-8 w-8 text-green-500" />
				</div>
				<h2 className="text-xl font-semibold mb-2">All caught up!</h2>
				<p className="text-muted-foreground text-center max-w-sm">
					No messages waiting for approval. AI is handling routine messages
					automatically.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Summary */}
			<div className="flex items-center gap-3 mb-2">
				<div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
					<ShieldAlert className="h-5 w-5 text-amber-500" />
				</div>
				<div>
					<p className="font-semibold text-sm">
						{messages.length} message{messages.length !== 1 ? "s" : ""} awaiting
						review
					</p>
					<p className="text-xs text-muted-foreground">
						AI has prepared draft responses for your review
					</p>
				</div>
			</div>

			{/* Approval Cards */}
			{messages.map((msg) => {
				const priConfig = PRIORITY_CONFIG[msg.priority] || PRIORITY_CONFIG.Low;

				return (
					<Card
						key={msg.id}
						className={`${priConfig.borderColor} transition-all duration-200`}
					>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap mb-1">
										<Badge
											variant="outline"
											className={`${priConfig.color} ${priConfig.bgColor} ${priConfig.borderColor} text-[11px]`}
										>
											{msg.priority} Priority
										</Badge>
										<span className="text-xs text-muted-foreground flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{formatDistanceToNow(new Date(msg.receivedAt), {
												addSuffix: true,
											})}
										</span>
									</div>
									<CardTitle className="text-base">{msg.subject}</CardTitle>
									<CardDescription className="flex items-center gap-2 mt-1">
										<User className="h-3 w-3" />
										{msg.senderName} ({msg.senderEmail})
									</CardDescription>
								</div>
							</div>
						</CardHeader>

						<CardContent className="space-y-4">
							{/* AI Analysis */}
							{(msg.aiSummary || msg.aiReason) && (
								<div className="rounded-lg bg-muted/50 border p-3 space-y-2">
									<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
										<AlertTriangle className="h-3 w-3" />
										AI Analysis
									</p>
									{msg.aiSummary && <p className="text-sm">{msg.aiSummary}</p>}
									{msg.aiReason && (
										<p className="text-xs text-muted-foreground">
											<span className="font-medium">Reason:</span>{" "}
											{msg.aiReason}
										</p>
									)}
								</div>
							)}

							{/* Original Message */}
							<div>
								<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
									<Mail className="h-3 w-3" />
									Original Message
								</p>
								<div className="rounded-lg border p-3 bg-card max-h-40 overflow-y-auto">
									<p className="text-sm whitespace-pre-wrap leading-relaxed">
										{msg.body}
									</p>
								</div>
							</div>

							{/* AI Draft Response */}
							{msg.aiDraftResponse && (
								<div>
									<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
										<ArrowRight className="h-3 w-3" />
										AI Suggested Response
									</p>
									<div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 max-h-48 overflow-y-auto">
										<p className="text-sm whitespace-pre-wrap leading-relaxed">
											{msg.aiDraftResponse}
										</p>
									</div>
								</div>
							)}
						</CardContent>

						<Separator />

						<CardFooter className="pt-4 flex flex-wrap gap-2">
							<Button
								onClick={() =>
									handleAction(msg.id, "approve", msg.aiDraftResponse || "")
								}
								disabled={actionLoading === msg.id}
								className="bg-green-600 hover:bg-green-700 text-white"
							>
								{actionLoading === msg.id ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<Check className="h-4 w-4 mr-2" />
								)}
								Approve & Send
							</Button>

							<Button
								variant="outline"
								onClick={() => {
									setEditMessage(msg);
									setEditedResponse(msg.aiDraftResponse || "");
									setEditDialogOpen(true);
								}}
								disabled={actionLoading === msg.id}
							>
								<Pencil className="h-4 w-4 mr-2" />
								Edit & Send
							</Button>

							<Button
								variant="outline"
								onClick={() => {
									setRejectMessage(msg);
									setRejectNotes("");
									setRejectDialogOpen(true);
								}}
								disabled={actionLoading === msg.id}
								className="text-destructive hover:text-destructive"
							>
								<X className="h-4 w-4 mr-2" />
								Reject
							</Button>

							<Button
								variant="ghost"
								size="sm"
								className="ml-auto text-xs"
								onClick={() => router.push(`/dashboard/messages/${msg.id}`)}
							>
								View Details
							</Button>
						</CardFooter>
					</Card>
				);
			})}

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit & Send Reply</DialogTitle>
						<DialogDescription>
							Edit the AI-generated response before sending to{" "}
							{editMessage?.senderName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<Label htmlFor="edit-response">Response</Label>
						<Textarea
							id="edit-response"
							value={editedResponse}
							onChange={(e) => setEditedResponse(e.target.value)}
							rows={10}
							className="font-mono text-sm"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() =>
								editMessage &&
								handleAction(editMessage.id, "approve", editedResponse)
							}
							disabled={!editedResponse.trim() || !!actionLoading}
							className="bg-green-600 hover:bg-green-700 text-white"
						>
							{actionLoading ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Check className="h-4 w-4 mr-2" />
							)}
							Send Edited Reply
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Draft</DialogTitle>
						<DialogDescription>
							No email will be sent. Optionally add notes for the audit log.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<Label htmlFor="reject-notes">Notes (optional)</Label>
						<Textarea
							id="reject-notes"
							value={rejectNotes}
							onChange={(e) => setRejectNotes(e.target.value)}
							placeholder="Why is this draft being rejected?"
							rows={4}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() =>
								rejectMessage &&
								handleAction(rejectMessage.id, "reject", undefined, rejectNotes)
							}
							disabled={!!actionLoading}
						>
							{actionLoading ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<X className="h-4 w-4 mr-2" />
							)}
							Reject Draft
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
