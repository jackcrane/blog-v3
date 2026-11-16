const SKY = {
  FEW: "Few clouds",
  SCT: "Scattered clouds",
  BKN: "Broken clouds",
  OVC: "Overcast",
  VV: "Vertical visibility",
};
const WX = {
  MI: "shallow",
  BC: "patches of",
  PR: "partial",
  DR: "low drifting",
  BL: "blowing",
  SH: "showers of",
  TS: "thunderstorm with",
  FZ: "freezing",
  VC: "in the vicinity:",
  DZ: "drizzle",
  RA: "rain",
  SN: "snow",
  SG: "snow grains",
  IC: "ice crystals",
  PL: "ice pellets",
  GR: "hail",
  GS: "small hail",
  UP: "unknown precipitation",
  BR: "mist",
  FG: "fog",
  FU: "smoke",
  VA: "volcanic ash",
  DU: "dust",
  SA: "sand",
  HZ: "haze",
  PY: "spray",
  PO: "dust whirls",
  SQ: "squalls",
  FC: "funnel cloud",
  SS: "sandstorm",
  DS: "duststorm",
};
const signed = (m, n) => `${m ? "-" : ""}${+n}`;

// [pattern, describe(...captures)] checked in order; first match wins
const DECODERS = [
  [
    /^(METAR|SPECI)$/,
    (_, t) =>
      t === "METAR" ? "Routine weather report" : "Special (unscheduled) report",
  ],
  [
    /^(\d{2})(\d{2})(\d{2})Z$/,
    (_, d, h, m) => `Day ${+d} of month, ${h}:${m} UTC`,
  ],
  [
    /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/,
    (_, dir, spd, gust, unit) =>
      `Wind ${dir === "VRB" ? "variable" : `from ${dir}°`} at ${+spd} ${unit}${gust ? `, gusting ${+gust}` : ""}`,
  ],
  [
    /^(\d{3})V(\d{3})$/,
    (_, a, b) => `Wind direction varying between ${a}° and ${b}°`,
  ],
  [
    /^([MP]?)(\d+(?:\/\d+)?)SM$/,
    (_, q, v) =>
      `Visibility ${q === "M" ? "less than " : q === "P" ? "greater than " : ""}${v} statute mile(s)`,
  ],
  [/^9999$/, () => "Visibility 10 km or more"],
  [/^(\d{4})$/, (_, v) => `Visibility ${+v} meters`],
  [/^CAVOK$/, () => "Ceiling and visibility OK"],
  [
    /^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/,
    (_, c, h, t) =>
      `${SKY[c]} at ${+h * 100} ft AGL${t ? (t === "CB" ? " (cumulonimbus)" : " (towering cumulus)") : ""}`,
  ],
  [/^(SKC|CLR)$/, () => "Sky clear"],
  [
    /^(M?)(\d{2})\/(M?)(\d{2})?$/,
    (_, tm, t, dm, d) =>
      `Temperature ${signed(tm, t)}°C${d ? `, dew point ${signed(dm, d)}°C` : ""}`,
  ],
  [/^A(\d{2})(\d{2})$/, (_, a, b) => `Altimeter ${a}.${b} inHg`],
  [/^Q(\d{4})$/, (_, q) => `Altimeter ${+q} hPa`],
  [/^RMK$/, () => "Remarks section begins"],
  [
    /^AO([12])$/,
    (_, n) =>
      `Automated station${n === "2" ? " with precipitation discriminator" : ""}`,
  ],
  [
    /^SLP(\d{3})$/,
    (_, p) => {
      const hpa = +p / 10 + (+p >= 500 ? 900 : 1000);
      return `Sea-level pressure ${hpa.toFixed(1)} hPa`;
    },
  ],
  [
    /^T([01])(\d{3})([01])(\d{3})$/,
    (_, ts, t, ds, d) =>
      `Precise temp ${ts === "1" ? "-" : ""}${t / 10}°C, dew point ${ds === "1" ? "-" : ""}${d / 10}°C`,
  ],
  [
    /^([-+]?)((?:VC)?(?:MI|BC|PR|DR|BL|SH|TS|FZ)?(?:[A-Z]{2})+)$/,
    (_, i, rest) => {
      const parts = rest.match(/../g).map((c) => WX[c]);
      if (parts.some((p) => !p)) return null;
      const intensity = i === "-" ? "Light " : i === "+" ? "Heavy " : "";
      return intensity + parts.join(" ");
    },
  ],
];

function describe(text) {
  for (const [re, fn] of DECODERS) {
    const m = text.match(re);
    if (m) return fn(...m) ?? null;
  }
  return null;
}

// One floating tooltip, so <pre>'s overflow:auto can't clip it
const tip = document.createElement("div");
tip.className = "metar-tooltip";
tip.hidden = true;
document.body.append(tip);

function show(el) {
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  tip.style.left = `${Math.max(8, Math.min(r.left + scrollX, scrollX + innerWidth - tip.offsetWidth - 8))}px`;
  tip.style.top = `${r.bottom + scrollY + 6}px`;
}

for (const span of document.querySelectorAll(".language-metar code span")) {
  const text = span.textContent.trim();
  const desc = describe(text);
  if (!desc) continue;
  span.classList.add("metar-tip");
  span.dataset.tip = desc;
  span.addEventListener("mouseenter", () => show(span));
  span.addEventListener("mouseleave", () => (tip.hidden = true));
  span.tabIndex = 0; // keyboard + tap support
  span.addEventListener("focus", () => show(span));
  span.addEventListener("blur", () => (tip.hidden = true));
}
