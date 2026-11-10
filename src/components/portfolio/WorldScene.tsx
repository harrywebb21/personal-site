import type { CSSProperties } from "react";
import type { SectionId } from "../../data/site";

type ThemedSection = Exclude<SectionId, "home">;

const images: Record<ThemedSection, string> = {
  about: "/worlds/jdm-drift.webp",
  work: "/worlds/cyberpunk-arcade.webp",
  projects: "/worlds/football-sideline.webp",
};

const animations: Record<ThemedSection, { name: string; label: string }> = {
  about: { name: "jdm-drift-loop", label: "Drifting coupe" },
  work: { name: "arcade-patron-walk", label: "Arcade patron" },
  projects: { name: "packers-watson-run", label: "Christian Watson, number 9" },
};

type Prop = { name: string; x: number; bottom: number; width: number; front?: boolean };
const props: Record<ThemedSection, { pack: string; items: Prop[] }> = {
  about: { pack: "jdm", items: [
    { name: "tires", x: 1, bottom: 8, width: 190, front: true },
    { name: "barrier", x: 17, bottom: 11, width: 210 },
    { name: "floodlight", x: 88, bottom: 20, width: 150 },
    { name: "cones", x: 38, bottom: 9, width: 98, front: true },
    { name: "mechanic", x: 70, bottom: 12, width: 90 },
    { name: "flag", x: 77, bottom: 10, width: 105, front: true },
    { name: "camera", x: 59, bottom: 10, width: 125, front: true },
  ] },
  work: { pack: "arcade", items: [
    { name: "cabinet", x: 1, bottom: 16, width: 115 },
    { name: "vending", x: 87, bottom: 15, width: 115 },
    { name: "kiosk", x: 73, bottom: 13, width: 130 },
    { name: "neon-sign", x: 88, bottom: 47, width: 90 },
    { name: "planter", x: 28, bottom: 13, width: 135, front: true },
    { name: "robot", x: 62, bottom: 13, width: 90 },
    { name: "drone", x: 54, bottom: 47, width: 100 },
    { name: "cartridges", x: 45, bottom: 11, width: 115, front: true },
  ] },
  projects: { pack: "packers", items: [
    { name: "coolers", x: 2, bottom: 7, width: 100, front: true },
    { name: "chain-marker", x: 96, bottom: 17, width: 65 },
    { name: "trunk", x: 87, bottom: 6, width: 145, front: true },
    { name: "camera", x: 78, bottom: 10, width: 115 },
  ] },
};

function PropLayer({ section, front }: { section: ThemedSection; front: boolean }) {
  const { pack, items } = props[section];
  return <div className={`world-scene__props world-scene__props--${front ? "front" : "mid"}`}>
    {items.filter(item => Boolean(item.front) === front).map(item =>
      <img key={item.name} src={`/worlds/props/${pack}-${item.name}.webp`} alt=""
        style={{ left: `${item.x}%`, bottom: `${item.bottom}%`,
          width: `clamp(${Math.round(item.width * .6)}px, ${item.width / 10.8}vh, ${Math.round(item.width * 1.12)}px)` }} />)}
  </div>;
}

export default function WorldScene({ section }: { section: ThemedSection }) {
  return <div className={`world-scene world-scene--${section}`} aria-hidden="true"
    style={{ "--world-image": `url(${images[section]})` } as CSSProperties}>
    <div className="world-scene__backdrop" />
    {section === "projects" && <div className="world-scene__skybox" aria-hidden="true">
      <div className="world-scene__firework world-scene__firework--one" />
      <div className="world-scene__firework world-scene__firework--two" />
    </div>}
    <div className="world-scene__atmosphere" />
    <div className="world-scene__glow" />
    <div className="world-scene__particles" />
    {section === "projects" && <div className="world-scene__field-play" />}
    <div className="world-scene__ground" />
    <PropLayer section={section} front={false} />
    <div className="world-scene__actor-track">
      <div className={`world-scene__actor world-scene__actor--${section}`}
        title={animations[section].label}
        style={{ "--actor-image": `url(/worlds/${animations[section].name}.webp)` } as CSSProperties} />
    </div>
    <PropLayer section={section} front={true} />
  </div>;
}
