import { ALT, CONTENT_TYPE, SIZE, renderSocialCard } from "@/lib/og/socialCard";

export const size = SIZE;
export const contentType = CONTENT_TYPE;
export const alt = ALT;

export default function TwitterImage() {
	return renderSocialCard();
}
