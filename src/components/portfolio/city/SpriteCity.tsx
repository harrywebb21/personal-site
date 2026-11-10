import { useEffect, useMemo, useState, type CSSProperties } from "react";
import CityAtmosphere from "./CityAtmosphere";
import manifest from "./manifest.json";

type SpriteName = keyof typeof manifest.sprites;
type AtlasName = keyof typeof manifest.atlases;
type BuildingName = "cathedral" | "tenement" | "powerStation" | "clockTower" | "broadcastCenter" | "diner" | "billboardApartments" | "ruinedMidrise" | "reactorStation" | "stoneWalkup";
type LayerName = "far" | "mid" | "near";
type SceneName = "home" | "about" | "work" | "projects";

const WORLD_WIDTH = manifest.designSize.width;
const WORLD_HEIGHT = manifest.designSize.height;
const STRIP_WIDTH = 2600;
const STATIC_COPIES = [0] as const;
const buildingNames: BuildingName[] = ["cathedral", "tenement", "powerStation", "clockTower", "broadcastCenter", "diner", "billboardApartments", "ruinedMidrise", "reactorStation", "stoneWalkup"];
const sceneSeeds: Record<SceneName, number> = { home: 0, about: 1009, work: 2017, projects: 3041 };
const sceneBuildings: Record<SceneName, BuildingName[]> = {
  home: ["ruinedMidrise", "diner", "stoneWalkup", "tenement", "reactorStation", "cathedral"],
  about: ["tenement", "stoneWalkup", "diner", "billboardApartments", "ruinedMidrise"],
  work: ["powerStation", "reactorStation", "broadcastCenter", "tenement", "ruinedMidrise"],
  projects: ["cathedral", "clockTower", "ruinedMidrise", "billboardApartments", "stoneWalkup"],
};
const sceneActors: Record<SceneName, { name: "ghoul" | "survivor" | "mutant"; x: number; scale: number }[]> = {
  home: [{ name: "ghoul", x: 360, scale: .42 }, { name: "survivor", x: 1140, scale: .46 }, { name: "mutant", x: 2060, scale: .48 }],
  about: [{ name: "survivor", x: 310, scale: .45 }, { name: "survivor", x: 1290, scale: .43 }, { name: "ghoul", x: 2200, scale: .4 }],
  work: [{ name: "survivor", x: 440, scale: .44 }, { name: "mutant", x: 1360, scale: .49 }, { name: "ghoul", x: 2200, scale: .42 }],
  projects: [{ name: "ghoul", x: 260, scale: .43 }, { name: "mutant", x: 1080, scale: .48 }, { name: "survivor", x: 1940, scale: .45 }],
};
const sceneTerminalX: Record<SceneName, number> = { home: 1540, about: 840, work: 1740, projects: 1240 };
const footprint: Record<BuildingName, number> = {
  cathedral: 372,
  tenement: 179,
  powerStation: 372,
  clockTower: 144,
  broadcastCenter: 372,
  diner: 372,
  billboardApartments: 372,
  ruinedMidrise: 372,
  reactorStation: 372,
  stoneWalkup: 279,
};
const layers: Record<LayerName, { seed: number; scale: number; baseline: number }> = {
  far: { seed: 11, scale: 0.58, baseline: 720 },
  mid: { seed: 29, scale: 0.6, baseline: 816 },
  near: { seed: 47, scale: 0.77, baseline: 963 },
};

function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Placement = { sprite: BuildingName; x: number; scale: number; flicker: boolean };
type Lot = { x: number; width: number; variant: number };
type GroundPropName = "rubble" | "fence" | "terminal" | "deadBush" | "barricade" | "streetlamp" | "barrelFire" | "sedan" | "wreckedBus" | "wreckedTruck";

function generateBuildings(layer: LayerName, scene: SceneName): { buildings: Placement[]; lots: Lot[] } {
  const { seed, scale } = layers[layer];
  const next = random(seed + sceneSeeds[scene]);
  const buildings: Placement[] = [];
  const lots: Lot[] = [];
  let x = -120;
  while (x < STRIP_WIDTH) {
    const choices = layer === "far" ? buildingNames : sceneBuildings[scene];
    const sprite = choices[Math.floor(next() * choices.length)];
    const size = scale * (0.88 + next() * 0.2);
    const width = footprint[sprite] * size;
    const flicker = next() > 0.72;
    // Leave one aligned breach through the nearer buildings for CH 02's distant battle.
    const battleBreach = scene === "about" &&
      ((layer === "near" && x > 850 && x < 900) || (layer === "mid" && x > 880 && x < 910));
    if (!battleBreach) {
      buildings.push({ sprite, x: x + width / 2, scale: size, flicker });
    } else if (layer === "near") {
      lots.push({ x: x + width / 2, width, variant: 2 });
    }
    const gap = layer === "near" ? 16 + next() * 26 : layer === "mid" ? 10 + next() * 18 : 4 + next() * 10;
    if (layer !== "far") lots.push({ x: x + width + gap / 2, width: gap, variant: Math.floor(next() * 3) });
    x += width + gap;
  }
  return { buildings, lots };
}

