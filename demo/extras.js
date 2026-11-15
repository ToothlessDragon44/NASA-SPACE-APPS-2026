/* Field Shift extras: loads AFTER the main script in index.html */
(function () {
  /* ---------- 1) More languages (core UI strings; the rest falls back to English) ---------- */
  T.en.lbl_sit = "Real situation"; T.en.lbl_crop = "Crops to grow and why";
  T.hi.lbl_sit = "असली स्थिति"; T.hi.lbl_crop = "कौन सी फसलें लें और क्यों";
  T.mr.lbl_sit = "प्रत्यक्ष परिस्थिती"; T.mr.lbl_crop = "कोणती पिके घ्यावीत आणि का";
  T.gu = { name:"ગુજરાતી", sub:"અવકાશમાંથી તમારા ખેતરને જાણો", s1:"તમારું ખેતર ક્યાં છે?", useLoc:"📍 મારું સ્થાન વાપરો",
    s2:"તમે શું જાણવા માંગો છો?", s3:"કેટલા દિવસ માટે?", days:"{n} દિવસ", go:"મારું ખેતર તપાસો", planner:"પાક ફેરબદલી આયોજક ખોલો →",
    c_crop:"મારા પાકનું સ્વાસ્થ્ય", c_soil:"જમીનમાં ભેજ", c_heat:"ખેતરની ગરમી", c_rain:"પડેલો વરસાદ",
    lbl_sit:"વાસ્તવિક સ્થિતિ", lbl_crop:"કયા પાક લેવા અને શા માટે" };
  T.bn = { name:"বাংলা", sub:"মহাকাশ থেকে আপনার জমিকে জানুন", s1:"আপনার জমি কোথায়?", useLoc:"📍 আমার অবস্থান ব্যবহার করুন",
    s2:"আপনি কী জানতে চান?", s3:"কত দিনের জন্য?", days:"{n} দিন", go:"আমার জমি দেখুন", planner:"ফসল আবর্তন পরিকল্পক খুলুন →",
    c_crop:"ফসলের স্বাস্থ্য", c_soil:"মাটির আর্দ্রতা", c_heat:"জমির গরম", c_rain:"বৃষ্টি যা হয়েছে",
    lbl_sit:"প্রকৃত অবস্থা", lbl_crop:"কোন ফসল চাষ করবেন ও কেন" };
  T.ta = { name:"தமிழ்", sub:"விண்வெளியிலிருந்து உங்கள் வயலை அறியுங்கள்", s1:"உங்கள் வயல் எங்கே?", useLoc:"📍 என் இருப்பிடத்தைப் பயன்படுத்து",
    s2:"நீங்கள் என்ன அறிய விரும்புகிறீர்கள்?", s3:"எத்தனை நாட்கள்?", days:"{n} நாட்கள்", go:"என் வயலைச் சோதி", planner:"பயிர் சுழற்சி திட்டத்தைத் திற →",
    c_crop:"பயிர் ஆரோக்கியம்", c_soil:"மண்ணில் ஈரம்", c_heat:"வயலின் வெப்பம்", c_rain:"பெய்த மழை",
    lbl_sit:"உண்மை நிலைமை", lbl_crop:"எந்த பயிர்கள், ஏன்" };
  T.te = { name:"తెలుగు", sub:"అంతరిక్షం నుండి మీ పొలాన్ని తెలుసుకోండి", s1:"మీ పొలం ఎక్కడ?", useLoc:"📍 నా లొకేషన్ వాడండి",
    s2:"మీరు ఏం తెలుసుకోవాలనుకుంటున్నారు?", s3:"ఎన్ని రోజులకు?", days:"{n} రోజులు", go:"నా పొలాన్ని చూడండి", planner:"పంట మార్పిడి ప్లానర్ తెరవండి →",
    c_crop:"పంట ఆరోగ్యం", c_soil:"నేలలో తేమ", c_heat:"పొలంలో వేడి", c_rain:"కురిసిన వర్షం",
    lbl_sit:"అసలు పరిస్థితి", lbl_crop:"ఏ పంటలు వేయాలి, ఎందుకు" };

  const fl = document.createElement("link"); fl.rel = "stylesheet";
  fl.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati&family=Noto+Sans+Bengali&family=Noto+Sans+Tamil&family=Noto+Sans+Telugu&display=swap";
  document.head.appendChild(fl);

  // language dropdown replaces the 3 buttons
  const names = { en:"English", hi:"हिन्दी", mr:"मराठी", gu:T.gu.name, bn:T.bn.name, ta:T.ta.name, te:T.te.name };
  const lang = document.querySelector(".lang");
  lang.innerHTML = '<select id="langSel">' + Object.keys(names).map(k => `<option value="${k}">${names[k]}</option>`).join("") + "</select>";
  const sel = document.getElementById("langSel");
  sel.style.cssText = "border:0;background:transparent;font:inherit;font-weight:700;font-size:13px;color:#166534;padding:6px 8px;cursor:pointer;outline:none";
  sel.value = state.lang;
  sel.onchange = () => { state.lang = sel.value; try { localStorage.setItem("fs_lang", state.lang); } catch (e) {} applyLang(); };
  document.body.style.fontFamily = "'Inter','Noto Sans Devanagari','Noto Sans Gujarati','Noto Sans Bengali','Noto Sans Tamil','Noto Sans Telugu',system-ui,sans-serif";

  /* ---------- 2) Planner link -> button ---------- */
  const st = document.createElement("style");
  st.textContent = `a.planner{display:block;text-align:center;margin-top:14px;padding:14px;border-radius:16px;border:2px solid var(--accent2);
    background:#fff;color:#166534;font-size:15px;font-weight:700;transition:all .2s}
    a.planner:hover{background:#f0fdf4;transform:translateY(-2px);text-decoration:none;box-shadow:0 8px 18px rgba(34,197,94,.2)}
    .advice{margin-top:12px;padding:13px 14px;background:#fff;border:1px solid var(--line);border-radius:14px;font-size:14.5px;line-height:1.5}
    .advice b{display:block;font-size:12.5px;color:var(--muted);margin-bottom:4px}
    .advice .cr{font-weight:800;color:#166534;margin-bottom:4px}`;
  document.head.appendChild(st);

  /* ---------- 3) Crop advice: [crops, reason] per verdict key ---------- */
  const A = {
    en: {
      crop_good:["Same crop now; next season gram, tur or soybean","Healthy growth means soil and water suit this crop. A pulse next season restores nitrogen."],
      crop_mid:["Gram, wheat, sorghum (jowar)","Average growth: choose hardy crops needing moderate water and add compost or a nitrogen top-dressing."],
      crop_bad:["Bajra, sorghum (jowar), horse gram, castor","Weak or bare land: low-input, drought-tolerant crops survive best. Test soil and check pests first."],
      soil_good:["Wheat, onion, sugarcane, maize, vegetables","Good soil water supports thirsty crops and lowers irrigation cost."],
      soil_mid:["Gram, safflower, sorghum, wheat","Moderate moisture suits medium-water crops; irrigate at critical growth stages."],
      soil_bad:["Bajra, sorghum, gram, safflower, pulses","Dry soil: deep-rooted, low-water crops need fewer irrigations. Mulch to hold moisture."],
      heat_good:["Wheat, gram, vegetables, maize","Mild ground temperature lets seeds sprout and grow without heat stress."],
      heat_mid:["Sorghum, maize, cotton, groundnut","Warm ground: pick heat-tolerant crops and irrigate in the evening."],
      heat_bad:["Bajra, sorghum, guar, moth bean","Very hot ground: only heat-hardy crops do well. Mulch and shade nets protect young plants."],
      rain_low:["Bajra, sorghum, gram, horse gram","Little rain: short-duration, drought-hardy crops; irrigate if water is available."],
      rain_ok:["Soybean, cotton, tur, maize, groundnut","Moderate rain fits most main-season crops; check soil by hand before sowing."],
      rain_high:["Rice, sugarcane, turmeric, ragi","Plenty of rain suits water-loving crops; keep drains open to avoid waterlogging."] },
    hi: {
      crop_good:["अभी वही फसल; अगले सीज़न चना, अरहर या सोयाबीन","स्वस्थ फसल का मतलब मिट्टी-पानी इस फसल के अनुकूल हैं। अगले सीज़न दलहन से नाइट्रोजन लौटती है।"],
      crop_mid:["चना, गेहूँ, ज्वार","औसत बढ़त: कम पानी वाली मज़बूत फसलें चुनें और खाद या नाइट्रोजन दें।"],
      crop_bad:["बाजरा, ज्वार, कुलथी, अरंडी","कमज़ोर या खाली खेत: कम लागत वाली सूखा-सहने वाली फसलें टिकती हैं। पहले मिट्टी और कीट जाँचें।"],
      soil_good:["गेहूँ, प्याज़, गन्ना, मक्का, सब्ज़ियाँ","अच्छी नमी ज़्यादा पानी वाली फसलों को सहारा देती है और सिंचाई खर्च घटाती है।"],
      soil_mid:["चना, कुसुम, ज्वार, गेहूँ","मध्यम नमी मध्यम पानी वाली फसलों के लिए ठीक है; ज़रूरी अवस्थाओं पर सिंचाई करें।"],
      soil_bad:["बाजरा, ज्वार, चना, कुसुम, दलहन","सूखी मिट्टी: गहरी जड़ और कम पानी वाली फसलें। नमी रोकने के लिए मल्चिंग करें।"],
      heat_good:["गेहूँ, चना, सब्ज़ियाँ, मक्का","हल्का तापमान बीज के अंकुरण और बढ़त के लिए ठीक है।"],
      heat_mid:["ज्वार, मक्का, कपास, मूँगफली","गर्म ज़मीन: गर्मी सहने वाली फसलें लें और शाम को सिंचाई करें।"],
      heat_bad:["बाजरा, ज्वार, ग्वार, मोठ","बहुत गर्म ज़मीन: केवल गर्मी-सहनशील फसलें। मल्च और शेड नेट से पौधे बचाएँ।"],
      rain_low:["बाजरा, ज्वार, चना, कुलथी","कम बारिश: कम अवधि की सूखा-सहनशील फसलें; पानी हो तो सिंचाई करें।"],
      rain_ok:["सोयाबीन, कपास, अरहर, मक्का, मूँगफली","मध्यम बारिश अधिकतर मुख्य फसलों के लिए ठीक है; बोने से पहले मिट्टी हाथ से जाँचें।"],
      rain_high:["धान, गन्ना, हल्दी, रागी","भरपूर बारिश पानी पसंद फसलों के लिए ठीक है; जलभराव रोकने को नालियाँ खुली रखें।"] },
    mr: {
      crop_good:["सध्याचे पीक; पुढील हंगामात हरभरा, तूर किंवा सोयाबीन","निरोगी वाढ म्हणजे जमीन-पाणी या पिकाला योग्य आहे. पुढील हंगामात कडधान्याने नत्र परत मिळते."],
      crop_mid:["हरभरा, गहू, ज्वारी","सरासरी वाढ: कमी पाणी लागणारी टिकाऊ पिके निवडा आणि खत किंवा नत्र द्या."],
      crop_bad:["बाजरी, ज्वारी, कुळीथ, एरंडी","कमकुवत किंवा रिकामे शेत: कमी खर्चाची दुष्काळसहन पिके टिकतात. आधी माती आणि कीड तपासा."],
      soil_good:["गहू, कांदा, ऊस, मका, भाजीपाला","चांगला ओलावा जास्त पाणी लागणाऱ्या पिकांना आधार देतो आणि पाण्याचा खर्च कमी करतो."],
      soil_mid:["हरभरा, करडई, ज्वारी, गहू","मध्यम ओलावा मध्यम पाण्याच्या पिकांना योग्य; महत्त्वाच्या अवस्थेत पाणी द्या."],
      soil_bad:["बाजरी, ज्वारी, हरभरा, करडई, कडधान्ये","कोरडी जमीन: खोल मुळांची, कमी पाण्याची पिके. ओलावा टिकवण्यासाठी आच्छादन करा."],
      heat_good:["गहू, हरभरा, भाजीपाला, मका","सौम्य तापमान बियाणे उगवण्यास आणि वाढीस योग्य आहे."],
      heat_mid:["ज्वारी, मका, कापूस, भुईमूग","तापलेली जमीन: उष्णता सहन करणारी पिके घ्या आणि संध्याकाळी पाणी द्या."],
      heat_bad:["बाजरी, ज्वारी, गवार, मटकी","खूप तापलेली जमीन: फक्त उष्णतासहन पिके. आच्छादन आणि शेडनेटने रोपे वाचवा."],
      rain_low:["बाजरी, ज्वारी, हरभरा, कुळीथ","कमी पाऊस: कमी कालावधीची दुष्काळसहन पिके; पाणी असल्यास सिंचन करा."],
      rain_ok:["सोयाबीन, कापूस, तूर, मका, भुईमूग","मध्यम पाऊस बहुतेक मुख्य पिकांना योग्य; पेरणीपूर्वी माती हाताने तपासा."],
      rain_high:["भात, ऊस, हळद, नाचणी","भरपूर पाऊस पाणी आवडणाऱ्या पिकांना योग्य; पाणी साचू नये म्हणून चर मोकळे ठेवा."] }
  };

  /* ---------- 4) Wrap result card: real numbers + crop advice ---------- */
  const box = document.createElement("div");
  box.className = "advice only-ok"; box.id = "rAdvice";
  document.getElementById("rFacts").after(box);
  const baseRender = renderResult;
  renderResult = function () {
    baseRender();
    const d = state.last;
    if (!d || d.err || d.mean == null) { box.style.display = "none"; return; }
    const c = LAYERS[d.layer];
    const score = d.layer === "rain" ? d.mean * 30 / d.days : d.mean;
    const lv = c.levels.find(x => score < x[0]) || c.levels[c.levels.length - 1];
    const bits = [`${t(lv[1])}: ${d.mean.toFixed(c.dec)}${c.unit}`];
    if (d.avgTemp != null) bits.push(`${t("fTemp")} ${d.avgTemp.toFixed(1)} °C`);
    if (d.rainFact != null && d.layer !== "rain") bits.push(`${t("fRain")} ${Math.round(d.rainFact)} ${t("mm")}`);
    document.getElementById("rTip").textContent = `${t("lbl_sit")} (${t("lastN").replace("{n}", d.days)}): ${bits.join(" · ")}. ${t("tip_" + lv[1])}`;
    const a = (A[state.lang] || A.en)[lv[1]];
    box.style.display = "block";
    box.innerHTML = `<b>🌾 ${t("lbl_crop")}</b><div class="cr">${a[0]}</div><div>${a[1]}</div>`;
  };

  sel.value = state.lang; applyLang();
})();