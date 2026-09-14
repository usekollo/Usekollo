import { Loader2 } from "lucide-react";

export default function PageLoading() {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/30 backdrop-blur-[2px]">
			<Loader2 className="size-12 animate-spin text-primary" />
		</div>
	);
}
