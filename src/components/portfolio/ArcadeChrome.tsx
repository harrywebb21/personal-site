import { useEffect, useRef, useState } from "react";
import { nav, pathFor, profile, type SectionId } from "../../data/site";
import GameMenu, { type Navigate } from "./GameMenu";
import { gsap, ScrollTrigger, useGSAP } from "./gsap-setup";

type Props = {
	section: SectionId;
	menuOpen: boolean;
	onToggleMenu: () => void;
	onCloseMenu: () => void;
	onNavigate: Navigate;
};

export default function ArcadeChrome({ section, menuOpen, onToggleMenu, onCloseMenu, onNavigate }: Props) {
	const barRef = useRef<HTMLSpanElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const wasOpen = useRef(false);
	const menuReady = useRef(false);
	const stage = nav.find((item) => item.id === section);

	useEffect(() => {
		if (!menuOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onCloseMenu();
			}
		};
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [menuOpen, onCloseMenu]);

	useEffect(() => {
		if (menuOpen) {
			wasOpen.current = true;
			return;
		}
		if (wasOpen.current) menuButtonRef.current?.focus();
	}, [menuOpen]);

	useGSAP(() => {
		const bar = barRef.current;
		if (!bar) return;
		const mm = gsap.matchMedia();
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
			ScrollTrigger.create({
				trigger: document.documentElement,
				start: "top top",
				end: "bottom bottom",
				onUpdate: (self) => {
					gsap.set(bar, { scaleX: self.progress, transformOrigin: "left center" });
				},
			});
		});
		return () => mm.revert();
	}, { dependencies: [section], revertOnUpdate: true });

	useGSAP(() => {
		const root = overlayRef.current;
		if (!root) return;
		const opening = menuOpen;
		const immediate = !menuReady.current;
		menuReady.current = true;
		const mm = gsap.matchMedia();
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			if (immediate || !opening) {
				if (immediate && !opening) {
					gsap.set(root, { autoAlpha: 0 });
					return;
				}
				gsap.to(root, { autoAlpha: 0, duration: 0.2, ease: "power2.in" });
				return;
			}
			gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28, ease: "power2.out" });
		});
		mm.add("(prefers-reduced-motion: reduce)", () => {
			gsap.set(root, { autoAlpha: opening ? 1 : 0 });
		});
		return () => mm.revert();
	}, { dependencies: [menuOpen], scope: overlayRef, revertOnUpdate: true });

	useGSAP(() => {
		const mm = gsap.matchMedia();
		mm.add("(prefers-reduced-motion: no-preference) and (hover: hover)", () => {
			const cleanups: Array<() => void> = [];
			document.querySelectorAll<HTMLElement>(".stage-nav .game-menu-item").forEach((el) => {
				const enter = () => gsap.to(el, { x: 4, duration: 0.16, ease: "power2.out", overwrite: "auto" });
				const leave = () => gsap.to(el, { x: 0, duration: 0.24, ease: "power2.out", overwrite: "auto" });
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
	}, { dependencies: [section], revertOnUpdate: true });

	return (
		<>
			<div inert={menuOpen ? true : undefined}>
			<div className="bezel-corner" aria-hidden="true" />
			<div className="bezel-corner" aria-hidden="true" />
			<div className="bezel-corner" aria-hidden="true" />
			<div className="bezel-corner" aria-hidden="true" />

			<header className="hud">
				<div>
					<a
						href="/"
						className="hud-name"
						aria-label={`${profile.first} ${profile.last}, home`}
						onClick={(event) => onNavigate("home", event)}
					>
						{profile.first} {profile.last}
					</a>
					{stage && (
						<p className="hud-stage">
							Stage {stage.index} · {stage.label}
						</p>
					)}
				</div>
				<div className="hud-side">
					<button
						ref={menuButtonRef}
						type="button"
						className="hud-menu"
						aria-expanded={menuOpen}
						aria-controls="arcade-menu"
						onClick={onToggleMenu}
					>
						<span className="game-menu-blink" aria-hidden="true" />
						Menu
					</button>
					<p className="hud-meta">
						<span className="avail-dot h-2 w-2 rounded-full bg-lime" aria-hidden="true" />
						<span>{profile.availability}</span>
						<HudClock />
						<span>{profile.location}</span>
					</p>
				</div>
				<div className="energy" aria-hidden="true">
					<span ref={barRef} />
				</div>
			</header>

			<nav aria-label="Primary" className="stage-nav">
				{nav.map((item) => {
					const active = section === item.id;
					return (
						<a
							key={item.id}
							href={pathFor(item.id)}
							aria-current={active ? "page" : undefined}
							onClick={(event) => onNavigate(item.id, event)}
							className={`game-menu-item${active ? " is-selected" : ""}`}
						>
							<span className="game-menu-mark" aria-hidden="true">
								{active ? "▸" : ""}
							</span>
							<span>{item.index}</span>
							<span>{item.label}</span>
						</a>
					);
				})}
			</nav>
			</div>

			<div
				ref={overlayRef}
				id="arcade-menu"
				role="dialog"
				aria-modal="true"
				aria-label="Game menu"
				aria-hidden={menuOpen ? undefined : true}
				inert={menuOpen ? undefined : true}
				className={`menu-overlay${menuOpen ? " is-open" : ""}`}
			>
				<button type="button" className="menu-backdrop" aria-label="Close menu" onClick={onCloseMenu} />
				<div className="menu-stack">
					<GameMenu onNavigate={onNavigate} active={menuOpen} showHome current={section} />
					<p className="menu-hint">Esc to close</p>
				</div>
			</div>
		</>
	);
}

function HudClock() {
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

	return (
		<time dateTime={time || undefined} className="tabular-nums">
			{time || "––:––:––"}
		</time>
	);
}
