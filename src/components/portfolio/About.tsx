import { about } from "../../data/site";

export default function About() {
	return (
		<div className="mx-auto w-full max-w-5xl">
			<p className="font-pixel text-[0.68rem] tracking-[0.22em] text-neon">01</p>
			<h1
				id="section-title"
				tabIndex={-1}
				className="mt-3 font-display text-5xl font-extrabold tracking-[-0.04em] outline-none sm:text-7xl"
			>
				About
			</h1>
			<div className="mt-10 grid items-start gap-8 sm:mt-14 md:grid-cols-[9rem_minmax(0,36rem)] md:gap-12">
				<img
					src={about.portrait.src}
					width={about.portrait.width}
					height={about.portrait.height}
					alt={about.portrait.alt}
					className="noir-still w-28 sm:w-36"
				/>
				<div>
					<p className="font-display text-2xl leading-snug font-semibold tracking-[-0.03em] text-white sm:text-3xl">
						{about.lede}
					</p>
					<div className="mt-6 space-y-4 text-base leading-relaxed text-white/75 sm:text-lg">
						{about.paragraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
					<ul className="mt-8 flex flex-wrap gap-2">
						{about.stack.map((item) => (
							<li
								key={item}
								className="border border-neon/25 px-3 py-1 text-sm text-white/80"
							>
								{item}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
