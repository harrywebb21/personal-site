import { experience } from "../../data/site";

export default function Work() {
	return (
		<div className="mx-auto w-full max-w-5xl">
			<p className="text-xs font-medium tracking-[0.32em] text-lime">02</p>
			<h1
				id="section-title"
				tabIndex={-1}
				className="mt-3 font-display text-5xl font-extrabold tracking-[-0.04em] outline-none sm:text-7xl"
			>
				Work
			</h1>
			<div className="mt-10 space-y-5 sm:mt-14">
				{experience.map((job) => (
					<article
						key={job.company}
						className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8"
					>
						<img
							src={job.logo.src}
							width={job.logo.width}
							height={job.logo.height}
							alt={job.logo.alt}
							className="h-16 w-16 rounded-2xl object-cover sm:h-20 sm:w-20"
						/>
						<div>
							<a
								href={job.href}
								target="_blank"
								rel="noopener noreferrer"
								className="font-display text-3xl font-bold tracking-[-0.03em] underline-offset-4 hover:underline sm:text-4xl"
							>
								{job.company}
							</a>
							<p className="mt-1 text-base text-white/70 sm:text-lg">{job.role}</p>
							<ul className="mt-5 space-y-3">
								{job.points.map((point) => (
									<li key={point} className="flex gap-3 text-sm leading-relaxed text-white/75 sm:text-base">
										<span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" aria-hidden="true" />
										<span>{point}</span>
									</li>
								))}
							</ul>
						</div>
						<p className="year-mark font-display text-5xl leading-none font-extrabold tracking-[-0.04em] sm:text-6xl md:text-right">
							{job.year}
						</p>
					</article>
				))}
			</div>
		</div>
	);
}
