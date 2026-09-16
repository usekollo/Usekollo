"use client";

import type { ReactElement } from "react";
import { ArrowRight, Fingerprint, QrCode, Sailboat, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import WalletIcon from "@/components/icons/WalletIcon";

const wallets = [
	{ name: "Freighter Wallet", icon: Sailboat },
	{ name: "Albedo", icon: Fingerprint },
	{ name: "WalletConnect", icon: QrCode },
];

// No dedicated Figma node for this — built from the "Connect Wallet" modal
// screenshot the user pasted. Actual wallet connection (Freighter/Albedo/
// WalletConnect SDKs) isn't wired up yet, so each row just surfaces a
// "coming soon" toast instead of doing nothing silently.
export default function ConnectWalletModal({ trigger }: { trigger: ReactElement }) {
	return (
		<Dialog>
			<DialogTrigger render={trigger} />
			<DialogContent>
				<div className="p-6 sm:p-8">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-grey-dark text-white">
								<WalletIcon className="size-5" />
							</span>
							<h2 className="text-2xl font-medium text-foreground">Connect Wallet</h2>
						</div>
						<DialogClose className="text-foreground hover:opacity-70" aria-label="Close">
							<X className="size-6" />
						</DialogClose>
					</div>

					<div className="mt-8 space-y-4">
						{wallets.map(({ name, icon: Icon }) => (
							<button
								key={name}
								type="button"
								onClick={() => toast.info(`${name} support is coming soon`)}
								className="flex w-full items-center gap-4 rounded-3xl bg-grey-lighter p-4 text-left transition-colors hover:bg-grey-light"
							>
								<span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-light text-primary">
									<Icon className="size-5" />
								</span>
								<span className="flex-1 text-base font-medium text-foreground">{name}</span>
								<ArrowRight className="size-5 shrink-0 text-grey-light-active" />
							</button>
						))}
					</div>
				</div>

				<div className="rounded-b-3xl bg-grey-lighter p-6 sm:p-8">
					<h3 className="text-base font-medium text-foreground">Non Custodial Security</h3>
					<p className="mt-1 text-sm text-grey-normal">
						UseKollo is a non-custodial protocol. We never store, request, or have access to your
						private keys. Your assets remain under your control.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
