import { useEffect, useState, type MouseEvent, type CSSProperties } from 'react';
import { about, experience, pathFor, projects, sectionFromPath, titles, type SectionId } from '../../data/site';
import Home from './Home';
import SpriteCity from './city/SpriteCity';
import CodeTakeover from './CodeTakeover';
import './terminal.css';
import './channel-tv.css';
const tabs: { id:SectionId; label:string }[]=[{id:'home',label:'STAT'},{id:'about',label:'BIO'},{id:'work',label:'WORK'},{id:'projects',label:'DATA'}];
const channels: { id:SectionId; name:string }[]=[{id:'home',name:'WASTELAND'},{id:'about',name:'WASTELAND / ABOUT'},{id:'work',name:'WASTELAND / WORK'},{id:'projects',name:'WASTELAND / PROJECTS'}];
export default function Portfolio({initialSection}:{initialSection:SectionId}) {
  const [section,setSection]=useState(initialSection);
  const [tuneKey,setTuneKey]=useState(0);
  const [powered,setPowered]=useState(true);
  const [brightness,setBrightness]=useState(1);
  useEffect(()=>{const pop=()=>{setSection(sectionFromPath(location.pathname));setTuneKey(n=>n+1)};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)},[]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable]'))return;const current=channels.findIndex(channel=>channel.id===section);const number=Number(event.key);const nextIndex=event.key==='ArrowRight'?(current+1)%channels.length:event.key==='ArrowLeft'?(current-1+channels.length)%channels.length:Number.isInteger(number)&&number>=1&&number<=channels.length?number-1:-1;if(nextIndex<0||nextIndex===current)return;event.preventDefault();const next=channels[nextIndex].id;history.pushState(null,'',pathFor(next));setSection(next);setTuneKey(n=>n+1)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[section]);
  useEffect(()=>{document.title=titles[section];document.getElementById('pip-scroll')?.scrollTo(0,0)},[section]);
  function go(next:SectionId,event:MouseEvent<HTMLAnchorElement>){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();if(section!==next){history.pushState(null,'',pathFor(next));setSection(next);setTuneKey(n=>n+1)}requestAnimationFrame(()=>document.getElementById('section-title')?.focus({preventScroll:true}));}
  const activeChannel=channels.findIndex(channel=>channel.id===section);
  return <div className="pip-world">
    <SpriteCity scene={section} />
    <div className="tv-glass" aria-hidden="true" />
    <div className="tv-glass-texture" aria-hidden="true" />
    <CodeTakeover />
    <div className="tv-tune" key={tuneKey} aria-hidden="true" />
    <div className="tv-channel-status" aria-live="polite"><strong>CH {String(activeChannel+1).padStart(2,'0')}</strong><span>{channels[activeChannel].name}</span></div>
    <nav className="tv-channel-nav" aria-label="Change channel; use number keys 1 to 4 or the left and right arrow keys">{channels.map((channel,i)=><a key={channel.id} href={pathFor(channel.id)} aria-current={section===channel.id?'page':undefined} onClick={event=>go(channel.id,event)}>CH {String(i+1).padStart(2,'0')} · {channel.name}</a>)}</nav>
    <main id="content" className="pip-device" hidden aria-label="Personal information processor">
    <img className="generated-device-frame" src="/frames/pip-frame-v1.png" alt="" aria-hidden="true"/><div className="device-top"><span>PERSONAL INFORMATION PROCESSOR</span><strong>HW / 2000</strong><span className="device-serial">SER. 001—HW</span></div>
    <div className="device-middle"><div className={`crt-housing${powered?'':' is-off'}`}><div className="crt-glass" style={{'--screen-brightness':brightness} as CSSProperties}><div className="crt-content" inert={!powered}>
      <nav className="pip-tabs" aria-label="Primary">{tabs.map(tab=><a key={tab.id} href={pathFor(tab.id)} aria-current={section===tab.id?'page':undefined} onClick={e=>go(tab.id,e)}>{tab.label}</a>)}</nav>
      <div className="pip-scroll" id="pip-scroll" key={section}>
        {section==='home'&&<Home onNavigate={go}/>}
        {section==='about'&&<section className="pip-record"><p className="record-index">PERSONNEL / 01</p><h1 id="section-title" tabIndex={-1}>Harry Webb</h1><p className="record-lede">{about.lede}</p>{about.paragraphs.map(p=><p key={p}>{p}</p>)}<h2>SKILLS</h2><ul className="skill-list">{about.stack.map(x=><li key={x}>{x}</li>)}</ul></section>}
        {section==='work'&&<section className="pip-record"><p className="record-index">EMPLOYMENT / 02</p><h1 id="section-title" tabIndex={-1}>Work log</h1>{experience.map(job=><article className="pip-job" key={job.company}><div className="job-heading"><a href={job.href} target="_blank" rel="noreferrer">{job.company} ↗</a><span>{job.year}</span></div><p>{job.role}</p><ul>{job.points.map(p=><li key={p}>{p}</li>)}</ul></article>)}</section>}
        {section==='projects'&&<section className="pip-record"><p className="record-index">PROJECT ARCHIVE / 03</p><h1 id="section-title" tabIndex={-1}>Projects</h1><div className="pip-projects">{projects.map((p,i)=><figure key={p.name}><img src={p.image.src} alt={p.image.alt}/><figcaption><span>0{i+1}</span>{p.name}</figcaption></figure>)}</div></section>}
      </div><div className="pip-status"><span>HARRY WEBB</span><span>LONDON, UK</span><span>AVAILABLE FOR WORK</span></div>
    </div><div className="crt-scan" aria-hidden="true"/></div></div>
    <aside className="device-side" aria-label="Device controls"><button className={`power-button${powered?' powered':''}`} aria-label={powered?'Turn display off':'Turn display on'} aria-pressed={powered} onClick={()=>{if(powered)window.dispatchEvent(new Event("pip-power-off"));setPowered(p=>!p)}}><span className="sr-only">Power</span></button><label className="brightness-control"><span>BRIGHT</span><input aria-label="Screen brightness" type="range" min="0.55" max="1.2" step="0.05" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label></aside></div>

  </main></div>;
}
