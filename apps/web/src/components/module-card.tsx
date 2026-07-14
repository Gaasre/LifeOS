import type { ComponentType, SVGProps } from "react";
import { motion, type Variants } from "motion/react";
import { Link } from "react-router-dom";

import { Card } from "@lifeos/ui/components/card";
import { cn } from "@lifeos/ui/lib/utils";

const MotionLink = motion.create(Link);

const moduleCardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.985,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

type ModuleCardProps = {
  title: string;
  description: string;
  image: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href?: string;
  className?: string;
};

export function ModuleCard({
  title,
  description,
  image,
  icon: Icon,
  href,
  className,
}: ModuleCardProps) {
  const card = (
    <Card
      className={cn(
        "relative isolate min-h-49 overflow-hidden rounded-[0.5rem] border border-transparent bg-muted/20 p-0 text-card-foreground shadow-[0_24px_70px_-48px_rgb(0_0_0_/_0.95),inset_0_1px_0_rgb(255_255_255_/_0.035),inset_0_-1px_0_rgb(255_255_255_/_0.018)] ring-1 ring-foreground/[0.025] outline-none transition-[box-shadow,translate] duration-500 ease-out group-hover/module:-translate-y-1.5 group-hover/module:shadow-[0_34px_90px_-46px_rgb(0_0_0_/_1),inset_0_1px_0_rgb(255_255_255_/_0.09),inset_0_0_0_1px_rgb(255_255_255_/_0.09)] group-hover/module:ring-foreground/10 group-focus-visible/module:-translate-y-1.5 group-focus-visible/module:ring-3 group-focus-visible/module:ring-ring/50 xl:min-h-60",
        className,
      )}
    >
      <img
        className="absolute inset-0 z-0 size-full scale-[1.015] object-cover opacity-80 grayscale brightness-[0.62] contrast-[0.98] saturate-0 transition-[opacity,filter,transform] duration-700 ease-out group-hover/module:scale-[1.035] group-hover/module:opacity-95 group-hover/module:grayscale-0 group-hover/module:brightness-100 group-hover/module:saturate-100 group-focus-within/module:scale-[1.035] group-focus-within/module:opacity-95 group-focus-within/module:grayscale-0 group-focus-within/module:brightness-100 group-focus-within/module:saturate-100"
        src={image}
        alt=""
        aria-hidden
      />
      <div
        className="absolute inset-0 z-10 bg-gradient-to-b from-background/64 via-background/42 to-background/78 transition-opacity duration-700 ease-out group-hover/module:opacity-35 group-focus-within/module:opacity-35"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-20 bg-gradient-to-r from-background/76 via-background/26 to-transparent transition-opacity duration-700 ease-out group-hover/module:opacity-[0.42] group-focus-within/module:opacity-[0.42]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 z-20 h-1/2 bg-gradient-to-b from-foreground/8 to-transparent opacity-35 transition-opacity duration-700 ease-out group-hover/module:opacity-55 group-focus-within/module:opacity-55"
        aria-hidden
      />
      <div className="relative z-30 flex min-h-[inherit] flex-col justify-between p-6 sm:p-7">
        <Icon
          className="size-8 text-foreground drop-shadow-[0_0_0.5rem_rgb(0_0_0_/_0.65)]"
          strokeWidth={1.35}
          aria-hidden
        />
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-2xl leading-none font-normal tracking-normal sm:text-[1.65rem]">
            {title}
          </h2>
          <p className="m-0 text-sm leading-snug font-light text-muted-foreground/75">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );

  if (!href) {
    return (
      <motion.div
        className="group/module col-span-12 sm:col-span-6 xl:col-span-3"
        variants={moduleCardVariants}
      >
        {card}
      </motion.div>
    );
  }

  return (
    <MotionLink
      to={href}
      className="group/module col-span-12 rounded-lg outline-none sm:col-span-6 xl:col-span-3"
      variants={moduleCardVariants}
    >
      {card}
    </MotionLink>
  );
}
