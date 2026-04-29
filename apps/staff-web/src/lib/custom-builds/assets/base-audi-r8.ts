/**
 * Audi R8 — design-quality multi-layer SVG silhouette.
 *
 * L35 (locked): 5 base cars in P3.1. All inline SVG with multi-gradient body,
 *   glass layer, glow lights, ground reflection.
 * L46: Upgraded to design-quality silhouettes with model-accurate light
 *   signatures, wheel designs, body line creases, and refined gradients.
 *
 * Distinctive traits: mid-engine supercar wedge profile, iconic side blade
 * between wheel arches (contrasting panel), flying buttress C-pillars,
 * very low stance, wide sills, Audi laser/matrix LED headlights with blade DRL
 * extending into the door line, large rear diffuser with twin oval exhausts,
 * R8 multi-spoke Y-spoke alloys.
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

export const AUDI_R8_SVG = svgDataUri(`${preamble}
<defs>
  <!-- Body gradient — warm stone-grey R8 tone for hue-rotate paint filter -->
  <linearGradient id="r8-body" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#c8c2bc" stop-opacity="0.97"/>
    <stop offset="14%"  stop-color="#908880" stop-opacity="1"/>
    <stop offset="40%"  stop-color="#625c56" stop-opacity="1"/>
    <stop offset="66%"  stop-color="#3e3a36" stop-opacity="1"/>
    <stop offset="85%"  stop-color="#252220" stop-opacity="1"/>
    <stop offset="100%" stop-color="#131210" stop-opacity="1"/>
  </linearGradient>
  <!-- Roof sheen -->
  <linearGradient id="r8-sheen" x1="10%" y1="0%" x2="90%" y2="100%">
    <stop offset="0%"   stop-color="#f0ece8" stop-opacity="0.28"/>
    <stop offset="22%"  stop-color="#c0bcb8" stop-opacity="0.14"/>
    <stop offset="55%"  stop-color="#908c88" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="#131210" stop-opacity="0"/>
  </linearGradient>
  <!-- Side blade — contrasting dark carbon-look panel (R8 signature) -->
  <linearGradient id="r8-blade" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#282422" stop-opacity="1"/>
    <stop offset="50%"  stop-color="#141210" stop-opacity="1"/>
    <stop offset="100%" stop-color="#080808" stop-opacity="1"/>
  </linearGradient>
  <!-- Side skirt -->
  <linearGradient id="r8-skirt" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#3e3a36" stop-opacity="1"/>
    <stop offset="52%"  stop-color="#201e1c" stop-opacity="1"/>
    <stop offset="100%" stop-color="#0a0808" stop-opacity="1"/>
  </linearGradient>
  <!-- Hood gradient (short front hood — mid engine) -->
  <linearGradient id="r8-hood" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#bab4ae" stop-opacity="0.96"/>
    <stop offset="38%"  stop-color="#7c7670" stop-opacity="1"/>
    <stop offset="74%"  stop-color="#4c4844" stop-opacity="1"/>
    <stop offset="100%" stop-color="#2c2a28" stop-opacity="1"/>
  </linearGradient>
  <!-- Glass -->
  <linearGradient id="r8-glass" x1="0%" y1="0%" x2="5%" y2="100%">
    <stop offset="0%"   stop-color="#b4d0e4" stop-opacity="0.32"/>
    <stop offset="34%"  stop-color="#4888b0" stop-opacity="0.17"/>
    <stop offset="67%"  stop-color="#184460" stop-opacity="0.44"/>
    <stop offset="100%" stop-color="#040c12" stop-opacity="0.70"/>
  </linearGradient>
  <!-- Rear quarter glass -->
  <linearGradient id="r8-rglass" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#88bcd8" stop-opacity="0.28"/>
    <stop offset="100%" stop-color="#040c12" stop-opacity="0.62"/>
  </linearGradient>
  <!-- R8 carbon blade accent line gradient -->
  <linearGradient id="r8-blade-line" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#706c68" stop-opacity="0"/>
    <stop offset="20%"  stop-color="#908c88" stop-opacity="0.7"/>
    <stop offset="80%"  stop-color="#908c88" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="#706c68" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="r8-wheel" cx="35%" cy="29%" r="65%">
    <stop offset="0%"   stop-color="#a09c98"/>
    <stop offset="30%"  stop-color="#706c68"/>
    <stop offset="63%"  stop-color="#3c3836"/>
    <stop offset="100%" stop-color="#0e0c0a"/>
  </radialGradient>
  <!-- Audi R8 ceramic brake caliper — silver/yellow -->
  <radialGradient id="r8-caliper" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#c8b820"/>
    <stop offset="100%" stop-color="#807408"/>
  </radialGradient>
  <radialGradient id="r8-shadow" cx="50%" cy="24%" r="52%">
    <stop offset="0%"   stop-color="#000000" stop-opacity="0.70"/>
    <stop offset="70%"  stop-color="#000000" stop-opacity="0.28"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <filter id="r8-glow-front" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="7" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="r8-glow-rear" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Paintable body region — feColorMatrix paint target (L36) -->
  <filter id="r8-paint" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="painted"/>
  </filter>
</defs>

<!-- Ground shadow — R8 very low stance, wider shadow -->
<ellipse cx="940" cy="844" rx="705" ry="26" fill="url(#r8-shadow)"/>

<!-- ── LOWER BODY / SILL ── -->
<path d="M304,720 L318,700 L346,674 L418,652 L528,638 L730,630 L964,626 L1200,628 L1388,636 L1484,656 L1548,680 L1574,706 L1582,720 Z"
      fill="url(#r8-skirt)" data-paintable="false"/>

<!-- ── MAIN BODY SHELL ── -->
<path d="M290,730 L304,720 L318,700 L346,674 L418,652 L528,638 L730,630 L964,626 L1200,628 L1388,636 L1484,656 L1548,680 L1574,706 L1582,720 L1592,730 Z"
      fill="url(#r8-body)" filter="url(#r8-paint)" data-paintable="true"/>

<!-- Upper body — R8 wedge profile, cabin set forward-of-center for mid-engine -->
<path d="M528,638 L550,546 L584,498 L648,466 L758,448 L914,440 L1072,440 L1164,450 L1232,476 L1278,520 L1304,576 L1316,626 L1200,628 L964,626 L730,630 Z"
      fill="url(#r8-body)" filter="url(#r8-paint)" data-paintable="true"/>

<!-- Roof sheen -->
<path d="M560,498 L654,468 L768,450 L926,442 L1084,443 L1172,454 L1228,478 L1268,510 L1232,476 L1164,450 L914,440 L648,466 Z"
      fill="url(#r8-sheen)" pointer-events="none"/>

<!-- ── HOOD — short front nose (mid-engine layout) -->
<path d="M346,674 L360,646 L408,630 L472,620 L528,614 L550,546 L546,638 L528,638 L418,652 Z"
      fill="url(#r8-hood)" filter="url(#r8-paint)" data-paintable="true"/>
<!-- Short hood shut line -->
<path d="M362,646 Q440,622 528,614"
      fill="none" stroke="#9e9a96" stroke-width="1.5" opacity="0.40"/>

<!-- ── REAR ENGINE SECTION — R8 visible engine intake / buttress area -->
<path d="M1304,576 L1348,574 L1396,588 L1438,614 L1476,646 L1500,682 L1508,720 L1484,656 L1388,636 L1316,626 Z"
      fill="url(#r8-body)" filter="url(#r8-paint)" data-paintable="true"/>
<!-- Rear haunch crease -->
<path d="M1368,580 Q1418,604 1456,642"
      fill="none" stroke="#9e9a96" stroke-width="2" opacity="0.34"/>

<!-- ── SIDE BLADE — R8 signature contrasting panel between wheel arches -->
<rect x="676" y="634" width="462" height="26" rx="4"
      fill="url(#r8-blade)" stroke="#504c48" stroke-width="1.5" opacity="0.94"/>
<!-- Blade accent line (top edge highlight) -->
<line x1="680" y1="639" x2="1134" y2="639"
      stroke="url(#r8-blade-line)" stroke-width="1.5" opacity="0.7"/>
<!-- Blade lower edge -->
<line x1="680" y1="658" x2="1134" y2="658"
      stroke="#403c38" stroke-width="1" opacity="0.35"/>

<!-- ── FLYING BUTTRESS C-PILLARS — R8 distinctive open-air design element -->
<path d="M1222,476 L1284,520 L1306,568 L1292,570 L1270,526 L1208,484 Z"
      fill="#3e3a36" stroke="#505048" stroke-width="1.5"/>
<!-- Buttress channel accent -->
<path d="M1222,476 Q1258,510 1280,560"
      fill="none" stroke="#908c88" stroke-width="1.5" opacity="0.4"/>
<!-- Buttress outer edge highlight -->
<path d="M1284,520 L1306,568"
      fill="none" stroke="#706c68" stroke-width="2" opacity="0.3"/>

<!-- ── BODY CHARACTER LINES ── -->
<!-- R8 dramatic wedge crease along body side -->
<path d="M418,664 Q700,644 964,640 Q1196,638 1424,648"
      fill="none" stroke="#a4a09c" stroke-width="2.5" opacity="0.35"/>
<!-- Lower body line -->
<path d="M444,682 Q714,664 964,660 Q1200,657 1462,666"
      fill="none" stroke="#787470" stroke-width="1.5" opacity="0.24"/>
<!-- Door shut lines (R8 is coupe — single door each side visible from side) -->
<line x1="748" y1="630" x2="746" y2="718" stroke="#908c88" stroke-width="1.5" opacity="0.26"/>
<line x1="1098" y1="628" x2="1096" y2="716" stroke="#908c88" stroke-width="1.5" opacity="0.26"/>

<!-- ── FENDER FLARES ── -->
<!-- Front fender flare (R8 aggressive arch) -->
<path d="M418,652 Q460,626 526,620 Q590,616 626,636 L528,638 L528,638 Z"
      fill="url(#r8-body)" filter="url(#r8-paint)" data-paintable="true" opacity="0.62"/>
<path d="M420,652 Q464,627 529,621 Q594,617 630,638"
      fill="none" stroke="#c8c4c0" stroke-width="1.5" opacity="0.36"/>
<!-- Rear fender flare (R8 extreme rear arch) -->
<path d="M1296,638 Q1350,618 1412,620 Q1472,622 1516,648 L1484,656 L1388,636 Z"
      fill="url(#r8-body)" filter="url(#r8-paint)" data-paintable="true" opacity="0.70"/>
<path d="M1298,638 Q1354,619 1416,621 Q1476,623 1520,650"
      fill="none" stroke="#c8c4c0" stroke-width="1.5" opacity="0.36"/>

<!-- ── SIDE SKIRTS — R8 very wide low sills -->
<path d="M540,638 L540,720 L560,726 L1122,726 L1142,720 L1142,628 L964,624 L730,628 Z"
      fill="url(#r8-skirt)" opacity="0.76"/>

<!-- ── MID-ENGINE INTAKE (behind doors — R8 side air scoop) -->
<path d="M1142,648 L1152,636 L1188,638 L1192,660 L1162,662 L1140,654 Z"
      fill="#0c0a08" stroke="#2c2a28" stroke-width="1.5" opacity="0.88"/>
<!-- Intake mesh hint -->
<line x1="1154" y1="640" x2="1152" y2="660" stroke="#1e1c1a" stroke-width="2" opacity="0.5"/>
<line x1="1164" y1="638" x2="1162" y2="660" stroke="#1e1c1a" stroke-width="2" opacity="0.5"/>
<line x1="1174" y1="638" x2="1172" y2="660" stroke="#1e1c1a" stroke-width="2" opacity="0.5"/>

<!-- ── GLASS ── -->
<!-- Windscreen — R8 steep rake, small low cabin -->
<path d="M584,498 L648,466 L766,450 L988,444 L1124,446 L1160,466 L1150,498 L908,514 Z"
      fill="url(#r8-glass)" opacity="0.88"/>
<path d="M584,498 L648,466 L766,450 L988,444 L1124,446 L1160,466 L1150,498"
      fill="none" stroke="#2c2a28" stroke-width="3" opacity="0.88"/>
<!-- Windscreen reflection -->
<path d="M660,466 L778,452 L996,447 L1110,449 L1140,470 L900,480 Z"
      fill="white" opacity="0.050" pointer-events="none"/>

<!-- Rear glass (small — behind flying buttresses) -->
<path d="M1232,476 L1278,520 L1254,532 L1214,490 Z"
      fill="url(#r8-rglass)" opacity="0.76"/>
<path d="M1232,476 L1278,520 L1254,532" fill="none" stroke="#2c2a28" stroke-width="2" opacity="0.7"/>

<!-- Side windows — R8 low narrow greenhouse -->
<path d="M1152,496 L1150,498 L908,514 L588,494 L648,466 L780,451 L988,444 L1124,446 L1160,466 Z"
      fill="url(#r8-glass)" opacity="0.40"/>
<path d="M588,494 L908,514 L1150,498"
      fill="none" stroke="#2c2a28" stroke-width="2.5" opacity="0.74"/>

<!-- ── SIDE MIRROR — R8 blade-style aero mirror ── -->
<path d="M588,468 L614,462 L620,476 L616,494 L588,496 Z"
      fill="#2c2a28" stroke="#404038" stroke-width="1.5"/>

<!-- ── WHEELS ── -->
<!-- === FRONT WHEEL === -->
<!-- Arch inner shadow -->
<path d="M418,654 Q462,616 540,608 Q616,602 650,642 L528,638 L528,638 L418,652 Z"
      fill="#080a08" opacity="0.52"/>
<circle cx="526" cy="726" r="106" fill="#0e0c0a"/>
<circle cx="526" cy="726" r="102" fill="#161412" stroke="#2c2a28" stroke-width="2"/>
<circle cx="526" cy="726" r="67" fill="url(#r8-wheel)"/>
<!-- Brake disc -->
<circle cx="526" cy="726" r="53" fill="none" stroke="#2e2c2a" stroke-width="3" opacity="0.55"/>
<!-- R8 ceramic caliper -->
<path d="M526,676 L542,678 L544,692 L526,692 L508,692 L510,678 Z"
      fill="url(#r8-caliper)" opacity="0.76"/>
<!-- R8 multi-spoke Y-spoke design -->
${makeR8Spokes(526, 726, 67, 26, '#6e6a66', '#9e9a96')}
<circle cx="526" cy="726" r="13" fill="#2c2a28" stroke="#585450" stroke-width="1.5"/>
<circle cx="526" cy="726" r="7" fill="#3c3836" stroke="#686462" stroke-width="1"/>
<ellipse cx="526" cy="748" rx="106" ry="13" fill="#000" opacity="0.38"/>

<!-- === REAR WHEEL — R8 wider (extreme rear tyre) === -->
<!-- Arch inner shadow -->
<path d="M1290,640 Q1336,602 1416,594 Q1494,588 1532,630 L1484,656 L1388,636 Z"
      fill="#080a08" opacity="0.52"/>
<circle cx="1436" cy="726" r="120" fill="#0e0c0a"/>
<circle cx="1436" cy="726" r="116" fill="#161412" stroke="#2c2a28" stroke-width="2"/>
<circle cx="1436" cy="726" r="78" fill="url(#r8-wheel)"/>
<circle cx="1436" cy="726" r="62" fill="none" stroke="#2e2c2a" stroke-width="3" opacity="0.55"/>
<path d="M1436,668 L1454,670 L1456,686 L1436,686 L1416,686 L1418,670 Z"
      fill="url(#r8-caliper)" opacity="0.76"/>
${makeR8Spokes(1436, 726, 78, 30, '#6e6a66', '#9e9a96')}
<circle cx="1436" cy="726" r="15" fill="#2c2a28" stroke="#585450" stroke-width="1.5"/>
<circle cx="1436" cy="726" r="8" fill="#3c3836" stroke="#686462" stroke-width="1"/>
<ellipse cx="1436" cy="748" rx="120" ry="13" fill="#000" opacity="0.38"/>

<!-- ── LIGHTS ── -->
<!-- === AUDI R8 LASER/MATRIX HEADLIGHT — angular wedge with blade extending into door -->
<!-- Headlight housing -->
<path d="M306,668 L366,656 L390,660 L392,682 L390,694 L366,698 L306,686 Z"
      fill="#0c0a08" stroke="#2c2a28" stroke-width="2"/>
<!-- Main LED element -->
<path d="M310,671 L360,659 L380,664 L380,688 L360,692 L310,682 Z"
      fill="#0e1010" opacity="0.9"/>
<!-- Audi R8 blade DRL signature — horizontal lines extending into door (distinctive!) -->
<line x1="314" y1="667" x2="384" y2="661" stroke="#fffde0" stroke-width="3" opacity="0.94" filter="url(#r8-glow-front)"/>
<line x1="314" y1="674" x2="384" y2="669" stroke="#fff8a0" stroke-width="2.5" opacity="0.74" filter="url(#r8-glow-front)"/>
<line x1="314" y1="681" x2="384" y2="677" stroke="#ffee60" stroke-width="2" opacity="0.54"/>
<!-- Blade DRL extends into door line (R8 signature — the light "blade" continues along door) -->
<line x1="384" y1="661" x2="528" y2="645" stroke="#fffde0" stroke-width="1.5" opacity="0.28" filter="url(#r8-glow-front)"/>
<line x1="384" y1="669" x2="528" y2="654" stroke="#fff8a0" stroke-width="1" opacity="0.18"/>
<!-- DRL bloom -->
<line x1="314" y1="667" x2="384" y2="661" stroke="#fff8c0" stroke-width="9" opacity="0.20" filter="url(#r8-glow-front)"/>
<!-- Main laser projector (central headlight element) -->
<ellipse cx="350" cy="676" rx="14" ry="12" fill="#0a1820" opacity="0.88"/>
<ellipse cx="350" cy="676" rx="8" ry="7" fill="#b8d8f8" opacity="0.55" filter="url(#r8-glow-front)"/>

<!-- === SINGLEFRAME GRILLE — R8 very low front intake === -->
<path d="M300,718 L312,680 L380,662 L422,662 L426,686 L426,728 L300,728 Z"
      fill="#080a08" stroke="#2c2a28" stroke-width="2.5" opacity="0.96"/>
<!-- R8 Singleframe honeycomb -->
<path d="M316,694 L340,688 L364,694 L364,706 L340,712 L316,706 Z"
      fill="none" stroke="#1a1816" stroke-width="1.2" opacity="0.55"/>
<path d="M340,688 L364,694 L388,688 L388,700 L364,706 L340,700 Z"
      fill="none" stroke="#1a1816" stroke-width="1.2" opacity="0.55"/>
<path d="M316,706 L340,712 L364,706 L364,718 L340,724 L316,718 Z"
      fill="none" stroke="#1a1816" stroke-width="1.2" opacity="0.55"/>

<!-- === REAR FULL-WIDTH LED BAR + OLED segments === -->
<!-- Light housing -->
<path d="M1508,632 L1580,634 L1584,650 L1584,672 L1580,686 L1508,686 L1504,672 L1504,648 Z"
      fill="#0c0a08" stroke="#2c2a28" stroke-width="2"/>
<!-- Full-width OLED strip -->
<rect x="1508" y="648" width="74" height="16" rx="2" fill="#3c0808" opacity="0.56"/>
<line x1="1508" y1="656" x2="1582" y2="656"
      stroke="#ef4444" stroke-width="6" opacity="0.96" filter="url(#r8-glow-rear)"/>
<line x1="1508" y1="656" x2="1582" y2="656"
      stroke="#fca5a5" stroke-width="2.5" opacity="0.60"/>
<!-- OLED segment lines (R8 segmented rear light look) -->
<line x1="1526" y1="634" x2="1526" y2="684" stroke="#1a1816" stroke-width="1.5" opacity="0.50"/>
<line x1="1544" y1="634" x2="1544" y2="684" stroke="#1a1816" stroke-width="1.5" opacity="0.50"/>
<line x1="1562" y1="634" x2="1562" y2="684" stroke="#1a1816" stroke-width="1.5" opacity="0.50"/>
<!-- Reverse light -->
<rect x="1510" y="673" width="36" height="8" rx="1" fill="#d4dce4" opacity="0.26"/>

<!-- === LARGE REAR DIFFUSER + TWIN EXHAUSTS === -->
<!-- Diffuser main panel -->
<path d="M1494,720 L1504,702 L1584,702 L1594,720 Z"
      fill="#080a08" stroke="#1a1816" stroke-width="1.5" opacity="0.90"/>
<!-- Diffuser fins -->
<line x1="1512" y1="704" x2="1514" y2="720" stroke="#1e1c1a" stroke-width="2" opacity="0.55"/>
<line x1="1530" y1="704" x2="1532" y2="720" stroke="#1e1c1a" stroke-width="2" opacity="0.55"/>
<line x1="1548" y1="704" x2="1550" y2="720" stroke="#1e1c1a" stroke-width="2" opacity="0.55"/>
<line x1="1566" y1="704" x2="1568" y2="720" stroke="#1e1c1a" stroke-width="2" opacity="0.55"/>
<line x1="1584" y1="704" x2="1586" y2="720" stroke="#1e1c1a" stroke-width="2" opacity="0.55"/>
<!-- Twin large oval exhaust tips -->
<ellipse cx="1524" cy="716" rx="16" ry="10" fill="#0c0a08" stroke="#4c4848" stroke-width="2.5"/>
<ellipse cx="1566" cy="716" rx="16" ry="10" fill="#0c0a08" stroke="#4c4848" stroke-width="2.5"/>
<ellipse cx="1524" cy="716" rx="10" ry="6" fill="#040406" opacity="0.96"/>
<ellipse cx="1566" cy="716" rx="10" ry="6" fill="#040406" opacity="0.96"/>
<!-- Exhaust heat ring -->
<ellipse cx="1524" cy="716" rx="14" ry="8" fill="none" stroke="#684040" stroke-width="1" opacity="0.32"/>
<ellipse cx="1566" cy="716" rx="14" ry="8" fill="none" stroke="#684040" stroke-width="1" opacity="0.32"/>

<!-- ── DETAILS ── -->
<!-- Door handle -->
<rect x="880" y="640" width="54" height="9" rx="4.5"
      fill="#6e6a66" stroke="#4e4a46" stroke-width="1" opacity="0.62"/>
<rect x="882" y="648" width="52" height="3" rx="1.5" fill="#080808" opacity="0.28"/>

<!-- Quattro rings badge -->
<circle cx="360" cy="730" r="6" fill="#3c3836" stroke="#686460" stroke-width="1.5"/>
<circle cx="373" cy="730" r="6" fill="#3c3836" stroke="#686460" stroke-width="1.5"/>
<circle cx="386" cy="730" r="6" fill="#3c3836" stroke="#686460" stroke-width="1.5"/>
<circle cx="399" cy="730" r="6" fill="#3c3836" stroke="#686460" stroke-width="1.5"/>

<!-- Front bumper lower -->
<path d="M296,728 L308,700 L338,674 L376,660"
      fill="none" stroke="#9e9a96" stroke-width="2" opacity="0.42"/>

${end}`);

function makeR8Spokes(cx: number, cy: number, r: number, ir: number, fill: string, highlight: string): string {
  // R8 10-spoke Y-spoke design (alternating wider main + thinner cross spokes)
  const spokes = 10;
  let paths = '';
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * 2 * Math.PI - Math.PI / 2;
    const isMain = i % 2 === 0;
    const x1 = (cx + ir * Math.cos(angle)).toFixed(1);
    const y1 = (cy + ir * Math.sin(angle)).toFixed(1);
    const x2 = (cx + r * Math.cos(angle)).toFixed(1);
    const y2 = (cy + r * Math.sin(angle)).toFixed(1);
    if (isMain) {
      // Main Y-spoke — wider, tapered
      const perpA = angle + Math.PI / 2;
      const spread = 3;
      const paths_part = [
        `<line x1="${(cx + ir * Math.cos(angle) - spread * Math.cos(perpA)).toFixed(1)}" y1="${(cy + ir * Math.sin(angle) - spread * Math.sin(perpA)).toFixed(1)}" x2="${(cx + r * Math.cos(angle) - spread * 1.6 * Math.cos(perpA)).toFixed(1)}" y2="${(cy + r * Math.sin(angle) - spread * 1.6 * Math.sin(perpA)).toFixed(1)}" stroke="${highlight}" stroke-width="5" stroke-linecap="round" opacity="0.92"/>`,
        `<line x1="${(cx + ir * Math.cos(angle) + spread * Math.cos(perpA)).toFixed(1)}" y1="${(cy + ir * Math.sin(angle) + spread * Math.sin(perpA)).toFixed(1)}" x2="${(cx + r * Math.cos(angle) + spread * 1.6 * Math.cos(perpA)).toFixed(1)}" y2="${(cy + r * Math.sin(angle) + spread * 1.6 * Math.sin(perpA)).toFixed(1)}" stroke="${fill}" stroke-width="5" stroke-linecap="round" opacity="0.88"/>`,
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${highlight}" stroke-width="6" stroke-linecap="round" opacity="0.82"/>`,
      ];
      paths += paths_part.join('');
    } else {
      // Cross spoke — thinner
      paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="3.5" stroke-linecap="round" opacity="0.65"/>`;
    }
    // Rim edge marker
    paths += `<circle cx="${x2}" cy="${y2}" r="2" fill="${isMain ? highlight : fill}" opacity="${isMain ? 0.55 : 0.30}"/>`;
  }
  paths += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.20).toFixed(1)}" fill="${highlight}" opacity="0.46"/>`;
  return paths;
}
