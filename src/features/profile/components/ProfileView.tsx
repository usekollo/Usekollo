"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Copy, ExternalLink, Link2, Lock, LogOut, Plus, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import KeyIntegrityMeter from "@/components/auth/KeyIntegrityMeter";
import WalletIcon from "@/components/icons/WalletIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import InputField from "@/components/ui/custom/InputField";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogoutMutation } from "@/features/auth/hooks";
import {
	useChangePassword,
	useConnectWallet,
	useDisconnectWallet,
	useProfile,
	useUpdateProfile,
	useWalletConnection,
} from "@/features/profile/hooks";
import { ChangePasswordSchema, ChangePasswordValues, PersonalDetailsSchema, PersonalDetailsValues } from "@/lib/validations/profileValidations";
import { cn } from "@/lib/utils";

type TabId = "connection" | "personal" | "security";

const TABS: { id: TabId; label: string }[] = [
	{ id: "connection", label: "Connection" },
	{ id: "personal", label: "Personal Details" },
	{ id: "security", label: "Security" },
];

function formatSyncTime(iso: string) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "--:--:-- UTC";
	return `${date.toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" })} UTC`;
}

function ConnectionTab() {
	const { data, isLoading } = useWalletConnection();
	const disconnect = useDisconnectWallet();
	const connect = useConnectWallet();
	const [confirmOpen, setConfirmOpen] = useState(false);

	if (isLoading) {
		return <Skeleton className="h-72 w-full rounded-3xl" />;
	}

	if (!data?.connected) {
		return (
			<div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-xs">
				<span className="flex size-16 items-center justify-center rounded-full bg-grey-lighter text-grey-dark">
					<WalletIcon className="size-6" />
				</span>
				<h2 className="mt-6 text-xl font-medium text-foreground">No Wallet Connected</h2>
				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					Connect a Stellar wallet to sync your balance and start saving toward your goals.
				</p>
				<Button onClick={() => connect.mutate()} isLoading={connect.isPending} size="xl" className="mt-6">
					<Plus className="size-4" />
					Connect Wallet
				</Button>
			</div>
		);
	}

	const copyAddress = async () => {
		try {
			await navigator.clipboard.writeText(data.address);
			toast.success("Wallet address copied.");
		} catch {
			// Clipboard access can be blocked (insecure context, permissions) —
			// the address is still visible on screen either way.
		}
	};

	return (
		<>
			<div className="rounded-3xl bg-white p-6 shadow-xs md:p-8">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-medium text-foreground">Connection</h2>
					<Link2 className="size-5 text-primary" />
				</div>

				<div className="mt-6 space-y-2">
					<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">Wallet Address</p>
					<div className="flex items-center justify-between gap-3 rounded-full bg-grey-lighter py-2 pr-5 pl-2">
						<span className="flex min-w-0 items-center gap-3 text-sm font-medium text-foreground">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-dark text-white">
								<WalletIcon className="size-4" />
							</span>
							<span className="truncate">{data.address}</span>
						</span>
						<button
							type="button"
							onClick={copyAddress}
							aria-label="Copy wallet address"
							className="shrink-0 text-grey-normal hover:text-foreground"
						>
							<Copy className="size-4" />
						</button>
					</div>
				</div>

				<div className="mt-6 space-y-1">
					<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">Last Sync</p>
					<p className="text-sm text-foreground">{formatSyncTime(data.lastSyncedAt)}</p>
				</div>
			</div>

			<Button
				onClick={() => setConfirmOpen(true)}
				variant="outline"
				size="xl"
				className="mt-6 w-full"
			>
				Disconnect Wallet
				<ExternalLink className="size-4" />
			</Button>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<div className="p-6 text-center sm:p-8">
						<span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 text-destructive">
							<WalletIcon className="size-6" />
						</span>
						<h2 className="mt-4 text-xl font-medium text-foreground">Disconnect wallet?</h2>
						<p className="mt-2 text-sm text-grey-normal">
							You won&apos;t be able to add savings or see your live balance until you reconnect it.
						</p>
						<div className="mt-6 space-y-3">
							<Button
								onClick={() => disconnect.mutate(undefined, { onSuccess: () => setConfirmOpen(false) })}
								isLoading={disconnect.isPending}
								variant="destructive"
								size="xl"
								className="w-full"
							>
								Disconnect Wallet
							</Button>
							<Button onClick={() => setConfirmOpen(false)} variant="outline" size="xl" className="w-full">
								Cancel
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function PersonalDetailsTab() {
	const { data, isLoading } = useProfile();
	const { mutate: updateProfile, isPending } = useUpdateProfile();
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

	const form = useForm<PersonalDetailsValues>({
		resolver: zodResolver(PersonalDetailsSchema),
		mode: "onChange",
		defaultValues: { fullName: "" },
	});

	useEffect(() => {
		if (data) form.reset({ fullName: data.fullName });
		// form is stable across renders (react-hook-form) — only re-run when
		// the loaded profile itself changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const {
		formState: { isValid },
	} = form;

	if (isLoading || !data) {
		return <Skeleton className="h-96 w-full rounded-3xl" />;
	}

	const avatarSrc = avatarPreview ?? data.avatarUrl;

	const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => setAvatarPreview(reader.result as string);
		reader.readAsDataURL(file);
	};

	const onSubmit = (values: PersonalDetailsValues) => {
		// Email isn't editable here (see PersonalDetailsSchema) — send the
		// account's existing address through unchanged.
		updateProfile({ ...values, email: data.email, avatarUrl: avatarSrc });
	};

	return (
		<div className="rounded-3xl bg-white p-6 shadow-xs md:p-8">
			<h2 className="text-lg font-medium text-foreground">Personal Details</h2>

			<div className="mt-6 flex items-center gap-4">
				<span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grey-lighter text-grey-dark">
					{avatarSrc ? (
						// eslint-disable-next-line @next/next/no-img-element -- a user-picked data: URL, not a static/remote asset the image optimizer can help with
						<img src={avatarSrc} alt="" className="size-full object-cover" />
					) : (
						<UserRound className="size-8" />
					)}
				</span>
				<div>
					<label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-grey-lighter">
						<Camera className="size-4" />
						Change Photo
						<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
					</label>
					<p className="mt-2 text-xs text-grey-normal">JPG or PNG, up to 2MB.</p>
				</div>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
					<FormField
						control={form.control}
						name="fullName"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField {...field} label="Full Name" error={fieldState.error?.message ?? null} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<InputField
						name="email"
						label="Email Address"
						type="email"
						value={data.email}
						disabled
						readonly
						icon={<Lock className="size-4" />}
						description="Your email is tied to your account and can't be changed."
					/>

					<Button type="submit" size="xl" isLoading={isPending} disabled={!isValid}>
						Save Changes
					</Button>
				</form>
			</Form>
		</div>
	);
}

function SecurityTab() {
	const { mutate: changePassword, isPending } = useChangePassword();

	const form = useForm<ChangePasswordValues>({
		resolver: zodResolver(ChangePasswordSchema),
		mode: "onChange",
		defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
	});

	const {
		formState: { isValid },
	} = form;

	const newPassword = form.watch("newPassword");

	const onSubmit = (values: ChangePasswordValues) => {
		changePassword(values, { onSuccess: () => form.reset() });
	};

	return (
		<div className="rounded-3xl bg-white p-6 shadow-xs md:p-8">
			<h2 className="text-lg font-medium text-foreground">Change Password</h2>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
					<FormField
						control={form.control}
						name="currentPassword"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Current Password"
										icon={<Lock className="size-4" />}
										type="password"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="newPassword"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="New Password"
										icon={<Lock className="size-4" />}
										type="password"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Confirm New Password"
										icon={<Lock className="size-4" />}
										type="password"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<KeyIntegrityMeter password={newPassword} />

					<Button type="submit" size="xl" isLoading={isPending} disabled={!isValid}>
						Update Password
					</Button>
				</form>
			</Form>
		</div>
	);
}

function LogoutSection() {
	const [open, setOpen] = useState(false);
	const { mutate: logout, isPending } = useLogoutMutation();

	return (
		<>
			<div className="rounded-3xl bg-white p-6 shadow-xs md:p-8">
				<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
					<div>
						<h2 className="text-lg font-medium text-foreground">Log Out</h2>
						<p className="mt-1 text-sm text-grey-normal">Sign out of usekollo on this device.</p>
					</div>
					<Button
						onClick={() => setOpen(true)}
						variant="outline"
						size="lg"
						className="w-full shrink-0 text-destructive sm:w-auto"
					>
						<LogOut className="size-4" />
						Log Out
					</Button>
				</div>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<div className="p-6 text-center sm:p-8">
						<span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 text-destructive">
							<LogOut className="size-6" />
						</span>
						<h2 className="mt-4 text-xl font-medium text-foreground">Log out?</h2>
						<p className="mt-2 text-sm text-grey-normal">
							You&apos;ll need to sign in again to access your dashboard.
						</p>
						<div className="mt-6 space-y-3">
							<Button
								onClick={() => logout()}
								isLoading={isPending}
								variant="destructive"
								size="xl"
								className="w-full"
							>
								Log Out
							</Button>
							<Button onClick={() => setOpen(false)} variant="outline" size="xl" className="w-full">
								Cancel
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

// Built from the pasted "Profile" screenshots (Connection tab, plus the
// disconnected empty state) — Personal Details, Security, and Log Out
// weren't in the reference but were asked for explicitly, so they follow
// the same card/form conventions as the rest of the dashboard rather than
// a specific mockup.
export default function ProfileView() {
	const [tab, setTab] = useState<TabId>("connection");

	return (
		<div className="space-y-6">
			<div className="hidden items-center gap-2 text-sm md:flex">
				<span className="font-medium text-foreground">Profile Settings</span>
			</div>

			<div className="flex items-center gap-1 overflow-x-auto rounded-full bg-grey-lighter p-1 text-sm font-medium">
				{TABS.map(({ id, label }) => (
					<button
						key={id}
						type="button"
						onClick={() => setTab(id)}
						className={cn(
							"shrink-0 rounded-full px-4 py-2 whitespace-nowrap transition-colors",
							tab === id ? "bg-grey-dark text-white" : "text-grey-normal",
						)}
					>
						{label}
					</button>
				))}
			</div>

			{tab === "connection" && <ConnectionTab />}
			{tab === "personal" && <PersonalDetailsTab />}
			{tab === "security" && <SecurityTab />}

			<LogoutSection />
		</div>
	);
}
