import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import poster from "./assets/poster.jpg";
import promoVideo from "./assets/video.mp4";
import linksRaw from "./assets/links.txt?raw";

function extractData(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const allUrls = lines.flatMap((l) => {
    const m = l.match(/https?:\/\/\S+/g);
    return m ? m : [];
  });

  const ticketUrl =
    allUrls.find((u) => u.includes("appmost.ru/city-yakutsk")) ||
    allUrls[0] ||
    "#";

  const phoneMatches = raw.match(/\+?\d[\d\s()-]{7,}\d/g) || [];
  const phones = Array.from(new Set(phoneMatches)).slice(0, 3);

  // Prefer content after "main text:" marker; otherwise keep all non-link lines
  const mainIndex = lines.findIndex((l) => /main\s*text:/i.test(l));
  const contentLines = (
    mainIndex >= 0 ? lines.slice(mainIndex + 1) : lines
  ).filter((l) => !/^https?:\/\//.test(l) && !/https?:\/\//.test(l));

  return { ticketUrl, phones, contentLines };
}

function App() {
  const { ticketUrl, phones, contentLines } = useMemo(
    () => extractData(linksRaw),
    []
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [videoAspect, setVideoAspect] = useState("16 / 9");
  const userPausedRef = useRef(false);
  const autoPauseRef = useRef(false);
  const lastToggleTsRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onIntersect: IntersectionObserverCallback = async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (userPausedRef.current) continue; // respect manual pause
          try {
            video.volume = 0.2;
            video.muted = false;
            await video.play();
          } catch {
            video.muted = true; // fallback: keep autoplay with mute
            if (video.paused) {
              await video.play().catch(() => {});
            }
          }
        } else {
          if (!video.paused) {
            autoPauseRef.current = true;
            video.pause();
          }
        }
      }
    };

    const observer = new IntersectionObserver(onIntersect, { threshold: 0.5 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
      }
      video.volume = 0.2;
    };

    const onUserGesture = () => {
      video.muted = false;
      video.volume = 0.2;
    };

    const onTogglePointerUp = async () => {
      const now = performance.now();
      if (now - lastToggleTsRef.current < 300) return; // dedupe double-fire
      lastToggleTsRef.current = now;
      if (video.paused) {
        userPausedRef.current = false;
        video.muted = false;
        video.volume = 0.2;
        await video.play().catch(() => {});
      } else {
        userPausedRef.current = true;
        video.pause();
      }
    };

    const onPlay = () => {
      userPausedRef.current = false;
    };

    const onPause = () => {
      if (autoPauseRef.current) {
        autoPauseRef.current = false;
        return;
      }
      userPausedRef.current = true;
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    video.setAttribute("controlsList", "nodownload noplaybackrate");
    video.setAttribute("disablePictureInPicture", "");
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("touchstart", onUserGesture);
    video.addEventListener("pointerup", onTogglePointerUp);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("contextmenu", onContextMenu);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("touchstart", onUserGesture);
      video.removeEventListener("pointerup", onTogglePointerUp);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const handleHero: IntersectionObserverCallback = ([entry]) => {
      setShowFloatingCta(!entry.isIntersecting);
    };

    const observer = new IntersectionObserver(handleHero, { threshold: 0.2 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [setShowFloatingCta]);

  return (
    <div className="page">
      <header className="hero" ref={heroRef}>
        <img src={poster} alt="Афиша — Кыым" className="hero__bg" />
        <div className="hero__overlay" />
        <div className="hero__content">
          <h1 className="hero__title">«Кыым» — Эдэр саас 80–90</h1>
          <p className="hero__subtitle">Кытта кыттыһан эдэр сааһы эргитиҥ!</p>
          <div className="hero__cta">
            <a
              className="button button--primary button--lg"
              href={ticketUrl}
              target="_blank"
              rel="noreferrer"
            >
              Билиэттэр
            </a>
            <a className="button" href="#details">
              Ойуулааһын
            </a>
          </div>
        </div>
      </header>

      <main className="content" id="details">
        <section className="section">
          <h2 className="section__title">Тэрээһин туһунан</h2>
          <div className="section__body">
            {contentLines.map((line, idx) => (
              <p key={idx} className="text">
                {line}
              </p>
            ))}
          </div>
        </section>

        <section className="section">
          {/* <h2 className="section__title">Видео</h2> */}
          <div className="video" style={{ aspectRatio: videoAspect }}>
            <video
              className="video__el"
              controls
              preload="metadata"
              muted
              playsInline
              ref={videoRef}
              poster={poster}
            >
              <source src={promoVideo} type="video/mp4" />
              Ваш браузер не поддерживает видео тег.
            </video>
          </div>
        </section>

        <section className="section">
          {/* <h2 className="section__title">Контакты</h2> */}
          <div className="contacts">
            {phones.length > 0 ? (
              phones.map((p) => (
                <a
                  key={p}
                  className="contact"
                  href={`tel:${p.replace(/[^\d+]/g, "")}`}
                >
                  {p}
                </a>
              ))
            ) : (
              <p className="text">Контакты уточняйте по ссылке «Билеты».</p>
            )}
          </div>
        </section>
      </main>

      {/* <footer className="footer">
        <a
          className="button button--primary button--lg"
          href={ticketUrl}
          target="_blank"
          rel="noreferrer"
        >
          Билиэт атыылаһыы
        </a>
      </footer> */}
      {showFloatingCta && (
        <a
          className="floating-cta button button--primary button--lg"
          href={ticketUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Билиэт атыылаһыы"
        >
          Билиэт атыылаһыы
        </a>
      )}
    </div>
  );
}

export default App;
