import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { nav, profile, type SectionId } from "../../data/site";
import { gsap, useGSAP } from "./gsap-setup";

type MenuEntry = { id: SectionId; label: string; index: string };

export type Navigate = (section: SectionId, event: MouseEvent<HTMLAnchorElement>) => void;

type Props = {
	onNavigate: Navigate;
	active?: boolean;
	titleId?: boolean;
	showHome?: boolean;
	current?: SectionId;
};

export default function GameMenu({ onNavigate, active = true, titleId = false, showHome = false, current }: Props) {
	const root = useRef<HTMLDivElement>(null);
	const [cursor, setCursor] = useState(0);
	const primed = useRef(false);
	const entries = useMemo<readonly MenuEntry[]>(
		() => (showHome ? [{ id: "home", label: "Home", index: "00" }, ...nav] : nav),
		[showHome],
	);

	useEffect(() => {
		if (!active) return;
		const onKey = (event: KeyboardEvent) => {
			const target = event.target;
			if (target instanceof HTMLElement && target.closest("input, textarea")) return;
			if (event.key === "ArrowDown" || event.key === "ArrowRight") {
				event.preventDefault();
				setCursor((index) => (index + 1) % entries.length);
			} else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
				event.preventDefault();
				setCursor((index) => (index - 1 + entries.length) % entries.length);
			} else if (event.key === "Enter" && !(target instanceof HTMLAnchorElement)) {
				const link = root.current?.querySelectorAll<HTMLAnchorElement>(".game-menu-item")[cursor];
				link?.click();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [active, cursor, entries.length]);

	useEffect(() => {
		if (!active || !current) return;
		const next = entries.findIndex((item) => item.id === current);
		if (next >= 0) setCursor(next);
	}, [active, current, entries]);

	useEffect(() => {
		if (!active || titleId) return;
		root.current?.focus({ preventScroll: true });
	}, [active, titleId]);

	useGSAP(() => {
		if (!active) return;
		const mm = gsap.matchMedia();
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
			tl.from(".game-menu-kicker", { y: 10, autoAlpha: 0, duration: 0.32 })
				.from(".game-title span", { y: 16, autoAlpha: 0, duration: 0.46, stagger: 0.08 }, "-=0.12")
				.from(".game-menu-role", { y: 8, autoAlpha: 0, duration: 0.32 }, "-=0.22")
				.from(".game-menu-item", { x: -14, autoAlpha: 0, duration: 0.38, stagger: 0.07 }, "-=0.16")
				.from(".game-menu-status", { autoAlpha: 0, duration: 0.32 }, "-=0.14");

			const hover = window.matchMedia("(hover: hover)");
			if (!hover.matches || !root.current) return;
			const cleanups: Array<() => void> = [];
			root.current.querySelectorAll<HTMLElement>(".game-menu-item").forEach((el) => {
				const enter = () => gsap.to(el, { x: 4, duration: 0.16, ease: "power2.out", overwrite: "auto" });
				const leave = () => gsap.to(el, { x: 0, duration: 0.22, ease: "power2.out", overwrite: "auto" });
				el.addEventListener("pointerenter", enter);
				el.addEventListener("pointerleave", leave);
				cleanups.push(() => {
					el.removeEventListener("pointerenter", enter);
					el.removeEventListener("pointerleave", leave);
				});
			});
			return () => cleanups.forEach((fn) => fn());
		});
		return () => mm.revert();
	}, { scope: root, dependencies: [active], revertOnUpdate: true });

	useGSAP(() => {
		if (!primed.current) {
			primed.current = true;
			return;
		}
		if (!active) return;
		const item = root.current?.querySelectorAll<HTMLElement>(".game-menu-item")[cursor];
		if (!item) return;
		const mm = gsap.matchMedia();
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			gsap.fromTo(item, { x: -8 }, { x: 0, duration: 0.2, ease: "power2.out", overwrite: "auto" });
		});
		return () => mm.revert();
	}, { scope: root, dependencies: [cursor, active], revertOnUpdate: true });

	return (
		<div ref={root} data-game-menu className="game-menu" tabIndex={titleId ? undefined : -1}>
			<p className="game-menu-kicker">
				<span className="game-menu-blink" aria-hidden="true" />
				Select
			</p>
			{titleId ? (
				<h1 id="section-title" tabIndex={-1} className="game-title">
					<span className="block">{profile.first}</span>
					<span className="block">{profile.last}</span>
				</h1>
			) : (
				<p className="game-title">
					<span className="block">{profile.first}</span>
					<span className="block">{profile.last}</span>
				</p>
			)}
			<p className="game-menu-role">
				{profile.role[0]} {profile.role[1]}
			</p>
			<nav aria-label="Primary" className="game-menu-list">
				{entries.map((item, index) => (
					<a
						key={item.id}
						href={item.id === "home" ? "/" : `/${item.id}`}
						className={`game-menu-item${cursor === index ? " is-selected" : ""}`}
						onMouseEnter={() => setCursor(index)}
						onFocus={() => setCursor(index)}
						onClick={(event) => onNavigate(item.id, event)}
					>
						<span className="game-menu-mark" aria-hidden="true">
							{cursor === index ? "▸" : ""}
						</span>
						<span>{item.index}</span>
						<span>{item.label}</span>
					</a>
				))}
			</nav>
			<p className="game-menu-status">
				<span className="avail-dot h-2 w-2 rounded-full bg-lime" aria-hidden="true" />
				<span>{profile.availability}</span>
				<MenuClock />
				<span>{profile.location}</span>
			</p>
		</div>
	);
}

function MenuClock() {
	const [time, setTime] = useState("");

	useEffect(() => {
		const format = () =>
			new Intl.DateTimeFormat("en-GB", {
				timeZone: profile.timeZone,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hourCycle: "h23",
			}).format(new Date());
		const paint = () => setTime(format());
		paint();
		const id = window.setInterval(paint, 1000);
		return () => window.clearInterval(id);
	}, []);

	return <time dateTime={time || undefined}>{time || "––:––:––"}</time>;
}
