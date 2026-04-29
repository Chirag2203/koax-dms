/**
 * Porsche 911 — design-quality multi-layer SVG silhouette.
 *
 * L35 (locked): 5 base cars in P3.1. All inline SVG with multi-gradient body,
 *   glass layer, glow lights, ground reflection.
 * L46: Upgraded to design-quality silhouettes with model-accurate light
 *   signatures, wheel designs, body line creases, and refined gradients.
 *
 * Distinctive traits: continuous sloping roofline merging into engine lid,
 * integrated rear wing flush with lid, wide rear haunches (air-cooled haunches
 * even on 992), round headlights with DRL ring, tight greenhouse, no B-pillar.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §24.1, §26 (L46)
 */

const W = 1920;
const H = 1080;
const preamble = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
const end = `</svg>`;

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

export const PORSCHE_911_SVG = svgDataUri(`${preamble}
<defs>
  <!-- Body metallic gradient — silver/grey base for CSS hue-rotate paint filter -->
  <linearGradient id="p911-body" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#c8cdd6" stop-opacity="0.98"/>
    <stop offset="18%"  stop-color="#8e9aaa" stop-opacity="1"/>
    <stop offset="45%"  stop-color="#5c6578" stop-opacity="1"/>
    <stop offset="72%"  stop-color="#3a4155" stop-opacity="1"/>
    <stop offset="88%"  stop-color="#252d3d" stop-opacity="1"/>
    <stop offset="100%" stop-color="#141b28" stop-opacity="1"/>
  </linearGradient>
  <!-- Upper highlight sheen — specular reflection on roof -->
  <linearGradient id="p911-sheen" x1="22%" y1="0%" x2="78%" y2="100%">
    <stop offset="0%"   stop-color="#e8ecf2" stop-opacity="0.22"/>
    <stop offset="30%"  stop-color="#b0bac8" stop-opacity="0.12"/>
    <stop offset="65%"  stop-color="#8090a8" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="#141b28" stop-opacity="0"/>
  </linearGradient>
  <!-- Hood / front section gradient — slightly lighter than body -->
  <linearGradient id="p911-hood" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#bcc4d0" stop-opacity="0.95"/>
    <stop offset="40%"  stop-color="#7a8698" stop-opacity="1"/>
    <stop offset="80%"  stop-color="#4a5468" stop-opacity="1"/>
    <stop offset="100%" stop-color="#2e3648" stop-opacity="1"/>
  </linearGradient>
  <!-- Side skirt / lower body — darker to create visual depth -->
  <linearGradient id="p911-skirt" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#3a4155" stop-opacity="1"/>
    <stop offset="60%"  stop-color="#1e2535" stop-opacity="1"/>
    <stop offset="100%" stop-color="#0d1220" stop-opacity="1"/>
  </linearGradient>
  <!-- Glass gradient — blue-grey tinted -->
  <linearGradient id="p911-glass" x1="0%" y1="0%" x2="10%" y2="100%">
    <stop offset="0%"   stop-color="#a8c4e8" stop-opacity="0.38"/>
    <stop offset="40%"  stop-color="#4a7ab5" stop-opacity="0.22"/>
    <stop offset="75%"  stop-color="#1a3a60" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="#060e1a" stop-opacity="0.70"/>
  </linearGradient>
  <!-- Rear window glass -->
  <linearGradient id="p911-rglass" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#7ab0d8" stop-opacity="0.30"/>
    <stop offset="100%" stop-color="#060e1a" stop-opacity="0.62"/>
  </linearGradient>
  <!-- Front wheel radial gradient -->
  <radialGradient id="p911-wheel-f" cx="38%" cy="32%" r="62%">
    <stop offset="0%"   stop-color="#8090a0"/>
    <stop offset="35%"  stop-color="#5a6878"/>
    <stop offset="68%"  stop-color="#323e4e"/>
    <stop offset="100%" stop-color="#0e141e"/>
  </radialGradient>
  <!-- Rear wheel radial gradient -->
  <radialGradient id="p911-wheel-r" cx="38%" cy="32%" r="62%">
    <stop offset="0%"   stop-color="#8090a0"/>
    <stop offset="35%"  stop-color="#5a6878"/>
    <stop offset="68%"  stop-color="#323e4e"/>
    <stop offset="100%" stop-color="#0e141e"/>
  </radialGradient>
  <!-- Brake disc caliper gradient -->
  <radialGradient id="p911-caliper-f" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#c0310a"/>
    <stop offset="100%" stop-color="#7a1e04"/>
  </radialGradient>
  <!-- Ground shadow gradient -->
  <radialGradient id="p911-shadow" cx="50%" cy="30%" r="50%">
    <stop offset="0%"   stop-color="#000000" stop-opacity="0.62"/>
    <stop offset="70%"  stop-color="#000000" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <!-- Headlight glow -->
  <filter id="p911-glow-front" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="7" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Taillight glow -->
  <filter id="p911-glow-rear" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Wheel arch inner shadow -->
  <filter id="p911-arch-shadow" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="4" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Paintable body region — feColorMatrix paint target (L36) -->
  <filter id="p911-paint" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="painted"/>
  </filter>
</defs>

<!-- Ground shadow — soft wide ellipse under car -->
<ellipse cx="940" cy="840" rx="700" ry="28" fill="url(#p911-shadow)"/>

<!-- ── LOWER BODY / SILL ── -->
<!-- Rocker sill — lowest body panel, darkest gradient -->
<path d="M342,720 L355,698 L385,682 L462,666 L570,654 L720,644 L900,638 L1090,638 L1255,643 L1358,654 L1432,668 L1480,686 L1510,704 L1520,720 Z"
      fill="url(#p911-skirt)" data-paintable="false"/>

<!-- ── MAIN BODY SHELL ── paintable, hue-rotate filter target -->
<!-- Lower body outer shell -->
<path d="M328,730 L342,720 L355,698 L385,682 L462,666 L570,654 L720,644 L900,638 L1090,638 L1255,643 L1358,654 L1432,668 L1480,686 L1510,704 L1520,720 L1530,730 Z"
      fill="url(#p911-body)" filter="url(#p911-paint)" data-paintable="true"/>

<!-- Upper body — 911 continuous sloping roofline, no B-pillar break -->
<!-- Greenhouse + body side as one unified path -->
<path d="M570,654 L590,535 L622,472 L688,428 L804,400 L946,390 L1062,392 L1148,404 L1212,432 L1262,478 L1295,540 L1320,610 L1310,640 L1258,648 L1090,638 L900,638 L720,644 Z"
      fill="url(#p911-body)" filter="url(#p911-paint)" data-paintable="true"/>

<!-- Roof sheen — specular highlight on top surface -->
<path d="M628,472 L705,428 L838,402 L980,393 L1100,396 L1188,418 L1230,456 L1212,432 L1148,404 L1062,392 L804,400 L688,428 Z"
      fill="url(#p911-sheen)" pointer-events="none"/>

<!-- ── FRONT LID (frunk) — 911 has front luggage compartment -->
<path d="M385,682 L395,658 L430,644 L480,636 L520,630 L545,628 L570,654 L462,666 Z"
      fill="url(#p911-hood)" filter="url(#p911-paint)" data-paintable="true"/>
<!-- Front lid crease / shut line -->
<path d="M396,657 Q465,644 545,630"
      fill="none" stroke="#9ab0c8" stroke-width="1.5" opacity="0.45"/>

<!-- ── REAR ENGINE LID — continuous slope into haunches -->
<path d="M1295,540 L1330,538 L1372,545 L1415,558 L1450,578 L1475,605 L1488,635 L1480,668 L1432,668 L1358,654 L1320,610 Z"
      fill="url(#p911-body)" filter="url(#p911-paint)" data-paintable="true"/>
<!-- Rear haunch crease (air intake outline) -->
<path d="M1385,562 Q1440,575 1470,605"
      fill="none" stroke="#9ab0c8" stroke-width="2" opacity="0.35"/>

<!-- Integrated rear wing (Carrera S flush spoiler) -->
<path d="M1318,528 L1420,528 L1432,540 L1422,550 L1318,550 L1306,540 Z"
      fill="#1a2030" stroke="#2e3d50" stroke-width="1.5"/>
<path d="M1318,528 L1420,528 L1432,540" fill="none" stroke="#5a6878" stroke-width="1" opacity="0.5"/>
<line x1="1335" y1="550" x2="1335" y2="578" stroke="#2e3d50" stroke-width="3.5" stroke-linecap="round"/>
<line x1="1393" y1="550" x2="1393" y2="578" stroke="#2e3d50" stroke-width="3.5" stroke-linecap="round"/>

<!-- ── BODY LINES / CHARACTER CREASES ── -->
<!-- Main shoulder blade (runs along entire door length) -->
<path d="M400,686 Q620,665 900,658 Q1140,654 1360,660"
      fill="none" stroke="#a0b4c8" stroke-width="2" opacity="0.32"/>
<!-- Lower door crease (below door handle height) -->
<path d="M426,700 Q680,684 960,680 Q1180,678 1390,682"
      fill="none" stroke="#7a90a8" stroke-width="1.5" opacity="0.22"/>
<!-- Door shut lines (front + rear door boundary) -->
<line x1="748" y1="640" x2="745" y2="726" stroke="#8090a8" stroke-width="1.5" opacity="0.28"/>
<line x1="1108" y1="638" x2="1106" y2="720" stroke="#8090a8" stroke-width="1.5" opacity="0.28"/>

<!-- ── FENDER FLARES — subtle path over wheel arches -->
<!-- Front fender flare -->
<path d="M396,666 Q424,640 470,636 Q522,634 565,650 L570,654 L462,666 Z"
      fill="url(#p911-body)" filter="url(#p911-paint)" data-paintable="true" opacity="0.6"/>
<path d="M398,666 Q428,641 472,637 Q524,635 566,650"
      fill="none" stroke="#c0d0e0" stroke-width="1.5" opacity="0.38"/>
<!-- Rear fender flare (wide 911 haunches) -->
<path d="M1256,648 Q1300,634 1358,636 Q1412,640 1452,658 L1432,668 L1358,654 Z"
      fill="url(#p911-body)" filter="url(#p911-paint)" data-paintable="true" opacity="0.7"/>
<path d="M1258,648 Q1302,635 1360,637 Q1416,641 1454,660"
      fill="none" stroke="#c0d0e0" stroke-width="1.5" opacity="0.38"/>

<!-- ── SIDE SKIRTS — distinct darker panel between wheel arches -->
<path d="M562,654 L562,720 L580,726 L1096,726 L1115,720 L1115,650 L900,644 L720,644 Z"
      fill="url(#p911-skirt)" opacity="0.75"/>
<!-- Skirt upper edge highlight -->
<line x1="562" y1="656" x2="1115" y2="652" stroke="#7a8fa8" stroke-width="1" opacity="0.3"/>

<!-- ── GLASS ── -->
<!-- Windscreen — 911 very steep rake, deeply integrated into body -->
<path d="M592,534 L624,472 L700,430 L905,412 L1052,413 L1092,472 L1066,534 L845,548 Z"
      fill="url(#p911-glass)" opacity="0.88"/>
<!-- Windscreen frame / A-pillar edges -->
<path d="M592,534 L624,472 L700,430 L905,412 L1052,413 L1092,472 L1066,534"
      fill="none" stroke="#2a3548" stroke-width="3" opacity="0.9"/>
<!-- Windscreen inner reflection highlight -->
<path d="M645,472 L714,432 L870,415 L1020,416 L1050,458 L680,475 Z"
      fill="white" opacity="0.06" pointer-events="none"/>

<!-- Rear window (engine lid glass, 911-style small rear screen) -->
<path d="M1212,432 L1262,478 L1232,490 L1186,448 Z"
      fill="url(#p911-rglass)" opacity="0.80"/>
<path d="M1212,432 L1262,478 L1232,490" fill="none" stroke="#2a3548" stroke-width="2" opacity="0.7"/>

<!-- Side windows — large greenhouse, no B-pillar -->
<path d="M1068,532 L1066,534 L845,548 L595,532 L624,472 L704,432 L905,412 L1052,413 L1092,472 Z"
      fill="url(#p911-glass)" opacity="0.48"/>
<!-- Side window lower belt line -->
<path d="M595,532 L845,548 L1066,534"
      fill="none" stroke="#2a3548" stroke-width="2.5" opacity="0.75"/>
<!-- Side window interior highlight reflection -->
<path d="M638,472 L720,434 L880,416 L1040,418 L1060,472 L840,488 Z"
      fill="white" opacity="0.04" pointer-events="none"/>

<!-- ── SIDE MIRROR — A-pillar mounted, 911 distinctive small wing mirror -->
<path d="M592,490 L614,486 L620,496 L616,508 L592,509 Z"
      fill="#2e3d50" stroke="#3e5068" stroke-width="1.5"/>
<path d="M614,486 L620,496" fill="none" stroke="#6a8098" stroke-width="1" opacity="0.5"/>

<!-- ── WHEELS ── -->
<!-- === FRONT WHEEL === -->
<!-- Wheel arch inner shadow -->
<path d="M395,668 Q428,634 495,624 Q562,614 595,650 L562,654 L462,666 Z"
      fill="#0a0f18" opacity="0.5"/>
<!-- Front tyre (wider at rear — note 911 rear is wider) -->
<circle cx="500" cy="728" r="100" fill="#0e141e"/>
<circle cx="500" cy="728" r="96" fill="#161e2c" stroke="#2e3a4c" stroke-width="2"/>
<!-- Tyre sidewall highlight -->
<path d="M406,700 A97,97 0 0 1 596,700" fill="none" stroke="#2e3a4c" stroke-width="1" opacity="0.4"/>
<!-- Front rim -->
<circle cx="500" cy="728" r="65" fill="url(#p911-wheel-f)"/>
<!-- Brake disc visible behind spokes -->
<circle cx="500" cy="728" r="50" fill="none" stroke="#3a4858" stroke-width="3" opacity="0.55"/>
<!-- Caliper hint — red/orange for 911 -->
<path d="M500,680 L514,682 L516,694 L500,694 L484,694 L486,682 Z"
      fill="url(#p911-caliper-f)" opacity="0.75"/>
<!-- 5-spoke Carrera forged design -->
${makePorscheSpokes(500, 728, 65, 27, '#6a7e90', '#9ab4c8')}
<!-- Centre cap -->
<circle cx="500" cy="728" r="13" fill="#2e3a4c" stroke="#5a7088" stroke-width="1.5"/>
<!-- Centre cap crest (Porsche shield hint) -->
<circle cx="500" cy="728" r="7" fill="#3a4858" stroke="#6a8098" stroke-width="1"/>
<!-- Wheel arch lower shadow -->
<ellipse cx="500" cy="750" rx="100" ry="14" fill="#000" opacity="0.38"/>

<!-- === REAR WHEEL — wider (911 rear engine stance) === -->
<!-- Wheel arch inner shadow -->
<path d="M1248,650 Q1290,616 1362,608 Q1430,602 1462,640 L1432,668 L1358,654 Z"
      fill="#0a0f18" opacity="0.5"/>
<!-- Rear tyre — noticeably wider than front -->
<circle cx="1360" cy="728" r="112" fill="#0e141e"/>
<circle cx="1360" cy="728" r="108" fill="#161e2c" stroke="#2e3a4c" stroke-width="2"/>
<!-- Rear rim -->
<circle cx="1360" cy="728" r="74" fill="url(#p911-wheel-r)"/>
<!-- Brake disc -->
<circle cx="1360" cy="728" r="57" fill="none" stroke="#3a4858" stroke-width="3" opacity="0.55"/>
<!-- Caliper -->
<path d="M1360,670 L1376,672 L1378,686 L1360,686 L1342,686 L1344,672 Z"
      fill="url(#p911-caliper-f)" opacity="0.75"/>
<!-- 5-spoke rear (same design, larger) -->
${makePorscheSpokes(1360, 728, 74, 31, '#6a7e90', '#9ab4c8')}
<circle cx="1360" cy="728" r="14" fill="#2e3a4c" stroke="#5a7088" stroke-width="1.5"/>
<circle cx="1360" cy="728" r="8" fill="#3a4858" stroke="#6a8098" stroke-width="1"/>
<!-- Wheel arch lower shadow -->
<ellipse cx="1360" cy="750" rx="112" ry="14" fill="#000" opacity="0.38"/>

<!-- ── LIGHTS ── -->
<!-- === FRONT HEADLIGHT — 911 signature round light === -->
<!-- Headlight surround / bezel -->
<circle cx="335" cy="670" r="40" fill="#0e141e" stroke="#2e3a4c" stroke-width="2.5"/>
<!-- Outer DRL ring — glowing halo -->
<circle cx="335" cy="670" r="35" fill="none" stroke="#c8e0f8" stroke-width="2.5"
        opacity="0.65" filter="url(#p911-glow-front)"/>
<!-- Reflector bowl -->
<circle cx="335" cy="670" r="29" fill="#142240" opacity="0.9"/>
<!-- Main projector lens -->
<circle cx="335" cy="670" r="22" fill="#1e3a65" opacity="0.85"/>
<!-- Projector centre bright spot -->
<circle cx="335" cy="670" r="14" fill="#b0d4f8" opacity="0.6" filter="url(#p911-glow-front)"/>
<!-- Centre hotspot -->
<circle cx="335" cy="670" r="7" fill="#dff0ff" opacity="0.95"/>
<!-- Lens cut-off line (projector beam) -->
<line x1="314" y1="670" x2="356" y2="670" stroke="#a8ccf0" stroke-width="1" opacity="0.3"/>

<!-- === FRONT BUMPER DETAIL === -->
<!-- Front bumper lower contour -->
<path d="M330,730 L340,702 L362,684 L400,672 L448,664"
      fill="none" stroke="#9ab0c8" stroke-width="2" opacity="0.45"/>
<!-- Front air intake (lower bumper duct) -->
<path d="M330,714 L348,700 L365,700 L368,716 L330,717 Z"
      fill="#0e141e" stroke="#2e3a4c" stroke-width="1.5" opacity="0.80"/>
<!-- Fog light position (small rectangular) -->
<rect x="358" y="700" width="20" height="10" rx="3"
      fill="#181e2c" stroke="#3a5068" stroke-width="1" opacity="0.7"/>

<!-- === REAR LIGHTS — modern 911 continuous LED strip === -->
<!-- Rear light housing -->
<path d="M1488,620 L1548,620 L1552,638 L1552,660 L1548,674 L1488,674 L1484,660 L1484,638 Z"
      fill="#0e141e" stroke="#2e3a4c" stroke-width="2"/>
<!-- Continuous LED bar — 911 full-width strip -->
<rect x="1488" y="643" width="62" height="14" rx="2" fill="#3a0808" opacity="0.6"/>
<line x1="1488" y1="650" x2="1550" y2="650"
      stroke="#ef4444" stroke-width="5" opacity="0.95" filter="url(#p911-glow-rear)"/>
<line x1="1488" y1="650" x2="1550" y2="650"
      stroke="#fca5a5" stroke-width="2.5" opacity="0.65"/>
<!-- Reverse light section (white, at bottom of cluster) -->
<rect x="1490" y="662" width="28" height="6" rx="1"
      fill="#e0e8f0" opacity="0.30"/>

<!-- ── EXHAUST TIPS — dual oval, centrally placed -->
<ellipse cx="1498" cy="722" rx="14" ry="9" fill="#0a0e18" stroke="#3a4858" stroke-width="2"/>
<ellipse cx="1528" cy="722" rx="14" ry="9" fill="#0a0e18" stroke="#3a4858" stroke-width="2"/>
<!-- Exhaust inner depth hint -->
<ellipse cx="1498" cy="722" rx="9" ry="5" fill="#060a12" opacity="0.9"/>
<ellipse cx="1528" cy="722" rx="9" ry="5" fill="#060a12" opacity="0.9"/>

<!-- ── DETAILS ── -->
<!-- Door handle — flush pop-out style -->
<rect x="878" y="630" width="56" height="9" rx="4.5"
      fill="#6a7e90" stroke="#4a5e70" stroke-width="1" opacity="0.65"/>
<!-- Door handle shadow / indent -->
<rect x="879" y="638" width="54" height="3" rx="1.5"
      fill="#0e141e" opacity="0.35"/>

<!-- Rear bumper lower contour -->
<path d="M1548,730 L1550,704 L1544,684 L1520,670"
      fill="none" stroke="#9ab0c8" stroke-width="2" opacity="0.45"/>

<!-- Brand badge position (front lid) — subtle silver oval -->
<ellipse cx="475" cy="625" rx="18" ry="11"
         fill="#3a4858" stroke="#6a8098" stroke-width="1.5" opacity="0.8"/>
<ellipse cx="475" cy="625" rx="12" ry="7"
         fill="#2a3848" opacity="0.9"/>

${end}`);

