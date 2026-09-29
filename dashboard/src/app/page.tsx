"use client";

import { Bot, Loader2, Mail, Shield, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	// Sign In
	const [signInEmail, setSignInEmail] = useState("");
	const [signInPassword, setSignInPassword] = useState("");

	// Sign Up
	const [signUpName, setSignUpName] = useState("");
	const [signUpEmail, setSignUpEmail] = useState("");
	const [signUpPassword, setSignUpPassword] = useState("");

	async function handleSignIn(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		try {
			const result = await signIn.email({
				email: signInEmail,
				password: signInPassword,
			});
			if (result.error) {
				toast.error(result.error.message || "Invalid credentials");
			} else {
				toast.success("Welcome back!");
				router.push("/dashboard");
			}
		} catch {
			toast.error("Something went wrong");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleSignUp(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		try {
			const result = await signUp.email({
				name: signUpName,
				email: signUpEmail,
				password: signUpPassword,
			});
			if (result.error) {
				toast.error(result.error.message || "Sign up failed");
			} else {
				toast.success("Account created! Redirecting...");
				router.push("/dashboard");
			}
		} catch {
			toast.error("Something went wrong");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex flex-col bg-linear-to-br from-background via-background to-muted/50">
			{/* Top bar */}
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>

			<div className="flex-1 flex items-center justify-center p-4">
				<div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
					{/* Left — Branding */}
					<div className="hidden lg:flex flex-col gap-8 pr-8">
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
									<Mail className="h-6 w-6 text-primary-foreground" />
								</div>
								<div>
									<h1 className="text-2xl font-bold tracking-tight">
										Email CRM
									</h1>
									<p className="text-sm text-muted-foreground">
										AI-Powered Triage Dashboard
									</p>
								</div>
							</div>
							<p className="text-lg text-muted-foreground leading-relaxed">
								Monitor conversations, review AI-classified emails, and handle
								messages that need human attention — all in one place.
							</p>
						</div>

						<div className="space-y-4">
							{[
								{
									icon: Bot,
									title: "AI Auto-Response",
									desc: "Routine messages handled automatically by AI",
								},
								{
									icon: Shield,
									title: "Human-in-the-Loop",
									desc: "Sensitive messages flagged for your review",
								},
								{
									icon: Zap,
									title: "Real-time Alerts",
									desc: "Instant notifications when your input is needed",
								},
							].map((feature) => (
								<div
									key={feature.title}
									className="flex items-start gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur-sm"
								>
									<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
										<feature.icon className="h-5 w-5 text-primary" />
									</div>
									<div>
										<p className="font-medium">{feature.title}</p>
										<p className="text-sm text-muted-foreground">
											{feature.desc}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Right — Auth Card */}
					<div className="w-full max-w-md mx-auto lg:mx-0">
						{/* Mobile branding */}
						<div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
							<div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
								<Mail className="h-5 w-5 text-primary-foreground" />
							</div>
							<h1 className="text-xl font-bold tracking-tight">Email CRM</h1>
						</div>

						<Card className="border-border/50 shadow-xl">
							<Tabs defaultValue="signin">
								<CardHeader className="pb-4">
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="signin">Sign In</TabsTrigger>
										<TabsTrigger value="signup">Sign Up</TabsTrigger>
									</TabsList>
								</CardHeader>
								<CardContent>
									{/* Sign In Tab */}
									<TabsContent value="signin" className="mt-0">
										<div className="space-y-1 mb-6">
											<CardTitle className="text-xl">Welcome back</CardTitle>
											<CardDescription>
												Sign in to your account to continue
											</CardDescription>
										</div>
										<form onSubmit={handleSignIn} className="space-y-4">
											<div className="space-y-2">
												<Label htmlFor="signin-email">Email</Label>
												<Input
													id="signin-email"
													type="email"
													placeholder="you@example.com"
													value={signInEmail}
													onChange={(e) => setSignInEmail(e.target.value)}
													required
													disabled={isLoading}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="signin-password">Password</Label>
												<Input
													id="signin-password"
													type="password"
													placeholder="••••••••"
													value={signInPassword}
													onChange={(e) => setSignInPassword(e.target.value)}
													required
													disabled={isLoading}
												/>
											</div>
											<Button
												type="submit"
												className="w-full"
												disabled={isLoading}
											>
												{isLoading ? (
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
												) : null}
												Sign In
											</Button>
										</form>
									</TabsContent>

									{/* Sign Up Tab */}
									<TabsContent value="signup" className="mt-0">
										<div className="space-y-1 mb-6">
											<CardTitle className="text-xl">Create account</CardTitle>
											<CardDescription>
												Set up your team member account
											</CardDescription>
										</div>
										<form onSubmit={handleSignUp} className="space-y-4">
											<div className="space-y-2">
												<Label htmlFor="signup-name">Full Name</Label>
												<Input
													id="signup-name"
													type="text"
													placeholder="Your Name"
													value={signUpName}
													onChange={(e) => setSignUpName(e.target.value)}
													required
													disabled={isLoading}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="signup-email">Email</Label>
												<Input
													id="signup-email"
													type="email"
													placeholder="you@example.com"
													value={signUpEmail}
													onChange={(e) => setSignUpEmail(e.target.value)}
													required
													disabled={isLoading}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="signup-password">Password</Label>
												<Input
													id="signup-password"
													type="password"
													placeholder="Min. 8 characters"
													value={signUpPassword}
													onChange={(e) => setSignUpPassword(e.target.value)}
													required
													minLength={8}
													disabled={isLoading}
												/>
											</div>
											<Button
												type="submit"
												className="w-full"
												disabled={isLoading}
											>
												{isLoading ? (
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
												) : null}
												Create Account
											</Button>
										</form>
									</TabsContent>
								</CardContent>
							</Tabs>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
