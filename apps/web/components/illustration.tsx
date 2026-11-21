import { cx } from "@carepath/ui";
import {
  ILLUSTRATION_CAPTION,
  ILLUSTRATION_HEIGHT,
  ILLUSTRATION_WIDTH,
  smallVariant,
  type Illustration as IllustrationData,
} from "../lib/illustrations";

/** Body-area pictures are tight crops: only ever drawn as a tile of 64 px or less (DR-004 U9). */
export const isAreaPicture = (path: string): boolean => /\/area-[^/]+\.webp$/.test(path);

/**
 * An exercise or body-area picture with its mandatory caption. Explicit width and height reserve the
 * space, so nothing shifts; the first picture on a screen passes `priority` and loads at once, the rest
 * load lazily. Both sizes are offered through srcSet. The files have true alpha, so the picture sits on a
 * `surface-sunken` tile (radius 10, no border), DR-001 section 9. A body-area picture (`area-*`) is
 * always a 64 px tile with the caption beside it, whatever the caller asks for (DR-004 U9).
 */
export function IllustrationFigure({
  illustration,
  priority = false,
  className,
}: {
  illustration: IllustrationData;
  priority?: boolean;
  className?: string;
}) {
  if (isAreaPicture(illustration.path)) {
    return (
      <figure className={cx("flex items-center gap-3", className)}>
        <img
          src={smallVariant(illustration.path)}
          alt={illustration.alt}
          width={64}
          height={48}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-12 w-16 shrink-0 rounded-control bg-surface-sunken object-cover"
        />
        <figcaption className="text-small text-ink-muted">{ILLUSTRATION_CAPTION}</figcaption>
      </figure>
    );
  }
  return (
    <figure className={cx("flex w-full max-w-xs flex-col gap-1.5", className)}>
      {/* A static file under /public: the next/image optimiser would add a service and a dependency. */}
      <img
        src={illustration.path}
        srcSet={`${smallVariant(illustration.path)} 480w, ${illustration.path} 960w`}
        sizes="(min-width: 640px) 320px, 80vw"
        alt={illustration.alt}
        width={ILLUSTRATION_WIDTH}
        height={ILLUSTRATION_HEIGHT}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-auto w-full rounded-container bg-surface-sunken"
      />
      <figcaption className="text-small text-ink-muted">{ILLUSTRATION_CAPTION}</figcaption>
    </figure>
  );
}

/**
 * A quiet picture for an empty or finished state. It is decoration: empty alt text, no caption, never
 * the only carrier of meaning (the heading and text beside it say everything).
 */
export function MomentImage({ path, className }: { path: string; className?: string }) {
  return (
    <img
      src={path}
      srcSet={`${smallVariant(path)} 480w, ${path} 960w`}
      sizes="(min-width: 640px) 320px, 80vw"
      alt=""
      width={ILLUSTRATION_WIDTH}
      height={ILLUSTRATION_HEIGHT}
      loading="lazy"
      decoding="async"
      className={cx("h-auto w-full max-w-xs", className)}
    />
  );
}
