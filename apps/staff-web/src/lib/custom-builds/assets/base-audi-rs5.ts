/**
 * Audi RS5 — design-quality multi-layer SVG silhouette.
 *
 * L35 (locked): 5 base cars in P3.1. All inline SVG with multi-gradient body,
 *   glass layer, glow lights, ground reflection.
 * L46: Upgraded to design-quality silhouettes with model-accurate light
 *   signatures, wheel designs, body line creases, and refined gradients.
 *
 * Distinctive traits: wide Singleframe hexagonal grille, sharp shoulder blade,
 * Sportback flowing roofline with small hatch angle, quattro wide-stance,
 * RS-specific honeycomb intakes, OLED tail lamps, 5-double-spoke RS alloys,
 * blade-line DRL horizontal LED signature.
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

export const AUDI_RS5_SVG = svgDataUri(`${preamble}
<defs>
  <!-- Body gradient — warm silver-grey, Audi tone for hue-rotate paint filter -->
  <linearGradient id="rs5-body" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#c8cac8" stop-opacity="0.98"/>
    <stop offset="16%"  stop-color="#8c9090" stop-opacity="1"/>
    <stop offset="42%"  stop-color="#606464" stop-opacity="1"/>
    <stop offset="68%"  stop-color="#3e4244" stop-opacity="1"/>
    <stop offset="86%"  stop-color="#252628" stop-opacity="1"/>
    <stop offset="100%" stop-color="#131415" stop-opacity="1"/>
  </linearGradient>
  <!-- Roof sheen -->
  <linearGradient id="rs5-sheen" x1="12%" y1="0%" x2="88%" y2="100%">
    <stop offset="0%"   stop-color="#f0f0f0" stop-opacity="0.22"/>
    <stop offset="26%"  stop-color="#b0b4b4" stop-opacity="0.11"/>
    <stop offset="60%"  stop-color="#808484" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="#131415" stop-opacity="0"/>
  </linearGradient>
  <!-- Hood gradient -->
  <linearGradient id="rs5-hood" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#bcbebe" stop-opacity="0.96"/>
    <stop offset="38%"  stop-color="#7e8282" stop-opacity="1"/>
    <stop offset="74%"  stop-color="#4c5050" stop-opacity="1"/>
    <stop offset="100%" stop-color="#2a2c2c" stop-opacity="1"/>
  </linearGradient>
  <!-- Side skirt / rocker -->
  <linearGradient id="rs5-skirt" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#3e4244" stop-opacity="1"/>
    <stop offset="52%"  stop-color="#1e2020" stop-opacity="1"/>
    <stop offset="100%" stop-color="#0a0c0c" stop-opacity="1"/>
  </linearGradient>
  <!-- Glass -->
  <linearGradient id="rs5-glass" x1="0%" y1="0%" x2="6%" y2="100%">
    <stop offset="0%"   stop-color="#b8d8e8" stop-opacity="0.34"/>
    <stop offset="36%"  stop-color="#5090b8" stop-opacity="0.18"/>
    <stop offset="70%"  stop-color="#1c4870" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="#050c14" stop-opacity="0.70"/>
  </linearGradient>
  <!-- Rear quarter glass -->
  <linearGradient id="rs5-rglass" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#90c0dc" stop-opacity="0.30"/>
    <stop offset="100%" stop-color="#050c14" stop-opacity="0.62"/>
  </linearGradient>
  <!-- RS honeycomb grille pattern -->
  <pattern id="rs5-hex" x="0" y="0" width="22" height="20" patternUnits="userSpaceOnUse">
    <polygon points="11,1 20,5.5 20,14.5 11,19 2,14.5 2,5.5"
             fill="none" stroke="#1e2222" stroke-width="1.2" opacity="0.7"/>
  </pattern>
  <radialGradient id="rs5-wheel" cx="38%" cy="32%" r="62%">
    <stop offset="0%"   stop-color="#909898"/>
    <stop offset="32%"  stop-color="#626868"/>
    <stop offset="66%"  stop-color="#383c3c"/>
    <stop offset="100%" stop-color="#101212"/>
  </radialGradient>
  <!-- RS caliper — Audi yellow/gold -->
  <radialGradient id="rs5-caliper" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#d4a020"/>
    <stop offset="100%" stop-color="#8c6008"/>
  </radialGradient>
  <radialGradient id="rs5-shadow" cx="50%" cy="28%" r="52%">
    <stop offset="0%"   stop-color="#000000" stop-opacity="0.65"/>
    <stop offset="72%"  stop-color="#000000" stop-opacity="0.26"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <filter id="rs5-glow-front" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="7" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="rs5-glow-rear" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Paintable body region — feColorMatrix paint target (L36) -->
  <filter id="rs5-paint" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="painted"/>
  </filter>
</defs>

<!-- Ground shadow — RS5 wide quattro stance -->
<ellipse cx="970" cy="842" rx="745" ry="28" fill="url(#rs5-shadow)"/>

<!-- ── LOWER BODY / SILL ── -->
<path d="M252,720 L268,696 L308,668 L408,642 L556,622 L770,612 L1000,606 L1232,608 L1436,618 L1546,642 L1618,674 L1652,706 L1662,720 Z"
      fill="url(#rs5-skirt)" data-paintable="false"/>

<!-- ── MAIN BODY SHELL ── -->
<path d="M238,730 L252,720 L268,696 L308,668 L408,642 L556,622 L770,612 L1000,606 L1232,608 L1436,618 L1546,642 L1618,674 L1652,706 L1662,720 L1672,730 Z"
      fill="url(#rs5-body)" filter="url(#rs5-paint)" data-paintable="true"/>

<!-- Upper body — Sportback flowing roofline -->
<path d="M556,622 L578,484 L626,418 L724,378 L898,358 L1072,355 L1188,364 L1278,398 L1358,448 L1404,516 L1430,592 L1436,618 L1232,608 L1000,606 L770,612 Z"
      fill="url(#rs5-body)" filter="url(#rs5-paint)" data-paintable="true"/>

<!-- Roof sheen -->
<path d="M634,418 L732,380 L908,360 L1082,357 L1196,368 L1270,400 L1312,432 L1278,398 L1188,364 L898,358 L724,378 Z"
      fill="url(#rs5-sheen)" pointer-events="none"/>

<!-- ── HOOD — RS5 flat hood with power character -->
<path d="M308,668 L320,640 L366,622 L444,608 L524,600 L556,596 L578,484 L574,622 L556,622 L408,642 Z"
      fill="url(#rs5-hood)" filter="url(#rs5-paint)" data-paintable="true"/>
<!-- Hood shut line -->
<path d="M322,640 Q440,614 556,598"
      fill="none" stroke="#9aa0a0" stroke-width="1.5" opacity="0.42"/>
<!-- Hood character line / crease -->
<path d="M360,640 Q440,618 540,606"
      fill="none" stroke="#b0b8b8" stroke-width="1.5" opacity="0.28"/>

<!-- ── REAR — Sportback fastback haunch -->
<path d="M1404,516 L1444,514 L1492,528 L1534,552 L1570,584 L1596,624 L1600,650 L1546,642 L1436,618 L1430,592 Z"
      fill="url(#rs5-body)" filter="url(#rs5-paint)" data-paintable="true"/>
<!-- Rear arch crease -->
<path d="M1460,524 Q1512,548 1548,590"
      fill="none" stroke="#9aa0a0" stroke-width="2" opacity="0.34"/>

<!-- ── BODY CHARACTER LINES ── -->
<!-- RS5 sharp shoulder blade (signature Audi Tornado line) -->
<path d="M406,652 Q680,630 1000,626 Q1240,622 1468,634"
      fill="none" stroke="#aab0b0" stroke-width="2.5" opacity="0.36"/>
<!-- Lower body crease -->
<path d="M432,682 Q706,664 1000,660 Q1240,657 1510,666"
      fill="none" stroke="#7a8080" stroke-width="1.5" opacity="0.24"/>
<!-- Front arch flare line -->
<path d="M424,648 Q476,626 578,618"
      fill="none" stroke="#aab0b0" stroke-width="2" opacity="0.30"/>
<!-- Door shut lines -->
<line x1="786" y1="612" x2="783" y2="720" stroke="#909898" stroke-width="1.5" opacity="0.28"/>
<line x1="1148" y1="608" x2="1146" y2="716" stroke="#909898" stroke-width="1.5" opacity="0.28"/>

<!-- ── FENDER FLARES ── -->
<!-- Front fender flare -->
<path d="M408,642 Q452,618 514,612 Q576,608 610,628 L578,622 L556,622 Z"
      fill="url(#rs5-body)" filter="url(#rs5-paint)" data-paintable="true" opacity="0.62"/>
<path d="M410,642 Q456,619 517,613 Q580,609 614,630"
      fill="none" stroke="#c8cece" stroke-width="1.5" opacity="0.38"/>
<!-- Rear fender flare -->
<path d="M1300,620 Q1354,604 1408,606 Q1464,610 1504,634 L1436,618 L1404,618 Z"
      fill="url(#rs5-body)" filter="url(#rs5-paint)" data-paintable="true" opacity="0.68"/>
<path d="M1302,620 Q1358,605 1412,607 Q1468,611 1508,636"
      fill="none" stroke="#c8cece" stroke-width="1.5" opacity="0.38"/>

<!-- ── SIDE SKIRTS ── -->
<path d="M570,622 L570,720 L590,726 L1124,726 L1144,720 L1144,614 L1000,608 L770,612 Z"
      fill="url(#rs5-skirt)" opacity="0.76"/>
<line x1="570" y1="624" x2="1144" y2="618" stroke="#7a8080" stroke-width="1" opacity="0.28"/>

<!-- ── GLASS ── -->
<!-- Windscreen — RS5 moderately raked -->
<path d="M578,484 L626,418 L730,382 L964,366 L1140,368 L1180,418 L1158,484 L908,500 Z"
      fill="url(#rs5-glass)" opacity="0.88"/>
<path d="M578,484 L626,418 L730,382 L964,366 L1140,368 L1180,418 L1158,484"
      fill="none" stroke="#282e2e" stroke-width="3" opacity="0.88"/>
<!-- Windscreen reflection -->
<path d="M644,418 L742,384 L972,370 L1108,372 L1142,404 L720,424 Z"
      fill="white" opacity="0.054" pointer-events="none"/>

<!-- Rear quarter glass — Sportback angle -->
<path d="M1278,398 L1358,448 L1330,462 L1260,414 Z"
      fill="url(#rs5-rglass)" opacity="0.78"/>
<path d="M1278,398 L1358,448 L1330,462" fill="none" stroke="#282e2e" stroke-width="2" opacity="0.7"/>

<!-- Side windows -->
<path d="M1160,482 L1158,484 L908,500 L582,480 L626,418 L738,382 L964,366 L1140,368 L1180,418 Z"
      fill="url(#rs5-glass)" opacity="0.44"/>
<path d="M582,480 L908,500 L1158,484"
      fill="none" stroke="#282e2e" stroke-width="2.5" opacity="0.76"/>

<!-- ── SIDE MIRROR — Audi folding mirror ── -->
<path d="M584,452 L610,446 L616,460 L612,476 L584,478 Z"
      fill="#282e2e" stroke="#3c4444" stroke-width="1.5"/>

<!-- ── WHEELS ── -->
<!-- === FRONT WHEEL === -->
<!-- Arch inner shadow -->
<path d="M408,644 Q452,608 528,600 Q602,594 638,632 L578,622 L556,622 L408,642 Z"
      fill="#080c0c" opacity="0.52"/>
<circle cx="516" cy="726" r="106" fill="#101212"/>
<circle cx="516" cy="726" r="102" fill="#161818" stroke="#2c3030" stroke-width="2"/>
<circle cx="516" cy="726" r="68" fill="url(#rs5-wheel)"/>
<!-- Brake disc -->
<circle cx="516" cy="726" r="54" fill="none" stroke="#303434" stroke-width="3" opacity="0.55"/>
<!-- RS caliper — Audi gold -->
<path d="M516,676 L532,678 L534,692 L516,692 L498,692 L500,678 Z"
      fill="url(#rs5-caliper)" opacity="0.76"/>
<!-- 5-double-spoke RS design -->
${makeAudiSpokes(516, 726, 68, 27, '#6a7070', '#9aa4a4')}
<circle cx="516" cy="726" r="13" fill="#2c3030" stroke="#5a6464" stroke-width="1.5"/>
<circle cx="516" cy="726" r="7" fill="#363e3e" stroke="#6a7474" stroke-width="1"/>
<ellipse cx="516" cy="748" rx="106" ry="14" fill="#000" opacity="0.38"/>

<!-- === REAR WHEEL — RS5 wider rear === -->
<!-- Arch inner shadow -->
<path d="M1294,622 Q1340,586 1416,578 Q1490,572 1528,614 L1546,642 L1436,618 Z"
      fill="#080c0c" opacity="0.52"/>
<circle cx="1414" cy="726" r="118" fill="#101212"/>
<circle cx="1414" cy="726" r="114" fill="#161818" stroke="#2c3030" stroke-width="2"/>
<circle cx="1414" cy="726" r="76" fill="url(#rs5-wheel)"/>
<circle cx="1414" cy="726" r="60" fill="none" stroke="#303434" stroke-width="3" opacity="0.55"/>
<path d="M1414,668 L1432,670 L1434,685 L1414,685 L1394,685 L1396,670 Z"
      fill="url(#rs5-caliper)" opacity="0.76"/>
${makeAudiSpokes(1414, 726, 76, 30, '#6a7070', '#9aa4a4')}
<circle cx="1414" cy="726" r="14" fill="#2c3030" stroke="#5a6464" stroke-width="1.5"/>
<circle cx="1414" cy="726" r="8" fill="#363e3e" stroke="#6a7474" stroke-width="1"/>
<ellipse cx="1414" cy="748" rx="118" ry="14" fill="#000" opacity="0.38"/>

<!-- ── LIGHTS ── -->
<!-- === FRONT MATRIX LED — Audi RS5 blade DRL signature === -->
<!-- Headlight housing -->
<path d="M256,646 L318,632 L342,638 L344,660 L342,678 L318,684 L256,672 Z"
      fill="#080c0c" stroke="#282e2e" stroke-width="2"/>
<!-- Main LED element -->
<path d="M260,650 L314,638 L334,643 L334,674 L314,678 L260,668 Z"
      fill="#0a1010" opacity="0.9"/>
<!-- Blade DRL — horizontal stacked lines (Audi signature) -->
<line x1="264" y1="648" x2="330" y2="638" stroke="#fffde0" stroke-width="3" opacity="0.92" filter="url(#rs5-glow-front)"/>
<line x1="264" y1="656" x2="330" y2="647" stroke="#fff8a0" stroke-width="2.5" opacity="0.72" filter="url(#rs5-glow-front)"/>
<line x1="264" y1="663" x2="330" y2="655" stroke="#ffee60" stroke-width="2" opacity="0.52"/>
<!-- DRL glow bloom -->
<line x1="264" y1="648" x2="330" y2="638" stroke="#fff8c8" stroke-width="8" opacity="0.22" filter="url(#rs5-glow-front)"/>
<!-- Main headlight projector -->
<ellipse cx="302" cy="660" rx="14" ry="12" fill="#0a1820" opacity="0.88"/>
<ellipse cx="302" cy="660" rx="8" ry="7" fill="#b8d4f0" opacity="0.52" filter="url(#rs5-glow-front)"/>

<!-- === SINGLEFRAME GRILLE — RS-specific hexagonal, very wide === -->
<!-- Grille frame -->
<path d="M252,714 L260,648 L346,634 L418,636 L424,670 L424,720 L252,720 Z"
      fill="#060808" stroke="#282e2e" stroke-width="2.5" opacity="0.96"/>
<!-- RS honeycomb fill -->
<path d="M252,714 L260,648 L346,634 L418,636 L424,670 L424,720 Z"
      fill="url(#rs5-hex)" opacity="0.6"/>
<!-- Grille inner surround accent -->
<path d="M258,710 L264,652 L344,638 L414,640 L420,668 L420,716 Z"
      fill="none" stroke="#1e2222" stroke-width="1" opacity="0.6"/>

<!-- === REAR OLED TAILLIGHTS — continuous horizontal bar === -->
<!-- Light cluster housing -->
<path d="M1564,626 L1658,626 L1662,642 L1662,665 L1658,678 L1564,678 L1560,665 L1560,640 Z"
      fill="#080c0c" stroke="#282e2e" stroke-width="2"/>
<!-- OLED full-width strip -->
<rect x="1564" y="644" width="96" height="16" rx="2" fill="#3c0808" opacity="0.58"/>
<line x1="1564" y1="652" x2="1658" y2="652"
      stroke="#ef4444" stroke-width="6" opacity="0.96" filter="url(#rs5-glow-rear)"/>
<line x1="1564" y1="652" x2="1658" y2="652"
      stroke="#fca5a5" stroke-width="2.5" opacity="0.62"/>
<!-- OLED segment dividers (RS5 striped pattern) -->
<line x1="1588" y1="628" x2="1588" y2="676" stroke="#1a1e1e" stroke-width="1.5" opacity="0.5"/>
<line x1="1612" y1="628" x2="1612" y2="676" stroke="#1a1e1e" stroke-width="1.5" opacity="0.5"/>
<line x1="1636" y1="628" x2="1636" y2="676" stroke="#1a1e1e" stroke-width="1.5" opacity="0.5"/>

<!-- === RS5 OVAL EXHAUST TIPS === -->
<!-- Diffuser area -->
<path d="M1558,718 L1566,702 L1660,706 L1666,726 L1558,726 Z"
      fill="#060808" stroke="#181e1e" stroke-width="1.5" opacity="0.88"/>
<!-- 4 oval exhaust tips -->
<ellipse cx="1580" cy="716" rx="12" ry="8" fill="#080c0c" stroke="#3c4848" stroke-width="2"/>
<ellipse cx="1606" cy="716" rx="12" ry="8" fill="#080c0c" stroke="#3c4848" stroke-width="2"/>
<ellipse cx="1632" cy="716" rx="12" ry="8" fill="#080c0c" stroke="#3c4848" stroke-width="2"/>
<ellipse cx="1658" cy="716" rx="12" ry="8" fill="#080c0c" stroke="#3c4848" stroke-width="2"/>
<ellipse cx="1580" cy="716" rx="7" ry="4" fill="#020404" opacity="0.9"/>
<ellipse cx="1606" cy="716" rx="7" ry="4" fill="#020404" opacity="0.9"/>
<ellipse cx="1632" cy="716" rx="7" ry="4" fill="#020404" opacity="0.9"/>
<ellipse cx="1658" cy="716" rx="7" ry="4" fill="#020404" opacity="0.9"/>

<!-- ── DETAILS ── -->
<!-- Door handle -->
<rect x="910" y="622" width="58" height="9" rx="4.5"
      fill="#6a7070" stroke="#4c5454" stroke-width="1" opacity="0.62"/>
<rect x="912" y="630" width="56" height="3" rx="1.5" fill="#0a0c0c" opacity="0.30"/>

<!-- Quattro rings badge — 4 interlocking circles on front -->
<circle cx="352" cy="728" r="6" fill="#383c3c" stroke="#6a7474" stroke-width="1.5"/>
<circle cx="365" cy="728" r="6" fill="#383c3c" stroke="#6a7474" stroke-width="1.5"/>
<circle cx="378" cy="728" r="6" fill="#383c3c" stroke="#6a7474" stroke-width="1.5"/>
<circle cx="391" cy="728" r="6" fill="#383c3c" stroke="#6a7474" stroke-width="1.5"/>

<!-- Front bumper lower -->
<path d="M244,728 L256,700 L286,674 L330,656"
      fill="none" stroke="#9aa0a0" stroke-width="2" opacity="0.42"/>

${end}`);

function makeAudiSpokes(cx: number, cy: number, r: number, ir: number, fill: string, highlight: string): string {
  // 5 double-spoke (RS 5-double-spoke design — pairs of thin spokes)
  const pairCount = 5;
  let paths = '';
  for (let i = 0; i < pairCount; i++) {
    const baseAngle = (i / pairCount) * 2 * Math.PI - Math.PI / 2;
    for (const offset of [-0.05, 0.05]) {
      const a = baseAngle + offset * 2 * Math.PI;
      const x1 = (cx + ir * Math.cos(a)).toFixed(1);
      const y1 = (cy + ir * Math.sin(a)).toFixed(1);
      const x2 = (cx + r * Math.cos(a)).toFixed(1);
      const y2 = (cy + r * Math.sin(a)).toFixed(1);
      paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${offset < 0 ? highlight : fill}" stroke-width="6" stroke-linecap="round" opacity="0.88"/>`;
    }
    // Rim join arc at outer end
    const a1 = baseAngle + (-0.05) * 2 * Math.PI;
    const a2 = baseAngle + (0.05) * 2 * Math.PI;
    const rx1 = (cx + r * Math.cos(a1)).toFixed(1);
    const ry1 = (cy + r * Math.sin(a1)).toFixed(1);
    const rx2 = (cx + r * Math.cos(a2)).toFixed(1);
    const ry2 = (cy + r * Math.sin(a2)).toFixed(1);
    paths += `<line x1="${rx1}" y1="${ry1}" x2="${rx2}" y2="${ry2}" stroke="${highlight}" stroke-width="4" opacity="0.50"/>`;
  }
  paths += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.2).toFixed(1)}" fill="${highlight}" opacity="0.48"/>`;
  return paths;
}
