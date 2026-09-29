"use client";

import { formatDistanceToNow } from "date-fns";
import {
	Bell,
	BellOff,
	CheckCheck,
	Info,
	ShieldAlert,
	ShieldBan,
	Trash2,
	XCircle,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card, CardContent
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
	id: string;
	type: string;
	title: string;
	body: string;
	messageId: string | null;
	isRead: boolean;
	createdAt: string;
	message?: {
		id: string;
		subject: string;
		classification: string;
		priority: string;
	} | null;
}

const TYPE_CONFIG: Record<
	string,
	{ icon: typeof Bell; color: string; bgColor: string }
> = {
	approval_needed: {
		icon: ShieldAlert,
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
	},
	auto_reply_sent: {
		icon: Zap,
		color: "text-green-500",
		bgColor: "bg-green-500/10",
	},
	new_spam: {
		icon: ShieldBan,
		color: "text-red-500",
		bgColor: "bg-red-500/10",
	},
	message_rejected: {
		icon: XCircle,
		color: "text-red-500",
		bgColor: "bg-red-500/10",
	},
	system: {
		icon: Info,
		color: "text-blue-500",
		bgColor: "bg-blue-500/10",
	},
};

export default function NotificationsPage() {
	const router = useRouter();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const fetchNotifications = useCallback(async () => {
		try {
			const res = await fetch("/api/notifications?limit=100");
			if (res.ok) {
				const data = await res.json();
				setNotifications(data.notifications);
				setUnreadCount(data.unreadCount);
			}
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 15000);
		return () => clearInterval(interval);
	}, [fetchNotifications]);

	async function markAllRead() {
		try {
			await fetch("/api/notifications", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ markAll: true }),
			});
			setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
			setUnreadCount(0);
			toast.success("All notifications marked as read");
		} catch {
			toast.error("Failed to mark as read");
		}
	}

	async function deleteAllConfirm() {
		try {
			await fetch("/api/notifications", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deleteAll: true }),
			});
			setNotifications([]);
			setUnreadCount(0);
			toast.success("All notifications deleted");
		} catch {
			toast.error("Failed to delete notifications");
		} finally {
			setDeleteDialogOpen(false);
		}
	}

	function deleteAll() {
		setDeleteDialogOpen(true);
	}

	async function markRead(id: string) {
		try {
			await fetch("/api/notifications", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: [id] }),
			});
			setNotifications((prev) =>
				prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
			);
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch {
			// silently fail
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
						<Bell className="h-5 w-5 text-primary" />
					</div>
					<div>
						<p className="font-semibold text-sm">Notifications</p>
						<p className="text-xs text-muted-foreground">
							{unreadCount > 0
								? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
								: "All caught up"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{notifications.length > 0 && (
						<Button variant="outline" size="sm" onClick={deleteAll} className="text-destructive hover:text-destructive">
							<Trash2 className="h-3.5 w-3.5 mr-1.5" />
							Clear All
						</Button>
					)}
					{unreadCount > 0 && (
						<Button variant="outline" size="sm" onClick={markAllRead}>
							<CheckCheck className="h-3.5 w-3.5 mr-1.5" />
							Mark all read
						</Button>
					)}
				</div>
			</div>

			<Card>
				<CardContent className="p-0">
					{loading ? (
						<div className="p-6 space-y-3">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-16" />
							))}
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<BellOff className="h-10 w-10 mb-3 opacity-30" />
							<p className="font-medium">No notifications</p>
							<p className="text-sm">
								You&apos;ll see alerts here when messages need attention
							</p>
						</div>
					) : (
						<div className="divide-y">
							{notifications.map((notification) => {
								const config =
									TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
								const Icon = config.icon;

								const handleAction = () => {
									if (!notification.isRead) {
										markRead(notification.id);
									}
									if (notification.messageId) {
										router.push(
											`/dashboard/messages/${notification.messageId}`,
										);
									}
								};

								return (
									<button
										key={notification.id}
										type="button"
										className={`w-full text-left flex items-start gap-3 p-4 transition-colors cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50 ${
											!notification.isRead ? "bg-primary/2" : ""
										}`}
										onClick={handleAction}
									>
										<div
											className={`h-9 w-9 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0 mt-0.5`}
										>
											<Icon className={`h-4 w-4 ${config.color}`} />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p
													className={`text-sm ${
														!notification.isRead
															? "font-semibold"
															: "font-medium"
													}`}
												>
													{notification.title}
												</p>
												{!notification.isRead && (
													<span className="h-2 w-2 rounded-full bg-primary shrink-0" />
												)}
											</div>
											<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
												{notification.body}
											</p>
											<p className="text-[11px] text-muted-foreground mt-1.5">
												{formatDistanceToNow(new Date(notification.createdAt), {
													addSuffix: true,
												})}
											</p>
										</div>
										{notification.message && (
											<Badge variant="outline" className="text-[10px] shrink-0">
												{notification.message.priority}
											</Badge>
										)}
									</button>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear All Notifications</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete all notifications? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={deleteAllConfirm}>
							Clear All
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
