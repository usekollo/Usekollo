import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CtaBand() {
	return (
		<section className="bg-primary py-20 text-center text-primary-foreground sm:py-28">
			<div className="custom-container">
				<h2 className="text-3xl leading-tight font-semibold sm:text-4xl">
					Make progress without giving up control.
				</h2>
				<p className="mx-auto mt-4 max-w-md text-sm opacity-85">
					Connect a Stellar Testnet wallet and turn your next milestone into a plan you can see.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Button size="lg" variant="light">
						<Wallet className="size-4" />
						Connect Wallet
					</Button>
					<Button
						size="lg"
						variant="outline"
						className="border-white/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
					>
						See Docs
					</Button>
				</div>
			</div>
		</section>
	);
}
