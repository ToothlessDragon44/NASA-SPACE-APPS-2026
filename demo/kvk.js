/* Field Shift: KVK crop calendar as a small, collapsed reference. Loads AFTER extras.js */
(function () {
  window.KVK_CAL = {
    scarcity: { name: "Deccan scarcity zone",
      d: ["ahilyanagar","ahmednagar","ahmadnagar","solapur","beed","jalna","sambhajinagar","aurangabad","dharashiv","osmanabad","dhule","jalgaon"],
      k: ["Bajra (mid Jun-Jul)","Soybean (mid Jun-early Jul)","Tur (Jun-Jul)","Moong (Jun-Jul)","Cotton (Jun, with rain)"],
      r: ["Rabi jowar (mid Sep-mid Oct)","Safflower (Sep-Oct)","Gram (Oct-mid Nov)","Wheat (Nov 1-25)","Onion (Nov-Dec transplant)"],
      z: ["Groundnut (Jan-Feb)","Summer bajra (Feb-Mar)","Moong (Mar)","Fodder maize (Feb-Mar)","Vegetables (Feb-Mar)"] },
    plain: { name: "Western Maharashtra plains",
      d: ["pune","satara","sangli","kolhapur","nashik","nandurbar"],
      k: ["Soybean (Jun-Jul)","Maize (Jun-Jul)","Rice (Jun-Jul, Kolhapur)","Groundnut (Jun-Jul)","Sugarcane Adsali (Jul-Aug)"],
      r: ["Wheat (Nov)","Gram (Oct-Nov)","Rabi jowar (Sep-Oct)","Onion (Nov-Dec)","Sugarcane Pre-seasonal (Oct-Nov)"],
      z: ["Groundnut (Jan-Feb)","Vegetables (Feb-Mar)","Sugarcane Suru (Dec-Jan)","Fodder maize (Mar)","Moong (Mar)"] },
    konkan: { name: "Konkan coastal zone",
      d: ["raigad","ratnagiri","sindhudurg","thane","palghar","mumbai"],
      k: ["Rice (Jun-Jul)","Ragi (Jun-Jul)","Varai (Jun-Jul)","Vegetables (Jun-Jul)"],
      r: ["Cowpea (Nov-Dec)","Groundnut (Nov-Dec)","Pulses after rice (Oct-Nov)","Vegetables (Nov)"],
      z: ["Vegetables (Feb-Mar)","Groundnut (Jan)","Watermelon (Jan-Feb)"] },
    vidarbha: { name: "Vidarbha zone",
      d: ["nagpur","amravati","akola","yavatmal","wardha","buldhana","washim","chandrapur","gadchiroli","bhandara","gondia"],
      k: ["Cotton (Jun-Jul)","Soybean (Jun-Jul)","Tur (Jun-Jul)","Rice (Jun-Jul, east Vidarbha)"],
      r: ["Gram (Oct-Nov)","Wheat (Nov)","Linseed (Oct-Nov)","Rabi jowar (Sep-Oct)"],
      z: ["Sesame (Feb-Mar)","Moong (Feb-Mar)","Groundnut (Jan-Feb)","Vegetables (Feb)"] },
    marathwada: { name: "Marathwada zone",
      d: ["latur","nanded","parbhani","hingoli"],
      k: ["Soybean (mid Jun-Jul)","Tur (Jun-Jul)","Cotton (Jun)","Moong (Jun-Jul)"],
      r: ["Gram (Oct-Nov)","Rabi jowar (Sep-Oct)","Wheat (Nov)","Safflower (Sep-Oct)"],
      z: ["Summer moong (Mar)","Groundnut (Jan-Feb)","Fodder (Feb-Mar)","Vegetables (Feb-Mar)"] },
    general: { name: "General India calendar (district data not added yet)", d: [],
      k: ["Rice (Jun-Jul)","Maize (Jun-Jul)","Cotton (Jun-Jul)","Soybean (Jun-Jul)","Tur (Jun-Jul)","Moong (Jun-Jul)"],
      r: ["Wheat (Nov)","Gram (Oct-Nov)","Mustard (Oct)","Barley (Nov)","Onion (Nov-Dec)"],
      z: ["Moong (Mar)","Fodder (Feb-Mar)","Vegetables (Feb-Mar)","Groundnut (Jan-Feb)"] }
  };

  const LB = {
    en: { ttl:"KVK calendar for your district", dist:"District", seas:["Kharif (Jun-Oct)","Rabi (Nov-Feb)","Summer / Zaid (Mar-May)"],
          next:"Next season", load:"Finding your district…", note:"Typical zone dates. Confirm exact sowing dates with your local KVK." },
    hi: { ttl:"आपके ज़िले का KVK कैलेंडर", dist:"ज़िला", seas:["खरीफ (जून-अक्टूबर)","रबी (नवंबर-फरवरी)","गर्मी / ज़ायद (मार्च-मई)"],
          next:"अगला सीज़न", load:"आपका ज़िला खोज रहे हैं…", note:"क्षेत्र की सामान्य तारीखें। सही बुवाई तारीख स्थानीय KVK से पूछें।" },
    mr: { ttl:"तुमच्या जिल्ह्याचे KVK कॅलेंडर", dist:"जिल्हा", seas:["खरीप (जून-ऑक्टोबर)","रब्बी (नोव्हेंबर-फेब्रुवारी)","उन्हाळी (मार्च-मे)"],
          next:"पुढील हंगाम", load:"तुमचा जिल्हा शोधत आहोत…", note:"विभागातील सर्वसाधारण तारखा. अचूक पेरणी तारीख स्थानिक KVK कडून विचारा." }
  };
  const lb = k => (LB[state.lang] || LB.en)[k];

  const st = document.createElement("style");
  st.textContent = `details.kvk{margin-top:14px;padding:8px 12px;border:1px dashed var(--line);border-radius:12px;font-size:12.5px;line-height:1.5;color:var(--muted)}
    details.kvk summary{cursor:pointer;font-weight:600;list-style:none}
    details.kvk summary::before{content:"🗓️ "}
    details.kvk .h{font-weight:700;color:#475569;margin-top:8px}
    details.kvk small{display:block;margin-top:8px;color:#94a3b8;font-style:italic}`;
  document.head.appendChild(st);

  const box = document.createElement("details"); box.className = "kvk only-ok";
  const anchor = document.querySelector("#result .disc");
  anchor.after(box);               // very bottom of the result card

  const cache = {}, pending = {};
  function lookup(l, done) {
    const key = l.lat.toFixed(2) + "," + l.lon.toFixed(2);
    if (key in cache) return cache[key];
    if (!pending[key]) {
      pending[key] = true;
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${l.lat}&lon=${l.lon}`)
        .then(r => r.json()).then(j => {
          const a = j.address || {};
          cache[key] = { dist: (a.state_district || a.county || a.city || "").replace(/ district$/i, ""), st: a.state || "" };
        }).catch(() => { cache[key] = { dist: "", st: "" }; }).then(done);
    }
    return undefined;
  }
  const zoneOf = dist => {
    const x = dist.toLowerCase();
    return Object.keys(KVK_CAL).find(z => KVK_CAL[z].d.some(n => x.includes(n))) || "general";
  };

  const prev = renderResult;
  renderResult = function () {
    const wasOpen = box.open;
    prev();
    const d = state.last;
    if (!d || d.err || d.mean == null || !state.loc) { box.style.display = "none"; return; }
    box.style.display = "block"; box.open = wasOpen;
    const info = lookup(state.loc, () => renderResult());
    if (!info) { box.innerHTML = `<summary>${lb("ttl")}</summary>${lb("load")}`; return; }

    const Z = KVK_CAL[zoneOf(info.dist)];
    const m = new Date().getMonth();
    const si = m >= 5 && m <= 9 ? 0 : (m >= 10 || m <= 1 ? 1 : 2);
    const keys = ["k", "r", "z"];
    const where = info.dist ? info.dist + (info.st ? ", " + info.st : "") : "—";
    box.innerHTML = `<summary>${lb("ttl")}</summary>
      <div>${lb("dist")}: <strong>${where}</strong> · ${Z.name}</div>
      <div class="h">${lb("seas")[si]}</div><div>${Z[keys[si]].join(", ")}</div>
      <div class="h">${lb("next")}: ${lb("seas")[(si + 1) % 3]}</div><div>${Z[keys[(si + 1) % 3]].join(", ")}</div>
      <small>${lb("note")}</small>`;
  };
  renderResult();
})();