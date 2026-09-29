"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ArrowUpRight,
	Clock,
	Inbox,
	ShieldAlert,
	ShieldBan,
	TrendingUp,
	XCircle,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
	overview: {
		totalMessages: number;
		todayMessages: number;
		pendingApprovals: number;
		autoRepliesSent: number;
		spamCaught: number;
		rejectedMessages: number;
	};
	classificationBreakdown: Array<{ name: string; value: number }>;
	priorityBreakdown: Array<{ name: string; value: number }>;
	recentActivity: Array<{
		id: string;
		action: string;
		createdAt: string;
		user?: { name: string } | null;
		message?: { subject: string; senderName: string } | null;
	}>;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
	AUTO_REPLY: "hsl(142, 71%, 45%)",
	HUMAN_APPROVAL: "hsl(38, 92%, 50%)",
	NO_REPLY: "hsl(215, 20%, 65%)",
	SPAM: "hsl(0, 84%, 60%)",
};

const CLASSIFICATION_LABELS: Record<string, string> = {
	AUTO_REPLY: "Auto Reply",
	HUMAN_APPROVAL: "Human Approval",
	NO_REPLY: "No Reply",
	SPAM: "Spam",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
	message_auto_reply: { label: "Auto-replied", color: "text-green-500" },
	message_human_approval: { label: "Needs approval", color: "text-amber-500" },
	message_no_reply: { label: "Ignored", color: "text-muted-foreground" },
	message_spam: { label: "Spam detected", color: "text-red-500" },
	message_approve: { label: "Approved", color: "text-green-500" },
	message_reject: { label: "Rejected", color: "text-red-500" },
	message_mark_spam: { label: "Marked as spam", color: "text-red-500" },
	message_unmark_spam: { label: "Unmarked spam", color: "text-blue-500" },
};

