import type { Metadata } from "next";
import CreateGoalForm from "@/features/dashboard/components/CreateGoalForm";

export const metadata: Metadata = {
	title: "Create New Goal",
};

export default function CreateGoalPage() {
	return <CreateGoalForm />;
}