function GroundProps({ depth, scene }: { depth: "far" | "mid"; scene: SceneName }) {
  const props = useMemo(() => {
    const next = random((depth === "far" ? 3307 : 5189) + sceneSeeds[scene]);
    const items: { name: GroundPropName; x: number; scale: number; baseline: number }[] = [];
    const choices: GroundPropName[] = depth === "far"
      ? ["rubble", "rubble", "deadBush", "deadBush", "fence", "fence", "barricade", "terminal", "streetlamp"]
      : ["rubble", "rubble", "deadBush", "fence", "fence", "barricade", "terminal", "streetlamp", "barrelFire", "sedan"];
    for (let x = 35; x < STRIP_WIDTH; x += (depth === "far" ? 72 : 88) + next() * (depth === "far" ? 58 : 65)) {
      const name = choices[Math.floor(next() * choices.length)];
      items.push({ name, x: x + next() * 22, scale: (depth === "far" ? 0.36 : 0.48) + next() * (depth === "far" ? 0.14 : 0.19), baseline: (depth === "far" ? 754 : 878) + next() * (depth === "far" ? 26 : 51) });
    }
    items.push({ name: depth === "far" ? "wreckedBus" : "wreckedTruck", x: depth === "far" ? 1130 : 1730, scale: depth === "far" ? 0.39 : 0.56, baseline: depth === "far" ? 778 : 924 });
    items.push({ name: depth === "far" ? "wreckedTruck" : "wreckedBus", x: depth === "far" ? 2250 : 520, scale: depth === "far" ? 0.35 : 0.5, baseline: depth === "far" ? 769 : 909 });
    return items;
  }, [depth, scene]);
  return <div className={`city-layer city-layer--${depth}-props`}>
    <div className="city-layer-track">
      {STATIC_COPIES.map(copy => <div className="city-layer-repeat" key={copy} style={{ left: copy * STRIP_WIDTH }}>
        {props.map((item, i) => <Sprite key={i} name={item.name} x={item.x} baseline={item.baseline} scale={item.scale}
          className={item.name === "barrelFire" ? "city-sprite--fire" : item.name === "deadBush" ? "city-sprite--scrub" : ""}
          style={{ animationDelay: `${-i * 0.37}s` }} />)}
      </div>)}
    </div>
  </div>;
}

function Sprite({ name, x, baseline, scale, className = "", style }: {
  name: SpriteName;
  x: number;
  baseline: number;
  scale: number;
  className?: string;
  style?: CSSProperties;
}) {
  const definition = manifest.sprites[name];
  const atlas = manifest.atlases[definition.atlas as AtlasName];
  const width = atlas.frameWidth * scale;
  const height = atlas.frameHeight * scale;
  const spriteStyle = {
    left: x - width / 2,
    bottom: WORLD_HEIGHT - baseline,
    width,
    height,
    backgroundImage: `url(${atlas.url})`,
    backgroundSize: `${atlas.frameWidth * atlas.frames * scale}px ${height}px`,
    backgroundPosition: `${-definition.frame * width}px 0`,
    "--sprite-travel": `${-atlas.frameWidth * atlas.frames * scale}px`,
    "--sprite-duration": "duration" in atlas ? `${atlas.duration}s` : undefined,
    ...style,
  } as CSSProperties;
  return <span aria-hidden="true" className={`city-sprite ${className}`} style={spriteStyle} />;
}

