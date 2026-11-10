import './code-takeover.css';

const sourceLines = [
  ['01', 'const wasteland = new World();'],
  ['02', 'wasteland.seed(2077);'],
  ['03', 'skyline.render({ depth: 4 });'],
  ['04', 'smoke.diffuse(0.78);'],
  ['05', 'survivors.spawn("street");'],
  ['06', 'signal.override = true;'],
  ['07', 'while (world.alive) {'],
  ['08', '  city.update();'],
  ['09', '  memory.persist();'],
  ['10', '}'],
];

export default function CodeTakeover() {
  return <div className="code-takeover" aria-hidden="true">
    <div className="code-takeover__grid" />
    <div className="code-takeover__camera-id"><span className="code-takeover__record-light" />CAM 07 <i>/</i> GOTHAM EAST <span className="code-takeover__camera-live">LIVE FEED</span></div>
    <div className="code-takeover__source">
      <div className="code-takeover__heading"><span>LIVE SOURCE</span><span>● REC</span></div>
      <div className="code-takeover__file">/world/gotham-2077.tsx</div>
      <div className="code-takeover__lines">{sourceLines.map(([number, line]) => <div key={number}><span>{number}</span><code>{line}</code></div>)}</div>
      <div className="code-takeover__cursor">&gt; compiling environment<span>_</span></div>
    </div>
    <div className="code-takeover__override">
      <span className="code-takeover__eyebrow">SYSTEM / VISUAL LAYER</span>
      <strong data-text="CODE HAS TAKEN OVER">CODE HAS TAKEN OVER</strong>
      <span className="code-takeover__sub">REALITY.EXE IS BEING REWRITTEN</span>
      <div className="code-takeover__progress"><span /></div>
      <div className="code-takeover__stats"><span>WORLD STATE <b>UNSTABLE</b></span><span>RENDER <b>ACTIVE</b></span></div>
    </div>
    <div className="code-takeover__ghost code-takeover__ghost--one">&lt;City depth={4} haze="fallout" /&gt;</div>
    <div className="code-takeover__ghost code-takeover__ghost--two">// NOTHING HERE IS STATIC</div>
    <div className="code-takeover__reticle"><span className="code-takeover__reticle-center" /><span className="code-takeover__reticle-label">TRACKING / CITY CORE</span></div>
    <div className="code-takeover__pan"><span>CAMERA PAN</span><span className="code-takeover__pan-rail"><i /></span><span>SECTOR 07</span></div>
    <div className="code-takeover__tear" />
  </div>;
}
