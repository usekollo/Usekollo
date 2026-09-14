export default function SiteFooter() {
	return (
		<footer className="custom-container flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
			{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
			<img src="/images/logos/blue-logo.svg" alt="Kollo" width={612} height={179} className="h-6 w-auto" />

			<p className="max-w-sm text-xs text-grey-normal">
				Non-custodial savings infrastructure on Stellar Testnet. Your keys, your assets, your
				goals.
			</p>

			<p className="text-xs text-grey-normal">© {new Date().getFullYear()} UseKollo</p>
		</footer>
	);
}
