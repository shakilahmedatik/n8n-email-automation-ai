"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Filter,
	Inbox as InboxIcon,
	Search,
	Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	classification: string;
	priority: string;
	status: string;
	aiSummary: string | null;
	receivedAt: string;
}

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

const CLASSIFICATION_STYLES: Record<
	string,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	AUTO_REPLY: { label: "Auto Reply", variant: "default" },
	HUMAN_APPROVAL: { label: "Needs Review", variant: "destructive" },
	NO_REPLY: { label: "No Reply", variant: "secondary" },
	SPAM: { label: "Spam", variant: "outline" },
};

const PRIORITY_STYLES: Record<string, { color: string }> = {
	High: { color: "text-red-500 bg-red-500/10 border-red-500/20" },
	Medium: { color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
	Low: { color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
	pending: { label: "Pending", color: "text-amber-500" },
	approved: { label: "Approved", color: "text-green-500" },
	rejected: { label: "Rejected", color: "text-red-500" },
	auto_sent: { label: "Auto Sent", color: "text-blue-500" },
	spam: { label: "Spam", color: "text-red-400" },
	ignored: { label: "Ignored", color: "text-slate-400" },
};

export default function InboxPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [messages, setMessages] = useState<Message[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [loading, setLoading] = useState(true);
	
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

	const [search, setSearch] = useState(searchParams.get("search") || "");
	const [classification, setClassification] = useState(
		searchParams.get("classification") || "all",
	);
	const [priority, setPriority] = useState(
		searchParams.get("priority") || "all",
	);
	const [status, setStatus] = useState(searchParams.get("status") || "all");
	const [page, setPage] = useState(
		parseInt(searchParams.get("page") || "1", 10),
	);

	const fetchMessages = useCallback(async (background = false) => {
		if (!background) setLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("page", page.toString());
			params.set("limit", "20");
			if (search) params.set("search", search);
			if (classification !== "all")
				params.set("classification", classification);
			if (priority !== "all") params.set("priority", priority);
			if (status !== "all") params.set("status", status);

			const res = await fetch(`/api/messages?${params}`);
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
	}, [page, search, classification, priority, status]);

	useEffect(() => {
		fetchMessages();
		const interval = setInterval(() => fetchMessages(true), 15000);
		return () => clearInterval(interval);
	}, [fetchMessages]);

	async function handleDeleteConfirm() {
		if (!messageToDelete) return;
		try {
			const res = await fetch(`/api/messages`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: messageToDelete }),
			});
			if (res.ok) {
				fetchMessages(true);
			}
		} catch {
			// silently fail
		} finally {
			setDeleteDialogOpen(false);
			setMessageToDelete(null);
		}
	}

	function handleDeleteClick(e: React.MouseEvent, id: string) {
		e.stopPropagation();
		setMessageToDelete(id);
		setDeleteDialogOpen(true);
	}

	// Debounced search
	const [searchDebounce, setSearchDebounce] = useState(search);
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchDebounce);
			setPage(1);
		}, 400);
		return () => clearTimeout(timer);
	}, [searchDebounce]);

	return (
		<div className="space-y-4">
			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search messages..."
								className="pl-9"
								value={searchDebounce}
								onChange={(e) => setSearchDebounce(e.target.value)}
							/>
						</div>
						<div className="flex gap-2 flex-wrap">
							<Select
								value={classification}
								onValueChange={(v) => {
									setClassification(v as string);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-37.5">
									<Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
									<SelectValue placeholder="Classification" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="AUTO_REPLY">Auto Reply</SelectItem>
									<SelectItem value="HUMAN_APPROVAL">Human Approval</SelectItem>
									<SelectItem value="NO_REPLY">No Reply</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={priority}
								onValueChange={(v) => {
									setPriority(v as string);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-30">
									<SelectValue placeholder="Priority" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="High">High</SelectItem>
									<SelectItem value="Medium">Medium</SelectItem>
									<SelectItem value="Low">Low</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={status}
								onValueChange={(v) => {
									setStatus(v as string);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-32.5">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="approved">Approved</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
									<SelectItem value="auto_sent">Auto Sent</SelectItem>
									<SelectItem value="spam">Spam</SelectItem>
									<SelectItem value="ignored">Ignored</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Message Table */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Messages</CardTitle>
							<CardDescription>
								{pagination
									? `${pagination.total} message${pagination.total !== 1 ? "s" : ""} total`
									: "Loading..."}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{loading ? (
						<div className="p-6 space-y-3">
							{[1, 2, 3, 4, 5].map((id) => (
								<Skeleton key={id} className="h-14" />
							))}
						</div>
					) : messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<InboxIcon className="h-10 w-10 mb-3 opacity-30" />
							<p className="font-medium">No messages found</p>
							<p className="text-sm">
								{search || classification !== "all" || priority !== "all"
									? "Try adjusting your filters"
									: "Messages will appear here once n8n starts sending data"}
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-50">Sender</TableHead>
											<TableHead>Subject</TableHead>
											<TableHead className="w-30">Type</TableHead>
											<TableHead className="w-22.5">Priority</TableHead>
											<TableHead className="w-25">Status</TableHead>
											<TableHead className="w-30 text-right">
												Received
											</TableHead>
											<TableHead className="w-10"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{messages.map((msg) => {
											const clsStyle =
												CLASSIFICATION_STYLES[msg.classification] ||
												CLASSIFICATION_STYLES.NO_REPLY;
											const priStyle =
												PRIORITY_STYLES[msg.priority] || PRIORITY_STYLES.Low;
											const statStyle =
												STATUS_STYLES[msg.status] || STATUS_STYLES.pending;

											return (
												<TableRow
													key={msg.id}
													className="cursor-pointer hover:bg-muted/50 transition-colors"
													onClick={() =>
														router.push(`/dashboard/messages/${msg.id}`)
													}
												>
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
														<div className="min-w-0">
															<p className="text-sm truncate font-medium">
																{msg.subject}
															</p>
															{msg.aiSummary && (
																<p className="text-xs text-muted-foreground truncate mt-0.5">
																	{msg.aiSummary}
																</p>
															)}
														</div>
													</TableCell>
													<TableCell>
														<Badge
															variant={clsStyle.variant}
															className="text-[11px]"
														>
															{clsStyle.label}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge
															variant="outline"
															className={`text-[11px] ${priStyle.color}`}
														>
															{msg.priority}
														</Badge>
													</TableCell>
													<TableCell>
														<span
															className={`text-xs font-medium ${statStyle.color}`}
														>
															{statStyle.label}
														</span>
													</TableCell>
													<TableCell className="text-right text-xs text-muted-foreground">
														{formatDistanceToNow(new Date(msg.receivedAt), {
															addSuffix: true,
														})}
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-muted-foreground hover:text-destructive"
															onClick={(e) => handleDeleteClick(e, msg.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
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
											onClick={() => setPage(pagination.page - 1)}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => setPage(pagination.page + 1)}
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
						<Button variant="destructive" onClick={handleDeleteConfirm}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
