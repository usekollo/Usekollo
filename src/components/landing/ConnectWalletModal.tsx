"use client";

import type { ReactElement } from "react";
import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import WalletIcon from "@/components/icons/WalletIcon";
import { useConnectWallet } from "@/features/profile/hooks";
import { pageRoutes } from "@/lib/config/routes";
import { useIsAuthenticated } from "@/lib/stores/userAuthStore";

// No dedicated Figma node for this — built from the "Connect Wallet" modal
// screenshot the user pasted.
//
// This used to list three wallets, only one of which worked. Wallet choice now
// belongs to Stellar Wallets Kit's own picker (lib/wallet/kit), which lists
// exactly the wallets actually available on this device, so reproducing a
// hardcoded list here would only be a second, less accurate menu in front of
// the real one. Ownership is still proven before the account is linked — see
// features/profile/hooks useConnectWallet.
const SUPPORTED = "Freighter, xBull, Albedo, Rabet, Lobstr, Hana, and any wallet over WalletConnect.";

export default function ConnectWalletModal({ trigger }: { trigger: ReactElement }) {
	const router = useRouter();
	const isAuthenticated = useIsAuthenticated();
	const { mutate: connect, isPending } = useConnectWallet();

	// A wallet is linked *to an account*, so there has to be one first. This
	// modal is reachable from the landing page, where there usually isn't.
	const handleConnect = () => {
		if (!isAuthenticated) {
			toast.info("Sign in first, then connect your wallet.");
			router.push(pageRoutes.authRoutes.SIGN_IN);
			return;
		}

		connect();
	};

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

					<div className="mt-8">
						<button
							type="button"
							disabled={isPending}
							onClick={handleConnect}
							className="flex w-full items-center gap-4 rounded-3xl bg-grey-lighter p-4 text-left transition-colors hover:bg-grey-light disabled:opacity-60"
						>
							<span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-light text-primary">
								<WalletIcon className="size-5" />
							</span>
							<span className="flex-1 text-base font-medium text-foreground">
								{isPending ? "Check your wallet…" : "Choose a wallet"}
							</span>
							<ArrowRight className="size-5 shrink-0 text-grey-light-active" />
						</button>

						<p className="mt-4 text-sm text-grey-normal">{SUPPORTED}</p>
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
