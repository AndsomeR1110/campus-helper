/**
 * DEVELOPMENT PREVIEW ONLY — fictional verification images drawn as SVG.
 * Nothing here comes from or goes to the university.
 */
const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  )}`;

/** The fictional characters the preview accepts. */
export const PREVIEW_IMAGE_CODE = "7K3P";

export function previewImage(text = PREVIEW_IMAGE_CODE) {
  const letters = [...text]
    .map(
      (c, i) =>
        `<text x="${18 + i * 30}" y="${36 + (i % 2) * 6}" font-family="monospace" font-size="28" font-weight="700" fill="#3b3550" transform="rotate(${i % 2 ? 8 : -6} ${18 + i * 30} 30)">${c}</text>`,
    )
    .join("");
  return svg(
    `<rect width="160" height="56" fill="#f3f1f8"/><path d="M0 40 C40 10 80 50 160 18" stroke="#b9a7d6" stroke-width="2" fill="none"/>${letters}`,
    160,
    56,
  );
}

/** Where the gap is in the fictional puzzle, as a share of the width. */
export const PREVIEW_GAP = 0.56;
const W = 320;
const H = 160;
const P = 48;

export function previewPuzzle() {
  const gx = Math.round(PREVIEW_GAP * W);
  const gy = 56;
  const background = svg(
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a7dcf2"/><stop offset="1" stop-color="#d9eec4"/></linearGradient></defs>
     <rect width="${W}" height="${H}" fill="url(#g)"/>
     <circle cx="70" cy="50" r="26" fill="#f2b33d" opacity=".8"/>
     <path d="M0 120 Q80 90 160 120 T320 110 V160 H0Z" fill="#a9d38a"/>
     <rect x="${gx}" y="${gy}" width="${P}" height="${P}" rx="8" fill="#1e1b2e" opacity=".45" stroke="#fff" stroke-width="2"/>`,
    W,
    H,
  );
  const piece = svg(
    `<rect x="1" y="1" width="${P - 2}" height="${P - 2}" rx="8" fill="#d2e9e0" stroke="#fff" stroke-width="2"/>`,
    P,
    P,
  );
  return { background, piece, pieceTop: gy / H, pieceWidth: P / W };
}
