import type { SVGProps } from "react";

export function HappyBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="happy-brand" aria-label="Happy2Help">
      <span className="happy-brand__symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path
            d="M20 33.5C12.5 28.3 6 23.7 6 16.8a7.6 7.6 0 0 1 13.1-5.3L20 12.4l.9-.9A7.6 7.6 0 0 1 34 16.8c0 6.9-6.5 11.5-14 16.7Z"
            fill="#5B9CFF"
          />
          <path
            d="m12 10 1-5 4.5 3M28 10l-1-5-4.5 3"
            stroke="#0F2D5B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.5" cy="17.5" r="1" fill="#0F2D5B" />
          <circle cx="23.5" cy="17.5" r="1" fill="#0F2D5B" />
          <path
            d="M18 21c1.2 1 2.8 1 4 0"
            stroke="#0F2D5B"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="happy-brand__text">
          Happy<span>2</span>Help
        </span>
      )}
    </span>
  );
}

/** Original vector mascot: a white kitten with a blue scarf. */
export function HappyKitten({
  className = "",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 260 280"
      role="img"
      aria-label="Цэнхэр ороолттой цагаан муур"
      {...props}
    >
      <ellipse cx="130" cy="259" rx="88" ry="13" fill="#DCE8F8" />
      <path
        d="M68 101 76 23l51 34c9-2 18-2 27 0l46-34 9 78c15 19 21 39 21 63 0 55-43 91-100 91S30 219 30 164c0-24 10-46 38-63Z"
        fill="#fff"
        stroke="#0F2D5B"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="m81 45 4 43-25 17ZM181 45l-5 43 25 17Z" fill="#FFD8DF" />
      <path
        d="M76 184c-13 10-22 27-20 50M184 184c13 10 22 27 20 50"
        fill="none"
        stroke="#0F2D5B"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="93" cy="141" rx="5" ry="7" fill="#0F2D5B" />
      <ellipse cx="167" cy="141" rx="5" ry="7" fill="#0F2D5B" />
      <path d="m125 157 5 4 5-4Z" fill="#F4A6B2" />
      <path
        d="M130 161v6m0 0c-4 5-9 5-13 1m13-1c4 5 9 5 13 1"
        fill="none"
        stroke="#0F2D5B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="m91 164-27-4m27 11-26 4m104-11 27-4m-27 11 26 4"
        stroke="#0F2D5B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="71" cy="154" rx="9" ry="5" fill="#FFE0E4" />
      <ellipse cx="189" cy="154" rx="9" ry="5" fill="#FFE0E4" />
      <path
        d="M82 201c27-10 69-11 97 0l-7 26c-27 9-58 9-83 0Z"
        fill="#5B9CFF"
        stroke="#0F2D5B"
        strokeWidth="4"
      />
      <path
        d="m167 219 27 23-15 16-27-24"
        fill="#5B9CFF"
        stroke="#0F2D5B"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M99 247c0-12 12-21 26-21h10c14 0 26 9 26 21"
        fill="#fff"
        stroke="#0F2D5B"
        strokeWidth="4"
      />
      <path
        d="M79 102c-13-4-28-2-37 7"
        stroke="#0F2D5B"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="m46 102-7 17"
        stroke="#0F2D5B"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
