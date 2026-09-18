import GoalDetailView from "@/features/dashboard/components/GoalDetailView";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <GoalDetailView goalId={id} />;
}
