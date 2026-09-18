"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import GoalPreviewCard from "@/components/dashboard/GoalPreviewCard";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/custom/InputField";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { pageRoutes } from "@/lib/config/routes";
import { CreateGoalSchema, CreateGoalValues } from "@/lib/validations/goalValidations";
import { useCreateGoal } from "../hooks";

const ASSETS = ["USDC", "XLM"];

// Not a pill like Goal Name/Target Amount — Asset and Target Date are a
// plain underline in the reference, closer to a native select than a text
// field.
function UnderlineField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="space-y-2">
			<Label className="text-xs font-medium">{label}</Label>
			{children}
		</div>
	);
}

// Built from the pasted "Create New Goal" screenshots. One <form> spanning
// a 2-column grid: GoalPreviewCard (re-themes itself per breakpoint — blue
// on mobile, white with the name as a heading on desktop) in column 1, the
// actual fields in column 2, and the submit button back in column 1 below
// the preview — matching the desktop reference exactly, not just wrapping
// the fields.
export default function CreateGoalForm() {
	const { mutate: createGoal, isPending } = useCreateGoal();

	const form = useForm<CreateGoalValues>({
		resolver: zodResolver(CreateGoalSchema),
		mode: "onChange",
		defaultValues: {
			name: "",
			targetAmount: "",
			asset: "USDC",
			targetDate: "",
		},
	});

	const {
		formState: { isValid },
	} = form;

	const name = form.watch("name");
	const targetAmount = form.watch("targetAmount");
	const asset = form.watch("asset");
	const targetDate = form.watch("targetDate");

	const onSubmit = (values: CreateGoalValues) => {
		createGoal(values);
	};

	return (
		<Form {...form}>
			{/* Desktop-only breadcrumb, mirrors the typed name live */}
			<div className="mb-6 hidden items-center gap-2 text-sm text-grey-light-active md:flex">
				<Link
					href={pageRoutes.dashboardRoutes.DASHBOARD}
					className="flex items-center gap-2 hover:text-grey-normal"
				>
					<ArrowLeft className="size-4" />
					Home
				</Link>
				<span>/</span>
				<span className="font-medium text-foreground">{name || "Untitled Goal"}</span>
			</div>

			<form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
				<GoalPreviewCard
					name={name}
					targetAmount={targetAmount}
					asset={asset}
					targetDate={targetDate}
				/>

				<div className="space-y-5 md:rounded-3xl md:bg-white md:p-6 md:shadow-xs">
					<FormField
						control={form.control}
						name="name"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Goal Name"
										placeholder="e.g. New Laptop"
										type="text"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="targetAmount"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										value={field.value ?? ""}
										label="Target Amount"
										placeholder="0.00"
										type="number"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="asset"
						render={({ field, fieldState }) => (
							<FormItem>
								<UnderlineField label="Asset">
									<div className="relative">
										<select
											{...field}
											className="w-full appearance-none border-b border-border bg-transparent py-3 text-sm text-foreground outline-none focus:border-grey-normal"
										>
											{ASSETS.map((symbol) => (
												<option key={symbol} value={symbol}>
													{symbol}
												</option>
											))}
										</select>
										<ChevronDown className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2 text-grey-light-active" />
									</div>
								</UnderlineField>
								<FormMessage>{fieldState.error?.message}</FormMessage>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="targetDate"
						render={({ field, fieldState }) => (
							<FormItem>
								<UnderlineField label="Target Date">
									<input
										{...field}
										type="date"
										min={new Date().toISOString().split("T")[0]}
										className="w-full border-b border-border bg-transparent py-3 text-sm text-foreground outline-none focus:border-grey-normal"
									/>
								</UnderlineField>
								<FormMessage>{fieldState.error?.message}</FormMessage>
							</FormItem>
						)}
					/>
				</div>

				<Button
					type="submit"
					size="xl"
					isLoading={isPending}
					disabled={!isValid}
					className="w-full md:col-start-1 md:w-auto md:px-10"
				>
					<Plus className="size-4" />
					Create New Goal
				</Button>
			</form>
		</Form>
	);
}
