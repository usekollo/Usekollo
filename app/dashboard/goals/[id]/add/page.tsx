import TransactionFlow from "@/features/dashboard/components/TransactionFlow";

export default async function AddSavingsPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <TransactionFlow goalId={id} mode="deposit" />;
}
