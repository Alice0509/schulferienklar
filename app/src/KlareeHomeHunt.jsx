import { useEffect, useRef, useState } from "react";
import {
  FIRST_PEEK_MS, HUNT_GOAL, PEEK_VISIBLE_MS, findSafePeek, intersectsBox,
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

function viewportObstacles(doc, excluded = null) {
  const viewportHeight = doc.defaultView.innerHeight;
  return [...doc.querySelectorAll(OBSTACLE_SELECTOR)].flatMap((el) => {
    if (el === excluded) return [];
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
  // Purely decorative, time-limited celebration after a successful find.
  // The live status announces the discovery; this visual never traps focus.
  const [discovery, setDiscovery] = useState(null);
  const [notice, setNotice] = useState("");
  const [hidden, setHidden] = useState(false);
  const [turn, setTurn] = useState(0);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const lastPlacement = useRef(null);
  const immediate = useRef(false);
  const keyboardSummon = useRef(false);
  const peekRef = useRef(null);
  const summonRef = useRef(null);

  useEffect(() => {
    const onVisibility = () => {
      const isVisible = !document.hidden;
      setPageVisible(isVisible);
      if (!isVisible) {
        // Clear a live peek while the tab is hidden so the resumed tab
        // doesn't keep an un-timed, stale Klaree button on screen.
        setPeek(null);
        setDiscovery(null);
        setTurn((current) => current + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (hidden || found === HUNT_GOAL || !pageVisible || discovery) return undefined;

    const summoned = immediate.current;
    immediate.current = false;

    // Respect reduced-motion users: they can still summon Klaree manually.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && !summoned) {
      return undefined;
    }

    const first = turn === 0 && found === 0;
    // A visit stays visible long enough to discover; the next 15–30s
    // countdown begins AFTER it disappears, not while Klaree is still here.
    const delay = summoned ? 0
      : first ? (preview ? 300 : FIRST_PEEK_MS)
        : nextPeekInterval();

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
  }, [hidden, found, pageVisible, preview, turn, discovery]);

  // Keep the little joy-and-egg moment on screen briefly, then restart
  // the usual 15–30s interval. Clear the timer on dismissal or navigation.
  useEffect(() => {
    if (!discovery) return undefined;
    const timeout = window.setTimeout(() => setDiscovery(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [discovery]);

  useEffect(() => {
    if (!peek || !keyboardSummon.current) return;
    peekRef.current?.focus();
    keyboardSummon.current = false;
  }, [peek]);

  // Scroll used to dismiss Klaree instantly. Instead, let her stay as long
  // as the current viewport spot is safe. Reposition only if a control/ad
  // scrolls beneath her, and skip the peek only when no free space exists.
  useEffect(() => {
    if (!peek) return undefined;
    let frame = null;
    const recheckPlacement = () => {
      frame = null;
      const obstacles = viewportObstacles(document, peekRef.current);
      const tooClose = obstacles.some((obstacle) => intersectsBox(peek, obstacle, 9));
      const outOfView = peek.right > window.innerWidth || peek.bottom > window.innerHeight - 75;
      if (!tooClose && !outOfView) return;
      const replacement = findSafePeek({
        width: window.innerWidth,
        height: window.innerHeight,
        obstacles,
        previousId: peek.id,
      });
      if (replacement) {
        lastPlacement.current = replacement.id;
        setPeek(replacement);
        return;
      }
      // Accessibility and ad protection take priority over an impossible spot.
      if (peekRef.current === document.activeElement) summonRef.current?.focus();
      setPeek(null);
      setTurn((current) => current + 1);
    };
    const onViewportChange = () => {
      if (frame === null) frame = window.requestAnimationFrame(recheckPlacement);
    };
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange);
    return () => {
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [peek]);

  const summon = () => {
    if (hidden || found === HUNT_GOAL || peek || discovery) return;
    keyboardSummon.current = true;
    immediate.current = true;
    setPeek(null);
    setTurn((current) => current + 1);
  };

  const discover = () => {
    if (!peek || hidden || found >= HUNT_GOAL || discovery) return;
    const next = found + 1;
    // Show a tiny thank-you at the same safe spot rather than a modal
    // or a second button covering the calendar.
    setDiscovery({ ...peek, count: next });
    if (peekRef.current === document.activeElement) summonRef.current?.focus();
    setPeek(null);
    setFound(next);
    setNotice(text.found(next));
  };

  const restart = () => {
    lastPlacement.current = null;
    keyboardSummon.current = false;
    immediate.current = false;
    setFound(0);
    setPeek(null);
    setDiscovery(null);
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
            <button ref={summonRef} type="button" className="klaree-hunt-summon" onClick={summon} aria-disabled={Boolean(peek || discovery)}>
              {text.summon}
            </button>
          )}
          <button
            type="button"
            className="klaree-hunt-close"
            aria-label={text.hide}
            title={text.hide}
            onClick={() => { setHidden(true); setPeek(null); setDiscovery(null); }}
          >×</button>
        </div>
      </section>
      {discovery && (
        <div
          className="klaree-home-discovery"
          style={{ left: discovery.left, top: discovery.top }}
          data-egg={discovery.count % 3}
          aria-hidden="true"
        >
          <img
            className="klaree-home-discovery-dog"
            src="/klaree-mascot.webp"
            alt=""
            width="85"
            height="85"
            decoding="async"
          />
          <span className="klaree-home-discovery-egg" />
        </div>
      )}
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
