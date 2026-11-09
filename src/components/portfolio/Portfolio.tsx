import { useEffect, useState, type MouseEvent } from "react";
import {
	nav,
	pathFor,
	profile,
	sectionFromPath,
	titles,
	type SectionId,
} from "../../data/site";
import About from "./About";
import Home from "./Home";
import GothamGrime from "./GothamGrime";
import PixelCity from "./PixelCity";
import Projects from "./Projects";
import Work from "./Work";

type Props = {
	initialSection: SectionId;
};

function isModified(event: MouseEvent<HTMLAnchorElement>) {
	return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export default function Portfolio({ initialSection }: Props) {
	const [section, setSection] = useState<SectionId>(initialSection);
	const [motionSection, setMotionSection] = useState<SectionId | null>(null);

	useEffect(() => {
		const onPop = () => {
			const next = sectionFromPath(window.location.pathname);
			setMotionSection(next);
			setSection(next);
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	useEffect(() => {
		document.title = titles[section];
		if (motionSection !== section) return;
		document.getElementById("section-title")?.focus({ preventScroll: true });
	}, [section, motionSection]);

	function go(next: SectionId, event: MouseEvent<HTMLAnchorElement>) {
		if (isModified(event)) return;
		event.preventDefault();
		const url = pathFor(next);
		if (sectionFromPath(window.location.pathname) !== next) {
			history.pushState(null, "", url);
		}
		setMotionSection(next);
		setSection(next);
		window.scrollTo(0, 0);
	}

	const animate = motionSection === section;

	return (
		<div className="relative min-h-dvh">
			{section === "home" && <PixelCity />}
			{section === "home" && <GothamGrime />}
			{section !== "home" && <div className="atmosphere" aria-hidden="true" />}

			{section !== "home" && (
				<a
					href="/"
					onClick={(event) => go("home", event)}
					className="fixed top-5 left-5 z-20 font-display text-lg font-bold tracking-[-0.04em] text-white sm:top-7 sm:left-8 sm:text-xl"
				>
					{profile.first} {profile.last}
				</a>
			)}

			{section !== "home" && (
				<div className="fixed top-5 right-5 z-20 sm:hidden">
					<Status />
				</div>
			)}

			<main
				id="content"
				className={`relative z-10 mx-auto flex min-h-dvh w-full px-5 sm:px-8 ${
					section === "home"
						? "items-center justify-center py-16"
						: "items-start pt-24 pb-32 sm:pt-28"
				}`}
			>
				<div key={section} className={`w-full ${section === "home" ? "flex justify-center" : ""} ${animate ? "stage-in" : ""}`}>
					{section === "home" && <Home onNavigate={go} />}
					{section === "about" && <About />}
					{section === "work" && <Work />}
					{section === "projects" && <Projects />}
				</div>
			</main>

			{section !== "home" && (
			<div className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-between gap-6 bg-gradient-to-t from-ink via-ink/85 to-transparent px-5 pt-10 pb-5 sm:px-8 sm:pb-7">
				<nav aria-label="Primary" className="flex w-full items-baseline justify-between sm:w-auto sm:flex-col sm:items-start sm:gap-1">
					{nav.map((item) => {
						const active = section === item.id;
						return (
							<a
								key={item.id}
								href={pathFor(item.id)}
								aria-current={active ? "page" : undefined}
								onClick={(event) => go(item.id, event)}
								className={`group flex items-baseline gap-2 font-pixel text-[0.68rem] tracking-[0.14em] uppercase transition-colors ${
									active ? "text-neon" : "text-white/70 hover:text-white"
								}`}
							>
								<span className={`text-[0.58rem] tracking-[0.16em] ${active ? "text-neon" : "text-white/45"}`}>
									{item.index}
								</span>
								{item.label}
							</a>
						);
					})}
				</nav>
				<div className="hidden sm:block">
					<Status />
				</div>
			</div>
			)}
		</div>
	);
}

function Status() {
	return (
		<div className="flex flex-col items-end gap-1 text-right">
			<p className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-white uppercase">
				<span className="avail-dot h-2.5 w-2.5 bg-neon" aria-hidden="true" />
				{profile.availability}
			</p>
			<p className="text-sm text-white/75">
				<Clock />
				<span className="px-1.5 text-white/40" aria-hidden="true">
					·
				</span>
				<span>{profile.location}</span>
			</p>
		</div>
	);
}

function Clock() {
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
		<time dateTime={time || undefined} className="inline-block min-w-[8ch] text-left tabular-nums">
			{time || "––:––:––"}
		</time>
	);
}
