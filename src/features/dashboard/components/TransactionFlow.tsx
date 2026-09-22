"use client";

import { useState } from "react";
import { ArrowLeft, Check, Clock, Landmark, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import WalletIcon from "@/components/icons/WalletIcon";
import { useAddSavings, useDashboardSummary, useGoal, useWithdraw } from "@/features/dashboard/hooks";
import { GoalStatus } from "@/features/dashboard/types";
import { pageRoutes } from "@/lib/config/routes";
import { AddSavingsResult, MOCK_WALLET_ADDRESS } from "@/lib/mocks/dashboardMocks";
import { formatMoney } from "@/lib/utils";

export type TransactionMode = "deposit" | "withdraw";

const statusLabel: Record<GoalStatus, string> = { running: "RUNNING", urgent: "URGENT", done: "DONE" };

const QUICK_AMOUNTS = [50, 100, 200];

type Phase = "form" | "dialog" | "result";

// Deposit and withdraw are the same flow shape (amount → review → submit →
// result) mirrored in direction — this table is the only thing that
// differs between them; everything below renders off it instead of
// branching on `mode` all over the JSX.
const COPY: Record<
	TransactionMode,
	{
		breadcrumb: string;
		amountLabel: string;
		chipSign: "+" | "-";
		walletRowLabel: string;
		submitLabel: string;
		reviewTitle: string;
		reviewVerb: string;
		reviewDestination: (goalName: string) => string;
		walletChipLabel: string;
		pendingLabel: string;
		pendingSign: "+" | "-";
		pendingSuffix: (goalName: string) => string;
		successHeading: string;
		successSubtext: string;
		successAmountLabel: string;
		successGoalLabel: string;
		successButtonLabel: string;
		failedHeading: string;
		failedSubtext: string;
		failedGoalLabel: string;
		retryLabel: string;
	}
> = {
	deposit: {
		breadcrumb: "Add Savings",
		amountLabel: "Amount to Add",
		chipSign: "+",
		walletRowLabel: "From Wallet",
		submitLabel: "Review Transaction",
		reviewTitle: "Review Deposit",
		reviewVerb: "Adding",
		reviewDestination: (goalName) => goalName,
		walletChipLabel: "Source Wallet",
		pendingLabel: "Pending Deposit",
		pendingSign: "+",
		pendingSuffix: (goalName) => `To ${goalName}`,
		successHeading: "Transfer Complete",
		successSubtext: "Funds have been successfully allocated to your goal.",
		successAmountLabel: "Amount Added",
		successGoalLabel: "Destination Goal",
		successButtonLabel: "View Goal Progress",
		failedHeading: "Transfer Failed",
		failedSubtext: "Funds have failed to be allocated towards your goal.",
		failedGoalLabel: "Destination Goal",
		retryLabel: "Retry Transaction",
	},
	withdraw: {
		breadcrumb: "Withdraw",
		amountLabel: "Amount to Withdraw",
		chipSign: "-",
		walletRowLabel: "To Wallet",
		submitLabel: "Review Withdrawal",
		reviewTitle: "Review Withdrawal",
		reviewVerb: "Withdrawing",
		reviewDestination: () => "Stellar Account",
		walletChipLabel: "Destination Wallet",
		pendingLabel: "Pending Withdrawal",
		pendingSign: "-",
		pendingSuffix: (goalName) => `From ${goalName}`,
		successHeading: "Withdrawal Complete",
		successSubtext: "Funds have been successfully sent to your wallet.",
		successAmountLabel: "Amount Withdrawn",
		successGoalLabel: "Source Goal",
		successButtonLabel: "View Goal Progress",
		failedHeading: "Withdrawal Failed",
		failedSubtext: "Funds have failed to be withdrawn from your goal.",
		failedGoalLabel: "Source Goal",
		retryLabel: "Retry Withdrawal",
	},
};

function GoalSummaryCard({
	name,
	status,
	saved,
	target,
	currency,
}: {
	name: string;
	status: GoalStatus;
	saved: number;
	target: number;
	currency: string;
}) {
	const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

	return (
		<div className="rounded-3xl bg-primary p-6 text-primary-foreground">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">{name}</h2>
				<span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">{statusLabel[status]}</span>
			</div>
			<p className="mt-3 flex items-baseline gap-2 text-4xl font-semibold">
				{formatMoney(saved)}
				<span className="text-base font-medium opacity-80">{currency}</span>
			</p>
			<div className="mt-5 flex items-center justify-between text-xs opacity-80">
				<span>Progress</span>
				<span>{percent}%</span>
			</div>
			<div className="mt-2 h-1.5 rounded-full bg-white/25">
				<div className="h-1.5 rounded-full bg-white" style={{ width: `${percent}%` }} />
			</div>
			<div className="mt-2 flex items-center justify-between text-xs opacity-80">
				<span>
					{formatMoney(saved)} {currency}
				</span>
				<span>
					{formatMoney(target)} {currency}
				</span>
			</div>
		</div>
	);
}

function ReviewStep({
	mode,
	amount,
	currency,
	goalName,
	onConfirm,
	onCancel,
}: {
	mode: TransactionMode;
	amount: number;
	currency: string;
	goalName: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const copy = COPY[mode];

	return (
		<div className="p-6 sm:p-8">
			<h2 className="text-2xl font-medium text-foreground">{copy.reviewTitle}</h2>

			<div className="mt-6 border-b border-border pb-5">
				<p className="text-lg text-foreground">
					{copy.reviewVerb} {formatMoney(amount)} {currency}
				</p>
				<p className="mt-1 flex items-center gap-1 text-sm text-grey-normal">
					<span aria-hidden>→</span>
					{copy.reviewDestination(goalName)}
				</p>
			</div>

			<div className="mt-5 space-y-2">
				<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">{copy.walletChipLabel}</p>
				<div className="flex items-center gap-2 rounded-full bg-grey-lighter px-4 py-2.5 text-sm">
					<span className="flex size-6 items-center justify-center rounded-md bg-grey-dark text-white">
						<WalletIcon className="size-3.5" />
					</span>
					{MOCK_WALLET_ADDRESS}
				</div>
			</div>

			<div className="mt-5 flex items-center justify-between text-sm">
				<span className="text-grey-normal">Network Fee</span>
				<span className="font-medium text-foreground">0.00001 XLM</span>
			</div>

			<div className="mt-6 space-y-3">
				<Button onClick={onConfirm} size="xl" className="w-full">
					Confirm Transaction
				</Button>
				<Button onClick={onCancel} variant="outline" size="xl" className="w-full text-destructive">
					Cancel
				</Button>
			</div>
		</div>
	);
}

function SubmittingStep({
	mode,
	amount,
	currency,
	goalName,
}: {
	mode: TransactionMode;
	amount: number;
	currency: string;
	goalName: string;
}) {
	const copy = COPY[mode];

	return (
		<div className="p-6 text-center sm:p-8">
			<span className="mx-auto flex size-16 items-center justify-center rounded-full bg-grey-lighter text-foreground">
				<Clock className="size-7" strokeWidth={1.5} />
			</span>
			<h2 className="mt-4 text-xl font-medium text-foreground">Submitting to Stellar Testnet</h2>
			<p className="mt-2 text-sm text-grey-normal">
				Broadcasting transaction payload to Horizon &amp; Soroban VM engine. Please keep this open.
			</p>

			<div className="mt-6 rounded-2xl bg-grey-lighter p-4 text-left">
				<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">{copy.pendingLabel}</p>
				<p className="mt-1 flex items-baseline gap-2 text-3xl font-semibold text-foreground">
					{copy.pendingSign}
					{formatMoney(amount)}
					<span className="text-base font-medium text-grey-normal">{currency}</span>
				</p>
				<p className="mt-1 text-sm text-grey-normal">{copy.pendingSuffix(goalName)}</p>
			</div>

			<p className="mt-6 flex items-center justify-center gap-2 text-xs text-grey-light-active">
				<Clock className="size-3.5" />
				This usually takes 5-10 seconds
			</p>
		</div>
	);
}

// Terminal state, rendered in the page body (not the dialog) once the
// mutation settles. Same card either way, just the icon/copy/action differ
// by mode and by success/failure.
function TransactionResult({
	mode,
	result,
	onRetry,
	goalId,
}: {
	mode: TransactionMode;
	result: AddSavingsResult;
	onRetry: () => void;
	goalId: string;
}) {
	const router = useRouter();
	const copy = COPY[mode];

	if (result.success) {
		return (
			<div className="rounded-3xl bg-white p-6 text-center shadow-xs lg:p-8">
				<span className="mx-auto flex size-16 items-center justify-center rounded-full bg-blue-light">
					<span className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
						<Check className="size-5" strokeWidth={3} />
					</span>
				</span>
				<h2 className="mt-4 text-2xl font-medium text-foreground">{copy.successHeading}</h2>
				<p className="mt-2 text-sm text-grey-normal">{copy.successSubtext}</p>

				<div className="mt-6 divide-y divide-border border-t border-border text-left text-sm">
					<div className="flex items-center justify-between py-4">
						<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">
							{copy.successAmountLabel}
						</span>
						<span className="font-medium text-primary">
							{formatMoney(result.amount)} {result.currency}
						</span>
					</div>
					<div className="flex items-center justify-between py-4">
						<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">
							{copy.successGoalLabel}
						</span>
						<span className="font-medium text-foreground uppercase">{result.goalName}</span>
					</div>
					<div className="flex items-center justify-between py-4">
						<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">Transaction ID</span>
						<span className="font-medium text-primary">{result.transactionId}</span>
					</div>
				</div>

				<Button
					onClick={() => router.push(pageRoutes.dashboardRoutes.GOAL_DETAIL(goalId))}
					size="xl"
					className="mt-6 w-full"
				>
					{copy.successButtonLabel}
				</Button>
			</div>
		);
	}

	return (
		<div className="rounded-3xl bg-white p-6 text-center shadow-xs lg:p-8">
			<span className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 text-destructive">
				<span className="flex size-10 items-center justify-center rounded-full border-2 border-destructive">
					<X className="size-5" strokeWidth={3} />
				</span>
			</span>
			<h2 className="mt-4 text-2xl font-medium text-foreground">{copy.failedHeading}</h2>
			<p className="mt-2 text-sm text-grey-normal">{copy.failedSubtext}</p>

			<div className="mt-6 divide-y divide-border border-t border-border text-left text-sm">
				<div className="flex items-center justify-between py-4">
					<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">Amount</span>
					<span className="font-medium text-foreground">
						{formatMoney(result.amount)} {result.currency}
					</span>
				</div>
				<div className="flex items-center justify-between py-4">
					<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">
						{copy.failedGoalLabel}
					</span>
					<span className="font-medium text-foreground uppercase">{result.goalName}</span>
				</div>
				<div className="flex items-center justify-between py-4">
					<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">Transaction ID</span>
					<span className="font-medium text-foreground">{result.transactionId}</span>
				</div>
			</div>

			<Button onClick={onRetry} size="xl" className="mt-6 w-full">
				{copy.retryLabel}
			</Button>
		</div>
	);
}

// Shared by both /dashboard/goals/[id]/add and /dashboard/goals/[id]/withdraw
// — same amount → review → submit → result flow either way (see the pasted
// screenshots for both), just mirrored in direction. `mode` drives copy,
// which quick-amount chips do, the available/max cap, and which mutation
// runs; everything else (dialog choreography, layout) is identical.
export default function TransactionFlow({ goalId, mode }: { goalId: string; mode: TransactionMode }) {
	const { data: goal, isLoading } = useGoal(goalId);
	const { data: summary } = useDashboardSummary();
	const deposit = useAddSavings(goalId);
	const withdraw = useWithdraw(goalId);
	const mutation = mode === "deposit" ? deposit : withdraw;
	const copy = COPY[mode];

	const [amount, setAmount] = useState("");
	const [phase, setPhase] = useState<Phase>("form");
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<AddSavingsResult | null>(null);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-48 w-full rounded-3xl" />
				<Skeleton className="h-16 w-full rounded-3xl" />
			</div>
		);
	}

	if (!goal) {
		return (
			<div className="flex flex-col items-center px-4 py-16 text-center">
				<h1 className="text-2xl font-medium text-foreground">Goal not found</h1>
				<Button href={pageRoutes.dashboardRoutes.SAVINGS_GOALS} size="xl" className="mt-6">
					Back to Savings Goals
				</Button>
			</div>
		);
	}

	// Withdrawals only open up once a goal has actually hit its target (see
	// GoalDetailView's Withdraw button) — a direct link to this route for an
	// ongoing goal gets the same friendly guard instead of a broken form.
	if (mode === "withdraw" && goal.status !== "done" && goal.saved < goal.target) {
		return (
			<div className="flex flex-col items-center px-4 py-16 text-center">
				<h1 className="text-2xl font-medium text-foreground">Not ready to withdraw yet</h1>
				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					&quot;{goal.name}&quot; hasn&apos;t reached its target yet — keep saving and you&apos;ll be able to
					withdraw once it&apos;s done.
				</p>
				<Button href={pageRoutes.dashboardRoutes.GOAL_DETAIL(goal.id)} size="xl" className="mt-6">
					Back to Goal
				</Button>
			</div>
		);
	}

	const availableBalance = mode === "deposit" ? (summary?.balance ?? 0) : goal.saved;
	const amountNum = Number(amount) || 0;
	const remainingToTarget = Math.max(0, goal.target - goal.saved);
	const isValidAmount = amountNum > 0 && amountNum <= availableBalance;

	const addQuickAmount = (value: number) => {
		setAmount((prev) => String((Number(prev) || 0) + value));
	};

	const setMaxAmount = () => {
		const max =
			mode === "deposit" && remainingToTarget > 0
				? Math.min(availableBalance, remainingToTarget)
				: availableBalance;
		setAmount(max > 0 ? String(max) : "");
	};

	const submit = async () => {
		setPending(true);
		try {
			const outcome = await mutation.mutateAsync(amountNum);
			setResult(outcome);
		} finally {
			setPending(false);
			setPhase("result");
		}
	};

	const handleReview = () => setPhase("dialog");
	const handleConfirm = () => submit();
	const handleRetry = () => {
		setPhase("dialog");
		submit();
	};

	return (
		<div className="space-y-6">
			<div className="hidden items-center gap-2 text-sm text-grey-light-active lg:flex">
				<Link
					href={pageRoutes.dashboardRoutes.GOAL_DETAIL(goal.id)}
					className="flex items-center gap-2 hover:text-grey-normal"
				>
					<ArrowLeft className="size-4" /> Home
				</Link>
				<span>/</span>
				<span className="font-medium text-foreground">{copy.breadcrumb}</span>
			</div>

			{phase === "result" && result ? (
				<TransactionResult mode={mode} result={result} onRetry={handleRetry} goalId={goal.id} />
			) : (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
					<GoalSummaryCard
						name={goal.name}
						status={goal.status}
						saved={goal.saved}
						target={goal.target}
						currency={goal.currency}
					/>

					<div className="space-y-5">
						<div>
							<Label className="text-xs font-medium tracking-wide text-grey-normal uppercase">
								{copy.amountLabel} ({goal.currency})
							</Label>
							<div className="mt-2 flex items-center gap-3 rounded-3xl border border-border bg-white px-5 py-4 lg:rounded-none lg:border-none lg:bg-transparent lg:px-0 lg:py-0">
								<span className="text-sm font-medium text-grey-light-active">{goal.currency}</span>
								<input
									type="text"
									inputMode="decimal"
									placeholder="0.00"
									value={amount}
									onChange={(event) => {
										const next = event.target.value;
										if (/^\d*\.?\d*$/.test(next)) setAmount(next);
									}}
									className="min-w-0 flex-1 bg-transparent text-3xl font-semibold text-foreground outline-none"
								/>
							</div>
						</div>

						{/* Mobile: bordered pill chips, clustered left. Desktop: plain text,
						    spread across the full row (see the pasted "Add Savings" desktop
						    reference — no pill/border there at all). */}
						<div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-between lg:gap-0">
							{QUICK_AMOUNTS.map((value) => (
								<button
									key={value}
									type="button"
									onClick={() => addQuickAmount(value)}
									className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-grey-lighter lg:rounded-none lg:border-none lg:p-0 lg:hover:opacity-70"
								>
									{copy.chipSign}${value}
								</button>
							))}
							<button
								type="button"
								onClick={setMaxAmount}
								className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-grey-lighter lg:rounded-none lg:border-none lg:p-0 lg:hover:opacity-70"
							>
								Max
							</button>
						</div>

						<div className="flex items-center justify-between rounded-2xl bg-grey-lighter p-4">
							<div className="flex items-center gap-3">
								<span className="flex size-10 items-center justify-center rounded-full bg-blue-light text-primary">
									<Landmark className="size-4" />
								</span>
								<div>
									<p className="text-xs text-grey-normal">{copy.walletRowLabel}</p>
									<p className="text-sm font-medium text-foreground">Stellar Account</p>
								</div>
							</div>
							<div className="text-right">
								<p className="text-xs text-grey-normal">Available</p>
								<p className="text-sm font-medium text-foreground">
									{formatMoney(availableBalance)} {goal.currency}
								</p>
							</div>
						</div>

						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-grey-normal">Amount</span>
								<span className="font-medium text-foreground">
									{formatMoney(amountNum)} {goal.currency}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-grey-normal">Network Fee</span>
								<span className="font-medium text-foreground">0.00001 XLM</span>
							</div>
							<div className="flex justify-between border-t border-border pt-2 font-medium text-foreground">
								<span>Total</span>
								<span>
									~{formatMoney(amountNum)} {goal.currency}
								</span>
							</div>
						</div>

						<div className="space-y-3">
							<Button onClick={handleReview} size="xl" className="w-full" disabled={!isValidAmount}>
								{copy.submitLabel}
							</Button>
							<Button
								href={pageRoutes.dashboardRoutes.GOAL_DETAIL(goal.id)}
								variant="outline"
								size="xl"
								className="w-full text-destructive"
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			)}

			<Dialog
				open={phase === "dialog"}
				onOpenChange={(open) => {
					if (!open && !pending) setPhase("form");
				}}
				disablePointerDismissal={pending}
			>
				<DialogContent>
					{pending ? (
						<SubmittingStep mode={mode} amount={amountNum} currency={goal.currency} goalName={goal.name} />
					) : (
						<ReviewStep
							mode={mode}
							amount={amountNum}
							currency={goal.currency}
							goalName={goal.name}
							onConfirm={handleConfirm}
							onCancel={() => setPhase("form")}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