function makePorscheSpokes(cx: number, cy: number, r: number, ir: number, strokeColor: string, highlightColor: string): string {
  const spokes = 5;
  let paths = '';
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * 2 * Math.PI - Math.PI / 2;
    const nextAngle = ((i + 0.42) / spokes) * 2 * Math.PI - Math.PI / 2;
    const midAngle = (angle + nextAngle) / 2;
    const x1 = (cx + ir * Math.cos(angle)).toFixed(1);
    const y1 = (cy + ir * Math.sin(angle)).toFixed(1);
    const x2 = (cx + r * Math.cos(angle)).toFixed(1);
    const y2 = (cy + r * Math.sin(angle)).toFixed(1);
    const x3 = (cx + r * Math.cos(nextAngle)).toFixed(1);
    const y3 = (cy + r * Math.sin(nextAngle)).toFixed(1);
    const x4 = (cx + ir * Math.cos(nextAngle)).toFixed(1);
    const y4 = (cy + ir * Math.sin(nextAngle)).toFixed(1);
    const hx = (cx + (r - 4) * Math.cos(midAngle)).toFixed(1);
    const hy = (cy + (r - 4) * Math.sin(midAngle)).toFixed(1);
    // Spoke body
    paths += `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} Z" fill="${strokeColor}" opacity="0.88"/>`;
    // Leading edge highlight
    paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${highlightColor}" stroke-width="1.5" opacity="0.45"/>`;
    // Rim connection arc highlight
    paths += `<circle cx="${hx}" cy="${hy}" r="2" fill="${highlightColor}" opacity="0.35"/>`;
  }
  return paths;
}
