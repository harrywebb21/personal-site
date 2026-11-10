import { useEffect, useRef, useState, type MouseEvent } from "react";
import { pathFor, sectionFromPath, titles, type SectionId } from "../../data/site";
import About from "./About";
import ArcadeChrome from "./ArcadeChrome";
import GothamGrime from "./GothamGrime";
import Home from "./Home";
import PixelCity from "./PixelCity";
import Projects from "./Projects";
import Work from "./Work";
import { gsap, ScrollTrigger } from "./gsap-setup";
import type { Navigate } from "./GameMenu";

type Props = {
	initialSection: SectionId;
};

function isModified(event: MouseEvent<HTMLAnchorElement>) {
	return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export default function Portfolio({ initialSection }: Props) {
	const [section, setSection] = useState<SectionId>(initialSection);
	const [motionSection, setMotionSection] = useState<SectionId | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const shutterRef = useRef<HTMLDivElement>(null);
	const transitioning = useRef(false);
	const timeline = useRef<gsap.core.Timeline | null>(null);
	const sectionRef = useRef(section);
	sectionRef.current = section;

	const commit = (next: SectionId) => {
		setMotionSection(next);
		setSection(next);
		window.scrollTo(0, 0);
	};

	const playTo = (next: SectionId, event?: MouseEvent<HTMLAnchorElement>, push = true) => {
		if (event) {
			if (isModified(event)) return;
			event.preventDefault();
		}
		setMenuOpen(false);
		if (push && sectionFromPath(window.location.pathname) !== next) {
			history.pushState(null, "", pathFor(next));
		}
		if (next === sectionRef.current && !transitioning.current) {
			window.scrollTo(0, 0);
			return;
		}

		const shutter = shutterRef.current;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduced || !shutter) {
			timeline.current?.kill();
			transitioning.current = false;
			shutter?.classList.remove("is-active");
			commit(next);
			return;
		}

		if (transitioning.current) {
			timeline.current?.kill();
			transitioning.current = false;
			shutter.classList.remove("is-active");
			gsap.set(shutter, { scaleY: 0 });
			commit(next);
			return;
		}

		transitioning.current = true;
		shutter.classList.add("is-active");
		timeline.current = gsap.timeline({
			onComplete: () => {
				transitioning.current = false;
				shutter.classList.remove("is-active");
				gsap.set(shutter, { scaleY: 0 });
			},
		})
			.to(shutter, { scaleY: 1, duration: 0.32, ease: "power3.in" })
			.add(() => commit(next))
			.to(shutter, { scaleY: 0, duration: 0.45, ease: "power3.out" });
	};

	const playToRef = useRef(playTo);
	playToRef.current = playTo;

	useEffect(() => {
		const onPop = () => playToRef.current(sectionFromPath(window.location.pathname), undefined, false);
		window.addEventListener("popstate", onPop);
		return () => {
			window.removeEventListener("popstate", onPop);
			timeline.current?.kill();
		};
	}, []);

	useEffect(() => {
		document.title = titles[section];
		if (motionSection !== section) return;
		document.getElementById("section-title")?.focus({ preventScroll: true });
	}, [section, motionSection]);

	useEffect(() => {
		const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
		return () => window.cancelAnimationFrame(id);
	}, [section]);

	const go: Navigate = (next, event) => playTo(next, event);

	return (
		<div className="relative min-h-dvh">
			<PixelCity />
			{section === "home" && <GothamGrime />}
			{section !== "home" && <div className="screen-scrim" aria-hidden="true" />}

			{section !== "home" && (
				<ArcadeChrome
					section={section}
					menuOpen={menuOpen}
					onToggleMenu={() => setMenuOpen((open) => !open)}
					onCloseMenu={() => setMenuOpen(false)}
					onNavigate={go}
				/>
			)}

			<main
				id="content"
				inert={menuOpen ? true : undefined}
				className={`relative z-10 mx-auto flex min-h-dvh w-full px-5 sm:px-8 ${
					section === "home"
						? "items-center justify-center py-16"
						: "items-start pt-32 pb-32 sm:pt-36 sm:pb-28"
				}`}
			>
				<div key={section} className={`w-full ${section === "home" ? "flex justify-center" : ""}`}>
					{section === "home" && <Home onNavigate={go} />}
					{section === "about" && <About />}
					{section === "work" && <Work />}
					{section === "projects" && <Projects />}
				</div>
			</main>

			<div ref={shutterRef} className="shutter" aria-hidden="true" />
		</div>
	);
}
