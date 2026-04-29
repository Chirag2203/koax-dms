/**
 * Mercedes-AMG GT — design-quality multi-layer SVG silhouette.
 *
 * L35 (locked): 5 base cars in P3.1. All inline SVG with multi-gradient body,
 *   glass layer, glow lights, ground reflection.
 * L46: Upgraded to design-quality silhouettes with model-accurate light
 *   signatures, wheel designs, body line creases, and refined gradients.
 *
 * Distinctive traits: very long hood (front-mid-engine layout), short rear
 * deck, low-slung dramatic coupe, Panamericana vertical grille slats,
 * round AMG round taillights, massive flared rear haunches, AMG 10-spoke
 * forged alloys, central twin exhausts, pronounced power dome on hood.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §24.1, §26 (L46)
 */

const W = 1920;
const H = 1080;
const end = `</svg>`;

const svgPreamble = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

export const MERCEDES_AMG_GT_SVG = svgDataUri(`${svgPreamble}
<defs>
  <!-- Body gradient — warm silver, AMG precision tone for hue-rotate paint filter -->
  <linearGradient id="amggt-body" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#d0cece" stop-opacity="0.97"/>
    <stop offset="16%"  stop-color="#989492" stop-opacity="1"/>
    <stop offset="42%"  stop-color="#686462" stop-opacity="1"/>
    <stop offset="68%"  stop-color="#423e3c" stop-opacity="1"/>
    <stop offset="86%"  stop-color="#282422" stop-opacity="1"/>
    <stop offset="100%" stop-color="#141210" stop-opacity="1"/>
  </linearGradient>
  <!-- Roof sheen highlight -->
  <linearGradient id="amggt-sheen" x1="14%" y1="0%" x2="86%" y2="100%">
    <stop offset="0%"   stop-color="#f4f0f0" stop-opacity="0.26"/>
    <stop offset="24%"  stop-color="#c0bcba" stop-opacity="0.13"/>
    <stop offset="58%"  stop-color="#908c8a" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="#141210" stop-opacity="0"/>
  </linearGradient>
  <!-- Long hood gradient -->
  <linearGradient id="amggt-hood" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#c8c4c2" stop-opacity="0.96"/>
    <stop offset="36%"  stop-color="#8a8684" stop-opacity="1"/>
    <stop offset="72%"  stop-color="#565250" stop-opacity="1"/>
    <stop offset="100%" stop-color="#302c2a" stop-opacity="1"/>
  </linearGradient>
  <!-- Side skirt -->
  <linearGradient id="amggt-skirt" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#423e3c" stop-opacity="1"/>
    <stop offset="52%"  stop-color="#222020" stop-opacity="1"/>
    <stop offset="100%" stop-color="#0c0a08" stop-opacity="1"/>
  </linearGradient>
  <!-- Glass -->
  <linearGradient id="amggt-glass" x1="0%" y1="0%" x2="5%" y2="100%">
    <stop offset="0%"   stop-color="#c0d8e8" stop-opacity="0.32"/>
    <stop offset="35%"  stop-color="#5898b8" stop-opacity="0.18"/>
    <stop offset="68%"  stop-color="#205070" stop-opacity="0.46"/>
    <stop offset="100%" stop-color="#040c14" stop-opacity="0.72"/>
  </linearGradient>
  <!-- Rear quarter glass -->
  <linearGradient id="amggt-rglass" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#98c0dc" stop-opacity="0.28"/>
    <stop offset="100%" stop-color="#040c14" stop-opacity="0.64"/>
  </linearGradient>
  <radialGradient id="amggt-wheel" cx="36%" cy="30%" r="64%">
    <stop offset="0%"   stop-color="#a09c9a"/>
    <stop offset="30%"  stop-color="#706a68"/>
    <stop offset="64%"  stop-color="#403c3a"/>
    <stop offset="100%" stop-color="#101010"/>
  </radialGradient>
  <!-- AMG compound brake caliper — red -->
  <radialGradient id="amggt-caliper" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#c82020"/>
    <stop offset="100%" stop-color="#780808"/>
  </radialGradient>
  <radialGradient id="amggt-shadow" cx="50%" cy="25%" r="52%">
    <stop offset="0%"   stop-color="#000000" stop-opacity="0.68"/>
    <stop offset="72%"  stop-color="#000000" stop-opacity="0.28"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <filter id="amggt-glow-front" x="-70%" y="-70%" width="240%" height="240%">
    <feGaussianBlur stdDeviation="9" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="amggt-glow-rear" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="7" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Paintable body region — feColorMatrix paint target (L36) -->
  <filter id="amggt-paint" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="painted"/>
  </filter>
</defs>

<!-- Ground shadow — long car, elongated shadow -->
<ellipse cx="950" cy="842" rx="720" ry="28" fill="url(#amggt-shadow)"/>

<!-- ── LOWER BODY / SILL ── -->
<!-- AMG GT has very long hood — front axle ~470, rear ~1440 -->
<path d="M288,720 L302,696 L336,668 L416,646 L476,636 L700,626 L940,620 L1160,620 L1360,626 L1462,644 L1534,670 L1566,700 L1576,720 Z"
      fill="url(#amggt-skirt)" data-paintable="false"/>

<!-- ── MAIN BODY SHELL ── -->
<path d="M275,730 L288,720 L302,696 L336,668 L416,646 L476,636 L700,626 L940,620 L1160,620 L1360,626 L1462,644 L1534,670 L1566,700 L1576,720 L1586,730 Z"
      fill="url(#amggt-body)" filter="url(#amggt-paint)" data-paintable="true"/>

<!-- Upper body — AMG GT very long hood, short cabin set far back -->
<path d="M476,636 L494,562 L516,516 L558,484 L632,464 L774,450 L920,444 L1056,446 L1148,458 L1216,488 L1268,532 L1298,588 L1316,624 L1160,620 L940,620 L700,626 Z"
      fill="url(#amggt-body)" filter="url(#amggt-paint)" data-paintable="true"/>

<!-- Roof sheen -->
<path d="M524,516 L570,484 L642,464 L786,452 L936,447 L1068,450 L1152,462 L1212,490 L1252,520 L1216,488 L1148,458 L920,444 L632,464 Z"
      fill="url(#amggt-sheen)" pointer-events="none"/>

<!-- ── HOOD — AMG GT very long hood with twin power domes -->
<!-- Long hood section from front face to windscreen base -->
<path d="M302,696 L318,660 L372,642 L440,630 L476,626 L494,562 L492,636 L476,636 L416,646 Z"
      fill="url(#amggt-hood)" filter="url(#amggt-paint)" data-paintable="true"/>
<!-- Hood power dome — twin raised ridges (AMG signature) -->
<path d="M396,650 Q470,580 515,542"
      fill="none" stroke="#b0acaa" stroke-width="2" opacity="0.38"/>
<path d="M420,648 Q492,578 525,544"
      fill="none" stroke="#c0bcba" stroke-width="2" opacity="0.28"/>
<!-- Hood centre crease -->
<path d="M446,644 Q500,572 524,538"
      fill="none" stroke="#a0a09e" stroke-width="1.5" opacity="0.22"/>
<!-- Hood shut line -->
<path d="M320,660 Q440,632 476,626"
      fill="none" stroke="#a0a09e" stroke-width="1.5" opacity="0.40"/>

<!-- ── REAR — dramatic AMG GT haunches -->
<path d="M1298,588 L1342,586 L1390,600 L1436,624 L1474,656 L1500,692 L1510,720 L1462,644 L1360,626 L1316,624 Z"
      fill="url(#amggt-body)" filter="url(#amggt-paint)" data-paintable="true"/>
<!-- Rear haunch flare crease (massive AMG GT haunches) -->
<path d="M1362,592 Q1420,612 1460,652"
      fill="none" stroke="#b0acaa" stroke-width="2.5" opacity="0.38"/>
<!-- Rear body panel crease -->
<path d="M1320,622 Q1380,618 1460,636"
      fill="none" stroke="#909090" stroke-width="1.5" opacity="0.25"/>

<!-- ── BODY CHARACTER LINES ── -->
<!-- AMG GT dramatic sweep line (from front arch over door to rear haunch) -->
<path d="M416,658 Q680,636 940,632 Q1148,630 1372,640"
      fill="none" stroke="#a8a4a2" stroke-width="2.5" opacity="0.36"/>
<!-- Lower body crease -->
<path d="M438,680 Q700,662 960,658 Q1180,655 1470,666"
      fill="none" stroke="#787474" stroke-width="1.5" opacity="0.24"/>
<!-- Door shut lines -->
<line x1="718" y1="626" x2="715" y2="720" stroke="#909090" stroke-width="1.5" opacity="0.28"/>
<line x1="1086" y1="622" x2="1084" y2="718" stroke="#909090" stroke-width="1.5" opacity="0.28"/>

<!-- ── FENDER FLARES ── -->
<!-- Front fender flare -->
<path d="M416,646 Q458,624 520,618 Q578,614 612,630 L494,636 L476,636 Z"
      fill="url(#amggt-body)" filter="url(#amggt-paint)" data-paintable="true" opacity="0.62"/>
<path d="M418,646 Q462,625 524,619 Q582,615 616,632"
      fill="none" stroke="#d0ccca" stroke-width="1.5" opacity="0.36"/>
<!-- Rear fender flare — very dramatic AMG GT haunches -->
<path d="M1282,628 Q1338,610 1400,612 Q1462,616 1506,642 L1462,644 L1360,626 Z"
      fill="url(#amggt-body)" filter="url(#amggt-paint)" data-paintable="true" opacity="0.70"/>
<path d="M1284,628 Q1342,611 1404,613 Q1466,617 1510,644"
      fill="none" stroke="#d0ccca" stroke-width="1.5" opacity="0.36"/>

<!-- ── SIDE SKIRTS — AMG aerodynamic sill extensions -->
<path d="M488,636 L488,720 L508,726 L1122,726 L1142,720 L1142,622 L940,618 L700,624 Z"
      fill="url(#amggt-skirt)" opacity="0.78"/>
<line x1="488" y1="638" x2="1142" y2="626" stroke="#787474" stroke-width="1" opacity="0.26"/>

<!-- ── GLASS ── -->
<!-- Windscreen — AMG GT small, steeply raked, far back over cabin -->
<path d="M558,484 L632,464 L796,450 L1020,446 L1128,460 L1158,488 L1138,524 L840,540 Z"
      fill="url(#amggt-glass)" opacity="0.88"/>
<path d="M558,484 L632,464 L796,450 L1020,446 L1128,460 L1158,488 L1138,524"
      fill="none" stroke="#282220" stroke-width="3" opacity="0.88"/>
<!-- Windscreen reflection -->
<path d="M648,464 L808,452 L1028,449 L1108,464 L1116,498 L820,510 Z"
      fill="white" opacity="0.052" pointer-events="none"/>

<!-- Rear quarter glass -->
<path d="M1216,488 L1268,532 L1240,545 L1196,504 Z"
      fill="url(#amggt-rglass)" opacity="0.78"/>
<path d="M1216,488 L1268,532 L1240,545" fill="none" stroke="#282220" stroke-width="2" opacity="0.7"/>

<!-- Side windows — small greenhouse typical of AMG GT -->
<path d="M1140,522 L1138,524 L840,540 L562,520 L632,464 L810,452 L1020,446 L1128,460 L1158,488 Z"
      fill="url(#amggt-glass)" opacity="0.42"/>
<path d="M562,520 L840,540 L1138,524"
      fill="none" stroke="#282220" stroke-width="2.5" opacity="0.76"/>

<!-- ── SIDE MIRROR — AMG GT wing-style carbon mirror ── -->
<path d="M564,484 L592,476 L598,490 L594,508 L564,510 Z"
      fill="#282220" stroke="#3c3632" stroke-width="1.5"/>
<path d="M592,476 L598,490" fill="none" stroke="#686460" stroke-width="1" opacity="0.5"/>

<!-- ── WHEELS ── -->
<!-- === FRONT WHEEL === -->
<!-- Arch inner shadow -->
<path d="M416,648 Q458,612 534,604 Q608,598 644,636 L494,636 L476,636 L416,646 Z"
      fill="#080c0a" opacity="0.52"/>
<circle cx="474" cy="726" r="102" fill="#101010"/>
<circle cx="474" cy="726" r="98" fill="#181616" stroke="#2e2c2a" stroke-width="2"/>
<circle cx="474" cy="726" r="65" fill="url(#amggt-wheel)"/>
<!-- Brake disc -->
<circle cx="474" cy="726" r="51" fill="none" stroke="#302c2a" stroke-width="3" opacity="0.55"/>
<!-- AMG compound red caliper -->
<path d="M474,676 L490,678 L492,690 L474,690 L456,690 L458,678 Z"
      fill="url(#amggt-caliper)" opacity="0.80"/>
<!-- AMG 10-spoke forged design -->
${makeAMGSpokes(474, 726, 65, 25, '#888482', '#b8b4b2')}
<circle cx="474" cy="726" r="12" fill="#2e2c2a" stroke="#585452" stroke-width="1.5"/>
<circle cx="474" cy="726" r="6" fill="#3c3836" stroke="#686462" stroke-width="1"/>
<ellipse cx="474" cy="748" rx="102" ry="13" fill="#000" opacity="0.38"/>

<!-- === REAR WHEEL — AMG GT wide rear haunches === -->
<!-- Arch inner shadow -->
<path d="M1278,630 Q1326,594 1406,586 Q1484,580 1520,622 L1462,644 L1360,626 Z"
      fill="#080c0a" opacity="0.52"/>
<circle cx="1440" cy="726" r="116" fill="#101010"/>
<circle cx="1440" cy="726" r="112" fill="#181616" stroke="#2e2c2a" stroke-width="2"/>
<circle cx="1440" cy="726" r="76" fill="url(#amggt-wheel)"/>
<circle cx="1440" cy="726" r="60" fill="none" stroke="#302c2a" stroke-width="3" opacity="0.55"/>
<path d="M1440,668 L1458,670 L1460,684 L1440,684 L1420,684 L1422,670 Z"
      fill="url(#amggt-caliper)" opacity="0.80"/>
${makeAMGSpokes(1440, 726, 76, 29, '#888482', '#b8b4b2')}
<circle cx="1440" cy="726" r="14" fill="#2e2c2a" stroke="#585452" stroke-width="1.5"/>
<circle cx="1440" cy="726" r="7" fill="#3c3836" stroke="#686462" stroke-width="1"/>
<ellipse cx="1440" cy="748" rx="116" ry="13" fill="#000" opacity="0.38"/>

<!-- ── LIGHTS ── -->
<!-- === AMG GT FRONT — narrow LED strip lights === -->
<!-- Headlight housing -->
<path d="M293,666 L350,650 L368,656 L370,676 L368,688 L350,693 L293,676 Z"
      fill="#080c0a" stroke="#282220" stroke-width="2"/>
<!-- Main LED strip element -->
<path d="M297,669 L344,656 L360,661 L360,682 L344,686 L297,674 Z"
      fill="#0a1010" opacity="0.9"/>
<!-- Slim DRL horizontal strip (AMG GT signature slim light) -->
<line x1="300" y1="663" x2="354" y2="656" stroke="#e0f0ff" stroke-width="2.5" opacity="0.90" filter="url(#amggt-glow-front)"/>
<line x1="300" y1="671" x2="354" y2="665" stroke="#c0e4ff" stroke-width="3" opacity="0.75" filter="url(#amggt-glow-front)"/>
<line x1="300" y1="678" x2="354" y2="673" stroke="#a8d8f8" stroke-width="2" opacity="0.55"/>
<!-- DRL bloom glow -->
<line x1="300" y1="671" x2="354" y2="665" stroke="#d8f0ff" stroke-width="10" opacity="0.18" filter="url(#amggt-glow-front)"/>
<!-- Oval main projector -->
<ellipse cx="330" cy="672" rx="12" ry="10" fill="#0a1820" opacity="0.88"/>
<ellipse cx="330" cy="672" rx="7" ry="6" fill="#b8d8f8" opacity="0.55" filter="url(#amggt-glow-front)"/>

<!-- === PANAMERICANA GRILLE — AMG vertical slats === -->
<!-- Grille outer frame -->
<path d="M288,724 L298,660 L380,644 L414,646 L416,700 L416,730 L288,730 Z"
      fill="#060808" stroke="#282220" stroke-width="2.5" opacity="0.96"/>
<!-- AMG star badge in grille centre -->
<polygon points="352,695 349,704 358,698 346,698 355,704"
         fill="#9a9898" opacity="0.6"/>
<!-- Panamericana vertical slats -->
<line x1="306" y1="656" x2="304" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="318" y1="652" x2="316" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="330" y1="650" x2="328" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="342" y1="648" x2="340" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="354" y1="646" x2="352" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="366" y1="646" x2="364" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="378" y1="647" x2="376" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="390" y1="648" x2="388" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>
<line x1="402" y1="649" x2="400" y2="728" stroke="#1e1c1a" stroke-width="2.5" opacity="0.72"/>

<!-- === AMG GT ROUND TAILLIGHTS === -->
<!-- Light cluster housing -->
<path d="M1492,634 L1576,634 L1580,660 L1576,686 L1492,686 L1488,660 Z"
      fill="#080c0a" stroke="#282220" stroke-width="2"/>
<!-- Outer round AMG light (signature circular cluster) -->
<circle cx="1514" cy="660" rx="28" ry="28" r="28" fill="#0a0c0a" stroke="#282220" stroke-width="2"/>
<circle cx="1514" cy="660" r="21" fill="#7f1414" opacity="0.75"/>
<circle cx="1514" cy="660" r="14" fill="#ef4444" opacity="0.92" filter="url(#amggt-glow-rear)"/>
<circle cx="1514" cy="660" r="8" fill="#fca5a5" opacity="0.85"/>
<circle cx="1514" cy="660" r="4" fill="#fde8e8" opacity="0.95"/>
<!-- Inner smaller round AMG light -->
<circle cx="1556" cy="660" r="20" fill="#0a0c0a" stroke="#282220" stroke-width="2"/>
<circle cx="1556" cy="660" r="14" fill="#991010" opacity="0.80" filter="url(#amggt-glow-rear)"/>
<circle cx="1556" cy="660" r="8" fill="#fca5a5" opacity="0.75"/>
<!-- Light cluster connector bar -->
<rect x="1510" y="658" width="50" height="4" rx="2" fill="#3a0808" opacity="0.4"/>

<!-- === CENTRAL TWIN EXHAUSTS — AMG GT signature === -->
<!-- Rear bumper diffuser -->
<path d="M1492,720 L1500,704 L1576,704 L1584,720 Z"
      fill="#060808" stroke="#181616" stroke-width="1.5" opacity="0.88"/>
<!-- 2 large round exhaust tips (centrally mounted — AMG GT distinctive) -->
<circle cx="1518" cy="716" r="16" fill="#0a0c0a" stroke="#504c4a" stroke-width="2.5"/>
<circle cx="1554" cy="716" r="16" fill="#0a0c0a" stroke="#504c4a" stroke-width="2.5"/>
<circle cx="1518" cy="716" r="10" fill="#040606" opacity="0.95"/>
<circle cx="1554" cy="716" r="10" fill="#040606" opacity="0.95"/>
<!-- Exhaust heat ring -->
<circle cx="1518" cy="716" r="14" fill="none" stroke="#684040" stroke-width="1" opacity="0.35"/>
<circle cx="1554" cy="716" r="14" fill="none" stroke="#684040" stroke-width="1" opacity="0.35"/>

<!-- ── DETAILS ── -->
<!-- Door handle -->
<rect x="900" y="632" width="56" height="9" rx="4.5"
      fill="#686462" stroke="#4c4846" stroke-width="1" opacity="0.62"/>
<rect x="902" y="640" width="54" height="3" rx="1.5" fill="#080808" opacity="0.30"/>

<!-- AMG branding on front bumper -->
<rect x="344" y="730" width="38" height="12" rx="2"
      fill="#0a0a0a" stroke="#3c3836" stroke-width="1.5" opacity="0.80"/>
<!-- AMG lettering hint (3 small bars) -->
<line x1="350" y1="733" x2="350" y2="739" stroke="#a09c9a" stroke-width="2" opacity="0.7"/>
<line x1="358" y1="733" x2="358" y2="739" stroke="#a09c9a" stroke-width="2" opacity="0.7"/>
<line x1="366" y1="733" x2="366" y2="739" stroke="#a09c9a" stroke-width="2" opacity="0.7"/>
<line x1="374" y1="733" x2="374" y2="739" stroke="#a09c9a" stroke-width="2" opacity="0.7"/>

<!-- Front bumper lower contour -->
<path d="M280,728 L292,700 L320,674 L366,658"
      fill="none" stroke="#a09c9a" stroke-width="2" opacity="0.42"/>

${end}`);

