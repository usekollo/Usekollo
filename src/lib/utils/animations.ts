import { type Variants } from "framer-motion";

// Shared framer-motion presets so section/page animations stay consistent
// instead of every component hand-rolling its own variants.

export const viewport = {
	once: true,
	amount: 0.25,
};

export const transition = {
	duration: 0.6,
};

export const staggerContainer: Variants = {
	hidden: {
		opacity: 0,
	},
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			delayChildren: 0.1,
		},
	},
};

export const fadeUp: Variants = {
	hidden: {
		opacity: 0,
		y: 40,
	},
	show: {
		opacity: 1,
		y: 0,
		transition,
	},
};

export const fadeDown: Variants = {
	hidden: {
		opacity: 0,
		y: -40,
	},
	show: {
		opacity: 1,
		y: 0,
		transition,
	},
};

export const fadeLeft: Variants = {
	hidden: {
		opacity: 0,
		x: -40,
	},
	show: {
		opacity: 1,
		x: 0,
		transition,
	},
};

export const fadeRight: Variants = {
	hidden: {
		opacity: 0,
		x: 40,
	},
	show: {
		opacity: 1,
		x: 0,
		transition,
	},
};

export const zoomIn: Variants = {
	hidden: {
		opacity: 0,
		scale: 0.9,
	},
	show: {
		opacity: 1,
		scale: 1,
		transition,
	},
};

export const popIn: Variants = {
	hidden: {
		opacity: 0,
		scale: 0.8,
	},
	show: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.45,
		},
	},
};

export const hoverScale = {
	whileHover: {
		scale: 1.04,
		transition: {
			duration: 0.2,
		},
	},
};

export const hoverLift = {
	whileHover: {
		y: -6,
		transition: {
			duration: 0.2,
		},
	},
};

export const tap = {
	whileTap: {
		scale: 0.97,
	},
};
