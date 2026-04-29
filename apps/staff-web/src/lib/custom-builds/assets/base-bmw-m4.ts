/**
 * BMW M4 — design-quality multi-layer SVG silhouette.
 *
 * L35 (locked): 5 base cars in P3.1. All inline SVG with multi-gradient body,
 *   glass layer, glow lights, ground reflection.
 * L46: Upgraded to design-quality silhouettes with model-accurate light
 *   signatures, wheel designs, body line creases, and refined gradients.
 *
 * Distinctive traits: aggressive front splitter, M-specific flared arches,
 * twin kidney grille with large vertical slats, fastback roofline, wide-body
 * M stance, angular L-shape DRL, quad exhaust, M-multi-spoke alloys.
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

export const BMW_M4_SVG = svgDataUri(`${preamble}
<defs>
  <!-- Body gradient — cool silver-blue M tone for hue-rotate paint filter -->
  <linearGradient id="m4-body" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#bcc4d4" stop-opacity="0.98"/>
    <stop offset="14%"  stop-color="#7e8ea6" stop-opacity="1"/>
    <stop offset="40%"  stop-color="#545e72" stop-opacity="1"/>
    <stop offset="65%"  stop-color="#363e52" stop-opacity="1"/>
    <stop offset="84%"  stop-color="#202838" stop-opacity="1"/>
    <stop offset="100%" stop-color="#121820" stop-opacity="1"/>
  </linearGradient>
  <!-- Roof / upper highlight sheen -->
  <linearGradient id="m4-sheen" x1="18%" y1="0%" x2="82%" y2="100%">
    <stop offset="0%"   stop-color="#e0e8f4" stop-opacity="0.24"/>
    <stop offset="28%"  stop-color="#a8b8d0" stop-opacity="0.12"/>
    <stop offset="62%"  stop-color="#7888a0" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="#121820" stop-opacity="0"/>
  </linearGradient>
  <!-- Hood gradient -->
  <linearGradient id="m4-hood" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#b0bace" stop-opacity="0.96"/>
    <stop offset="35%"  stop-color="#7280a0" stop-opacity="1"/>
    <stop offset="72%"  stop-color="#424e64" stop-opacity="1"/>
    <stop offset="100%" stop-color="#262e3e" stop-opacity="1"/>
  </linearGradient>
  <!-- Side skirt / rocker panel — darker depth -->
  <linearGradient id="m4-skirt" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#363e52" stop-opacity="1"/>
    <stop offset="55%"  stop-color="#1c2230" stop-opacity="1"/>
    <stop offset="100%" stop-color="#080c14" stop-opacity="1"/>
  </linearGradient>
  <!-- Glass — cool blue-grey -->
  <linearGradient id="m4-glass" x1="0%" y1="0%" x2="8%" y2="100%">
    <stop offset="0%"   stop-color="#b0d0f0" stop-opacity="0.36"/>
    <stop offset="38%"  stop-color="#4878b8" stop-opacity="0.20"/>
    <stop offset="72%"  stop-color="#182855" stop-opacity="0.48"/>
    <stop offset="100%" stop-color="#050a14" stop-opacity="0.72"/>
  </linearGradient>
  <!-- Rear quarter glass -->
  <linearGradient id="m4-rglass" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#88b8e0" stop-opacity="0.32"/>
    <stop offset="100%" stop-color="#050a14" stop-opacity="0.65"/>
  </linearGradient>
  <radialGradient id="m4-wheel" cx="36%" cy="30%" r="64%">
    <stop offset="0%"   stop-color="#7a8ba0"/>
    <stop offset="32%"  stop-color="#525e72"/>
    <stop offset="66%"  stop-color="#2c3444"/>
    <stop offset="100%" stop-color="#0a0e18"/>
  </radialGradient>
  <!-- M caliper gradient — M blue/red -->
  <radialGradient id="m4-caliper" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#1060c8"/>
    <stop offset="100%" stop-color="#083080"/>
  </radialGradient>
  <radialGradient id="m4-shadow" cx="50%" cy="28%" r="52%">
    <stop offset="0%"   stop-color="#000000" stop-opacity="0.64"/>
    <stop offset="72%"  stop-color="#000000" stop-opacity="0.26"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <filter id="m4-glow-front" x="-70%" y="-70%" width="240%" height="240%">
    <feGaussianBlur stdDeviation="8" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="m4-glow-rear" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Paintable body region — feColorMatrix paint target (L36) -->
  <filter id="m4-paint" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="painted"/>
  </filter>
</defs>

<!-- Ground shadow -->
<ellipse cx="960" cy="840" rx="730" ry="28" fill="url(#m4-shadow)"/>

<!-- ── LOWER BODY / ROCKER SILL ── -->
<path d="M282,720 L295,698 L328,674 L416,652 L545,636 L748,626 L968,620 L1190,622 L1385,630 L1495,650 L1566,678 L1602,706 L1614,720 Z"
      fill="url(#m4-skirt)" data-paintable="false"/>

<!-- ── MAIN BODY SHELL ── -->
<path d="M268,730 L282,720 L295,698 L328,674 L416,652 L545,636 L748,626 L968,620 L1190,622 L1385,630 L1495,650 L1566,678 L1602,706 L1614,720 L1626,730 Z"
      fill="url(#m4-body)" filter="url(#m4-paint)" data-paintable="true"/>

<!-- Upper body — M4 fastback roofline, aggressive greenhouse angle -->
<path d="M545,636 L568,500 L614,432 L704,392 L862,370 L1020,366 L1140,374 L1232,404 L1306,454 L1354,524 L1382,598 L1385,630 L1190,622 L968,620 L748,626 Z"
      fill="url(#m4-body)" filter="url(#m4-paint)" data-paintable="true"/>

<!-- Roof sheen -->
<path d="M622,432 L712,394 L872,372 L1030,368 L1148,378 L1224,408 L1264,442 L1232,404 L1140,374 L862,370 L704,392 Z"
      fill="url(#m4-sheen)" pointer-events="none"/>

<!-- ── HOOD — M4 power dome hood -->
<path d="M328,674 L340,648 L382,630 L448,618 L520,610 L545,606 L568,500 L565,636 L545,636 L416,652 Z"
      fill="url(#m4-hood)" filter="url(#m4-paint)" data-paintable="true"/>
<!-- Hood power dome (twin power bulges — M4 signature) -->
<path d="M435,630 Q490,608 555,598"
      fill="none" stroke="#a0b4cc" stroke-width="2" opacity="0.4"/>
<path d="M455,626 L510,604 L520,610"
      fill="none" stroke="#c0d4ec" stroke-width="1" opacity="0.25"/>
<path d="M475,624 L530,602"
      fill="none" stroke="#c0d4ec" stroke-width="1" opacity="0.25"/>
<!-- Hood shut line -->
<path d="M342,648 Q440,628 555,608"
      fill="none" stroke="#9ab0c8" stroke-width="1.5" opacity="0.42"/>

<!-- ── REAR SECTION — fastback haunch -->
<path d="M1354,524 L1394,522 L1440,535 L1486,558 L1520,590 L1544,626 L1548,655 L1495,650 L1385,630 L1382,598 Z"
      fill="url(#m4-body)" filter="url(#m4-paint)" data-paintable="true"/>
<!-- Rear arch flare crease -->
<path d="M1406,532 Q1460,550 1498,590"
      fill="none" stroke="#a0b4cc" stroke-width="2" opacity="0.35"/>

<!-- ── BODY CHARACTER LINES ── -->
<!-- M4 sharp shoulder blade — character line along full door -->
<path d="M414,662 Q680,642 968,638 Q1196,636 1420,646"
      fill="none" stroke="#a8bcd0" stroke-width="2" opacity="0.34"/>
<!-- Lower body crease -->
<path d="M440,688 Q700,672 975,668 Q1200,666 1442,674"
      fill="none" stroke="#7a8ea8" stroke-width="1.5" opacity="0.24"/>
<!-- Front arch flare hint -->
<path d="M420,654 Q468,636 568,630"
      fill="none" stroke="#a8bcd0" stroke-width="2" opacity="0.30"/>
<!-- Door shut lines -->
<line x1="765" y1="626" x2="762" y2="720" stroke="#8090a8" stroke-width="1.5" opacity="0.28"/>
<line x1="1132" y1="622" x2="1130" y2="716" stroke="#8090a8" stroke-width="1.5" opacity="0.28"/>

<!-- ── FENDER FLARES ── -->
<!-- Front fender flare -->
<path d="M416,652 Q454,628 510,622 Q568,618 600,636 L568,636 L545,636 Z"
      fill="url(#m4-body)" filter="url(#m4-paint)" data-paintable="true" opacity="0.65"/>
<path d="M418,652 Q458,629 513,622 Q572,619 604,638"
      fill="none" stroke="#c0d4ec" stroke-width="1.5" opacity="0.38"/>
<!-- Rear fender flare (M4 wider rear) -->
<path d="M1290,634 Q1340,618 1390,620 Q1446,624 1480,648 L1495,650 L1385,630 Z"
      fill="url(#m4-body)" filter="url(#m4-paint)" data-paintable="true" opacity="0.72"/>
<path d="M1292,634 Q1344,619 1393,621 Q1450,625 1483,650"
      fill="none" stroke="#c0d4ec" stroke-width="1.5" opacity="0.38"/>

<!-- ── SIDE SKIRTS — distinct M aerodynamic panel ── -->
<path d="M560,636 L560,720 L580,726 L1108,726 L1128,720 L1128,630 L968,624 L748,626 Z"
      fill="url(#m4-skirt)" opacity="0.78"/>
<!-- M side skirt aero fin hint -->
<line x1="560" y1="638" x2="1128" y2="634" stroke="#7a90a8" stroke-width="1" opacity="0.28"/>

<!-- ── GLASS ── -->
<!-- Windscreen — M4 steep fastback rake -->
<path d="M568,500 L614,432 L712,396 L940,378 L1108,380 L1148,432 L1124,500 L876,516 Z"
      fill="url(#m4-glass)" opacity="0.88"/>
<path d="M568,500 L614,432 L712,396 L940,378 L1108,380 L1148,432 L1124,500"
      fill="none" stroke="#283040" stroke-width="3" opacity="0.9"/>
<!-- Windscreen reflection highlight -->
<path d="M632,432 L724,398 L904,382 L1068,384 L1100,420 L700,440 Z"
      fill="white" opacity="0.055" pointer-events="none"/>

<!-- Rear quarter glass -->
<path d="M1232,404 L1306,454 L1278,468 L1212,420 Z"
      fill="url(#m4-rglass)" opacity="0.78"/>
<path d="M1232,404 L1306,454 L1278,468" fill="none" stroke="#283040" stroke-width="2" opacity="0.7"/>

<!-- Side windows — M4 frameless glass -->
<path d="M1126,498 L1124,500 L876,516 L572,498 L614,432 L718,396 L940,378 L1108,380 L1148,432 Z"
      fill="url(#m4-glass)" opacity="0.46"/>
<path d="M572,498 L876,516 L1124,500"
      fill="none" stroke="#283040" stroke-width="2.5" opacity="0.78"/>

<!-- ── SIDE MIRROR — M4 carbon-trim wing mirror ── -->
<path d="M572,466 L598,460 L604,474 L600,490 L572,492 Z"
      fill="#283040" stroke="#3c4c60" stroke-width="1.5"/>
<path d="M598,460 L604,474" fill="none" stroke="#6a8098" stroke-width="1" opacity="0.5"/>

<!-- ── WHEELS ── -->
<!-- === FRONT WHEEL === -->
<!-- Arch inner shadow -->
<path d="M416,654 Q454,618 526,610 Q596,604 630,640 L568,636 L545,636 L416,652 Z"
      fill="#080c14" opacity="0.52"/>
<circle cx="490" cy="726" r="104" fill="#0a0e18"/>
<circle cx="490" cy="726" r="100" fill="#141a28" stroke="#2c3444" stroke-width="2"/>
<!-- Front rim -->
<circle cx="490" cy="726" r="66" fill="url(#m4-wheel)"/>
<!-- Brake disc -->
<circle cx="490" cy="726" r="52" fill="none" stroke="#323c50" stroke-width="3" opacity="0.55"/>
<!-- M caliper — blue -->
<path d="M490,676 L506,678 L508,690 L490,690 L472,690 L474,678 Z"
      fill="url(#m4-caliper)" opacity="0.78"/>
<!-- M-style 10-spoke alloy -->
${makeMSpokes(490, 726, 66, 25, '#5c6880', '#8090a8')}
<circle cx="490" cy="726" r="12" fill="#2c3444" stroke="#5c7088" stroke-width="1.5"/>
<circle cx="490" cy="726" r="6" fill="#3c4c60" stroke="#6a8098" stroke-width="1"/>
<ellipse cx="490" cy="748" rx="104" ry="14" fill="#000" opacity="0.38"/>

<!-- === REAR WHEEL — M4 wider rear track === -->
<!-- Arch inner shadow -->
<path d="M1284,636 Q1326,600 1398,592 Q1468,586 1504,624 L1495,650 L1385,630 Z"
      fill="#080c14" opacity="0.52"/>
<circle cx="1384" cy="726" r="116" fill="#0a0e18"/>
<circle cx="1384" cy="726" r="112" fill="#141a28" stroke="#2c3444" stroke-width="2"/>
<circle cx="1384" cy="726" r="74" fill="url(#m4-wheel)"/>
<circle cx="1384" cy="726" r="58" fill="none" stroke="#323c50" stroke-width="3" opacity="0.55"/>
<path d="M1384,668 L1402,670 L1404,683 L1384,683 L1364,683 L1366,670 Z"
      fill="url(#m4-caliper)" opacity="0.78"/>
${makeMSpokes(1384, 726, 74, 28, '#5c6880', '#8090a8')}
<circle cx="1384" cy="726" r="14" fill="#2c3444" stroke="#5c7088" stroke-width="1.5"/>
<circle cx="1384" cy="726" r="7" fill="#3c4c60" stroke="#6a8098" stroke-width="1"/>
<ellipse cx="1384" cy="748" rx="116" ry="14" fill="#000" opacity="0.38"/>

<!-- ── LIGHTS ── -->
<!-- === FRONT LASERLIGHT — M4 G80 angular design === -->
<!-- Headlight outer housing -->
<path d="M274,656 L332,640 L355,646 L358,668 L355,684 L332,690 L274,680 Z"
      fill="#080c14" stroke="#2c3444" stroke-width="2"/>
<!-- Main LED element (horizontal) -->
<path d="M278,661 L326,650 L346,655 L346,678 L326,683 L278,672 Z"
      fill="#0a1020" opacity="0.9"/>
<!-- L-shaped DRL signature (vertical + horizontal) — BMW G80 M4 -->
<line x1="280" y1="674" x2="280" y2="658" stroke="#d0eaff" stroke-width="3" opacity="0.9" filter="url(#m4-glow-front)"/>
<line x1="280" y1="658" x2="340" y2="648" stroke="#d0eaff" stroke-width="3" opacity="0.9" filter="url(#m4-glow-front)"/>
<!-- Inner DRL glow halo -->
<line x1="283" y1="672" x2="283" y2="660" stroke="#88ccff" stroke-width="5" opacity="0.4" filter="url(#m4-glow-front)"/>
<line x1="283" y1="660" x2="338" y2="651" stroke="#88ccff" stroke-width="5" opacity="0.4" filter="url(#m4-glow-front)"/>
<!-- Main projector ellipse -->
<ellipse cx="316" cy="666" rx="14" ry="12" fill="#0a1a30" opacity="0.85"/>
<ellipse cx="316" cy="666" rx="8" ry="7" fill="#b0d4f8" opacity="0.55" filter="url(#m4-glow-front)"/>

<!-- === KIDNEY GRILLE — BMW M4 wide-mouth iconic grille === -->
<!-- Grille surround frame -->
<path d="M274,718 L284,664 L360,648 L420,648 L428,678 L428,724 L274,724 Z"
      fill="#060a12" stroke="#2c3444" stroke-width="2.5" opacity="0.95"/>
<!-- Vertical divider between kidneys -->
<line x1="350" y1="650" x2="350" y2="724" stroke="#2c3444" stroke-width="3" opacity="0.8"/>
<!-- Grille vertical slat pattern (left kidney) -->
<line x1="294" y1="660" x2="292" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="308" y1="656" x2="306" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="322" y1="654" x2="320" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="336" y1="652" x2="334" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<!-- Grille vertical slat pattern (right kidney) -->
<line x1="360" y1="650" x2="358" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="374" y1="650" x2="372" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="388" y1="651" x2="386" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="402" y1="652" x2="400" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>
<line x1="416" y1="653" x2="414" y2="722" stroke="#1a2232" stroke-width="2.5" opacity="0.7"/>

<!-- === REAR LED BAR — BMW full-width horizontal strip === -->
<path d="M1552,626 L1612,630 L1618,644 L1618,664 L1612,674 L1552,674 L1546,662 L1546,640 Z"
      fill="#080c14" stroke="#2c3444" stroke-width="2"/>
<!-- Full-width LED strip -->
<rect x="1550" y="644" width="66" height="14" rx="2" fill="#3a0808" opacity="0.55"/>
<line x1="1550" y1="651" x2="1616" y2="653"
      stroke="#ef4444" stroke-width="6" opacity="0.95" filter="url(#m4-glow-rear)"/>
<line x1="1550" y1="651" x2="1616" y2="653"
      stroke="#fca5a5" stroke-width="2.5" opacity="0.62"/>
<!-- Reverse light (lower section) -->
<rect x="1552" y="662" width="32" height="7" rx="1" fill="#d8e8f0" opacity="0.28"/>

<!-- === QUAD EXHAUSTS — M4 signature 4-pipe === -->
<!-- Rear bumper diffuser area -->
<path d="M1570,714 L1578,700 L1634,706 L1634,728 L1570,728 Z"
      fill="#060a12" stroke="#1a2232" stroke-width="1.5" opacity="0.85"/>
<!-- 4 exhaust tips (square-oval M4 style) -->
<rect x="1550" y="710" width="20" height="14" rx="5" fill="#080c14" stroke="#3c4c60" stroke-width="2"/>
<rect x="1574" y="710" width="20" height="14" rx="5" fill="#080c14" stroke="#3c4c60" stroke-width="2"/>
<rect x="1598" y="710" width="20" height="14" rx="5" fill="#080c14" stroke="#3c4c60" stroke-width="2"/>
<rect x="1622" y="710" width="20" height="14" rx="5" fill="#080c14" stroke="#3c4c60" stroke-width="2"/>
<!-- Inner darkness -->
<rect x="1552" y="712" width="16" height="10" rx="4" fill="#020408" opacity="0.9"/>
<rect x="1576" y="712" width="16" height="10" rx="4" fill="#020408" opacity="0.9"/>
<rect x="1600" y="712" width="16" height="10" rx="4" fill="#020408" opacity="0.9"/>
<rect x="1624" y="712" width="16" height="10" rx="4" fill="#020408" opacity="0.9"/>

<!-- ── DETAILS ── -->
<!-- Door handle — M4 frameless flush -->
<rect x="918" y="630" width="58" height="9" rx="4.5"
      fill="#627288" stroke="#485870" stroke-width="1" opacity="0.62"/>
<!-- Door handle shadow -->
<rect x="920" y="638" width="56" height="3" rx="1.5" fill="#080c14" opacity="0.32"/>

<!-- M badge on front bumper area -->
<rect x="348" y="728" width="26" height="14" rx="2"
      fill="#0c2060" stroke="#1e50b8" stroke-width="1.5" opacity="0.85"/>
<!-- M tricolour stripes hint -->
<line x1="354" y1="730" x2="354" y2="740" stroke="#3060c8" stroke-width="2" opacity="0.7"/>
<line x1="360" y1="730" x2="360" y2="740" stroke="#7a30a0" stroke-width="2" opacity="0.7"/>
<line x1="366" y1="730" x2="366" y2="740" stroke="#c82020" stroke-width="2" opacity="0.7"/>

<!-- Front bumper lower contour -->
<path d="M270,728 L282,700 L306,676 L350,660"
      fill="none" stroke="#9ab0c8" stroke-width="2" opacity="0.42"/>

${end}`);

function makeMSpokes(cx: number, cy: number, r: number, ir: number, fill: string, highlight: string): string {
  const spokes = 10;
  let paths = '';
  for (let i = 0; i < spokes; i++) {
    const a1 = (i / spokes) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 0.36) / spokes) * 2 * Math.PI - Math.PI / 2;
    const x1 = (cx + ir * Math.cos(a1)).toFixed(1);
    const y1 = (cy + ir * Math.sin(a1)).toFixed(1);
    const x2 = (cx + r * Math.cos(a1)).toFixed(1);
    const y2 = (cy + r * Math.sin(a1)).toFixed(1);
    const x3 = (cx + r * Math.cos(a2)).toFixed(1);
    const y3 = (cy + r * Math.sin(a2)).toFixed(1);
    const x4 = (cx + ir * Math.cos(a2)).toFixed(1);
    const y4 = (cy + ir * Math.sin(a2)).toFixed(1);
    const isLight = i % 2 === 0;
    paths += `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} Z" fill="${isLight ? fill : '#181e2c'}" opacity="${isLight ? 0.92 : 0.62}"/>`;
    if (isLight) {
      paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${highlight}" stroke-width="1.5" opacity="0.42"/>`;
    }
  }
  // Centre ring
  paths += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.18).toFixed(1)}" fill="${highlight}" opacity="0.5"/>`;
  return paths;
}
