export function LifeOsMark() {
  return (
    <div
      className="grid grid-cols-2 gap-[0.2rem] drop-shadow-[0_0_1rem_rgb(255_255_255_/_0.38)]"
      aria-hidden
    >
      <span className="aspect-square w-3.5 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
      <span className="aspect-square w-3.5 rotate-90 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
      <span className="aspect-square w-3.5 -rotate-90 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
      <span className="aspect-square w-3.5 rotate-180 rounded-[999px_999px_999px_0] bg-gradient-to-br from-foreground/90 to-muted-foreground/80" />
    </div>
  );
}
