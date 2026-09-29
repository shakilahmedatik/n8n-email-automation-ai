"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Inbox,
	Loader2,
	ShieldBan,
	Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface Message {
	id: string;
	senderName: string;
	senderEmail: string;
	subject: string;
	aiSummary: string | null;
	receivedAt: string;
}

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export default function SpamPage() {
	const router = useRouter();
	const [messages, setMessages] = useState<Message[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const fetchMessages = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/messages?status=spam&page=${page}&limit=20`,
			);
			if (res.ok) {
				const data = await res.json();
				setMessages(data.messages);
				setPagination(data.pagination);
			}
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, [page]);

	useEffect(() => {
		fetchMessages();
	}, [fetchMessages]);

	async function handleUnmarkSpam(id: string) {
		setActionLoading(id);
		try {
			const res = await fetch(`/api/messages/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "unmark_spam" }),
			});
			if (res.ok) {
				toast.success("Message moved to inbox");
				setMessages((prev) => prev.filter((m) => m.id !== id));
				if (pagination) {
					setPagination({ ...pagination, total: pagination.total - 1 });
				}
			} else {
				toast.error("Failed to unmark spam");
			}
		} catch {
			toast.error("Something went wrong");
		} finally {
			setActionLoading(null);
		}
	}
console.log('spam data: ', messages)
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3 mb-2">
				<div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
					<ShieldBan className="h-5 w-5 text-red-500" />
				</div>
				<div>
					<p className="font-semibold text-sm">Spam Messages</p>
					<p className="text-xs text-muted-foreground">
						Automatically classified as spam by AI — review if needed
					</p>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Spam Box</CardTitle>
							<CardDescription>
								{pagination
									? `${pagination.total} spam message${pagination.total !== 1 ? "s" : ""}`
									: "Loading..."}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{loading ? (
						<div className="p-6 space-y-3">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-14" />
							))}
						</div>
					) : messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<Inbox className="h-10 w-10 mb-3 opacity-30" />
							<p className="font-medium">No spam</p>
							<p className="text-sm">Your inbox is clean</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-50">Sender</TableHead>
											<TableHead>Subject / Summary</TableHead>
											<TableHead className="w-30 text-right">
												Received
											</TableHead>
											<TableHead className="w-25 text-right">
												Action
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{messages.map((msg) => (
											<TableRow key={msg.id}>
												<TableCell>
													<div className="min-w-0">
														<p className="font-medium text-sm truncate">
															{msg.senderName}
														</p>
														<p className="text-xs text-muted-foreground truncate">
															{msg.senderEmail}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<button
														type="button"
														className="min-w-0 cursor-pointer text-left w-full bg-transparent border-none p-0"
														onClick={() =>
															router.push(`/dashboard/messages/${msg.id}`)
														}
													>
														<p className="text-sm truncate">{msg.subject}</p>
														{msg.aiSummary && (
															<p className="text-xs text-muted-foreground truncate mt-0.5">
																{msg.aiSummary}
															</p>
														)}
													</button>
												</TableCell>
												<TableCell className="text-right text-xs text-muted-foreground">
													{formatDistanceToNow(new Date(msg.receivedAt), {
														addSuffix: true,
													})}
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleUnmarkSpam(msg.id)}
														disabled={actionLoading === msg.id}
													>
														{actionLoading === msg.id ? (
															<Loader2 className="h-3.5 w-3.5 animate-spin" />
														) : (
															<Undo2 className="h-3.5 w-3.5 mr-1" />
														)}
														Not Spam
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{pagination && pagination.totalPages > 1 && (
								<div className="flex items-center justify-between px-6 py-4 border-t">
									<p className="text-xs text-muted-foreground">
										Page {pagination.page} of {pagination.totalPages}
									</p>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page <= 1}
											onClick={() => setPage(page - 1)}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => setPage(page + 1)}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
