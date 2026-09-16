import { z } from "zod";

export const CreateGoalSchema = z.object({
	name: z.string().nonempty("Give your goal a name").max(50, "Name is too long"),
	// Kept as a string (what the <input> actually produces) rather than
	// z.coerce.number() — coerce's input/output types differ, which
	// zodResolver can't reconcile with useForm<CreateGoalValues>. Converted
	// to a number only where it's actually needed (GoalPreviewCard, the
	// mock payload).
	targetAmount: z
		.string()
		.nonempty("Enter a target amount")
		.refine((value) => Number(value) > 0, "Enter an amount greater than 0"),
	asset: z.string().nonempty("Choose an asset"),
	targetDate: z.string().nonempty("Choose a target date"),
});

export type CreateGoalValues = z.infer<typeof CreateGoalSchema>;
