import { useEffect, useState, type MouseEvent } from "react";
import { nav, profile, type SectionId } from "../../data/site";

type Props = {
	onNavigate: (section: SectionId, event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function Home({ onNavigate }: Props) {
	const [cursor, setCursor] = useState(0);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const target = event.target;
			if (target instanceof HTMLElement && target.closest("input, textarea")) return;
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setCursor((index) => (index + 1) % nav.length);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				setCursor((index) => (index - 1 + nav.length) % nav.length);
			} else if (event.key === "Enter" && !(target instanceof HTMLAnchorElement)) {
				const link = document.querySelectorAll<HTMLAnchorElement>(".game-menu-item")[cursor];
				link?.click();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [cursor]);

	return (
		<div data-game-menu className="game-menu">
			<p className="game-menu-kicker">
				<span className="game-menu-blink" aria-hidden="true" />
				Select
			</p>
			<h1 id="section-title" tabIndex={-1} className="game-title">
				<span className="block">{profile.first}</span>
				<span className="block">{profile.last}</span>
			</h1>
			<p className="game-menu-role">
				{profile.role[0]} {profile.role[1]}
			</p>
			<nav aria-label="Primary" className="game-menu-list">
				{nav.map((item, index) => (
					<a
						key={item.id}
						href={`/${item.id}`}
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
				<span className="avail-dot h-2 w-2 bg-neon" aria-hidden="true" />
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