export default function DashboardPage() {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchStats = useCallback(async () => {
		try {
			const res = await fetch("/api/stats");
			if (res.ok) {
				const data = await res.json();
				setStats(data);
			}
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStats();
		const interval = setInterval(fetchStats, 30000);
		return () => clearInterval(interval);
	}, [fetchStats]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<Card key={i}>
							<CardHeader className="pb-2">
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16" />
							</CardContent>
						</Card>
					))}
				</div>
				<div className="grid gap-6 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-40" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-62.5" />
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-40" />
						</CardHeader>
						<CardContent className="space-y-3">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-12" />
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	const statCards = [
		{
			title: "Today's Messages",
			value: stats?.overview.todayMessages ?? 0,
			icon: Inbox,
			href: "/dashboard/inbox",
			color: "text-blue-500",
			bgColor: "bg-blue-500/10",
		},
		{
			title: "Pending Approvals",
			value: stats?.overview.pendingApprovals ?? 0,
			icon: ShieldAlert,
			href: "/dashboard/approvals",
			color: "text-amber-500",
			bgColor: "bg-amber-500/10",
			urgent: (stats?.overview.pendingApprovals ?? 0) > 0,
		},
		{
			title: "Auto-Replies (Today)",
			value: stats?.overview.autoRepliesSent ?? 0,
			icon: Zap,
			href: "/dashboard/inbox?classification=AUTO_REPLY",
			color: "text-green-500",
			bgColor: "bg-green-500/10",
		},
		{
			title: "Spam Caught (Today)",
			value: stats?.overview.spamCaught ?? 0,
			icon: ShieldBan,
			href: "/dashboard/spam",
			color: "text-red-500",
			bgColor: "bg-red-500/10",
		},
	];

	return (
		<div className="space-y-6">
			{/* Urgent banner */}
			{(stats?.overview.pendingApprovals ?? 0) > 0 && (
				<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-4">
					<div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
						<ShieldAlert className="h-5 w-5 text-amber-500" />
					</div>
					<div className="flex-1">
						<p className="font-semibold text-sm">
							{stats?.overview.pendingApprovals} message
							{stats?.overview.pendingApprovals !== 1 ? "s" : ""} waiting for
							review
						</p>
						<p className="text-xs text-muted-foreground">
							AI has flagged these messages for human attention
						</p>
					</div>
					<Link href="/dashboard/approvals">
						<Badge
							variant="outline"
							className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer gap-1"
						>
							Review now
							<ArrowUpRight className="h-3 w-3" />
						</Badge>
					</Link>
				</div>
			)}

			{/* Stat Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statCards.map((stat) => (
					<Link key={stat.title} href={stat.href}>
						<Card
							className={`hover:shadow-md transition-all duration-200 cursor-pointer group ${
								stat.urgent ? "border-amber-500/40 shadow-amber-500/5" : ""
							}`}
						>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardDescription className="text-xs font-medium">
									{stat.title}
								</CardDescription>
								<div
									className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}
								>
									<stat.icon className={`h-4 w-4 ${stat.color}`} />
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-baseline gap-2">
									<span className="text-3xl font-bold tracking-tight">
										{stat.value}
									</span>
									<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Charts & Activity */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Classification Breakdown */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
							Classification Breakdown
						</CardTitle>
						<CardDescription>
							How AI is categorizing incoming messages
						</CardDescription>
					</CardHeader>
					<CardContent>
						{stats?.classificationBreakdown &&
						stats.classificationBreakdown.length > 0 ? (
							<ResponsiveContainer width="100%" height={280}>
								<PieChart>
									<Pie
										data={stats.classificationBreakdown.map((item) => ({
											...item,
											displayName:
												CLASSIFICATION_LABELS[item.name] || item.name,
										}))}
										cx="50%"
										cy="50%"
										innerRadius={60}
										outerRadius={100}
										paddingAngle={4}
										dataKey="value"
										nameKey="displayName"
										stroke="none"
									>
										{stats.classificationBreakdown.map((entry) => (
											<Cell
												key={entry.name}
												fill={
													CLASSIFICATION_COLORS[entry.name] || "hsl(0,0%,50%)"
												}
											/>
										))}
									</Pie>
									<RechartsTooltip
										contentStyle={{
											borderRadius: "8px",
											border: "1px solid hsl(var(--border))",
											backgroundColor: "hsl(var(--card))",
											color: "hsl(var(--card-foreground))",
											fontSize: "13px",
										}}
									/>
									<Legend
										formatter={(value) => (
											<span className="text-xs text-foreground">{value}</span>
										)}
									/>
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="h-70 flex items-center justify-center text-muted-foreground text-sm">
								No data yet — messages will appear here once n8n starts sending
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Activity */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							Recent Activity
						</CardTitle>
						<CardDescription>Latest actions and events</CardDescription>
					</CardHeader>
					<CardContent>
						{stats?.recentActivity && stats.recentActivity.length > 0 ? (
							<div className="space-y-1">
								{stats.recentActivity.map((activity) => {
									const actionInfo = ACTION_LABELS[activity.action] || {
										label: activity.action,
										color: "text-muted-foreground",
									};
									return (
										<div
											key={activity.id}
											className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
										>
											<div className="mt-0.5">
												{activity.action.includes("reject") ||
												activity.action.includes("spam") ? (
													<XCircle className="h-4 w-4 text-red-500" />
												) : activity.action.includes("approve") ? (
													<Zap className="h-4 w-4 text-green-500" />
												) : activity.action.includes("auto") ? (
													<Zap className="h-4 w-4 text-green-500" />
												) : (
													<Inbox className="h-4 w-4 text-muted-foreground" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm">
													<span className={`font-medium ${actionInfo.color}`}>
														{actionInfo.label}
													</span>
													{activity.message && (
														<span className="text-muted-foreground">
															{" · "}
															{activity.message.subject?.slice(0, 40) ||
																activity.message.senderName}
															{(activity.message.subject?.length ?? 0) > 40
																? "…"
																: ""}
														</span>
													)}
												</p>
												<p className="text-[11px] text-muted-foreground mt-0.5">
													{activity.user?.name && `${activity.user.name} · `}
													{formatDistanceToNow(new Date(activity.createdAt), {
														addSuffix: true,
													})}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="h-70 flex items-center justify-center text-muted-foreground text-sm">
								No activity yet
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Summary row */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium">
							Total Messages
						</CardDescription>
					</CardHeader>
					<CardContent>
						<span className="text-2xl font-bold">
							{stats?.overview.totalMessages ?? 0}
						</span>
						<p className="text-xs text-muted-foreground mt-1">
							All time across all classifications
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium">
							Rejected Messages
						</CardDescription>
					</CardHeader>
					<CardContent>
						<span className="text-2xl font-bold">
							{stats?.overview.rejectedMessages ?? 0}
						</span>
						<p className="text-xs text-muted-foreground mt-1">
							AI drafts declined by reviewers
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium">
							Approval Queue
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2 flex-wrap">
							{stats?.priorityBreakdown &&
							stats.priorityBreakdown.length > 0 ? (
								stats.priorityBreakdown.map((item) => (
									<Badge
										key={item.name}
										variant={
											item.name === "High"
												? "destructive"
												: item.name === "Medium"
													? "default"
													: "secondary"
										}
									>
										{item.name}: {item.value}
									</Badge>
								))
							) : (
								<span className="text-sm text-muted-foreground">
									Queue empty — all caught up!
								</span>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
