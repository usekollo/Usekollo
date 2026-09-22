import CtaBand from "@/components/landing/CtaBand";
import FeatureCards from "@/components/landing/FeatureCards";
import FeatureIntro from "@/components/landing/FeatureIntro";
import HeroSection from "@/components/landing/HeroSection";
import SiteFooter from "@/components/landing/SiteFooter";
import SiteHeader from "@/components/landing/SiteHeader";
import StepsSection from "@/components/landing/StepsSection";

// Figma "Landing Page" — desktop node 104-3807, mobile node 104-5087
// (fetched as screenshots; the Figma API was rate-limited at the time).
export default function Home() {
	return (
		<div className="overflow-x-hidden">
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
