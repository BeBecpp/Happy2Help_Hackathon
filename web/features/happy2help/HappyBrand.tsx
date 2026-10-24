/* eslint-disable @next/next/no-img-element */
import type { SVGProps } from "react";

/** Compact wordmark: navy lettering with a sunshine accent. */
export function HappyBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="happy-brand" aria-label="Happy2Help">
      <span className="happy-brand__symbol" aria-hidden="true">
        <img src="/brand/mark.png" alt="" width={36} height={36} />
      </span>
      {!compact && (
        <span className="happy-brand__text">
          Happy<span>2</span>Help
        </span>
      )}
    </span>
  );
}

/**
 * The Happy2Help mascot: the team's original white kitten with a blue scarf.
 * Uses the brand raster (web/public/brand/mascot.png). `pose` selects the
 * framing; the vector fallback (Astra's reconstruction) renders if the image
 * cannot load.
 */
export function HappyKitten({
  pose = "welcome",
  className = "",
  decorative = true,
}: {
  pose?: "welcome" | "listening" | "reassuring";
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span className={`happy-kitten happy-kitten--${pose} ${className}`}>
      <img
        src="/brand/mascot.png"
        alt={decorative ? "" : "Цэнхэр ороолттой цагаан муур мэндчилж байна"}
        aria-hidden={decorative || undefined}
        draggable={false}
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          (img.nextElementSibling as HTMLElement | null)?.style.removeProperty("display");
        }}
      />
      <span style={{ display: "none" }} aria-hidden="true">
        <HappyKittenVector />
      </span>
    </span>
  );
}

/** Vector fallback (Astra reconstruction), used only if the brand raster fails to load. */
export function HappyKittenVector(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 260 280" role="img" {...props}>
      <ellipse cx="130" cy="259" rx="88" ry="13" fill="#DCE8F8" />
      <path d="M68 101 76 23l51 34c9-2 18-2 27 0l46-34 9 78c15 19 21 39 21 63 0 55-43 91-100 91S30 219 30 164c0-24 10-46 38-63Z" fill="#fff" stroke="#0F2D5B" strokeWidth="5" strokeLinejoin="round" />
      <path d="m81 45 4 43-25 17ZM181 45l-5 43 25 17Z" fill="#FFD8DF" />
      <ellipse cx="93" cy="141" rx="5" ry="7" fill="#0F2D5B" />
      <ellipse cx="167" cy="141" rx="5" ry="7" fill="#0F2D5B" />
      <path d="m125 157 5 4 5-4Z" fill="#F4A6B2" />
      <path d="M130 161v6m0 0c-4 5-9 5-13 1m13-1c4 5 9 5 13 1" fill="none" stroke="#0F2D5B" strokeWidth="3" strokeLinecap="round" />
      <path d="M82 201c27-10 69-11 97 0l-7 26c-27 9-58 9-83 0Z" fill="#5B9CFF" stroke="#0F2D5B" strokeWidth="4" />
      <path d="m167 219 27 23-15 16-27-24" fill="#5B9CFF" stroke="#0F2D5B" strokeWidth="4" strokeLinejoin="round" />
      <path d="M99 247c0-12 12-21 26-21h10c14 0 26 9 26 21" fill="#fff" stroke="#0F2D5B" strokeWidth="4" />
    </svg>
  );
}
