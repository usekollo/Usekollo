import { Button } from "@/components/ui/button";
import ConnectWalletModal from "./ConnectWalletModal";
import WalletIcon from "./WalletIcon";

// Figma "Landing Page" hero (104-3807 desktop / 104-5087 mobile). The phone
// mockup is the actual exported Figma asset (public/images/hero-img.svg,
// background baked in), not redrawn.
export default function HeroSection() {
	return (
		<section className="bg-grey-lighter">
			<div className="custom-container grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-28 bgred-700">
				<div className="maxlg:bg-blue-300 max-lg:flex max-lg:flex-col max-lg:w-fit max-lg:mx-auto">
					<h1 className="text-4xl leading-[1.05] font-medium tracking-tight text-blue-darker sm:text-5xl">
						Save with purpose.
						<br />
						&amp; Stay in control.
					</h1>
					<p className="mt-5 max-w-md text-base text-[#010E52] sm:text-xl">
						A non-custodial wallet interface that organizes your digital assets
						around the goals that matter.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<ConnectWalletModal
							trigger={
								<Button size="xl" className="w-full sm:w-60">
									<WalletIcon className="size-4 text-primary-foreground" />
									Connect Wallet
								</Button>
							}
						/>
						<Button size="xl" variant="outline" className="w-full sm:w-60">
							See Docs
						</Button>
					</div>
				</div>

				{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
				<img
					src="/images/hero-img.svg"
					alt="Kollo app preview: total balance and ongoing savings goals"
					width={599}
					height={433}
					className="h-auto w-full max-w-lg justify-self-center"
				/>
			</div>
		</section>
	);
}