function makeAMGSpokes(cx: number, cy: number, r: number, ir: number, fill: string, highlight: string): string {
  // AMG 5-twin-spoke (10 blade spokes in pairs — elegant forged look)
  const pairs = 5;
  let paths = '';
  for (let i = 0; i < pairs; i++) {
    const angle = (i / pairs) * 2 * Math.PI - Math.PI / 2;
    // Each spoke pair = two parallel rectangular blades
    for (const w of [-4, 4]) {
      const perpAngle = angle + Math.PI / 2;
      const sx = Math.cos(perpAngle) * w;
      const sy = Math.sin(perpAngle) * w;
      // Tapered spoke: narrower at hub, wider at rim
      const ix1 = (cx + ir * Math.cos(angle) + sx * 0.5).toFixed(1);
      const iy1 = (cy + ir * Math.sin(angle) + sy * 0.5).toFixed(1);
      const ox1 = (cx + r * Math.cos(angle) + sx).toFixed(1);
      const oy1 = (cy + r * Math.sin(angle) + sy).toFixed(1);
      paths += `<line x1="${ix1}" y1="${iy1}" x2="${ox1}" y2="${oy1}" stroke="${w < 0 ? highlight : fill}" stroke-width="5.5" stroke-linecap="round" opacity="0.90"/>`;
    }
    // Spoke tip connector at rim
    const rx1 = (cx + r * Math.cos(angle) - 4 * Math.cos(angle + Math.PI / 2)).toFixed(1);
    const ry1 = (cy + r * Math.sin(angle) - 4 * Math.sin(angle + Math.PI / 2)).toFixed(1);
    const rx2 = (cx + r * Math.cos(angle) + 4 * Math.cos(angle + Math.PI / 2)).toFixed(1);
    const ry2 = (cy + r * Math.sin(angle) + 4 * Math.sin(angle + Math.PI / 2)).toFixed(1);
    paths += `<line x1="${rx1}" y1="${ry1}" x2="${rx2}" y2="${ry2}" stroke="${highlight}" stroke-width="4" opacity="0.50"/>`;
  }
  // Hub centre ring
  paths += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.22).toFixed(1)}" fill="${highlight}" opacity="0.48"/>`;
  return paths;
}
