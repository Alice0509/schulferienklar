import { useEffect, useRef, useState } from "react";
import {
  FIRST_PEEK_MS, HUNT_GOAL, PEEK_VISIBLE_MS, findSafePeek,
  getHomeHuntCopy, nextPeekInterval,
} from "./klaree-home-hunt.js";
import "./klaree-home-hunt.css";

// Avoid obscuring ads, controls, inputs, the site menu and consent elements.
// The cameo is a small button, not a full-screen overlay or a popup.
const OBSTACLE_SELECTOR = [
  'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
  '[role="button"]', '[role="combobox"]', '[role="listbox"]',
  'ins.adsbygoogle', 'iframe', '[data-ad-slot]', '[class*="ad-slot"]',
  '[id*="google_ads"]',
].join(", ");

function viewportObstacles(doc) {
  const viewportHeight = doc.defaultView.innerHeight;
  return [...doc.querySelectorAll(OBSTACLE_SELECTOR)].flatMap((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 ||
        rect.bottom < 0 || rect.top > viewportHeight) return [];
    return [{ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }];
  });
}

export default function KlareeHomeHunt({ locale = "de", preview = false }) {
  const text = getHomeHuntCopy(locale);
  const [found, setFound] = useState(0);
  const [peek, setPeek] = useState(null);
  const [notice, setNotice] = useState("");
  const [hidden, setHidden] = useState(false);
  const [turn, setTurn] = useState(0);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const lastPlacement = useRef(null);
  const immediate = useRef(false);
  const fromClick = useRef(false);
  const keyboardSummon = useRef(false);
  const peekRef = useRef(null);
  const summonRef = useRef(null);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (hidden || found === HUNT_GOAL || !pageVisible) return undefined;

    const summoned = immediate.current;
    const afterClick = fromClick.current;
    immediate.current = false;
    fromClick.current = false;

    // Respect reduced-motion users: they can still summon Klaree manually.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && !summoned) {
      return undefined;
    }

    const first = turn === 0 && found === 0;
    const delay = summoned ? 0
      : first ? (preview ? 300 : FIRST_PEEK_MS)
        : afterClick ? nextPeekInterval()
          : Math.max(3000, nextPeekInterval() - PEEK_VISIBLE_MS);

    let hideTimer;
    const showTimer = window.setTimeout(() => {
      if (document.querySelector("dialog[open], .site-menu")) {
        setTurn((current) => current + 1);
        return;
      }
      const position = findSafePeek({
        width: window.innerWidth,
        height: window.innerHeight,
        obstacles: viewportObstacles(document),
        previousId: lastPlacement.current,
      });
      if (!position) {
        // No safe gap in this viewport; never place Klaree over an ad/control.
        setTurn((current) => current + 1);
        return;
      }
      lastPlacement.current = position.id;
      setPeek(position);
      hideTimer = window.setTimeout(() => {
        if (peekRef.current === document.activeElement) summonRef.current?.focus();
        setPeek(null);
        setTurn((current) => current + 1);
      }, PEEK_VISIBLE_MS);
    }, delay);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hidden, found, pageVisible, preview, turn]);

  useEffect(() => {
    if (!peek || !keyboardSummon.current) return;
    peekRef.current?.focus();
    keyboardSummon.current = false;
  }, [peek]);

  // A user scrolling through holiday data should not be followed by a button.
  useEffect(() => {
    if (!peek) return undefined;
    const onScroll = () => {
      if (peekRef.current === document.activeElement) summonRef.current?.focus();
      setPeek(null);
      setTurn((current) => current + 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [peek]);

  const summon = () => {
    if (hidden || found === HUNT_GOAL || peek) return;
    keyboardSummon.current = true;
    immediate.current = true;
    setPeek(null);
    setTurn((current) => current + 1);
  };

  const discover = () => {
    if (!peek || hidden || found >= HUNT_GOAL) return;
    const next = found + 1;
    if (peekRef.current === document.activeElement) summonRef.current?.focus();
    fromClick.current = true;
    setPeek(null);
    setFound(next);
    setNotice(text.found(next));
  };

  const restart = () => {
    lastPlacement.current = null;
    keyboardSummon.current = false;
    immediate.current = false;
    fromClick.current = false;
    setFound(0);
    setPeek(null);
    setNotice("");
    setTurn(0);
  };

  if (hidden) {
    return (
      <div className="klaree-home-hunt--collapsed">
        <button type="button" onClick={() => { setHidden(false); setTurn((n) => n + 1); }}>
          <img src="/klaree-mascot.webp" alt="" width="27" height="27" />
          {text.resume}
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="klaree-home-hunt" aria-label={text.title}>
        <img className="klaree-home-hunt-avatar" src="/klaree-mascot.webp" alt="" width="48" height="48" />
        <div className="klaree-home-hunt-copy">
          {preview && <span className="klaree-home-hunt-preview">{text.preview}</span>}
          <strong>{text.title}</strong>
          <p>{found === HUNT_GOAL ? text.completed : (notice || text.intro)}</p>
          <div className="klaree-home-hunt-progress">
            <progress value={found} max={HUNT_GOAL} aria-label={text.progress(found)} />
            <span>{text.progress(found)}</span>
          </div>
          <span className="klaree-home-hunt-live" role="status" aria-live="polite" aria-atomic="true">
            {notice}
          </span>
        </div>
        <div className="klaree-home-hunt-actions">
          {found === HUNT_GOAL ? (
            <button type="button" className="klaree-hunt-summon" onClick={restart}>{text.again}</button>
          ) : (
            <button ref={summonRef} type="button" className="klaree-hunt-summon" onClick={summon} aria-disabled={Boolean(peek)}>
              {text.summon}
            </button>
          )}
          <button
            type="button"
            className="klaree-hunt-close"
            aria-label={text.hide}
            title={text.hide}
            onClick={() => { setHidden(true); setPeek(null); }}
          >×</button>
        </div>
      </section>
      {peek && (
        <button
          ref={peekRef}
          type="button"
          className="klaree-home-peek"
          style={{ left: peek.left, top: peek.top }}
          aria-label={text.peek}
          title={text.peek}
          onClick={discover}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              summonRef.current?.focus();
              setPeek(null);
              setTurn((current) => current + 1);
            }
          }}
        >
          <img
            src={found % 3 === 0 ? "/klaree-walk.webp" : found % 3 === 1 ? "/klaree-mascot.webp" : "/klaree-rest.webp"}
            alt=""
            width="85"
            height="85"
            decoding="async"
          />
          <span className="klaree-home-peek-egg" aria-hidden="true" />
          <span className="klaree-home-peek-name">Klaree!</span>
        </button>
      )}
    </>
  );
}
