"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Bot,
	Check,
	Clock,
	FileText,
	Loader2,
	Mail,
	Pencil,
	ShieldAlert,
	ShieldBan,
	Trash2,
	User,
	X,
	Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface Message {
	id: string;
	gmailMessageId: string | null;
	gmailThreadId: string | null;
	senderName: string;
	senderEmail: string;
	subject: string;
	body: string;
	snippet: string | null;
	receivedAt: string;
	classification: string;
	priority: string;
	aiReason: string | null;
	aiSummary: string | null;
	aiDraftResponse: string | null;
	finalResponse: string | null;
	status: string;
	reviewedBy: { id: string; name: string; email: string } | null;
	reviewedAt: string | null;
	reviewerNotes: string | null;
	createdAt: string;
	updatedAt: string;
	activities: Array<{
		id: string;
		action: string;
		createdAt: string;
		user?: { id: string; name: string } | null;
		details?: Record<string, unknown> | null;
	}>;
}

const CLASSIFICATION_CONFIG: Record<
	string,
	{ label: string; icon: typeof Mail; color: string; bgColor: string }
> = {
	AUTO_REPLY: {
		label: "Auto Reply",
		icon: Zap,
		color: "text-green-500",
		bgColor: "bg-green-500/10",
	},
	HUMAN_APPROVAL: {
		label: "Human Approval",
		icon: ShieldAlert,
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
	},
	NO_REPLY: {
		label: "No Reply",
		icon: FileText,
		color: "text-slate-500",
		bgColor: "bg-slate-500/10",
	},
	SPAM: {
		label: "Spam",
		icon: ShieldBan,
		color: "text-red-500",
		bgColor: "bg-red-500/10",
	},
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
	pending: { label: "Pending Review", color: "text-amber-500" },
	approved: { label: "Approved & Sent", color: "text-green-500" },
	rejected: { label: "Rejected", color: "text-red-500" },
	auto_sent: { label: "Auto-Replied", color: "text-blue-500" },
	spam: { label: "Spam", color: "text-red-400" },
	ignored: { label: "Ignored", color: "text-slate-400" },
};

const PRIORITY_CONFIG: Record<
	string,
	{ color: string; bgColor: string; borderColor: string }
> = {
	High: {
		color: "text-red-500",
		bgColor: "bg-red-500/10",
		borderColor: "border-red-500/20",
	},
	Medium: {
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
		borderColor: "border-amber-500/20",
	},
	Low: {
		color: "text-slate-500",
		bgColor: "bg-slate-500/10",
		borderColor: "border-slate-500/20",
	},
};

