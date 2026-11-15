// 1. Agronomic Trait Matrix for KVK Crops
const CROP_TRAITS = {
  bajra:     { name: "Pearl Millet (Bajra)", family: "poaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 1 },
  jowar:     { name: "Sorghum (Jowar)", family: "poaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 1 },
  ragi:      { name: "Finger Millet (Ragi)", family: "poaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 1 },
  maize:     { name: "Maize", family: "poaceae", waterNeed: "medium", fixesN: false, droughtHardy: false, heatSensitive: false, cashTier: 2 },
  rice:      { name: "Paddy (Rice)", family: "poaceae", waterNeed: "high", fixesN: false, droughtHardy: false, heatSensitive: false, cashTier: 2 },
  wheat:     { name: "Wheat", family: "poaceae", waterNeed: "high", fixesN: false, droughtHardy: false, heatSensitive: true, cashTier: 2 },
  soybean:   { name: "Soybean", family: "fabaceae", waterNeed: "medium", fixesN: true, droughtHardy: false, heatSensitive: false, cashTier: 2 },
  tur:       { name: "Pigeon Pea (Tur/Arhar)", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  moong:     { name: "Green Gram (Moong)", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  urad:      { name: "Black Gram (Urad)", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  chickpea:  { name: "Chickpea (Gram/Harbhara)", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  guar:      { name: "Cluster Bean (Guar)", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  moth:      { name: "Moth Bean", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: false, cashTier: 1 },
  groundnut: { name: "Groundnut", family: "fabaceae", waterNeed: "medium", fixesN: true, droughtHardy: false, heatSensitive: false, cashTier: 3 },
  lentil:    { name: "Lentil (Masoor)", family: "fabaceae", waterNeed: "low", fixesN: true, droughtHardy: true, heatSensitive: true, cashTier: 2 },
  peas:      { name: "Field Pea", family: "fabaceae", waterNeed: "medium", fixesN: true, droughtHardy: false, heatSensitive: true, cashTier: 2 },
  cotton:    { name: "Cotton", family: "malvaceae", waterNeed: "medium", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 3 },
  mustard:   { name: "Indian Mustard", family: "brassicaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: true, cashTier: 2 },
  castor:    { name: "Castor", family: "euphorbiaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 3 },
  cumin:     { name: "Cumin (Jeera)", family: "apiaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: true, cashTier: 3 },
  safflower: { name: "Safflower (Kardi)", family: "asteraceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  sesame:    { name: "Sesame (Til)", family: "pedaliaceae", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  sunflower: { name: "Sunflower", family: "asteraceae", waterNeed: "medium", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 2 },
  onion:     { name: "Onion", family: "amaryllidaceae", waterNeed: "medium", fixesN: false, droughtHardy: false, heatSensitive: true, cashTier: 3 },
  potato:    { name: "Potato", family: "solanaceae", waterNeed: "high", fixesN: false, droughtHardy: false, heatSensitive: true, cashTier: 3 },
  fallow:    { name: "Soil-Moisture Fallow / Mulch", family: "none", waterNeed: "low", fixesN: false, droughtHardy: true, heatSensitive: false, cashTier: 0 }
};

// 2. District-Specific KVK Crop Calendars (Expandable with any "State|District" key)
const KVK_DISTRICT_CALENDARS = {
  "Maharashtra|Ahilyanagar": {
    kvkName: "KVK Babhaleshwar & Dahigaon (Ahilyanagar)",
    kharif: ["bajra", "soybean", "cotton", "tur", "moong", "urad", "maize"],
    rabi:   ["jowar", "chickpea", "wheat", "safflower", "onion"],
    zaid:   ["groundnut", "moong", "fallow"]
  },
  "Maharashtra|Pune": {
    kvkName: "KVK Baramati & Narayangaon (Pune)",
    kharif: ["bajra", "soybean", "groundnut", "tur", "rice"],
    rabi:   ["jowar", "chickpea", "wheat", "onion"],
    zaid:   ["groundnut", "moong", "fallow"]
  },
  "Maharashtra|Nagpur": {
    kvkName: "KVK CICR Nagpur",
    kharif: ["cotton", "soybean", "tur", "rice", "maize"],
    rabi:   ["chickpea", "wheat", "mustard", "linseed" in CROP_TRAITS ? "linseed" : "safflower"],
    zaid:   ["moong", "groundnut", "fallow"]
  },
  "Rajasthan|Jodhpur": {
    kvkName: "ICAR-CAZRI KVK Jodhpur",
    kharif: ["bajra", "guar", "moth", "moong", "sesame", "castor"],
    rabi:   ["cumin", "mustard", "chickpea", "wheat"],
    zaid:   ["moong", "fallow"]
  },
  "Rajasthan|Jaipur": {
    kvkName: "KVK Chomu (Jaipur)",
    kharif: ["bajra", "guar", "groundnut", "moong", "cowpea" in CROP_TRAITS ? "cowpea" : "urad"],
    rabi:   ["wheat", "mustard", "chickpea", "peas"],
    zaid:   ["moong", "fallow"]
  },
  "Gujarat|Kachchh": {
    kvkName: "KVK Mundra & Bhuj (Kachchh)",
    kharif: ["cotton", "groundnut", "castor", "bajra", "moong", "guar"],
    rabi:   ["cumin", "mustard", "wheat", "jowar"],
    zaid:   ["bajra", "moong", "fallow"]
  },
  "Gujarat|Rajkot": {
    kvkName: "KVK Targhadia (Rajkot)",
    kharif: ["groundnut", "cotton", "soybean", "sesame", "tur"],
    rabi:   ["chickpea", "wheat", "cumin", "onion"],
    zaid:   ["moong", "sesame", "fallow"]
  },
  "Punjab|Ludhiana": {
    kvkName: "KVK Samrala (Ludhiana)",
    kharif: ["rice", "maize", "cotton", "moong"],
    rabi:   ["wheat", "mustard", "potato", "peas"],
    zaid:   ["moong", "maize", "fallow"]
  }
};

// 3. State-Level ICAR / KVK Agro-Climatic Fallbacks (Covers all 36 States & UTs)
const KVK_STATE_CALENDARS = {
  "Andhra Pradesh": { kharif: ["rice", "cotton", "groundnut", "tur", "maize"], rabi: ["chickpea", "urad", "jowar", "sunflower"], zaid: ["moong", "sesame", "fallow"] },
  "Arunachal Pradesh": { kharif: ["rice", "maize", "ragi", "soybean"], rabi: ["mustard", "wheat", "peas"], zaid: ["maize", "fallow"] },
  "Assam": { kharif: ["rice", "urad", "sesame", "maize"], rabi: ["mustard", "lentil", "potato", "peas"], zaid: ["rice", "moong", "fallow"] },
  "Bihar": { kharif: ["rice", "maize", "tur", "urad"], rabi: ["wheat", "lentil", "chickpea", "mustard", "potato"], zaid: ["moong", "maize", "fallow"] },
  "Chhattisgarh": { kharif: ["rice", "soybean", "tur", "urad", "maize"], rabi: ["chickpea", "lentil", "wheat", "mustard"], zaid: ["moong", "groundnut", "fallow"] },
  "Goa": { kharif: ["rice", "ragi", "groundnut"], rabi: ["urad", "moong", "groundnut"], zaid: ["moong", "fallow"] },
  "Gujarat": { kharif: ["cotton", "groundnut", "castor", "bajra", "tur"], rabi: ["wheat", "cumin", "chickpea", "mustard"], zaid: ["moong", "bajra", "fallow"] },
  "Haryana": { kharif: ["rice", "cotton", "bajra", "guar", "maize"], rabi: ["wheat", "mustard", "chickpea"], zaid: ["moong", "fallow"] },
  "Himachal Pradesh": { kharif: ["maize", "rice", "urad", "soybean"], rabi: ["wheat", "peas", "mustard", "lentil"], zaid: ["potato", "fallow"] },
  "Jharkhand": { kharif: ["rice", "maize", "tur", "urad", "ragi"], rabi: ["chickpea", "lentil", "wheat", "mustard"], zaid: ["moong", "fallow"] },
  "Karnataka": { kharif: ["ragi", "maize", "tur", "cotton", "soybean", "groundnut"], rabi: ["jowar", "chickpea", "sunflower", "safflower"], zaid: ["moong", "groundnut", "fallow"] },
  "Kerala": { kharif: ["rice", "sesame", "urad"], rabi: ["rice", "moong", "groundnut"], zaid: ["moong", "fallow"] },
  "Madhya Pradesh": { kharif: ["soybean", "maize", "tur", "urad", "cotton"], rabi: ["wheat", "chickpea", "lentil", "mustard"], zaid: ["moong", "fallow"] },
  "Maharashtra": { kharif: ["soybean", "cotton", "tur", "bajra", "rice"], rabi: ["jowar", "chickpea", "wheat", "safflower"], zaid: ["groundnut", "moong", "fallow"] },
  "Manipur": { kharif: ["rice", "maize", "soybean", "urad"], rabi: ["mustard", "peas", "lentil", "potato"], zaid: ["maize", "fallow"] },
  "Meghalaya": { kharif: ["rice", "maize", "soybean"], rabi: ["mustard", "potato", "peas"], zaid: ["maize", "fallow"] },
  "Mizoram": { kharif: ["rice", "maize", "soybean", "sesame"], rabi: ["mustard", "peas", "lentil"], zaid: ["maize", "fallow"] },
  "Nagaland": { kharif: ["rice", "maize", "soybean", "tur"], rabi: ["mustard", "peas", "lentil"], zaid: ["maize", "fallow"] },
  "Odisha": { kharif: ["rice", "tur", "urad", "groundnut", "maize"], rabi: ["moong", "urad", "mustard", "groundnut"], zaid: ["moong", "sesame", "fallow"] },
  "Punjab": { kharif: ["rice", "cotton", "maize", "moong"], rabi: ["wheat", "mustard", "potato", "peas"], zaid: ["moong", "maize", "fallow"] },
  "Rajasthan": { kharif: ["bajra", "guar", "moong", "moth", "soybean"], rabi: ["wheat", "mustard", "chickpea", "cumin"], zaid: ["moong", "fallow"] },
  "Sikkim": { kharif: ["maize", "rice", "ragi", "soybean"], rabi: ["mustard", "wheat", "peas", "potato"], zaid: ["potato", "fallow"] },
  "Tamil Nadu": { kharif: ["rice", "bajra", "groundnut", "cotton", "tur"], rabi: ["jowar", "urad", "moong", "sesame"], zaid: ["moong", "groundnut", "fallow"] },
  "Telangana": { kharif: ["rice", "cotton", "maize", "tur", "soybean"], rabi: ["chickpea", "groundnut", "jowar", "sunflower"], zaid: ["moong", "sesame", "fallow"] },
  "Tripura": { kharif: ["rice", "maize", "urad", "sesame"], rabi: ["mustard", "potato", "lentil", "peas"], zaid: ["rice", "moong", "fallow"] },
  "Uttar Pradesh": { kharif: ["rice", "maize", "bajra", "tur", "urad"], rabi: ["wheat", "mustard", "chickpea", "lentil", "potato"], zaid: ["moong", "urad", "fallow"] },
  "Uttarakhand": { kharif: ["rice", "ragi", "soybean", "maize"], rabi: ["wheat", "lentil", "mustard", "peas"], zaid: ["moong", "potato", "fallow"] },
  "West Bengal": { kharif: ["rice", "maize", "urad", "tur"], rabi: ["potato", "mustard", "lentil", "wheat"], zaid: ["rice", "moong", "sesame", "fallow"] },
  "Andaman and Nicobar Islands": { kharif: ["rice", "maize", "urad"], rabi: ["moong", "groundnut"], zaid: ["fallow"] },
  "Chandigarh": { kharif: ["rice", "maize"], rabi: ["wheat", "mustard"], zaid: ["moong", "fallow"] },
  "Dadra and Nagar Haveli and Daman and Diu": { kharif: ["rice", "ragi", "tur"], rabi: ["chickpea", "wheat"], zaid: ["moong", "fallow"] },
  "Delhi": { kharif: ["bajra", "jowar", "maize"], rabi: ["wheat", "mustard", "chickpea"], zaid: ["moong", "fallow"] },
  "Jammu and Kashmir": { kharif: ["rice", "maize", "urad"], rabi: ["wheat", "mustard", "peas"], zaid: ["potato", "fallow"] },
  "Ladakh": { kharif: ["wheat", "peas", "potato"], rabi: ["fallow"], zaid: ["fallow"] },
  "Lakshadweep": { kharif: ["maize", "moong"], rabi: ["urad", "fallow"], zaid: ["fallow"] },
  "Puducherry": { kharif: ["rice", "groundnut", "cotton"], rabi: ["urad", "moong", "sesame"], zaid: ["moong", "fallow"] }
};

const EXACT_DISTRICT_COORDS = {
  "Maharashtra|Ahilyanagar": [19.0948, 74.7480],
  "Rajasthan|Jodhpur": [26.2389, 73.0243],
  "Gujarat|Kachchh": [23.2420, 69.6669]
};

const INDIA_STATE_DISTRICTS = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Changlang", "East Siang", "Lohit", "Lower Subansiri", "Papum Pare", "Tawang", "West Kameng"],
  "Assam": ["Barpeta", "Cachar", "Darrang", "Dibrugarh", "Goalpara", "Golaghat", "Jorhat", "Kamrup", "Lakhimpur", "Nagaon", "Sivasagar", "Sonitpur", "Tinsukia"],
  "Bihar": ["Araria", "Aurangabad", "Begusarai", "Bhagalpur", "Bhojpur", "Darbhanga", "East Champaran", "Gaya", "Katihar", "Madhubani", "Muzaffarpur", "Nalanda", "Patna", "Purnia", "Rohtas", "Samastipur", "Saran", "Siwan", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Bastar", "Bilaspur", "Dhamtari", "Durg", "Janjgir-Champa", "Kanker", "Korba", "Mahasamund", "Raigarh", "Raipur", "Rajnandgaon", "Surguja"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Banaskantha", "Bharuch", "Bhavnagar", "Dahod", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kachchh", "Kheda", "Mehsana", "Morbi", "Navsari", "Panchmahal", "Patan", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Palamu", "Ranchi", "Sahibganj", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bidar", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kolar", "Mandya", "Mysuru", "Raichur", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Madhya Pradesh": ["Balaghat", "Betul", "Bhind", "Bhopal", "Chhatarpur", "Chhindwara", "Damoh", "Dewas", "Dhar", "Guna", "Gwalior", "Hoshangabad", "Indore", "Jabalpur", "Khargone", "Mandsaur", "Morena", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Shivpuri", "Ujjain", "Vidisha"],
  "Maharashtra": ["Ahilyanagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Chhatrapati Sambhajinagar", "Dharashiv", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Churachandpur", "Imphal East", "Imphal West", "Senapati", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Khasi Hills", "Ri Bhoi", "West Garo Hills", "West Jaintia Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lunglei", "Serchhip"],
  "Nagaland": ["Dimapur", "Kohima", "Mokokchung", "Mon", "Tuensang", "Wokha"],
  "Odisha": ["Balangir", "Balasore", "Bargarh", "Bhadrak", "Cuttack", "Dhenkanal", "Ganjam", "Jajpur", "Kalahandi", "Kendrapara", "Keonjhar", "Khordha", "Koraput", "Mayurbhanj", "Puri", "Sambalpur", "Sundargarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Ganganagar", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Kota", "Nagaur", "Pali", "Sikar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Chengalpattu", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Salem", "Thanjavur", "Tiruchirappalli", "Tirunelveli", "Tiruppur", "Tiruvannamalai", "Vellore", "Villupuram"],
  "Telangana": ["Adilabad", "Hyderabad", "Jagtial", "Karimnagar", "Khammam", "Mahabubnagar", "Medak", "Nalgonda", "Nizamabad", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Warangal"],
  "Tripura": ["Dhalai", "Gomati", "North Tripura", "South Tripura", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ayodhya", "Azamgarh", "Bareilly", "Basti", "Bijnor", "Bulandshahr", "Deoria", "Etawah", "Ghaziabad", "Gorakhpur", "Hardoi", "Jaunpur", "Jhansi", "Kanpur Nagar", "Lakhimpur Kheri", "Lucknow", "Mathura", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Prayagraj", "Saharanpur", "Shahjahanpur", "Sitapur", "Sultanpur", "Varanasi"],
  "Uttarakhand": ["Almora", "Chamoli", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North West Delhi", "South Delhi", "South West Delhi", "West Delhi"],
  "Jammu and Kashmir": ["Anantnag", "Baramulla", "Budgam", "Jammu", "Kathua", "Kupwara", "Pulwama", "Rajouri", "Srinagar", "Udhampur"],
  "Ladakh": ["Kargil", "Leh"],
  "Lakshadweep": ["Lakshadweep"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"]
};