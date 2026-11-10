import { useEffect, useRef, useState, type MouseEvent } from "react";
import { profile, type SectionId } from "../../data/site";
import "./terminal.css";
import PhotoTransmission from "./PhotoTransmission";

type Props = { onNavigate: (section: SectionId, event: MouseEvent<HTMLAnchorElement>) => void };
const transmissions = [
  "Hey, I'm Harry. I'm a software engineer based in London. Have a look around.",
  "I work with TypeScript, React, Next.js and Node.js. I've also worked on mobile apps with React Native.",
  "I worked at Agomi Studio in 2024. You can find that under Work, or look through what I've made under Projects.",
];
export default function Home({ onNavigate }: Props) {
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    setVoiceAvailable('speechSynthesis' in window);
    const powerOff = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };
    window.addEventListener('pip-power-off', powerOff);
    return () => { window.removeEventListener('pip-power-off', powerOff); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);
  useEffect(() => {
    setTyped(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(transmissions[line].length); return; }
    const timer = window.setInterval(() => setTyped(n => {
      if (n >= transmissions[line].length) window.clearInterval(timer);
      return Math.min(n + 2, transmissions[line].length);
    }), 32);
    return () => window.clearInterval(timer);
  }, [line]);
  function stop() { window.speechSynthesis?.cancel(); setSpeaking(false); }
  function speak() {
    if (speaking) { stop(); return; }
    const message = new SpeechSynthesisUtterance(transmissions[line]);
    message.lang = 'en-GB'; message.rate = .9; message.pitch = .8;
    message.onend = message.onerror = () => setSpeaking(false);
    speech.current = message; window.speechSynthesis.cancel();
    setSpeaking(true); window.speechSynthesis.speak(message);
  }
  return (
    <section className="pip-home" aria-label="Harry's status">
      <div className="pip-personnel"><div className="pip-personnel-copy"><p className="record-index">STATUS / PERSONAL</p><h1 id="section-title" tabIndex={-1}>HARRY WEBB</h1><p className="pip-role">Software engineer</p><dl className="pip-attributes"><div><dt>LOCATION</dt><dd>London, UK</dd></div><div><dt>SPECIALITY</dt><dd>Web & mobile</dd></div><div><dt>STATUS</dt><dd>{profile.availability}</dd></div></dl><div className="pip-skills"><h2>SKILLS</h2>{['TypeScript','React','Next.js','Node.js'].map((skill,i)=><div key={skill}><span>0{i+1}</span>{skill}</div>)}</div></div><PhotoTransmission speaking={speaking}/></div>
      <div className={`pip-dialogue${speaking?' is-speaking':''}`}><div className="dialogue-name"><span>HARRY</span><span>{speaking?'● TRANSMITTING':'○ READY'}</span></div><p aria-hidden="true">{transmissions[line].slice(0,typed)}<span className="type-cursor">▌</span></p><span className="sr-only" aria-live="polite">{transmissions[line]}</span><div className="dialogue-actions"><button onClick={speak} disabled={!voiceAvailable}>{speaking?'[ STOP ]':'[ LISTEN ]'}</button><button onClick={()=>{stop();setLine(n=>(n+1)%transmissions.length)}}>[ CONTINUE ]</button><a href="/projects" onClick={e=>onNavigate('projects',e)}>[ PROJECTS ]</a></div></div>
    </section>
  );
}