export default function MessageDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [message, setMessage] = useState<Message | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editedResponse, setEditedResponse] = useState("");
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
	const [rejectNotes, setRejectNotes] = useState("");
	
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const fetchMessage = useCallback(async () => {
		try {
			const res = await fetch(`/api/messages/${id}`);
			if (res.ok) {
				const data = await res.json();
				setMessage(data);
			} else if (res.status === 404) {
				toast.error("Message not found");
				router.push("/dashboard/inbox");
			}
		} catch {
			toast.error("Failed to load message");
		} finally {
			setLoading(false);
		}
	}, [id, router]);

	useEffect(() => {
		fetchMessage();
	}, [fetchMessage]);

	async function handleAction(
		action: "approve" | "reject" | "mark_spam" | "unmark_spam",
		finalResponse?: string,
		reviewerNotes?: string,
	) {
		setActionLoading(true);
		try {
			const res = await fetch(`/api/messages/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action, finalResponse, reviewerNotes }),
			});
			if (res.ok) {
				const messages: Record<string, string> = {
					approve: "Reply approved and sent!",
					reject: "Draft rejected",
					mark_spam: "Marked as spam",
					unmark_spam: "Removed from spam",
				};
				toast.success(messages[action]);
				fetchMessage();
				setEditDialogOpen(false);
				setRejectDialogOpen(false);
			} else {
				const data = await res.json();
				toast.error(data.error || "Action failed");
			}
		} catch {
			toast.error("Something went wrong");
		} finally {
			setActionLoading(false);
		}
	}

	async function handleDeleteConfirm() {
		setActionLoading(true);
		try {
			const res = await fetch(`/api/messages`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			if (res.ok) {
				toast.success("Message deleted");
				router.push("/dashboard/inbox");
			} else {
				const data = await res.json();
				toast.error(data.error || "Failed to delete message");
			}
		} catch {
			toast.error("Something went wrong");
		} finally {
			setActionLoading(false);
			setDeleteDialogOpen(false);
		}
	}

	function handleDelete() {
		setDeleteDialogOpen(true);
	}

	if (loading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-64" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-24" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!message) return null;

	const clsConfig =
		CLASSIFICATION_CONFIG[message.classification] ||
		CLASSIFICATION_CONFIG.NO_REPLY;
	const statusConfig = STATUS_CONFIG[message.status] || STATUS_CONFIG.pending;
	const priConfig = PRIORITY_CONFIG[message.priority] || PRIORITY_CONFIG.Low;
	const ClsIcon = clsConfig.icon;
	const isPending =
		message.classification === "HUMAN_APPROVAL" && message.status === "pending";

	return (
		<div className="space-y-4 max-w-4xl">
			{/* Back Button */}
			<div className="flex justify-between items-center">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.back()}
					className="gap-1.5"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</Button>
				<Button
					variant="destructive"
					size="sm"
					onClick={handleDelete}
					disabled={actionLoading}
					className="gap-1.5"
				>
					<Trash2 className="h-4 w-4" />
					Delete
				</Button>
			</div>

			{/* Header Card */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between gap-4 flex-wrap">
						<div className="space-y-2 min-w-0 flex-1">
							<CardTitle className="text-xl leading-tight">
								{message.subject}
							</CardTitle>
							<CardDescription className="flex items-center gap-2 flex-wrap">
								<span className="flex items-center gap-1.5">
									<User className="h-3.5 w-3.5" />
									{message.senderName} &lt;{message.senderEmail}&gt;
								</span>
								<span className="text-muted-foreground/50">·</span>
								<span className="flex items-center gap-1.5">
									<Clock className="h-3.5 w-3.5" />
									{format(
										new Date(message.receivedAt),
										"MMM d, yyyy 'at' h:mm a",
									)}
									{" ("}
									{formatDistanceToNow(new Date(message.receivedAt), {
										addSuffix: true,
									})}
									{")"}
								</span>
							</CardDescription>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<Badge
								variant="outline"
								className={`${clsConfig.color} ${clsConfig.bgColor} gap-1`}
							>
								<ClsIcon className="h-3 w-3" />
								{clsConfig.label}
							</Badge>
							<Badge
								variant="outline"
								className={`${priConfig.color} ${priConfig.bgColor} ${priConfig.borderColor}`}
							>
								{message.priority}
							</Badge>
							<Badge variant="secondary" className={statusConfig.color}>
								{statusConfig.label}
							</Badge>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* AI Analysis */}
			{(message.aiSummary || message.aiReason) && (
				<Card className="border-blue-500/20">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm flex items-center gap-2">
							<Bot className="h-4 w-4 text-blue-500" />
							AI Analysis
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{message.aiSummary && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">
									Summary
								</p>
								<p className="text-sm">{message.aiSummary}</p>
							</div>
						)}
						{message.aiReason && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">
									Classification Reason
								</p>
								<p className="text-sm">{message.aiReason}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Original Message */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm flex items-center gap-2">
						<Mail className="h-4 w-4 text-muted-foreground" />
						Original Message
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border p-4 bg-muted/30 max-h-100 overflow-y-auto">
						<p className="text-sm whitespace-pre-wrap leading-relaxed">
							{message.body}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* AI Draft Response */}
			{message.aiDraftResponse && (
				<Card className="border-blue-500/20">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm flex items-center gap-2">
							<ArrowRight className="h-4 w-4 text-blue-500" />
							AI Suggested Response
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 max-h-75 overflow-y-auto">
							<p className="text-sm whitespace-pre-wrap leading-relaxed">
								{message.aiDraftResponse}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Final Response (if sent) */}
			{message.finalResponse && message.status !== "pending" && (
				<Card className="border-green-500/20">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm flex items-center gap-2">
							<Check className="h-4 w-4 text-green-500" />
							Final Response Sent
						</CardTitle>
						{message.reviewedBy && (
							<CardDescription>
								{message.status === "approved"
									? `Approved by ${message.reviewedBy.name}`
									: `Sent by ${message.reviewedBy.name}`}
								{message.reviewedAt &&
									` · ${format(new Date(message.reviewedAt), "MMM d, yyyy 'at' h:mm a")}`}
							</CardDescription>
						)}
					</CardHeader>
					<CardContent>
						<div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 max-h-75 overflow-y-auto">
							<p className="text-sm whitespace-pre-wrap leading-relaxed">
								{message.finalResponse}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Reviewer Notes */}
			{message.reviewerNotes && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm flex items-center gap-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							Reviewer Notes
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">{message.reviewerNotes}</p>
					</CardContent>
				</Card>
			)}

			{/* Action Buttons (for pending approvals) */}
			{isPending && (
				<Card className="border-amber-500/20">
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 mb-4">
							<AlertTriangle className="h-4 w-4 text-amber-500" />
							<p className="text-sm font-medium">
								This message requires your action
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								onClick={() =>
									handleAction("approve", message.aiDraftResponse || "")
								}
								disabled={actionLoading}
								className="bg-green-600 hover:bg-green-700 text-white"
							>
								{actionLoading ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<Check className="h-4 w-4 mr-2" />
								)}
								Approve & Send
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setEditedResponse(message.aiDraftResponse || "");
									setEditDialogOpen(true);
								}}
								disabled={actionLoading}
							>
								<Pencil className="h-4 w-4 mr-2" />
								Edit & Send
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setRejectNotes("");
									setRejectDialogOpen(true);
								}}
								disabled={actionLoading}
								className="text-destructive hover:text-destructive"
							>
								<X className="h-4 w-4 mr-2" />
								Reject
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Activity Timeline */}
			{message.activities && message.activities.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							Activity Timeline
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{message.activities.map((activity, i) => (
								<div key={activity.id} className="flex items-start gap-3">
									<div className="relative flex flex-col items-center">
										<div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
										{i < message.activities.length - 1 && (
											<div className="w-px h-full bg-border absolute top-3" />
										)}
									</div>
									<div className="pb-3">
										<p className="text-sm font-medium">
											{activity.action
												.replace(/_/g, " ")
												.replace(/message /i, "")}
										</p>
										<p className="text-xs text-muted-foreground">
											{activity.user?.name && `${activity.user.name} · `}
											{formatDistanceToNow(new Date(activity.createdAt), {
												addSuffix: true,
											})}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit & Send Reply</DialogTitle>
						<DialogDescription>
							Edit the AI-generated response before sending to{" "}
							{message.senderName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<Label htmlFor="edit-detail-response">Response</Label>
						<Textarea
							id="edit-detail-response"
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
							onClick={() => handleAction("approve", editedResponse)}
							disabled={!editedResponse.trim() || actionLoading}
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
						<Label htmlFor="reject-detail-notes">Notes (optional)</Label>
						<Textarea
							id="reject-detail-notes"
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
							onClick={() => handleAction("reject", undefined, rejectNotes)}
							disabled={actionLoading}
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

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Message</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this message? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
							{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
