export default function AuthFooter() {
	return (
		// footer
		<footer className="hidden border-t border-white/20 md:block">
			<div className="custom-container flex items-center justify-between py-6 text-sm text-white/90">
				<span>© {new Date().getFullYear()} – Usekollo</span>

				<div className="flex items-center gap-8">
					<a href="#" className="hover:opacity-80">
						Cookies
					</a>
					<a href="#" className="hover:opacity-80">
						Privacy
					</a>
				</div>

				<span>English US 🇺🇸</span>
			</div>
		</footer>
	);
}
