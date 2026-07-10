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

import { AppHeader } from "@/components/app-header";
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

export function HomePage() {
  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <AppHeader />

        <section
          className="mt-12 mb-8 min-w-0 lg:mt-22 lg:pl-32"
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
