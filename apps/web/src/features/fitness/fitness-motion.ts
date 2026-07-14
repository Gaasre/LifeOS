import type { Transition, Variants } from "motion/react";

export const fitnessEase = [0.22, 1, 0.36, 1] as const;

export const fitnessSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.85,
};

export const fitnessMicroSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.62,
};

export const fitnessPageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.32,
      ease: fitnessEase,
      delayChildren: 0.04,
      staggerChildren: 0.055,
    },
  },
};

export const fitnessRise: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.992 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.46, ease: fitnessEase },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: fitnessEase },
  },
};

export const fitnessSectionVariants: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(3px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: fitnessEase },
  },
  exit: {
    opacity: 0,
    y: -5,
    filter: "blur(2px)",
    transition: { duration: 0.18, ease: fitnessEase },
  },
};

export const fitnessViewVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: fitnessEase },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: fitnessEase },
  },
};

export const fitnessStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.025,
      staggerChildren: 0.035,
    },
  },
};

export const fitnessDayVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.992 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: fitnessEase },
  },
};
