import React, { useEffect, useRef, useState } from 'react';
import { World } from './world';

// --- Quiz ---------------------------------------------------------------
// Question 1 is supplied verbatim by the project brief. Questions 2-6 were
// written from the scientific sources cited at the bottom of the page to
// complete the six-question set the brief describes.

interface Q { q: string; options: string[]; answer: number; why: string; src: string; mine: boolean; }

const QUIZ: Q[] = [
    {
        q: 'Why do cities often remain hotter than surrounding rural areas?',
        options: ['Cities are always closer to the Sun', 'Buildings and pavement absorb and release heat', 'Wind never enters cities'],
        answer: 1,
        why: 'Buildings, asphalt, and other artificial surfaces absorb energy from sunlight and release heat back into their surroundings, and reduced vegetation limits natural shade and cooling. This is the urban heat island effect. [2]',
        src: 'EPA, Learn About Heat Island Effects', mine: false,
    },
    {
        q: 'On June 28, 2021, Portland International Airport recorded which all-time record temperature?',
        options: ['104°F', '116°F', '98°F', '132°F'],
        answer: 1,
        why: 'The National Weather Service climate report records 116°F at Portland International Airport on June 28, 2021, an all-time record at that location. [7]',
        src: 'National Weather Service, Portland 2021 Climate Report', mine: true,
    },
    {
        q: 'A fire requires which three basic ingredients?',
        options: ['Heat, water, and wind', 'Fuel, smoke, and sunlight', 'Heat or an ignition source, fuel, and oxygen', 'Oxygen, nitrogen, and rain'],
        answer: 2,
        why: 'Fire needs heat (an ignition source), fuel such as dry grass, brush, or wood, and oxygen. Removing any one of them stops a fire from burning. [8][10]',
        src: 'USDA Climate Hubs / U.S. Fire Administration', mine: true,
    },
    {
        q: 'What is a prescribed burn?',
        options: ['An uncontrolled wildfire in a national park', 'A carefully planned fire conducted by trained professionals under selected weather and safety conditions', 'Burning household waste during a burn ban', 'A fire that only burns tree canopies'],
        answer: 1,
        why: 'Prescribed burns are carefully planned fires, set by trained professionals under selected conditions, that reduce accumulated combustible material and can reduce the intensity of some future wildfires. [8]',
        src: 'USDA Climate Hubs, Prescribed Fire in the Northwest', mine: true,
    },
    {
        q: 'What is PM2.5?',
        options: ['A fire-resistant roofing material', 'Fine particulate matter in wildfire smoke that can enter deep into the lungs', 'A rating for air conditioners', 'A harmless type of water vapor'],
        answer: 1,
        why: 'Wildfire smoke contains gases and tiny particles, including fine particulate matter known as PM2.5, which can enter deep into the lungs and worsen breathing and cardiovascular problems. [12]',
        src: 'EPA, Indoor Air Filtration During Wildfires', mine: true,
    },
    {
        q: 'In defensible space guidance, Zone 1 covers which distance from a building?',
        options: ['0–5 feet', '5–30 feet', '30–100 feet', '100–200 feet'],
        answer: 0,
        why: 'Zone 1 is the area 0–5 feet from the building: remove dry leaves, pine needles, and flammable debris, and keep combustible materials away from exterior walls. [9]',
        src: 'OSU Extension, Preparing Your Home for Wildfire', mine: true,
    },
];

const SOURCES: [string, string, string][] = [
    ['1', 'EPA — Climate Change Indicators in the United States, Fifth Edition (2024)', 'https://www.epa.gov/system/files/documents/2024-09/climate_indicators_2024.pdf'],
    ['2', 'EPA — Learn About Heat Island Effects', 'https://www.epa.gov/heatislands/learn-about-heat-island-effects'],
    ['3', 'EPA — Benefits of Trees and Vegetation', 'https://www.epa.gov/heatislands/benefits-trees-and-vegetation'],
    ['4', 'EPA — Using Cool Roofs to Reduce Heat Islands', 'https://www.epa.gov/heatislands/using-cool-roofs-reduce-heat-islands'],
    ['5', 'CDC — About Heat and Your Health', 'https://www.cdc.gov/extreme-heat/about/'],
    ['6', 'CDC/NIOSH — Heat-related Illnesses', 'https://www.cdc.gov/niosh/heat-stress/about/illnesses.html'],
    ['7', 'National Weather Service — Portland 2021 Climate Report', 'https://forecast.weather.gov/product.php?format=TXT&glossary=1&issuedby=PDX&product=CLA&site=BOI&version=13'],
    ['8', 'USDA Climate Hubs — Prescribed Fire in the Northwest', 'https://www.climatehubs.usda.gov/hubs/northwest/topic/prescribed-fire-northwest'],
    ['9', 'OSU Extension — Preparing Your Home for Wildfire', 'https://extension.oregonstate.edu/fire-program/preparing-your-home'],
    ['10', 'U.S. Fire Administration — Take Action on Wildland-Urban Interface Projects', 'https://www.usfa.fema.gov/wui/communities/take-action.html'],
    ['11', 'U.S. Fire Administration — Wildfire Evacuation', 'https://www.usfa.fema.gov/wui/outreach/wildfire-evacuation.html'],
    ['12', 'EPA — Indoor Air Filtration During Wildfires', 'https://www.epa.gov/wildfires/indoor-air-filtration'],
    ['13', 'U.S. Climate Resilience Toolkit — Fire Regimes', 'https://toolkit.climate.gov/fire-regimes'],
    ['14', 'EPA — Frequent Heat Island Questions and Resources', 'https://www.epa.gov/heatislands/frequent-heat-island-questions-and-resources'],
    ['15', 'OSU Extension — Wildfire Readiness', 'https://extension.oregonstate.edu/fire-program/wildfire-readiness'],
];

