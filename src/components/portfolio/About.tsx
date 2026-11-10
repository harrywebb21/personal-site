import { useRef } from "react";
import { about, profile } from "../../data/site";
import { useStageMotion } from "./stage-motion";

export default function About() {
	const root = useRef<HTMLElement>(null);
	useStageMotion(root);

	return (
		<section ref={root} className="stage">
			<header className="stage-hero" data-hero>
				<p className="watermark" data-watermark aria-hidden="true">
					01
				</p>
				<div data-reveal>
					<p className="game-menu-kicker">
						<span className="game-menu-blink" aria-hidden="true" />
						Stage 01
					</p>
					<h1 id="section-title" tabIndex={-1} className="game-title stage-title">
						About
					</h1>
					<p className="game-menu-role">Player file</p>
				</div>
			</header>

			<div className="screen-panel" data-dossier>
				<div className="dossier">
					<figure className="portrait-frame" data-reveal>
						<img
							src={about.portrait.src}
							width={about.portrait.width}
							height={about.portrait.height}
							alt={about.portrait.alt}
						/>
						<span className="scanline" aria-hidden="true" />
						<span className="portrait-tag">P1</span>
					</figure>
					<div data-reveal>
						<p className="nameplate">
							<span className="game-menu-mark" aria-hidden="true">
								▸
							</span>
							{profile.first} {profile.last}
						</p>
						<p className="lede">{about.lede}</p>
						<div className="prose">
							{about.paragraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
						<dl className="stat-row">
							<div className="stat" data-press>
								<dt>Base</dt>
								<dd>{profile.location}</dd>
							</div>
							<div className="stat" data-press>
								<dt>Class</dt>
								<dd>
									{profile.role[0]} {profile.role[1]}
								</dd>
							</div>
							<div className="stat" data-press>
								<dt>Status</dt>
								<dd>
									<span className="avail-dot h-2 w-2 rounded-full bg-lime" aria-hidden="true" />
									{profile.availability}
								</dd>
							</div>
						</dl>
						<div className="readout">
							<p>File</p>
							<div className="read-bar" aria-hidden="true">
								<span data-readbar />
							</div>
						</div>
						<ul className="slots">
							{about.stack.map((item, index) => (
								<li key={item} className="slot" data-press>
									<b>0{index + 1}</b>
									{item}
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}
