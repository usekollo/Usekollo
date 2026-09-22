import { GoalStatus } from "@/features/dashboard/types";

const RING_COLOR: Record<GoalStatus, string> = {
	running: "var(--blue-normal)",
	urgent: "var(--destructive)",
	done: "var(--blue-normal)",
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The big progress ring on the goal detail page — same idea as GoalCard's
// small one (percent-based arc, colored per status) but sized way up, with
// a dashed inner ring for decoration and a slot for whatever center
// content the caller wants (the SAVED/DONE% text differs between the
// in-progress and completed variants, see GoalDetailView).
export default function GoalDetailRing({
	percent,
	status,
	children,
}: {
	percent: number;
	status: GoalStatus;
	children: React.ReactNode;
}) {
	const clamped = Math.min(100, Math.max(0, percent));
	const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

	return (
		<div className="relative flex size-64 shrink-0 items-center justify-center lg:size-48">
			<svg viewBox="0 0 96 96" className="size-64 -rotate-90 lg:size-48">
				<circle cx="48" cy="48" r={RADIUS} fill="none" stroke="var(--grey-light)" strokeWidth="6" />
				<circle
					cx="48"
					cy="48"
					r={RADIUS}
					fill="none"
					stroke={RING_COLOR[status]}
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray={CIRCUMFERENCE}
					strokeDashoffset={offset}
				/>
			</svg>
			<div className="absolute inset-8 rounded-full border border-dashed border-grey-light-active lg:inset-6" />
			<div className="absolute flex flex-col items-center px-4 text-center">{children}</div>
		</div>
	);
}
