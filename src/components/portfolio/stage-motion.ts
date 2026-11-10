import type { RefObject } from "react";
import { gsap, useGSAP } from "./gsap-setup";

function bindHover(root: HTMLElement) {
	const cleanups: Array<() => void> = [];
	const hover = window.matchMedia("(hover: hover)").matches;
	if (!hover) return () => {};

	root.querySelectorAll<HTMLElement>("[data-press]").forEach((el) => {
		const target = el.querySelector<HTMLElement>("[data-press-target]") ?? el;
		const enter = () => gsap.to(target, { x: 5, duration: 0.18, ease: "power2.out", overwrite: "auto" });
		const leave = () => gsap.to(target, { x: 0, duration: 0.28, ease: "power2.out", overwrite: "auto" });
		el.addEventListener("pointerenter", enter);
		el.addEventListener("pointerleave", leave);
		cleanups.push(() => {
			el.removeEventListener("pointerenter", enter);
			el.removeEventListener("pointerleave", leave);
		});
	});

	root.querySelectorAll<HTMLElement>("[data-cart]").forEach((el) => {
		const img = el.querySelector("img");
		const enter = () => {
			if (img) gsap.to(img, { scale: 1.06, duration: 0.5, ease: "power3.out", overwrite: "auto" });
			gsap.to(el, { y: -4, duration: 0.35, ease: "power2.out", overwrite: "auto" });
		};
		const leave = () => {
			if (img) gsap.to(img, { scale: 1, duration: 0.55, ease: "power3.out", overwrite: "auto" });
			gsap.to(el, { y: 0, duration: 0.45, ease: "power2.out", overwrite: "auto" });
		};
		el.addEventListener("pointerenter", enter);
		el.addEventListener("pointerleave", leave);
		cleanups.push(() => {
			el.removeEventListener("pointerenter", enter);
			el.removeEventListener("pointerleave", leave);
		});
	});

	return () => cleanups.forEach((fn) => fn());
}

export function useStageMotion(scope: RefObject<HTMLElement | null>) {
	useGSAP(() => {
		const root = scope.current;
		if (!root) return;

		const mm = gsap.matchMedia();
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			gsap.utils.toArray<HTMLElement>("[data-reveal]", root).forEach((el, index) => {
				gsap.from(el, {
					y: 28,
					autoAlpha: 0,
					duration: 0.7,
					delay: 0.08 + index * 0.05,
					ease: "power3.out",
					scrollTrigger: {
						trigger: el,
						start: "top 92%",
						once: true,
					},
				});
			});

			const mark = root.querySelector("[data-watermark]");
			const hero = root.querySelector("[data-hero]");
			if (mark && hero) {
				gsap.to(mark, {
					x: -32,
					ease: "none",
					scrollTrigger: {
						trigger: hero,
						start: "top 85%",
						end: "bottom top",
						scrub: 0.5,
					},
				});
			}

			const bar = root.querySelector<HTMLElement>("[data-readbar]");
			const panel = root.querySelector("[data-dossier]");
			if (bar && panel) {
				gsap.fromTo(
					bar,
					{ scaleX: 0, transformOrigin: "left center" },
					{
						scaleX: 1,
						duration: 1.15,
						ease: "steps(12)",
						transformOrigin: "left center",
						scrollTrigger: {
							trigger: panel,
							start: "top 86%",
							once: true,
						},
					},
				);
			}

			root.querySelectorAll<HTMLElement>("[data-score]").forEach((el) => {
				const target = Number(el.dataset.score);
				if (!Number.isFinite(target)) return;
				const state = { n: Math.max(0, target - 36) };
				el.textContent = String(Math.round(state.n));
				gsap.to(state, {
					n: target,
					duration: 1.2,
					ease: "power2.out",
					snap: { n: 1 },
					scrollTrigger: { trigger: el, start: "top 88%", once: true },
					onUpdate: () => {
						el.textContent = String(Math.round(state.n));
					},
				});
			});

			const unbind = bindHover(root);
			return () => unbind();
		});

		return () => mm.revert();
	}, { scope });
}
