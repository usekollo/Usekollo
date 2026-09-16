import { ImageResponse } from "next/og";

// Shared by app/opengraph-image.tsx and app/twitter-image.tsx — same card
// for both networks, just declared through Next's two separate special-file
// conventions (each emits its own <meta> tags). Brand colors are hardcoded
// rather than referencing globals.css: satori (what ImageResponse renders
// through) doesn't evaluate CSS custom properties, only literal values —
// --blue-darker/--blue-normal/--blue-light from globals.css, copied by hand.
export const SIZE = { width: 1200, height: 630 };
export const CONTENT_TYPE = "image/png";
export const ALT = "usekollo — Save with purpose. Stay in control.";

export function renderSocialCard() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					position: "relative",
					background: "linear-gradient(135deg, #010e52 0%, #0329e9 100%)",
					padding: "80px 96px",
					fontFamily: "sans-serif",
				}}
			>
				{/* Decorative ring, echoing the goal-progress ring used throughout
				    the app — purely cosmetic, bleeding off the right edge. */}
				<div
					style={{
						position: "absolute",
						top: -180,
						right: -180,
						width: 620,
						height: 620,
						borderRadius: "50%",
						border: "28px solid rgba(230, 234, 253, 0.18)",
						display: "flex",
					}}
				/>
				<div
					style={{
						position: "absolute",
						bottom: -260,
						right: -80,
						width: 480,
						height: 480,
						borderRadius: "50%",
						border: "28px solid rgba(230, 234, 253, 0.12)",
						display: "flex",
					}}
				/>

				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<span
						style={{
							fontSize: 34,
							fontWeight: 600,
							color: "#ffffff",
							letterSpacing: "-0.02em",
						}}
					>
						usekollo
					</span>
				</div>

				<div style={{ display: "flex", flexDirection: "column", marginTop: 56, maxWidth: 880 }}>
					<span
						style={{
							fontSize: 72,
							fontWeight: 600,
							color: "#ffffff",
							lineHeight: 1.08,
							letterSpacing: "-0.02em",
						}}
					>
						Save with purpose.
					</span>
					<span
						style={{
							fontSize: 72,
							fontWeight: 600,
							color: "#ffffff",
							lineHeight: 1.08,
							letterSpacing: "-0.02em",
						}}
					>
						&amp; Stay in control.
					</span>
				</div>

				<span
					style={{
						display: "flex",
						marginTop: 32,
						fontSize: 28,
						color: "#e6eafd",
						maxWidth: 640,
					}}
				>
					Non-custodial savings on Stellar. Your keys, your assets, your goals.
				</span>
			</div>
		),
		{ ...SIZE },
	);
}
