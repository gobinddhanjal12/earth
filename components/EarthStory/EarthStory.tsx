"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import RealisticEarth, {
  ATMOSPHERE_SHELLS,
  ATMOSPHERE_VIEW_RADIUS,
} from "@/components/RealisticEarth";
import type { EarthVisualState } from "@/components/RealisticEarth";
import styles from "./EarthStory.module.css";

const SCROLL_SPEED_MULTIPLIER = 0.25;
const TOUCH_MOMENTUM_SECONDS = 0.25;

const atmosphereLayers = [
  {
    ...ATMOSPHERE_SHELLS.troposphere,
    name: "Troposphere",
    range: "0—12 km",
    text: "Weather and the air we breathe.",
    side: "left" as const,
    angle: 158,
  },
  {
    ...ATMOSPHERE_SHELLS.stratosphere,
    name: "Stratosphere",
    range: "12—50 km",
    text: "Ozone layer. Blocks UV.",
    side: "right" as const,
    angle: 22,
  },
  {
    ...ATMOSPHERE_SHELLS.mesosphere,
    name: "Mesosphere",
    range: "50—85 km",
    text: "Meteors burn up here.",
    side: "left" as const,
    angle: 178,
  },
  {
    ...ATMOSPHERE_SHELLS.thermosphere,
    name: "Thermosphere",
    range: "85—600 km",
    text: "Auroras. ISS orbit.",
    side: "right" as const,
    angle: -18,
  },
  {
    ...ATMOSPHERE_SHELLS.exosphere,
    name: "Exosphere",
    range: "600—10,000 km",
    text: "Air fades into space.",
    side: "left" as const,
    angle: 208,
  },
];

