import {
  BriefcaseBusiness,
  CircleDollarSign,
  CircleDot,
  Dumbbell,
  Folder,
  Home,
  ImageIcon,
  Plane,
  User,
  UsersRound,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "motion/react";

import { AppHeader } from "@/components/app-header";
import { ModuleCard } from "@/components/module-card";
import { usePerspective } from "@/features/perspectives/perspective-context";

const hubVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const moduleGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.04,
    },
  },
};

const modules = [
  {
    title: "Me",
    description: "Important details, ready when you need them",
    image: "/images/me.jpg",
    icon: User,
    href: "/me",
  },
  {
    title: "Family",
    description: "People, occasions",
    image: "/images/family.jpg",
    icon: UsersRound,
    href: "/family",
  },
  {
    title: "Documents",
    description: "Files, records, archives",
    image: "/images/documents.jpg",
    icon: Folder,
    href: "/documents",
  },
  {
    title: "Home",
    description: "Spaces, contracts, utilities",
    image: "/images/home.jpg",
    icon: Home,
  },
  {
    title: "Money",
    description: "Spending, taxes, accounts",
    image: "/images/money.jpg",
    icon: CircleDollarSign,
    href: "/money",
  },
  {
    title: "Fitness & Nutrition",
    description: "Training, meals, progress",
    image: "/images/fitness-workout-hero.jpg",
    icon: Dumbbell,
    href: "/fitness",
  },
  {
    title: "Work",
    description: "Career, documents, skills",
    image: "/images/work.jpg",
    icon: BriefcaseBusiness,
  },
  {
    title: "Travel",
    description: "Trips, visas, bookings",
    image: "/images/travel.jpg",
    icon: Plane,
  },
  {
    title: "Projects",
    description: "Goals, plans, tasks",
    image: "/images/projects.jpg",
    icon: CircleDot,
    href: "/projects",
  },
  {
    title: "Memories",
    description: "Photos, keepsakes, stories",
    image: "/images/memories.jpg",
    icon: ImageIcon,
  },
];

export function HomePage() {
  const { perspective, viewerPersonId } = usePerspective();
  const personalProfileHref =
    perspective.kind === "person" && perspective.personId !== viewerPersonId
      ? `/people/${perspective.personId}`
      : "/me";

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        className="dark min-h-screen overflow-x-hidden bg-background text-foreground"
        initial="hidden"
        animate="visible"
        variants={hubVariants}
      >
        <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AppHeader />

          <section
            className="mt-12 mb-8 min-w-0 lg:mt-22"
            aria-labelledby="home-title"
          >
            <h1
              id="home-title"
              className="m-0 text-[clamp(2rem,10vw,2.65rem)] leading-[1.08] font-normal tracking-normal sm:text-[clamp(2rem,2.7vw,2.65rem)]"
            >
              Life, organized.
            </h1>
            <p className="mt-2.5 mb-0 max-w-full text-[clamp(1.05rem,4.8vw,1.25rem)] leading-snug text-muted-foreground sm:text-[clamp(1.05rem,1.4vw,1.25rem)]">
              Documents, people, places, plans.
            </p>
          </section>

          <motion.section
            className="grid grid-cols-12 gap-4"
            aria-label="LifeOS modules"
            variants={moduleGridVariants}
          >
            {modules.map((module) => (
              <ModuleCard
                key={module.title}
                {...module}
                {...(module.title === "Me"
                  ? { href: personalProfileHref }
                  : {})}
              />
            ))}
          </motion.section>
        </div>
      </motion.main>
    </MotionConfig>
  );
}
