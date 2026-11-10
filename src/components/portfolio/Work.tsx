import { useRef } from "react";
import { experience } from "../../data/site";
import { useStageMotion } from "./stage-motion";

export default function Work() {
	const root = useRef<HTMLElement>(null);
	useStageMotion(root);

	return (
		<section ref={root} className="stage">
			<header className="stage-hero" data-hero>
				<p className="watermark" data-watermark aria-hidden="true">
					02
				</p>
				<div data-reveal>
					<p className="game-menu-kicker">
						<span className="game-menu-blink" aria-hidden="true" />
						Stage 02
					</p>
					<h1 id="section-title" tabIndex={-1} className="game-title stage-title">
						Work
					</h1>
					<p className="game-menu-role">High scores</p>
				</div>
			</header>

			<div className="screen-panel" data-reveal>
				<div className="score-head" aria-hidden="true">
					<span>Rank</span>
					<span />
					<span>Stage</span>
					<span>Score</span>
				</div>
				{experience.map((job, index) => (
					<article key={job.company} className="score-entry">
						<p className="rank">0{index + 1}</p>
						<img
							src={job.logo.src}
							width={job.logo.width}
							height={job.logo.height}
							alt={job.logo.alt}
							className="studio-logo"
						/>
						<div>
							<a
								href={job.href}
								target="_blank"
								rel="noopener noreferrer"
								className="score-link"
								data-press
							>
								<span data-press-target>{job.company}</span>
							</a>
							<p className="role-line">{job.role}</p>
						</div>
						<p className="score-year" data-score={job.year}>
							{job.year}
						</p>
						<ul className="missions">
							{job.points.map((point) => (
								<li key={point}>
									<span aria-hidden="true">▸</span>
									{point}
								</li>
							))}
						</ul>
					</article>
				))}
			</div>
		</section>
	);
}