const SCENES = ['THE WORLD IS CHANGING', 'THE CLIMATE CONNECTION', 'A CITY UNDER HEAT', 'THE HUMAN COST', 'A COOLER CITY', 'A FOREST UNDER PRESSURE', 'FIRE RESILIENCE', 'WILDFIRE SMOKE', 'HOME IGNITION ZONE', 'CHOOSE THE FUTURE', 'OUR RESPONSIBILITY'];

function Panel(props: { kicker?: string; title?: string; side?: 'left' | 'right' | 'center'; num?: string; collapsible?: boolean; children: React.ReactNode }) {
    const [mini, setMini] = useState(false);
    if (mini) return <div className={`panel mini ${props.side || 'left'}`}>
        <div className="minirow">
            <div className="kicker">{props.kicker}</div>
            <button className="collapse" onClick={() => setMini(false)}>Show text</button>
        </div>
        <h2>{props.title}</h2>
    </div>;
    return <div className={`panel ${props.side || 'left'}`} data-num={props.num}>
        {props.collapsible && <button className="collapse" onClick={() => setMini(true)}>Hide text</button>}
        {props.kicker && <div className="kicker">{props.kicker}</div>}
        {props.title && <h2>{props.title}</h2>}
        {props.children}
    </div>;
}

function DataMoment(props: { value: string; label: string; source: string; url: string }) {
    return <div className="datacall">
        <div className="bignum">{props.value}</div>
        <div className="biglabel">{props.label}</div>
        <a className="bigsrc" href={props.url} target="_blank" rel="noreferrer">{props.source} ↗</a>
    </div>;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function Quiz() {
    const [idx, setIdx] = useState(0);
    const [picked, setPicked] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const q = QUIZ[idx];
    const choose = (i: number) => {
        if (picked !== null) return;
        setPicked(i);
        if (i === q.answer) setScore(s => s + 1);
    };
    const next = () => {
        if (idx + 1 >= QUIZ.length) { setDone(true); return; }
        setIdx(idx + 1); setPicked(null);
    };
    const restart = () => { setIdx(0); setPicked(null); setScore(0); setDone(false); };
    if (done) return <div className="quiz">
        <div className="kicker">Climate Resilience Challenge</div>
        <div className="scorebig">{score}<span>/{QUIZ.length}</span></div>
        <p>{score >= 5 ? 'Excellent — you understand how climate change drives extreme heat and wildfire risk, and how communities can adapt.' : score >= 3 ? 'Good start — scroll back through the scenes to review the science, then try again.' : 'Scroll back through the scenes and try again — the answers are all in the story.'}</p>
        <button className="act" onClick={restart}>Try again</button>
    </div>;
    return <div className="quiz">
        <div className="kicker">Climate Resilience Challenge</div>
        <div className="qmeta">
            <div className="qcount">Question {idx + 1} of {QUIZ.length}</div>
            <div className="qdots">{QUIZ.map((_, i) => <span key={i} className={`qdot ${i < idx ? 'past' : ''} ${i === idx ? 'now' : ''}`} />)}</div>
        </div>
        <h3>{q.q}</h3>
        <div className="opts">
            {q.options.map((o, i) => {
                let cls = 'opt';
                if (picked !== null) {
                    if (i === q.answer) cls += ' correct';
                    else if (i === picked) cls += ' wrong';
                    else cls += ' dim';
                }
                return <button key={i} className={cls} onClick={() => choose(i)}><span className="optletter">{LETTERS[i]}</span>{o}</button>;
            })}
        </div>
        {picked !== null && <div className="why">
            <p>{picked === q.answer ? 'Correct. ' : 'Not quite. '}{q.why}</p>
            <div className="whysrc">Source: {q.src}{q.mine ? ' · question written from this source' : ''}</div>
            <button className="act" onClick={next}>{idx + 1 >= QUIZ.length ? 'See results' : 'Next question'}</button>
        </div>}
    </div>;
}

export function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const labelsRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<World | null>(null);
    const [cityOn, setCityOn] = useState<Record<string, boolean>>({});
    const [forestOn, setForestOn] = useState<Record<string, boolean>>({});
    const [ring, setRing] = useState(0);
    const [future, setFuture] = useState(0);
    const [progress, setProgress] = useState(0);
    const [stop, setStop] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current!;
        // The hosted viewer sizes the page iframe to the content height, so the
        // outer shell, not this document, does the scrolling. Give the stage an
        // explicit pixel height (the real browser-window height minus shell chrome)
        // and scroll internally: then vh units, position:fixed and progress all work.
        const site = document.querySelector('.site') as HTMLElement;
        const scroller = document.querySelector('.scroller') as HTMLElement;
        const fit = () => {
            const inShell = window.self !== window.top;
            const chrome = inShell ? (window.innerWidth < 768 ? 285 : 72) : 0;
            const h = Math.max(420, Math.min(1100, Math.round((window.outerHeight || window.innerHeight || 800) - chrome)));
            site.style.height = h + 'px';
            document.body.style.height = h + 'px';
            document.documentElement.style.height = h + 'px';
            document.body.style.overflow = 'hidden';
        };
        fit();
        // The viewer shell never shrinks the iframe below its own available height,
        // so adopt the real post-layout height when it is larger and converge.
        let fitRounds = 0;
        const refit = () => {
            const actual = window.innerHeight;
            const cur = parseInt(site.style.height || '0', 10);
            if (actual > cur && actual < 1400) {
                site.style.height = actual + 'px';
                document.body.style.height = actual + 'px';
                document.documentElement.style.height = actual + 'px';
            }
            if (++fitRounds < 6) setTimeout(refit, 400);
        };
        setTimeout(refit, 400);
        let world: World | null = null;
        try { world = new World(canvas); } catch (e) { console.error(e); return; }
        worldRef.current = world;
        if (labelsRef.current) world.setLabelRoot(labelsRef.current);
        const onPointer = (e: PointerEvent) => {
            world!.setPointer((e.clientX / window.innerWidth) * 2 - 1, (0.5 - e.clientY / window.innerHeight) * 2);
        };
        window.addEventListener('pointermove', onPointer, { passive: true });
        let last = performance.now();
        let raf = 0;
        const onScroll = () => {
            // Interpolate the camera stop from the two sections bracketing the
            // viewport center, so the 3D world tracks the story, not raw pixels.
            const secs = Array.from(scroller.querySelectorAll('.sec')) as HTMLElement[];
            const mid = scroller.scrollTop + scroller.clientHeight * 0.5;
            let stop = 0;
            for (let i = 0; i < secs.length; i++) {
                const top = secs[i].offsetTop;
                const s = parseFloat(secs[i].dataset.stop || '0');
                const nextTop = i + 1 < secs.length ? secs[i + 1].offsetTop : scroller.scrollHeight;
                const nextS = i + 1 < secs.length ? parseFloat(secs[i + 1].dataset.stop || '10') : s;
                if (mid >= top && mid < nextTop) {
                    const f = nextTop > top ? (mid - top) / (nextTop - top) : 0;
                    stop = s + (nextS - s) * f;
                    break;
                }
                stop = s;
            }
            world!.setProgress(stop / 10);
            setStop(stop);
            const max = scroller.scrollHeight - scroller.clientHeight;
            setProgress(max > 0 ? scroller.scrollTop / max : 0);
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            world!.frame(dt);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const obs = new IntersectionObserver(es => {
            for (const e of es) if (e.isIntersecting) e.target.classList.add('in');
        }, { threshold: 0.15, root: scroller });
        scroller.querySelectorAll('.panel,.datacall,.quiz,.srcs,.hero').forEach(el => obs.observe(el));
        return () => { cancelAnimationFrame(raf); scroller.removeEventListener('scroll', onScroll); window.removeEventListener('pointermove', onPointer); obs.disconnect(); };
    }, []);

    const cityFlag = (name: 'trees' | 'roofs' | 'centers' | 'shade') => {
        const next = !cityOn[name];
        setCityOn({ ...cityOn, [name]: next });
        const w = worldRef.current;
        if (!w) return;
        w.setFlag(name, next);
        if (next) {
            const meta = {
                trees: { f: [200, 2, -6] as [number, number, number], lift: 0, label: '+ Street trees', lp: [200, 5, -6] as [number, number, number] },
                roofs: { f: [200, 8, 0] as [number, number, number], lift: 6, label: 'Cool roofs on', lp: [200, 11, 0] as [number, number, number] },
                centers: { f: [208, 2, 10] as [number, number, number], lift: 2, label: 'Cooling centers', lp: [208, 5, 10] as [number, number, number] },
                shade: { f: [206, 2.5, -6] as [number, number, number], lift: 1, label: 'Shade structures', lp: [206, 4.2, -6] as [number, number, number] },
            }[name];
            w.pulseFocus(meta.f, meta.lift);
            w.flashLabel(meta.label, meta.lp, 'good');
        }
    };
    const forestFlag = (name: 'fuel' | 'rxFire' | 'defensible' | 'harden') => {
        const next = !forestOn[name];
        setForestOn({ ...forestOn, [name]: next });
        const w = worldRef.current;
        if (!w) return;
        w.setFlag(name, next);
        if (next) {
            const meta = {
                fuel: { f: [390, 1, -5] as [number, number, number], lift: 2, label: 'Fuel reduced', lp: [390, 3.5, -5] as [number, number, number], tone: 'good' as const },
                rxFire: { f: [400, 1, -3] as [number, number, number], lift: 2, label: 'Prescribed burn', lp: [400, 4, -3] as [number, number, number], tone: 'warm' as const },
                defensible: { f: [400, 1.5, 5] as [number, number, number], lift: 3, label: 'Defensible space', lp: [400, 4.5, 5] as [number, number, number], tone: 'good' as const },
                harden: { f: [400, 2.5, 5] as [number, number, number], lift: 3, label: 'Hardened home', lp: [400, 5.2, 5] as [number, number, number], tone: 'good' as const },
            }[name];
            w.pulseFocus(meta.f, meta.lift);
            w.flashLabel(meta.label, meta.lp, meta.tone);
        }
    };
    const pickRing = (i: number) => {
        const next = ring === i ? 0 : i;
        setRing(next);
        const w = worldRef.current;
        if (!w) return;
        w.setFlag('ring', next);
        if (next) {
            w.pulseFocus([400, 1.5, 5], 3);
            w.flashLabel(`Zone ${next} highlighted`, [400, 5, 5], 'info');
        }
    };
    const pickFuture = (v: number) => {
        setFuture(v);
        const w = worldRef.current;
        if (!w) return;
        w.setFlag('future', v);
        w.pulseFocus([200, 3, 0], 3);
        w.flashLabel(v === 1 ? 'With adaptation' : 'Without preparation', [200, 8.5, 0], v === 1 ? 'good' : 'warm');
    };
    const clearCity = () => {
        setCityOn({});
        const w = worldRef.current;
        if (!w) return;
        (['trees', 'roofs', 'centers', 'shade'] as const).forEach(k => w.setFlag(k, false));
    };
    const clearForest = () => {
        setForestOn({});
        const w = worldRef.current;
        if (!w) return;
        (['fuel', 'rxFire', 'defensible', 'harden'] as const).forEach(k => w.setFlag(k, false));
    };

    const sceneIdx = Math.max(0, Math.min(10, Math.round(stop)));
    const cityDock = stop > 3.4 && stop < 4.6;
    const forestDock = stop > 5.4 && stop < 6.6;
    const ringDock = stop > 7.4 && stop < 8.6;
    const futureDock = stop > 8.55 && stop < 9.45;
    const anyCity = cityOn.trees || cityOn.roofs || cityOn.centers || cityOn.shade;
    const anyForest = forestOn.fuel || forestOn.rxFire || forestOn.defensible || forestOn.harden;

    return <div className="site">
        <canvas ref={canvasRef} className="stage" />
        <div className="glow" />
        <div className="labels" ref={labelsRef} />
        <header className="topbar">
            <div className="brand"><span className="branddot" />ONE PLANET · TWO THREATS · OUR FUTURE</div>
            <div className="sceneind"><span className="scenenum">{String(sceneIdx === 0 ? 1 : sceneIdx).padStart(2, '0')}</span>{SCENES[sceneIdx]}</div>
            <div className="pbar"><div className="pfill" style={{ width: `${progress * 100}%` }} /></div>
        </header>
        <div className={`dock ${cityDock ? 'show' : ''}`}>
            <div className="docklabel">Transform the city</div>
            <div className="dockbtns">
                <button className={`act ${cityOn.trees ? 'on' : ''}`} onClick={() => cityFlag('trees')}>🌳 Plant Trees</button>
                <button className={`act ${cityOn.roofs ? 'on' : ''}`} onClick={() => cityFlag('roofs')}>🏢 Add Cool Roofs</button>
                <button className={`act ${cityOn.centers ? 'on' : ''}`} onClick={() => cityFlag('centers')}>❄️ Cooling Centers</button>
                <button className={`act ${cityOn.shade ? 'on' : ''}`} onClick={() => cityFlag('shade')}>⛱️ Create Shade</button>
            </div>
        </div>
        <div className={`caption ${cityDock && anyCity ? 'show' : ''}`}>
            <button className="capclose" onClick={clearCity}>Reset ✕</button>
            {cityOn.trees && <p><strong>Trees and green space:</strong> Trees block direct sunlight and cool their surroundings through evapotranspiration. An EPA-cited review of 308 studies found that urban forests were, on average, <strong>3°F cooler</strong> than urban areas without greenery. <sup>[3]</sup></p>}
            {cityOn.roofs && <p><strong>Reflective and green roofs:</strong> Traditional dark roofs absorb substantial solar energy. Cool roofs use reflective materials to absorb less heat, which can reduce building temperatures and air-conditioning demand. Green roofs add vegetation that provides shade and cooling. <sup>[4]</sup></p>}
            {cityOn.centers && <p><strong>Cooling centers:</strong> Accessible air-conditioned spaces in libraries, community centers, and other public buildings during extreme heat — supported by clear public information, accessible transportation, and accommodations for people with disabilities. <sup>[5]</sup></p>}
            {cityOn.shade && <p><strong>Redesigned public spaces:</strong> Shade structures, covered transit stops, drinking-water stations, and carefully selected pavement materials can reduce heat exposure where people spend time outside. <sup>[14]</sup></p>}
        </div>
        <div className={`dock ${forestDock ? 'show' : ''}`}>
            <div className="docklabel">Transform the forest</div>
            <div className="dockbtns">
                <button className={`act ${forestOn.fuel ? 'on' : ''}`} onClick={() => forestFlag('fuel')}>🪓 Manage Fuel</button>
                <button className={`act ${forestOn.rxFire ? 'on' : ''}`} onClick={() => forestFlag('rxFire')}>🔥 Prescribed Fire</button>
                <button className={`act ${forestOn.defensible ? 'on' : ''}`} onClick={() => forestFlag('defensible')}>🏡 Defensible Space</button>
                <button className={`act ${forestOn.harden ? 'on' : ''}`} onClick={() => forestFlag('harden')}>🛡️ Harden the Home</button>
            </div>
        </div>
        <div className={`caption ${forestDock && anyForest ? 'show' : ''}`}>
            <button className="capclose" onClick={clearForest}>Reset ✕</button>
            {forestOn.fuel && <p><strong>Forest thinning and fuel management:</strong> Overcrowded forests contain dense vegetation that lets flames move from the ground into tree canopies. Strategically thinning smaller trees and removing excess surface or ladder fuels can change how future fires burn. <sup>[8]</sup></p>}
            {forestOn.rxFire && <p><strong>Prescribed burns:</strong> A carefully planned fire conducted by trained professionals under selected weather and safety conditions. These burns reduce accumulated combustible material and can reduce the intensity and severity of some future wildfires. <em>The trade-off:</em> they create smoke and carry some risk of escaping control — they require careful planning and are not suitable for every landscape. <sup>[8]</sup></p>}
            {forestOn.defensible && <p><strong>Defensible space:</strong> Managing vegetation and combustible materials around buildings. A properly maintained home ignition zone can reduce the chances that flames or burning embers ignite a structure. Explore the three zones in the next scene. <sup>[9]</sup></p>}
            {forestOn.harden && <p><strong>Fire-resistant homes:</strong> Flying embers can ignite houses even before the main fire reaches them. Fire-resistant roofing and siding, ember-resistant vents, enclosed eaves, and clean roofs and gutters reduce vulnerable ignition points. <sup>[9][10]</sup></p>}
        </div>
        <div className={`dock ${ringDock ? 'show' : ''}`}>
            <div className="docklabel">Explore each zone</div>
            <div className="dockbtns">
                <button className={`act zone z1 ${ring === 1 ? 'on' : ''}`} onClick={() => pickRing(1)}>Zone 1 · 0–5 ft</button>
                <button className={`act zone z2 ${ring === 2 ? 'on' : ''}`} onClick={() => pickRing(2)}>Zone 2 · 5–30 ft</button>
                <button className={`act zone z3 ${ring === 3 ? 'on' : ''}`} onClick={() => pickRing(3)}>Zone 3 · 30–100 ft</button>
            </div>
        </div>
        <div className={`caption ${ringDock && ring > 0 ? 'show' : ''}`}>
            <button className="capclose" onClick={() => pickRing(ring)}>Close ✕</button>
            {ring === 1 && <ul>
                <li>Remove dry leaves, pine needles, and flammable debris.</li>
                <li>Keep combustible mulch, firewood, and other materials away from exterior walls.</li>
                <li>Use noncombustible landscaping immediately adjacent to the building where appropriate.</li>
            </ul>}
            {ring === 2 && <ul>
                <li>Maintain trees and shrubs.</li>
                <li>Remove dead vegetation and ladder fuels.</li>
                <li>Keep vegetation appropriately separated and maintained.</li>
            </ul>}
            {ring === 3 && <ul>
                <li>Reduce dense concentrations of vegetation where appropriate.</li>
                <li>Remove accumulations of dead plant material.</li>
                <li>Maintain breaks between fuel sources.</li>
            </ul>}
        </div>
        <div className={`dock future ${futureDock ? 'show' : ''}`}>
            <div className="docklabel">Compare the two futures</div>
            <div className="segwrap">
                <button className={`seg bad ${future === 0 ? 'on' : ''}`} onClick={() => pickFuture(0)}>Without preparation</button>
                <button className={`seg good ${future === 1 ? 'on' : ''}`} onClick={() => pickFuture(1)}>With adaptation</button>
            </div>
            <div className={`statechip ${future === 1 ? 'good' : 'bad'}`}>{future === 1 ? 'WITH ADAPTATION' : 'WITHOUT PREPARATION'}</div>
        </div>
        <div className="scroller">
        <section className="sec hero-sec" data-stop="0">
            <div className="hero">
                <div className="kicker">SUS 103 · Group Project Lab</div>
                <h1>ONE PLANET.<br />TWO THREATS.<br />OUR FUTURE.</h1>
                <p className="lede">An interactive journey through a warming city and a wildfire-prone forest.</p>
                <div className="scrollcue">Scroll to begin ↓</div>
            </div>
        </section>

        <section className="sec" data-stop="0.4">
            <Panel kicker="Scene 1" title="Welcome to a Changing Planet" num="01">
                <p>What if the places we call home became too hot to live comfortably, or too vulnerable to wildfire to feel safe?</p>
                <p>Across the world, rising temperatures are changing the conditions in which people live. Heat waves place growing pressure on cities, while warmer and drier conditions can intensify wildfires in many regions.</p>
                <p>These problems may appear different, but they share an important connection: our changing climate.</p>
                <p><strong>The challenge:</strong> How do we protect people, homes, and ecosystems in a warming world?</p>
                <p><strong>The opportunity:</strong> Science shows us ways to prepare, adapt, and reduce risk.</p>
                <p className="dim2">Keep scrolling to explore two climate threats — and discover what we can do about them.</p>
            </Panel>
        </section>

        <section className="sec" data-stop="1">
            <Panel kicker="Scene 2 · The climate connection" title="Why Is Our Planet Warming?" side="right" num="02">
                <p><strong>The greenhouse effect is natural. Human activities are making it stronger.</strong></p>
                <p>Earth receives energy from the Sun. Some energy is absorbed by the planet, and some is released back toward space as heat. Greenhouse gases, including carbon dioxide and methane, absorb and re-emit some of that outgoing heat. This natural process keeps Earth warm enough for life.</p>
                <p>However, human activities — particularly burning coal, oil, and natural gas — have increased greenhouse gas concentrations in the atmosphere, causing additional warming.</p>
                <p>As temperatures rise:</p>
                <ul>
                    <li>Heat waves generally become more frequent and intense.</li>
                    <li>Higher temperatures increase evaporation and can dry out vegetation.</li>
                    <li>Some regions face longer periods of dangerous fire weather.</li>
                    <li>Human health, ecosystems, and infrastructure face greater risks.</li>
                </ul>
                <p><strong>Key distinction:</strong> Climate change does not directly cause every heat wave or ignite every wildfire. Instead, it changes the conditions that make extreme heat and dangerous fire behavior more likely or more severe.</p>
            </Panel>
        </section>

        <section className="sec" data-stop="2">
            <Panel kicker="Scene 3 · Part I" title="A City Under Heat" num="03">
                <p className="shout">WHEN CITIES BECOME HEAT TRAPS</p>
                <p>Imagine walking through a city on an extremely hot summer afternoon. The road radiates heat. Buildings are warm to the touch. Concrete sidewalks offer little relief from the Sun. Even after sunset, the streets remain unusually warm.</p>
                <p>Why does this happen? Cities are often affected by the <strong>urban heat island effect</strong>. Buildings, asphalt, and other artificial surfaces absorb energy from sunlight and release heat back into their surroundings. Urban development also reduces vegetation, limiting natural shade and cooling.</p>
                <p>According to the U.S. Environmental Protection Agency (EPA), urban areas in the United States are generally about <strong>1–7°F warmer during the day</strong> and <strong>2–5°F warmer at night</strong> than surrounding outlying areas. <sup>[2]</sup></p>
                <p><strong>Why nighttime matters:</strong> When temperatures remain elevated overnight, people and buildings have fewer opportunities to cool down.</p>
            </Panel>
        </section>

        <section className="sec datasec" data-stop="2.6">
            <DataMoment value="116°F" label="Portland International Airport, June 28, 2021 — an all-time record at that location. Even regions known for milder summers can experience dangerous temperatures." source="NOAA / National Weather Service [7]" url="https://forecast.weather.gov/product.php?format=TXT&glossary=1&issuedby=PDX&product=CLA&site=BOI&version=13" />
            <DataMoment value="3×" label="As many average annual heat waves across 50 major U.S. cities: from about 2 per year in the 1960s to 6 per year in the 2020s. The average heat-wave season also became about 46 days longer." source="EPA, Climate Change Indicators 2024 [1]" url="https://www.epa.gov/system/files/documents/2024-09/climate_indicators_2024.pdf" />
            <p className="fineprint">These statistics illustrate long-term trends across the cities studied, not predictions for any individual city.</p>
        </section>

        <section className="sec" data-stop="3">
            <Panel kicker="Scene 4" title="The Human Cost of Extreme Heat" side="right" num="04">
                <p className="shout">HEAT IS MORE THAN DISCOMFORT.</p>
                <p>When exposed to excessive heat, the human body must work harder to maintain a safe internal temperature. Sweating helps the body cool through evaporation, but high humidity can make this process less effective. Prolonged exposure can lead to dehydration, heat exhaustion, and heatstroke. <sup>[5][6]</sup></p>
                <p><strong>Heat exhaustion</strong> can involve heavy sweating, dizziness, headache, nausea, weakness, and muscle cramps.</p>
                <p><strong>Heatstroke is a life-threatening medical emergency.</strong> Warning signs include confusion, altered mental status, loss of consciousness, and dangerously elevated body temperature. If heatstroke is suspected, call 911 and begin cooling the person while awaiting emergency responders.</p>
                <p><strong>Who faces the greatest risks?</strong></p>
                <ul>
                    <li>Older adults and young children</li>
                    <li>People with certain chronic health conditions</li>
                    <li>People who work outdoors</li>
                    <li>People experiencing homelessness</li>
                    <li>People without reliable access to indoor cooling</li>
                    <li>Individuals living in neighborhoods with limited shade and vegetation</li>
                </ul>
                <p>Heat exposure is also an issue of <strong>community equity</strong>. Not all neighborhoods have equal access to tree cover, parks, insulated buildings, affordable electricity, or air conditioning. Cities must consider these differences when creating heat protection plans.</p>
            </Panel>
        </section>

        <section className="sec hasdock" data-stop="4">
            <Panel kicker="Scene 5 · Interactive 1" title="Reimagining a Cooler City" num="05" collapsible>
                <p className="shout">WHAT IF WE COULD REDESIGN OUR CITIES TO FIGHT HEAT?</p>
                <p>Cities can use science-based strategies to make communities cooler and safer. <strong>Use the controls below and watch the city change:</strong></p>
                <p className="dim2">Tap a strategy in the control bar at the bottom of the screen to transform the 3D city and learn the science behind it.</p>
                <p className="concept">Conceptual 3D illustration — it shows the idea, not a measured temperature change. Real results depend on local climate, infrastructure, and ecosystems.</p>
                <p><strong>The takeaway:</strong> The safest city isn't simply the one with the most air conditioners. It is one designed to reduce heat exposure and provide reliable protection to everyone.</p>
            </Panel>
            <DataMoment value="3°F" label="Average cooling difference for urban forests versus non-green urban areas, across an EPA-cited review of 308 studies." source="EPA, Benefits of Trees and Vegetation [3]" url="https://www.epa.gov/heatislands/benefits-trees-and-vegetation" />
        </section>

        <section className="sec" data-stop="5">
            <Panel kicker="Scene 6 · Part II" title="A Forest Under Pressure" num="06">
                <p className="shout">WHEN A SPARK BECOMES A WILDFIRE</p>
                <p>Now leave the city and enter a forest during a hot, dry summer. The soil is dry. Fallen leaves and twigs have lost moisture. Winds begin to strengthen. A spark can ignite vegetation, and under the wrong conditions, a small fire may spread rapidly.</p>
                <p><strong>A fire requires three basic ingredients:</strong></p>
                <ol>
                    <li>Heat or an ignition source</li>
                    <li>Fuel, such as dry grass, brush, or wood</li>
                    <li>Oxygen</li>
                </ol>
                <p>Wildfires can begin from natural causes, including lightning, or human activities such as unattended campfires, equipment, or electrical infrastructure.</p>
                <p><strong>How does climate change affect wildfires?</strong> Climate change can increase wildfire risk by contributing to higher temperatures, drier vegetation, reduced snowpack, and longer fire seasons in many regions. Warm, dry, windy conditions can help fires spread quickly and become difficult to control.</p>
                <p>But climate is only one factor. Fire behavior also depends on weather, terrain, available vegetation, human ignitions, and land-management history.</p>
                <p><strong>Important:</strong> Fire is not always harmful to ecosystems. Many ecosystems evolved with periodic fire, and some plants and habitats depend on it. The challenge is reducing destructive wildfire impacts while maintaining healthy fire-adapted landscapes. <sup>[13]</sup></p>
            </Panel>
        </section>

        <section className="sec hasdock" data-stop="6">
            <Panel kicker="Scene 7 · Interactive 2" title="Building Fire Resilience" side="right" num="07" collapsible>
                <p className="shout">WE CANNOT PREVENT EVERY WILDFIRE. BUT WE CAN REDUCE THE DANGER.</p>
                <p className="dim2">Tap a strategy in the control bar at the bottom of the screen to transform the 3D forest and learn the science behind it.</p>
                <p className="concept">Conceptual 3D illustration — it shows the idea, not a fire-spread prediction or a percentage of homes saved.</p>
                <p><strong>Communities also need</strong> early warnings, evacuation planning, and prevention of avoidable human ignitions — preventing an ignition is often more effective than trying to control a dangerous fire after it starts. <sup>[11]</sup></p>
            </Panel>
        </section>

        <section className="sec" data-stop="7">
            <Panel kicker="Scene 8" title="A Hidden Danger: Wildfire Smoke" num="08">
                <p className="shout">THE FIRE DOESN'T HAVE TO REACH YOU TO AFFECT YOU.</p>
                <p>Wildfire smoke can travel far from the flames. It contains gases and tiny particles, including fine particulate matter known as <strong>PM2.5</strong>. These particles can enter deep into the lungs and worsen breathing and cardiovascular problems. <sup>[12]</sup></p>
                <p>During wildfire smoke events:</p>
                <ul>
                    <li>Check local air quality information.</li>
                    <li>Reduce strenuous outdoor activity when air quality is unhealthy.</li>
                    <li>Keep smoke out of indoor spaces where possible while maintaining safe indoor temperatures.</li>
                    <li>Use properly sized portable air cleaners or compatible high-efficiency HVAC filters.</li>
                    <li>Follow official health guidance and emergency instructions.</li>
                </ul>
                <p><strong>Important connection:</strong> Extreme heat and wildfire smoke can happen at the same time. Closing windows to keep smoke out may make an uncooled home dangerously hot. People may need access to a public facility that offers both cooling and cleaner air.</p>
            </Panel>
        </section>

        <section className="sec hasdock" data-stop="8">
            <Panel kicker="Scene 9 · Interactive 3" title="Explore the Home Ignition Zone" side="right" num="09" collapsible>
                <p>Defensible space means managing vegetation and combustible materials around buildings. <strong>Select each zone</strong> in the control bar below to see what actions reduce ignition risk: <sup>[9]</sup></p>
                <p className="concept">Conceptual 3D illustration — zone distances are representative, not to scale. Exact treatments should follow local guidance, ecological conditions, and property-specific risks.</p>
            </Panel>
        </section>

        <section className="sec hasdock" data-stop="9">
            <Panel kicker="Scene 10" title="Choose the Future" num="10">
                <p className="shout">THE FUTURE IS SHAPED BY THE ACTIONS WE TAKE.</p>
                <p>Imagine two versions of the same community. Switch between them using the control bar below:</p>
                <div className="expl">
                    {future === 0 && <ul>
                        <li>Streets have little shade and absorb heat throughout the day.</li>
                        <li>Residents lack access to safe cooling.</li>
                        <li>Buildings are vulnerable to extreme temperatures.</li>
                        <li>Excess vegetation accumulates near fire-prone homes.</li>
                        <li>Communities are unprepared for evacuation or unhealthy smoke.</li>
                    </ul>}
                    {future === 1 && <ul>
                        <li>Streets offer more shade and accessible green space.</li>
                        <li>Buildings use appropriate cooling strategies.</li>
                        <li>Residents can access cooling centers and heat warnings.</li>
                        <li>Suitable landscapes receive science-based fuel management.</li>
                        <li>Homes have defensible space and improved ignition resistance.</li>
                        <li>Communities have evacuation plans and cleaner-air options.</li>
                    </ul>}
                </div>
                <p>This is not a choice between a perfect future and a disastrous one. Extreme weather and wildfire risk will still exist. But science-based adaptation can reduce exposure, improve preparedness, and protect more people.</p>
            </Panel>
        </section>

        <section className="sec quiz-sec" data-stop="9.5">
            <Quiz />
            <p className="fineprint">Question 1 comes from the project brief. Questions 2–6 were written from the scientific sources listed below to complete the six-question set.</p>
        </section>

        <section className="sec" data-stop="10">
            <Panel kicker="Final scene" title="The Choice Is Ours" side="center">
                <p className="shout">WE SHARE ONE PLANET.</p>
                <p>A changing climate does not mean we are powerless. Research helps us understand the dangers. Planning helps us reduce exposure. Cooperation helps us protect people.</p>
                <p>The choices we make today about energy, infrastructure, forests, buildings, and public health influence how communities experience tomorrow's climate.</p>
                <p><strong>A cooler city. A more resilient landscape. A safer future.</strong> The science is clear enough to act.</p>
                <p><strong>As an individual:</strong> Stay informed, prepare for emergencies, help vulnerable neighbors, and follow local fire-safety guidance.</p>
                <p><strong>As a community:</strong> Support accessible cooling, neighborhood preparedness, and appropriate wildfire mitigation.</p>
                <p><strong>As a decision-maker:</strong> Invest in resilient infrastructure, equitable emergency services, effective forest management, and efforts to reduce greenhouse gas emissions.</p>
                <p>Adaptation protects us from risks we face. Emissions reduction limits how much worse future climate change can become. <strong>We need both.</strong></p>
                <p className="bigq">What will you do to help build a climate-resilient community?</p>
            </Panel>
        </section>

        <section className="sec srcs-sec" data-stop="10">
            <div className="srcs">
                <div className="kicker">Scientific sources</div>
                <ol className="srclist">
                    {SOURCES.map(([n, name, url]) => <li key={n}>
                        <a href={url} target="_blank" rel="noreferrer">[{n}] {name} ↗</a>
                    </li>)}
                </ol>
                <p className="fineprint">The key numerical facts come from the EPA's heat island research and climate indicators, National Weather Service records, and OSU/FEMA wildfire guidance. 3D scenes on this page are conceptual illustrations, not scientific measurements.</p>
                <p className="fineprint">SUS 103 · Group Project Lab · 40 points + possible 3 extra-credit points. Website format requires lab instructor approval; non-slideshow projects can earn 3 extra-credit points with a separate scientific reflection. Host publicly and include the working URL in the reflection PDF.</p>
            </div>
        </section>
        </div>
    </div>;
}
