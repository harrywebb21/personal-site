import { useRef } from "react";
import { projects } from "../../data/site";
import { useStageMotion } from "./stage-motion";

export default function Projects() {
	const root = useRef<HTMLElement>(null);
	useStageMotion(root);

	return (
		<section ref={root} className="stage">
			<header className="stage-hero" data-hero>
				<p className="watermark" data-watermark aria-hidden="true">
					03
				</p>
				<div data-reveal>
					<p className="game-menu-kicker">
						<span className="game-menu-blink" aria-hidden="true" />
						Stage 03
					</p>
					<h1 id="section-title" tabIndex={-1} className="game-title stage-title">
						Projects
					</h1>
					<p className="game-menu-role">Cartridge select</p>
				</div>
			</header>

			<ul className="cart-grid">
				{projects.map((project, index) => (
					<li key={project.name} className="cartridge" data-reveal data-cart>
						<div className="cart-label">
							<span>
								0{index + 1} {project.name}
							</span>
							<span className="cart-ready">▸ Ready</span>
						</div>
						<div className="cart-screen">
							<img
								src={project.image.src}
								width={project.image.width}
								height={project.image.height}
								alt={project.image.alt}
							/>
							<span className="scanline" aria-hidden="true" />
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
