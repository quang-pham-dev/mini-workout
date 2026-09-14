import { ArrowLeft, Compass, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101826] text-[#EDE6D6]">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
        aria-hidden="true"
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24 lg:flex-row lg:items-center lg:gap-20 lg:px-12">
        <div className="max-w-xl">
          <div className="flex items-center font-serif text-[7rem] font-medium leading-none tracking-tight sm:text-[9rem]">
            <span>4</span>
            <Compass
              className="mx-1 h-[0.62em] w-[0.62em] shrink-0 text-[#D2572B]"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            <span>4</span>
          </div>

          <h1 className="mt-6 font-serif text-3xl font-medium text-[#EDE6D6] sm:text-4xl">
            Off the map
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-[#8AA0B8]">
            The page you were headed to isn&apos;t here. It may have moved, been
            renamed, or never existed at this address.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 border-b border-[#D2572B] pb-1 text-sm font-medium text-[#EDE6D6] transition-colors hover:border-[#EDE6D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2572B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101826]"
            >
              <ArrowLeft
                className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                strokeWidth={1.75}
              />
              Back to known territory
            </Link>

            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-sm text-[#8AA0B8] transition-colors hover:text-[#EDE6D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2572B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101826]"
            >
              <Search className="h-4 w-4" strokeWidth={1.75} />
              Search instead
            </Link>
          </div>
        </div>

        <div className="mt-20 flex justify-center lg:mt-0 lg:flex-1">
          <svg
            viewBox="0 0 480 480"
            className="h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
            aria-hidden="true"
          >
            <path
              d="M 205 300 C 250 260, 270 220, 300 190"
              fill="none"
              stroke="#8AA0B8"
              strokeWidth="1.5"
              strokeDasharray="1 10"
              strokeLinecap="round"
              opacity="0.35"
            />

            <path
              d="M 45 445 C 90 420, 120 380, 140 350 C 155 328, 175 315, 205 300"
              fill="none"
              stroke="#B08D57"
              strokeWidth="2"
              strokeDasharray="1 9"
              strokeLinecap="round"
            />

            <g stroke="#D2572B" strokeWidth="2.5" strokeLinecap="round">
              <line x1="197" y1="292" x2="213" y2="308" />
              <line x1="213" y1="292" x2="197" y2="308" />
            </g>
            <text
              x="150"
              y="335"
              className="font-mono"
              fontSize="9"
              fill="#8AA0B8"
              letterSpacing="0.5"
            >
              trail ends here
            </text>

            <g transform="translate(320,160)">
              <circle r="92" fill="none" stroke="#3A4A5E" strokeWidth="1.5" />
              <circle r="70" fill="none" stroke="#3A4A5E" strokeWidth="1" />

              {[0, 90, 180, 270].map((deg) => (
                <line
                  key={deg}
                  x1="0"
                  y1="-92"
                  x2="0"
                  y2="-82"
                  stroke="#B08D57"
                  strokeWidth="2"
                  transform={`rotate(${deg})`}
                />
              ))}
              {[45, 135, 225, 315].map((deg) => (
                <line
                  key={deg}
                  x1="0"
                  y1="-92"
                  x2="0"
                  y2="-86"
                  stroke="#3A4A5E"
                  strokeWidth="1.5"
                  transform={`rotate(${deg})`}
                />
              ))}

              {/* needle */}
              <g
                style={{ transformOrigin: '0px 0px' }}
                className="origin-center animate-[settle_1.4s_ease-out_1]"
              >
                <polygon points="0,-58 10,0 0,10 -10,0" fill="#D2572B" />
                <polygon points="0,58 10,0 0,-10 -10,0" fill="#EDE6D6" />
              </g>
              <circle r="6" fill="#101826" stroke="#EDE6D6" strokeWidth="1.5" />

              <text
                x="0"
                y="-100"
                textAnchor="middle"
                className="font-mono"
                fontSize="10"
                fill="#8AA0B8"
              >
                N
              </text>
              <text
                x="0"
                y="112"
                textAnchor="middle"
                className="font-mono"
                fontSize="10"
                fill="#8AA0B8"
              >
                S
              </text>
              <text
                x="-105"
                y="4"
                textAnchor="middle"
                className="font-mono"
                fontSize="10"
                fill="#8AA0B8"
              >
                W
              </text>
              <text
                x="105"
                y="4"
                textAnchor="middle"
                className="font-mono"
                fontSize="10"
                fill="#8AA0B8"
              >
                E
              </text>
            </g>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes settle {
          0%   { transform: rotate(-35deg); }
          60%  { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[settle_1\\.4s_ease-out_1\\] { animation: none; }
        }
      `}</style>
    </main>
  );
}
