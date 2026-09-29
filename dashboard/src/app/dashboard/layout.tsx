"use client";

import {
	Bell,
	ChevronLeft,
	ChevronRight,
	Inbox,
	LayoutDashboard,
	LogOut,
	Mail,
	Menu,
	ShieldAlert,
	ShieldBan,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut, useSession } from "@/lib/auth-client";

const navItems = [
	{ href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
	{ href: "/dashboard/inbox", icon: Inbox, label: "Inbox" },
	{ href: "/dashboard/approvals", icon: ShieldAlert, label: "Approvals" },
	{ href: "/dashboard/spam", icon: ShieldBan, label: "Spam" },
	{ href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [pendingCount, setPendingCount] = useState(0);
	const [spamCount, setSpamCount] = useState(0);
console.log('spam count:', spamCount)
	const fetchCounts = useCallback(async () => {
		try {
			const [notifRes, approvalRes, spamRes] = await Promise.all([
				fetch("/api/notifications?unread=true&limit=1"),
				fetch(
					"/api/messages?classification=HUMAN_APPROVAL&status=pending&limit=1",
				),
				fetch("/api/messages?classification=SPAM&limit=1"),
			]);
			if (notifRes.ok) {
				const data = await notifRes.json();
				setUnreadCount(data.unreadCount);
			}
			if (approvalRes.ok) {
				const data = await approvalRes.json();
				setPendingCount(data.pagination.total);
			}
			if (spamRes.ok) {
				const data = await spamRes.json();
				console.log('spam data----->',data)
				setSpamCount(data.pagination.total);
			}
		} catch {
			// silently fail
		}
	}, []);

	useEffect(() => {
		if (session) {
			fetchCounts();
			const interval = setInterval(fetchCounts, 15000);
			return () => clearInterval(interval);
		}
	}, [session, fetchCounts]);

	useEffect(() => {
		if (!isPending && !session) {
			router.push("/");
		}
	}, [session, isPending, router]);

	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-pulse flex flex-col items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-primary/20" />
					<div className="h-4 w-32 rounded bg-muted" />
				</div>
			</div>
		);
	}

	if (!session) return null;

	const initials =
		session.user.name
			?.split(" ")
			.map((n: string) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) || "U";

	function NavLink({
		item,
		mobile = false,
	}: {
		item: (typeof navItems)[0];
		mobile?: boolean;
	}) {
		const isActive =
			item.href === "/dashboard"
				? pathname === "/dashboard"
				: pathname.startsWith(item.href);

		let badgeCount = 0;
		if (item.href === "/dashboard/notifications") badgeCount = unreadCount;
		if (item.href === "/dashboard/approvals") badgeCount = pendingCount;
		if (item.href === "/dashboard/spam") badgeCount = spamCount;

		const content = (
			<Link
				href={item.href}
				onClick={() => mobile && setMobileOpen(false)}
				className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${
					isActive
						? "bg-primary text-primary-foreground shadow-sm"
						: "text-muted-foreground hover:text-foreground hover:bg-accent"
				} ${collapsed && !mobile ? "justify-center px-2.5" : ""}`}
			>
				<div className="relative flex items-center justify-center">
					<item.icon
						className={`shrink-0 ${collapsed && !mobile ? "h-5 w-5" : "h-4.5 w-4.5"}`}
					/>
					{collapsed && !mobile && badgeCount > 0 && (
						<span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
							{badgeCount > 9 ? "9+" : badgeCount}
						</span>
					)}
				</div>
				{(!collapsed || mobile) && (
					<>
						<span className="flex-1">{item.label}</span>
						{badgeCount > 0 && (
							<Badge
								variant={isActive ? "secondary" : "default"}
								className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
							>
								{badgeCount > 99 ? "99+" : badgeCount}
							</Badge>
						)}
					</>
				)}
			</Link>
		);

		if (collapsed && !mobile) {
			return (
				<Tooltip>
					{/* @ts-expect-error - asChild type issue */}
					<TooltipTrigger asChild>{content}</TooltipTrigger>
					<TooltipContent side="right" className="flex items-center gap-2">
						{item.label}
						{badgeCount > 0 && (
							<Badge variant="secondary" className="h-5 text-[10px]">
								{badgeCount}
							</Badge>
						)}
					</TooltipContent>
				</Tooltip>
			);
		}

		return content;
	}

	const sidebarContent = (mobile: boolean) => (
		<div className="flex flex-col h-full">
			{/* Logo */}
			<div
				className={`flex items-center gap-3 px-4 py-5 ${
					collapsed && !mobile ? "justify-center px-2" : ""
				}`}
			>
				<div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
					<Mail className="h-4.5 w-4.5 text-primary-foreground" />
				</div>
				{(!collapsed || mobile) && (
					<div className="overflow-hidden">
						<h2 className="font-bold text-sm leading-tight tracking-tight">
							Email CRM
						</h2>
						<p className="text-[11px] text-muted-foreground truncate">
							AI Triage Dashboard
						</p>
					</div>
				)}
			</div>

			<Separator />

			{/* Nav */}
			<ScrollArea className="flex-1 px-3 py-4">
				<nav className="space-y-1">
					{navItems.map((item) => (
						<NavLink key={item.href} item={item} mobile={mobile} />
					))}
				</nav>
			</ScrollArea>

			<Separator />

			{/* User */}
			<div className={`p-3 ${collapsed && !mobile ? "px-2" : ""}`}>
				<DropdownMenu>
					<DropdownMenuTrigger
						className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer outline-none ${
							collapsed && !mobile ? "justify-center px-2" : ""
						}`}
					>
						<Avatar className="h-8 w-8 shrink-0">
							<AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
								{initials}
							</AvatarFallback>
						</Avatar>
						{(!collapsed || mobile) && (
							<div className="flex-1 text-left overflow-hidden">
								<p className="font-medium text-sm truncate">
									{session.user.name}
								</p>
								<p className="text-[11px] text-muted-foreground truncate">
									{session.user.email}
								</p>
							</div>
						)}
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						side="top"
						sideOffset={8}
						className="w-56"
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel>
								<div>
									<p className="font-medium">{session.user.name}</p>
									<p className="text-xs text-muted-foreground">
										{session.user.email}
									</p>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async () => {
								await signOut();
								router.push("/");
							}}
							className="text-destructive focus:text-destructive"
						>
							<LogOut className="mr-2 h-4 w-4" />
							Sign Out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen flex bg-background">
			{/* Desktop Sidebar — fixed, never scrolls with page content */}
			<aside
				className={`hidden lg:flex flex-col border-r bg-card/50 backdrop-blur-sm transition-all duration-300 sticky top-0 h-screen overflow-visible ${
					collapsed ? "w-17" : "w-64"
				}`}
			>
				{sidebarContent(false)}
				<div className="px-3 pb-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setCollapsed(!collapsed)}
						className={`w-full ${collapsed ? "px-0 justify-center" : ""}`}
					>
						{collapsed ? (
							<ChevronRight className="h-4 w-4" />
						) : (
							<>
								<ChevronLeft className="h-4 w-4 mr-2" />
								<span className="text-xs">Collapse</span>
							</>
						)}
					</Button>
				</div>
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Top Bar */}
				<header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
					{/* Mobile menu */}
					<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
						<SheetTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									className="lg:hidden h-9 w-9"
								/>
							}
						>
							<Menu className="h-5 w-5" />
						</SheetTrigger>
						<SheetContent side="left" className="w-64 p-0">
							{sidebarContent(true)}
						</SheetContent>
					</Sheet>

					{/* Page title */}
					<div className="flex-1">
						<h1 className="text-lg font-semibold capitalize">
							{pathname === "/dashboard"
								? "Overview"
								: pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
						</h1>
					</div>

					{/* Right actions */}
					<div className="flex items-center gap-1">
						<Tooltip>
							{/* @ts-expect-error - asChild type issue */}
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 relative"
									onClick={() => router.push("/dashboard/notifications")}
								>
									<Bell className="h-4 w-4" />
									{unreadCount > 0 && (
										<span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
											{unreadCount > 9 ? "9+" : unreadCount}
										</span>
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>Notifications</TooltipContent>
						</Tooltip>
						<ThemeToggle />
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
			</div>
		</div>
	);
}