export default function EarthStory() {
  const storyRef = useRef<HTMLElement>(null);
  const earthRigRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const interiorRef = useRef<HTMLElement>(null);
  const atmosphereRef = useRef<HTMLElement>(null);
  const atmosphereLabelsRef = useRef<HTMLDivElement>(null);
  const earthVisualStateRef = useRef<EarthVisualState>({
    atmosphereProgress: 0,
    cutawayProgress: 0,
    daylightProgress: 0,
    renderVisibility: 1,
  });

  useLayoutEffect(() => {
    const story = storyRef.current;
    const earthRig = earthRigRef.current;
    if (!story || !earthRig) return;

    gsap.registerPlugin(ScrollTrigger);

    const animationContext = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(earthRig, {
          position: "absolute",
          top: "64vh",
          xPercent: -50,
          yPercent: 0,
          scale: 1,
          zIndex: 2,
        });
        gsap.set(`.${styles.progressLine}`, { display: "none" });
        return;
      }

      const scrollNormalizer = ScrollTrigger.normalizeScroll({
        allowNestedScroll: true,
        momentum: TOUCH_MOMENTUM_SECONDS,
        type: "wheel,touch",
        wheelSpeed: SCROLL_SPEED_MULTIPLIER,
      });

      ScrollTrigger.create({
        trigger: story,
        start: "top top",
        end: "bottom bottom",
        onUpdate: ({ progress }) => {
          story.style.setProperty("--scroll-progress", String(progress));
        },
      });

      const responsiveAnimationContext = gsap.matchMedia();
      const buildEarthTimeline = (isMobile: boolean) => {
        const heroSection = heroRef.current;
        const interiorSection = interiorRef.current;
        const atmosphereSection = atmosphereRef.current;
        const finaleSection =
          story.querySelector<HTMLElement>("[data-finale]");
        if (
          !heroSection ||
          !interiorSection ||
          !atmosphereSection ||
          !finaleSection
        ) {
          return;
        }

        const viewportHeight = window.innerHeight;
        const scrollableDistance = Math.max(
          story.scrollHeight - viewportHeight,
          1,
        );
        const getDocumentTop = (element: HTMLElement) =>
          element.getBoundingClientRect().top + window.scrollY;
        const getScrollProgressAt = (
          element: HTMLElement,
          viewportOffset: number,
        ) =>
          gsap.utils.clamp(
            0,
            1,
            (getDocumentTop(element) - viewportHeight * viewportOffset) /
              scrollableDistance,
          );

        const heroEnd = gsap.utils.clamp(
          0.035,
          0.16,
          (getDocumentTop(heroSection) + heroSection.offsetHeight) /
            scrollableDistance,
        );
        const interiorStart = getScrollProgressAt(
          interiorSection,
          isMobile ? 0.9 : 0.92,
        );
        const atmosphereStart = getScrollProgressAt(atmosphereSection, 0.8);
        const interiorEnd = Math.max(
          interiorStart + 0.08,
          atmosphereStart - 0.008,
        );
        const interiorSpan = interiorEnd - interiorStart;
        const atmosphereEnd = Math.max(
          atmosphereStart + 0.025,
          getScrollProgressAt(
            atmosphereSection,
            isMobile ? 0.25 : 0.22,
          ),
        );
        const atmosphereHeading = atmosphereSection.querySelector<HTMLElement>(
          "[data-atmosphere-header]",
        );
        const labelsStart = atmosphereHeading
          ? Math.max(
              atmosphereEnd + 0.008,
              gsap.utils.clamp(
                0,
                1,
                (getDocumentTop(atmosphereHeading) +
                  atmosphereHeading.offsetHeight -
                  viewportHeight * 0.16) /
                  scrollableDistance,
              ),
            )
          : atmosphereEnd + 0.02;
        const finaleStart = getScrollProgressAt(finaleSection, 0.65);
        const finaleEnd = Math.max(
          finaleStart + 0.02,
          getScrollProgressAt(finaleSection, 0.1),
        );

        earthVisualStateRef.current.atmosphereProgress = 0;
        earthVisualStateRef.current.cutawayProgress = 0;
        earthVisualStateRef.current.daylightProgress = 0;
        earthVisualStateRef.current.renderVisibility = 1;
        gsap.set("[data-interior-copy]", {
          autoAlpha: 0,
          y: isMobile ? 30 : 42,
        });
        if (atmosphereLabelsRef.current) {
          gsap.set(atmosphereLabelsRef.current, { autoAlpha: 0 });
        }
        gsap.set(earthRig, {
          autoAlpha: 1,
          top: isMobile ? "69%" : "64%",
          xPercent: -50,
          yPercent: 0,
          scale: 1,
          zIndex: 2,
        });

        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: story,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.45,
          },
        });

        // This keeps the timeline exactly one unit long, so every keyframe is
        // controlled by one scroll position in both directions.
        timeline.to({}, { duration: 1 }, 0);
        timeline.set(earthRig, { zIndex: 6 }, Math.min(heroEnd * 0.02, 0.002));
        timeline.to(
          "[data-hero-copy]",
          { yPercent: -45, opacity: 0, duration: heroEnd },
          0,
        );
        timeline.to(
          earthRig,
          {
            top: "50%",
            xPercent: isMobile ? -50 : -5,
            yPercent: -50,
            scale: isMobile ? 0.68 : 0.54,
            duration: heroEnd,
            ease: "power2.inOut",
          },
          0,
        );

        timeline.to(
          earthVisualStateRef.current,
          {
            daylightProgress: 1,
            duration: interiorSpan * 0.3,
            ease: "power1.inOut",
          },
          interiorStart,
        );
        timeline.to(
          earthRig,
          {
            top: "50%",
            xPercent: isMobile ? -50 : -82,
            yPercent: -50,
            scale: isMobile ? 0.62 : 0.72,
            duration: interiorSpan * 0.38,
            ease: "power2.inOut",
          },
          interiorStart,
        );
        timeline.to(
          earthVisualStateRef.current,
          {
            cutawayProgress: 1,
            duration: interiorSpan * 0.28,
            ease: "power1.inOut",
          },
          interiorStart + interiorSpan * 0.12,
        );
        timeline.to(
          "[data-interior-copy]",
          {
            autoAlpha: 1,
            y: 0,
            duration: interiorSpan * 0.12,
            ease: "power2.out",
          },
          interiorStart + interiorSpan * 0.32,
        );
        const atmosphereSpan = atmosphereEnd - atmosphereStart;
        timeline.to(
          earthVisualStateRef.current,
          {
            cutawayProgress: 0,
            daylightProgress: 0,
            duration: atmosphereSpan * 0.42,
            ease: "power1.inOut",
          },
          atmosphereStart,
        );
        timeline.to(
          earthVisualStateRef.current,
          {
            atmosphereProgress: 1,
            duration: atmosphereSpan * 0.72,
            ease: "power1.inOut",
          },
          atmosphereStart + atmosphereSpan * 0.22,
        );
        timeline.to(
          earthRig,
          {
            top: "50%",
            xPercent: -50,
            yPercent: -50,
            scale: isMobile ? 0.62 : 0.7,
            duration: atmosphereEnd - atmosphereStart,
            ease: "power2.inOut",
          },
          atmosphereStart,
        );
        if (atmosphereLabelsRef.current) {
          timeline.fromTo(
            atmosphereLabelsRef.current,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: 0.035,
              ease: "power1.out",
            },
            labelsStart,
          );
          timeline.to(
            atmosphereLabelsRef.current,
            {
              autoAlpha: 0,
              duration: finaleEnd - finaleStart,
              ease: "power1.in",
            },
            finaleStart,
          );
        }
        timeline.to(
          earthRig,
          {
            autoAlpha: 0,
            scale: 0.42,
            duration: finaleEnd - finaleStart,
            ease: "power2.in",
          },
          finaleStart,
        );
        timeline.to(
          earthVisualStateRef.current,
          {
            renderVisibility: 0,
            duration: finaleEnd - finaleStart,
            ease: "power2.in",
          },
          finaleStart,
        );
      };

      responsiveAnimationContext.add("(min-width: 768px)", () =>
        buildEarthTimeline(false),
      );
      responsiveAnimationContext.add("(max-width: 767px)", () =>
        buildEarthTimeline(true),
      );

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      let resizeTimerId: number | undefined;
      let contextDisposed = false;
      const rebuildResponsiveTimeline = () => {
        window.clearTimeout(resizeTimerId);
        resizeTimerId = window.setTimeout(() => {
          if (!contextDisposed) {
            gsap.matchMediaRefresh();
            ScrollTrigger.refresh();
          }
        }, 150);
      };

      window.addEventListener("resize", rebuildResponsiveTimeline);
      void document.fonts.ready.then(() => {
        if (!contextDisposed) {
          gsap.matchMediaRefresh();
          ScrollTrigger.refresh();
        }
      });

      return () => {
        contextDisposed = true;
        window.clearTimeout(resizeTimerId);
        window.removeEventListener("resize", rebuildResponsiveTimeline);
        scrollNormalizer?.kill();
        responsiveAnimationContext.revert();
      };
    }, story);

    return () => animationContext.revert();
  }, []);

  const scrollToPageStart = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <main id="top" ref={storyRef} className={styles.story}>
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.progressLine} aria-hidden="true" />

      <div ref={earthRigRef} className={styles.earthRig}>
        <div className={styles.earthGlow} aria-hidden="true" />
        <RealisticEarth
          className={styles.earth}
          enableControls
          enableZoom={false}
          rotationSpeed={0.035}
          showStars
          visualStateRef={earthVisualStateRef}
        />
      </div>
      <div
        ref={atmosphereLabelsRef}
        className={styles.atmosphereLabels}
        aria-label="Atmosphere layer markers"
      >
        <div className={styles.atmosphereOrbit}>
          {atmosphereLayers.map((layer) => (
            <div
              key={layer.name}
              className={styles.atmosphereMarker}
              data-side={layer.side}
              style={{
                "--layer-color": layer.color,
                "--angle": `${layer.angle}deg`,
                "--radius-ratio": String(
                  layer.radius / ATMOSPHERE_VIEW_RADIUS,
                ),
              } as React.CSSProperties}
            >
                <i className={styles.markerArm} aria-hidden="true" />
                <span className={styles.markerLabel}>
                  <strong>{layer.name}</strong>
                  <small>{layer.range}</small>
                  <em>{layer.text}</em>
                </span>
              </div>
          ))}
        </div>
      </div>

      <section ref={heroRef} className={styles.hero}>
        <div data-hero-copy className={styles.heroCopy}>
          <p className={styles.eyebrow}>A portrait of our living world</p>
          <h1>
            <span>The Living</span>
            Planet
          </h1>
          <p className={styles.heroSubtitle}>
            A journey from the oceans under sunlight to the hidden core below
            our feet—and the thin atmosphere that makes life possible.
          </p>
        </div>
        <div className={styles.scrollCue}>
          <span>Scroll to begin</span>
          <i aria-hidden="true" />
        </div>
      </section>

      <section className={styles.surfaceStory}>
        <div className={styles.sectionIntro} data-reveal>
          <p className={styles.chapter}>01 · The surface</p>
          <h2>One world.<br />Endless motion.</h2>
          <p>
            Earth looks calm from far away. Up close, it is an active system:
            water circulates, continents drift, winds cross oceans, and life
            reshapes the air.
          </p>
        </div>

        <article className={styles.storyCard} data-reveal>
          <span className={styles.cardNumber}>01</span>
          <p className={styles.cardLabel}>The blue planet</p>
          <h3>Water connects every living system.</h3>
          <p>
            Oceans cover about 71% of the surface. They move heat around the
            planet, feed the water cycle, and hold most of Earth’s living space.
          </p>
          <strong>1.386 billion km³</strong>
          <small>estimated water on Earth</small>
        </article>

        <article className={styles.storyCard} data-reveal>
          <span className={styles.cardNumber}>02</span>
          <p className={styles.cardLabel}>A moving shell</p>
          <h3>The ground beneath us never truly stops.</h3>
          <p>
            Earth’s outer shell is split into slowly moving tectonic plates.
            Their motion raises mountains, opens oceans, and causes earthquakes.
          </p>
          <strong>2—10 cm</strong>
          <small>typical plate movement each year</small>
        </article>

        <article className={styles.storyCard} data-reveal>
          <span className={styles.cardNumber}>03</span>
          <p className={styles.cardLabel}>A protective field</p>
          <h3>An invisible shield reaches far into space.</h3>
          <p>
            Motion in the liquid iron outer core creates Earth’s magnetic
            field. It helps deflect charged particles arriving from the Sun.
          </p>
          <strong>4.54 billion</strong>
          <small>years since Earth formed</small>
        </article>
      </section>

      <section ref={interiorRef} className={styles.interior}>
        <div className={styles.interiorCopy} data-interior-copy>
          <p className={styles.chapter}>02 · Inside the same planet</p>
          <h2>Four layers.<br />One moving system.</h2>
          <p>
            The globe opens into a live 3D cutaway as you scroll. Below the thin
            crust sits a deep mantle, a moving liquid-metal outer core, and a
            solid inner core nearly as hot as the Sun’s surface.
          </p>

          <div className={styles.layerLegend}>
            <span><i className={styles.crust} />Crust · 5—70 km</span>
            <span><i className={styles.mantle} />Mantle · 2,900 km</span>
            <span><i className={styles.outerCore} />Outer core · liquid iron</span>
            <span><i className={styles.innerCore} />Inner core · solid iron</span>
          </div>
          <p className={styles.liveCutaway}>
            Live Three.js cutaway · drag to inspect
          </p>
        </div>
      </section>

      <section ref={atmosphereRef} className={styles.atmosphere}>
        <div
          className={styles.atmosphereHeader}
          data-atmosphere-header
          data-reveal
        >
          <p className={styles.chapter}>03 · The atmosphere</p>
          <h2>Five layers. One thin shelter.</h2>
        </div>
      </section>

      <section className={styles.finale} data-finale>
        <div data-reveal>
          <p className={styles.eyebrow}>One known home</p>
          <h2>Everything we know<br />began here.</h2>
          <p>
            A small world around an ordinary star—made extraordinary by oceans,
            atmosphere, motion, and life.
          </p>
          <a href="#top" onClick={scrollToPageStart}>
            Return to Earth
            <span aria-hidden="true">↑</span>
          </a>
        </div>
      </section>
    </main>
  );
}
