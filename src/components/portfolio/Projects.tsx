import { projects } from "../../data/site";

export default function Projects() {
	return (
		<div className="mx-auto w-full max-w-5xl">
			<p className="font-pixel text-[0.68rem] tracking-[0.22em] text-neon">03</p>
			<h1
				id="section-title"
				tabIndex={-1}
				className="mt-3 font-display text-5xl font-extrabold tracking-[-0.04em] outline-none sm:text-7xl"
			>
				Projects
			</h1>
			<ul className="mt-10 grid gap-5 sm:mt-14 md:grid-cols-2">
				{projects.map((project, index) => (
					<li key={project.name}>
						<figure className="overflow-hidden border border-neon/20 bg-black">
							<div className="flex aspect-square items-center justify-center">
								<img
									src={project.image.src}
									width={project.image.width}
									height={project.image.height}
									alt={project.image.alt}
									className="h-full w-full object-contain"
								/>
							</div>
							<figcaption className="flex items-baseline justify-between border-t border-white/10 px-5 py-4">
								<span className="font-display text-2xl font-bold tracking-[-0.03em]">{project.name}</span>
								<span className="text-xs font-medium tracking-[0.22em] text-white/60" aria-hidden="true">
									0{index + 1}
								</span>
							</figcaption>
						</figure>
					</li>
				))}
			</ul>
		</div>
	);
}
