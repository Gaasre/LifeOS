import {
  BriefcaseBusiness,
  CircleDollarSign,
  CircleDot,
  Folder,
  Heart,
  Home,
  ImageIcon,
  Plane,
  User,
  UsersRound,
} from "lucide-react";

import { ModuleCard } from "@/components/module-card";

const modules = [
  {
    title: "Me",
    description: "Identity, records",
    image: "/images/me.jpg",
    icon: User,
  },
  {
    title: "Family",
    description: "People, occasions",
    image: "/images/family.jpg",
    icon: UsersRound,
  },
  {
    title: "Documents",
    description: "Files, records, archives",
    image: "/images/documents.jpg",
    icon: Folder,
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
  },
  {
    title: "Health",
    description: "Fitness, medical, wellness",
    image: "/images/health.jpg",
    icon: Heart,
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
  },
  {
    title: "Memories",
    description: "Photos, keepsakes, stories",
    image: "/images/memories.jpg",
    icon: ImageIcon,
  },
];

export function App() {
  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <header
          className="flex min-h-11 items-center gap-4 sm:gap-5"
          aria-label="LifeOS"
        >
          <div
            className="grid grid-cols-2 gap-[0.2rem] drop-shadow-[0_0_1rem_rgb(255_255_255_/_0.38)]"
            aria-hidden
          >
            <span className="aspect-square w-3.5 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
            <span className="aspect-square w-3.5 rotate-90 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
            <span className="aspect-square w-3.5 -rotate-90 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
            <span className="aspect-square w-3.5 rotate-180 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
          </div>
          <span className="text-lg tracking-[0.08em] text-muted-foreground sm:text-xl">
            LifeOS
          </span>
        </header>

        <section
          className="mt-12 mb-8 lg:mt-22 lg:pl-32"
          aria-labelledby="home-title"
        >
          <h1
            id="home-title"
            className="m-0 text-[clamp(2rem,2.7vw,2.65rem)] leading-[1.08] font-normal tracking-normal"
          >
            Life, organized.
          </h1>
          <p className="mt-2.5 mb-0 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-snug text-muted-foreground">
            Documents, people, places, plans.
          </p>
        </section>

        <section
          className="grid grid-cols-12 gap-4 lg:pl-32"
          aria-label="LifeOS modules"
        >
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </section>
      </div>
    </main>
  );
}
