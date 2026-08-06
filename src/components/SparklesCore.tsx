import type { Container, Engine, ISourceOptions } from "@tsparticles/engine";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, useAnimation } from "motion/react";
import { useCallback, useMemo } from "react";
import { cn } from "../utils/cn";

type ParticlesProps = {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
  opacity?: number;
};

const initParticles = async (engine: Engine) => {
  await loadSlim(engine);
};

const SparklesCore = (props: ParticlesProps) => {
  const {
    id = "tsparticles",
    className,
    background = "transparent",
    minSize = 1,
    maxSize = 3,
    speed = 4,
    particleColor = "#ffffff",
    particleDensity = 120,
    opacity = 1,
  } = props;

  const controls = useAnimation();

  const particlesLoaded = useCallback(
    async (container?: Container) => {
      if (!container) return;
      await controls.start({
        opacity,
        transition: { duration: 1 },
      });
    },
    [controls, opacity],
  );

  const options = useMemo<ISourceOptions>(
    () => ({
      background: {
        color: { value: background },
      },
      fullScreen: {
        enable: false,
        zIndex: 1,
      },
      fpsLimit: 60,
      detectRetina: true,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: "push",
          },
          onHover: {
            enable: false,
            mode: "repulse",
          },
        },
        modes: {
          push: {
            quantity: 4,
          },
          repulse: {
            distance: 200,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: { value: particleColor },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "out" },
          random: false,
          speed: { min: 0.1, max: 1 },
          straight: false,
        },
        number: {
          density: { enable: true, width: 400, height: 400 },
          value: particleDensity,
        },
        opacity: {
          value: { min: 0.1, max: 1 },
          animation: {
            enable: true,
            speed,
            sync: false,
            startValue: "random",
          },
        },
        shape: { type: "circle" },
        size: {
          value: { min: minSize, max: maxSize },
        },
      },
    }),
    [
      background,
      maxSize,
      minSize,
      particleColor,
      particleDensity,
      speed,
    ],
  );

  return (
    <ParticlesProvider init={initParticles}>
      <motion.div animate={controls} className={cn("opacity-0", className)}>
        <Particles
          id={id}
          className="h-full w-full"
          particlesLoaded={particlesLoaded}
          options={options}
        />
      </motion.div>
    </ParticlesProvider>
  );
};

export default SparklesCore;