function CityLayer({ name, scene }: { name: LayerName; scene: SceneName }) {
  const { buildings, lots } = useMemo(() => generateBuildings(name, scene), [name, scene]);
  const config = layers[name];
  return (
    <div className={`city-layer city-layer--${name}`}>
      <div className="city-layer-track">
        {STATIC_COPIES.map((copy) => (
          <div className="city-layer-repeat" key={copy} style={{ left: copy * STRIP_WIDTH }}>
            {lots.map((lot, i) => (
              <span key={`lot-${copy}-${i}`} className={`city-vacant-lot city-vacant-lot--${lot.variant}`}
                style={{ left: lot.x - lot.width / 2, width: lot.width, bottom: WORLD_HEIGHT - config.baseline }} />
            ))}
            {buildings.map((building, i) => (
              <Sprite
                key={`${copy}-${i}`}
                name={building.sprite}
                x={building.x}
                baseline={config.baseline}
                scale={building.scale}
                className={building.flicker ? "city-sprite--flicker" : ""}
                style={{ animationDelay: `${-(i * 0.73 + copy * 0.11)}s` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DistantRuins({ scene }: { scene: SceneName }) {
  const skyline = useMemo(() => {
    const next = random(1019 + sceneSeeds[scene]);
    const pieces: { x: number; width: number; height: number; shape: number }[] = [];
    for (let x = -95; x < WORLD_WIDTH + 135;) {
      const width = 42 + next() * 86;
      pieces.push({ x, width, height: 110 + next() * 270, shape: Math.floor(next() * 4) });
      x += width - 6 + next() * 12;
    }
    return pieces;
  }, [scene]);
  return <div className="city-distant-ruins">
    {skyline.map((piece, i) => <span key={i} className={`city-distant-building city-distant-building--${piece.shape}`}
      style={{ left: piece.x, width: piece.width, height: piece.height, "--window-delay": `${-(i % 7) * 1.3}s` } as CSSProperties} />)}
    <span className="city-cooling-tower city-cooling-tower--one" />
    <span className="city-cooling-tower city-cooling-tower--two" />
    <span className="city-distant-smoke city-distant-smoke--one" />
    <span className="city-distant-smoke city-distant-smoke--two" />
  </div>;
}

function TerrainLayer({ scene }: { scene: SceneName }) {
  const details = useMemo(() => {
    const next = random(718 + sceneSeeds[scene]);
    const pieces: { name: "deadBush" | "rubble" | "fence" | "barricade" | "barrelFire" | "wreckedBus" | "wreckedTruck"; x: number; scale: number; baseline: number }[] = [];
    for (let x = 45; x < STRIP_WIDTH; x += 68 + next() * 70) {
      const roll = next();
      const name = roll < .34 ? "deadBush" : roll < .58 ? "rubble" : roll < .76 ? "fence" : roll < .91 ? "barricade" : "barrelFire";
      pieces.push({ name, x, scale: 0.43 + next() * 0.2, baseline: 918 + next() * 26 });
    }
    pieces.push({ name: "wreckedBus", x: 735, scale: 0.75, baseline: 935 });
    pieces.push({ name: "wreckedTruck", x: 1430, scale: 0.69, baseline: 934 });
    pieces.push({ name: "wreckedBus", x: 2310, scale: 0.62, baseline: 929 });
    return pieces;
  }, [scene]);
  return <div className="city-layer city-layer--terrain">
    <div className="city-layer-track">
      {STATIC_COPIES.map(copy => <div className="city-layer-repeat" key={copy} style={{ left: copy * STRIP_WIDTH }}>
        {details.map((detail, i) => <Sprite key={i} name={detail.name} x={detail.x} baseline={detail.baseline} scale={detail.scale}
          className={detail.name === "deadBush" ? "city-sprite--scrub" : detail.name === "barrelFire" ? "city-sprite--fire" : ""}
          style={{ animationDelay: `${-i * 1.9}s` }} />)}
      </div>)}
    </div>
  </div>;
}

function BrokenHighway() {
  return <div className="city-layer city-layer--highway">
    <div className="city-layer-track">
      {STATIC_COPIES.map(copy => <div className="city-layer-repeat" key={copy} style={{ left: copy * STRIP_WIDTH }}>
        <Sprite name="highway" x={1520} baseline={842} scale={1.05} />
      </div>)}
    </div>
  </div>;
}

function FalloutDust() {
  return <div className="city-layer city-layer--fallout-dust">
    <div className="city-layer-track">
      {STATIC_COPIES.map(copy => <div className="city-layer-repeat" key={copy} style={{ left: copy * STRIP_WIDTH }}>
        {[280, 1160, 2170].map((x, i) => <Sprite key={i} name="falloutDust" x={x} baseline={700 - i * 22}
          scale={1.65 + i * 0.12} className="city-sprite--fallout-dust" style={{ animationDelay: `${-i * 1.4}s` }} />)}
      </div>)}
    </div>
  </div>;
}

function StreetLayer({ scene }: { scene: SceneName }) {
  const props = useMemo(() => {
    const next = random(2077 + sceneSeeds[scene]);
    const items: { name: SpriteName; x: number; scale: number }[] = [];
    for (let x = 70; x < STRIP_WIDTH; x += 150 + next() * 145) {
      const roll = next();
      items.push({ name: roll > 0.78 ? "streetlamp" : roll > 0.53 ? "barricade" : roll > 0.26 ? "barrelFire" : "terminal", x, scale: roll > 0.78 ? 0.65 : roll > 0.53 ? 0.6 : roll > 0.26 ? 0.48 : 0.42 });
    }
    for (let x = 370, i = 0; x < STRIP_WIDTH; x += 480 + next() * 200, i++) {
      const name = (["sedan", "wreckedTruck", "wreckedBus"] as const)[i % 3];
      items.push({ name, x, scale: name === "sedan" ? 0.68 : 0.56 });
    }
    return items;
  }, [scene]);
  return (
    <div className="city-layer city-layer--street">
      <div className="city-layer-track">
        {STATIC_COPIES.map((copy) => (
          <div className="city-layer-repeat" key={copy} style={{ left: copy * STRIP_WIDTH }}>
            {props.map((item, i) => (
              <Sprite key={`${copy}-${i}`} name={item.name} x={item.x} baseline={item.name === "sedan" || item.name === "wreckedTruck" || item.name === "wreckedBus" ? 1054 : 976} scale={item.scale}
                className={item.name === "barrelFire" ? "city-sprite--fire" : ""} />
            ))}
            {sceneActors[scene].map((actor, i) => (
              <span className="city-ghoul-path" key={`${actor.name}-${copy}-${i}`} style={{ left: actor.x, animationDelay: `${-i * 4.7}s` }}>
                <Sprite name={actor.name} x={0} baseline={972} scale={actor.scale} className="city-sprite--walker" />
              </span>
            ))}
            <span className="city-interaction" style={{ left: sceneTerminalX[scene] }}>
              <Sprite name="terminal" x={0} baseline={976} scale={.39} className="city-sprite--terminal-pulse" />
              <Sprite name={scene === "work" ? "mutant" : "survivor"} x={56} baseline={973}
                scale={scene === "work" ? .43 : .41} className="city-sprite--interacting" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpriteCity({ scene }: { scene: SceneName }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    // Leave overscan around the viewport so the camera can pan without exposing an edge.
    const update = () => setScale(Math.max(window.innerWidth / WORLD_WIDTH, window.innerHeight / WORLD_HEIGHT, 0.5) * 1.12);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className={`sprite-city sprite-city--${scene}`} aria-hidden="true">
      <div className="sprite-city-world" style={{ "--world-scale": scale } as CSSProperties}>
        <div className="city-sky" />
        <div className="city-backdrop" />
        <div className="city-skyglow" />
        <div className="city-clouds city-clouds--back" />
        <div className="city-searchlight city-searchlight--one" />
        <div className="city-searchlight city-searchlight--two" />
        <div className="city-flash" />
        <DistantRuins scene={scene} />
        <FalloutDust />
        <BrokenHighway />
        <CityLayer name="far" scene={scene} />
        <div className="city-ground city-ground--far" />
        <div className="city-ground-haze city-ground-haze--far" />
        <GroundProps depth="far" scene={scene} />
        <div className="city-aircraft-path">
          <Sprite name="vertibird" x={0} baseline={510} scale={0.74} className="city-sprite--vertibird" />
        </div>
        <div className="city-clouds city-clouds--front" />
        <CityLayer name="mid" scene={scene} />
        {scene === "about" && <Sprite name="synthDuel" x={970} baseline={850} scale={0.42} className="city-sprite--synth-duel" />}
        <div className="city-ground city-ground--mid" />
        <div className="city-ground-haze city-ground-haze--mid" />
        <GroundProps depth="mid" scene={scene} />
        <CityAtmosphere />
        <Sprite name="nuke" x={1535} baseline={812} scale={1.45} className="city-sprite--nuke" />
        <TerrainLayer scene={scene} />
        <CityLayer name="near" scene={scene} />
        <div className="city-sidewalk" />
        <div className="city-road" />
        <StreetLayer scene={scene} />
        <div className="city-rain" />
        <div className="city-vignette" />
      </div>
    </div>
  );
}
