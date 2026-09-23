import TransactionFlow from "@/features/dashboard/components/TransactionFlow";

export default async function WithdrawPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <TransactionFlow goalId={id} mode="withdraw" />;
}
