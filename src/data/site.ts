/** Copy, work, and projects for the site. Fill in links when you have them. */

export const sectionIds = ["home", "about", "work", "projects"] as const;

export type SectionId = (typeof sectionIds)[number];

export const nav = [
	{ id: "about", label: "About", index: "01" },
	{ id: "work", label: "Work", index: "02" },
	{ id: "projects", label: "Projects", index: "03" },
] as const satisfies readonly { id: SectionId; label: string; index: string }[];

export const titles: Record<SectionId, string> = {
	home: "Harry Webb",
	about: "About — Harry Webb",
	work: "Work — Harry Webb",
	projects: "Projects — Harry Webb",
};

export const profile = {
	first: "Harry",
	last: "Webb",
	role: ["Software", "Engineer"] as const,
	location: "London, UK",
	timeZone: "Europe/London",
	availability: "Available",
};

export const about = {
	portrait: {
		src: "/me.jpg",
		width: 1575,
		height: 3174,
		alt: "Harry Webb",
	},
	lede: "Software engineer based in London.",
	paragraphs: [
		"In 2024 I worked at Agomi Studio on web and mobile products, with Next.js, React, React Native (Expo), TypeScript, and Node.js.",
		"I paired with designers and other developers on the interface and on keeping the code in good shape.",
	],
	stack: ["TypeScript", "React", "Next.js", "React Native", "Node.js"],
};

export const experience = [
	{
		company: "Agomi Studio",
		href: "https://agomi.studio",
		role: "Software Engineer",
		year: "2024",
		logo: {
			src: "/agomi.jpg",
			width: 200,
			height: 200,
			alt: "Agomi Studio",
		},
		points: [
			"Worked on web applications and mobile apps with Next.js, React, React Native (Expo), TypeScript, and Node.js.",
			"Collaborated with designers and other developers on user interfaces and code quality.",
		],
	},
];

export const projects = [
	{
		name: "Moodsify",
		image: { src: "/projects/moodsify.jpg", width: 1000, height: 1000, alt: "Moodsify" },
	},
	{
		name: "Meshed",
		image: { src: "/projects/meshed.jpg", width: 300, height: 300, alt: "Meshed" },
	},
];

export function pathFor(section: SectionId) {
	return section === "home" ? "/" : `/${section}`;
}

export function sectionFromPath(pathname: string): SectionId {
	const cleaned = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
	const segment = cleaned.split("/").filter(Boolean)[0];
	if (segment === "about" || segment === "work" || segment === "projects") return segment;
	return "home";
}
