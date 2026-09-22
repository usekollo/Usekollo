import CtaBand from "@/components/landing/CtaBand";
import FeatureCards from "@/components/landing/FeatureCards";
import FeatureIntro from "@/components/landing/FeatureIntro";
import HeroSection from "@/components/landing/HeroSection";
import SiteFooter from "@/components/landing/SiteFooter";
import SiteHeader from "@/components/landing/SiteHeader";
import StepsSection from "@/components/landing/StepsSection";

// Figma "Landing Page" — desktop node 104-3807, mobile node 104-5087
// (fetched as screenshots; the Figma API was rate-limited at the time).
//
// `overflow-hidden` (both axes, not just x) contains every section's
// framer-motion entrance animation — see HeroSection.tsx's header comment
// for why an off-screen `y`/`x`/`scale` "hidden" state inflates the
// document's real scrollable area if nothing clips it.
export default function Home() {
	return (
		<div className="overflow-hidden">
			<SiteHeader />
			<HeroSection />
			<FeatureIntro />
			<FeatureCards />
			<StepsSection />
			<CtaBand />
			<SiteFooter />
		</div>
	);
}
