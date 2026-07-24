/* ============================================================
   Summit: mountain dataset & curated lists
   Elevations in metres. Coordinates WGS84.
   ============================================================ */

const MOUNTAINS = [
  // ---- Eight-thousanders (14) ----
  { id: "everest",        name: "Mount Everest",      elevation: 8849, country: "Nepal / China",   flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.9881,  lng: 86.9250,   firstAscent: 1953 },
  { id: "k2",             name: "K2",                 elevation: 8611, country: "Pakistan / China",flag: "🇵🇰", continent: "Asia",          range: "Karakoram",       lat: 35.8808,  lng: 76.5133,   firstAscent: 1954 },
  { id: "kangchenjunga",  name: "Kangchenjunga",      elevation: 8586, country: "Nepal / India",   flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.7025,  lng: 88.1475,   firstAscent: 1955 },
  { id: "lhotse",         name: "Lhotse",             elevation: 8516, country: "Nepal / China",   flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.9617,  lng: 86.9333,   firstAscent: 1956 },
  { id: "makalu",         name: "Makalu",             elevation: 8485, country: "Nepal / China",   flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.8897,  lng: 87.0889,   firstAscent: 1955 },
  { id: "cho-oyu",        name: "Cho Oyu",            elevation: 8188, country: "Nepal / China",   flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 28.0942,  lng: 86.6608,   firstAscent: 1954 },
  { id: "dhaulagiri",     name: "Dhaulagiri I",       elevation: 8167, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 28.6967,  lng: 83.4875,   firstAscent: 1960 },
  { id: "manaslu",        name: "Manaslu",            elevation: 8163, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 28.5497,  lng: 84.5597,   firstAscent: 1956 },
  { id: "nanga-parbat",   name: "Nanga Parbat",       elevation: 8126, country: "Pakistan",        flag: "🇵🇰", continent: "Asia",          range: "Himalaya",        lat: 35.2375,  lng: 74.5892,   firstAscent: 1953 },
  { id: "annapurna",      name: "Annapurna I",        elevation: 8091, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 28.5961,  lng: 83.8203,   firstAscent: 1950 },
  { id: "gasherbrum-1",   name: "Gasherbrum I",       elevation: 8080, country: "Pakistan / China",flag: "🇵🇰", continent: "Asia",          range: "Karakoram",       lat: 35.7242,  lng: 76.6964,   firstAscent: 1958 },
  { id: "broad-peak",     name: "Broad Peak",         elevation: 8051, country: "Pakistan / China",flag: "🇵🇰", continent: "Asia",          range: "Karakoram",       lat: 35.8117,  lng: 76.5650,   firstAscent: 1957 },
  { id: "gasherbrum-2",   name: "Gasherbrum II",      elevation: 8035, country: "Pakistan / China",flag: "🇵🇰", continent: "Asia",          range: "Karakoram",       lat: 35.7578,  lng: 76.6531,   firstAscent: 1956 },
  { id: "shishapangma",   name: "Shishapangma",       elevation: 8027, country: "China",           flag: "🇨🇳", continent: "Asia",          range: "Himalaya",        lat: 28.3525,  lng: 85.7783,   firstAscent: 1964 },

  // ---- Seven Summits (incl. both Carstensz & Kosciuszko variants) ----
  { id: "aconcagua",      name: "Aconcagua",          elevation: 6961, country: "Argentina",       flag: "🇦🇷", continent: "South America", range: "Andes",           lat: -32.6532, lng: -70.0109,  firstAscent: 1897 },
  { id: "denali",         name: "Denali",             elevation: 6190, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Alaska Range",    lat: 63.0692,  lng: -151.0070, firstAscent: 1913 },
  { id: "kilimanjaro",    name: "Kilimanjaro",        elevation: 5895, country: "Tanzania",        flag: "🇹🇿", continent: "Africa",        range: "Rift Volcanoes",  lat: -3.0674,  lng: 37.3556,   firstAscent: 1889 },
  { id: "elbrus",         name: "Mount Elbrus",       elevation: 5642, country: "Russia",          flag: "🇷🇺", continent: "Europe",        range: "Caucasus",        lat: 43.3499,  lng: 42.4453,   firstAscent: 1874 },
  { id: "vinson",         name: "Mount Vinson",       elevation: 4892, country: "Antarctica",      flag: "🇦🇶", continent: "Antarctica",    range: "Ellsworth Mtns",  lat: -78.5254, lng: -85.6171,  firstAscent: 1966 },
  { id: "puncak-jaya",    name: "Puncak Jaya",        elevation: 4884, country: "Indonesia",       flag: "🇮🇩", continent: "Oceania",       range: "Sudirman Range",  lat: -4.0833,  lng: 137.1833,  firstAscent: 1962 },
  { id: "kosciuszko",     name: "Mount Kosciuszko",   elevation: 2228, country: "Australia",       flag: "🇦🇺", continent: "Oceania",       range: "Snowy Mountains", lat: -36.4558, lng: 148.2636,  firstAscent: 1840 },

  // ---- Volcanic Seven Summits (remaining) ----
  { id: "ojos",           name: "Ojos del Salado",    elevation: 6893, country: "Chile / Argentina",flag: "🇨🇱", continent: "South America", range: "Andes",          lat: -27.1092, lng: -68.5414,  firstAscent: 1937 },
  { id: "orizaba",        name: "Pico de Orizaba",    elevation: 5636, country: "Mexico",          flag: "🇲🇽", continent: "North America", range: "Trans-Mexican Belt", lat: 19.0303, lng: -97.2697, firstAscent: 1848 },
  { id: "damavand",       name: "Mount Damavand",     elevation: 5610, country: "Iran",            flag: "🇮🇷", continent: "Asia",          range: "Alborz",          lat: 35.9550,  lng: 52.1100,   firstAscent: 1837 },
  { id: "giluwe",         name: "Mount Giluwe",       elevation: 4367, country: "Papua New Guinea",flag: "🇵🇬", continent: "Oceania",       range: "Southern Highlands", lat: -6.0433, lng: 143.8869, firstAscent: 1934 },
  { id: "sidley",         name: "Mount Sidley",       elevation: 4285, country: "Antarctica",      flag: "🇦🇶", continent: "Antarctica",    range: "Executive Committee", lat: -77.0333, lng: -126.1000, firstAscent: 1990 },

  // ---- Alpine classics ----
  { id: "mont-blanc",     name: "Mont Blanc",         elevation: 4808, country: "France / Italy",  flag: "🇫🇷", continent: "Europe",        range: "Alps",            lat: 45.8326,  lng: 6.8652,    firstAscent: 1786 },
  { id: "dufourspitze",   name: "Dufourspitze",       elevation: 4634, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 45.9369,  lng: 7.8672,    firstAscent: 1855 },
  { id: "dom",            name: "Dom",                elevation: 4545, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.0942,  lng: 7.8586,    firstAscent: 1858 },
  { id: "weisshorn",      name: "Weisshorn",          elevation: 4506, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.1014,  lng: 7.7158,    firstAscent: 1861 },
  { id: "matterhorn",     name: "Matterhorn",         elevation: 4478, country: "Switzerland / Italy", flag: "🇨🇭", continent: "Europe",    range: "Alps",            lat: 45.9764,  lng: 7.6586,    firstAscent: 1865 },
  { id: "grand-combin",   name: "Grand Combin",       elevation: 4314, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 45.9375,  lng: 7.2986,    firstAscent: 1859 },
  { id: "finsteraarhorn", name: "Finsteraarhorn",     elevation: 4274, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.5372,  lng: 8.1261,    firstAscent: 1829 },
  { id: "grandes-jorasses", name: "Grandes Jorasses", elevation: 4208, country: "France / Italy",  flag: "🇫🇷", continent: "Europe",        range: "Alps",            lat: 45.8686,  lng: 6.9861,    firstAscent: 1868 },
  { id: "jungfrau",       name: "Jungfrau",           elevation: 4158, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.5367,  lng: 7.9625,    firstAscent: 1811 },
  { id: "monch",          name: "Mönch",              elevation: 4107, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.5583,  lng: 7.9978,    firstAscent: 1857 },
  { id: "piz-bernina",    name: "Piz Bernina",        elevation: 4049, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.3822,  lng: 9.9081,    firstAscent: 1850 },
  { id: "gran-paradiso",  name: "Gran Paradiso",      elevation: 4061, country: "Italy",           flag: "🇮🇹", continent: "Europe",        range: "Alps",            lat: 45.5175,  lng: 7.2669,    firstAscent: 1860 },
  { id: "eiger",          name: "Eiger",              elevation: 3967, country: "Switzerland",     flag: "🇨🇭", continent: "Europe",        range: "Alps",            lat: 46.5775,  lng: 8.0053,    firstAscent: 1858 },
  { id: "ortler",         name: "Ortler",             elevation: 3905, country: "Italy",           flag: "🇮🇹", continent: "Europe",        range: "Alps",            lat: 46.5089,  lng: 10.5447,   firstAscent: 1804 },
  { id: "grossglockner",  name: "Grossglockner",      elevation: 3798, country: "Austria",         flag: "🇦🇹", continent: "Europe",        range: "Alps",            lat: 47.0742,  lng: 12.6947,   firstAscent: 1800 },
  { id: "marmolada",      name: "Marmolada",          elevation: 3343, country: "Italy",           flag: "🇮🇹", continent: "Europe",        range: "Dolomites",       lat: 46.4344,  lng: 11.8514,   firstAscent: 1864 },
  { id: "zugspitze",      name: "Zugspitze",          elevation: 2962, country: "Germany",         flag: "🇩🇪", continent: "Europe",        range: "Alps",            lat: 47.4211,  lng: 10.9853,   firstAscent: 1820 },
  { id: "triglav",        name: "Triglav",            elevation: 2864, country: "Slovenia",        flag: "🇸🇮", continent: "Europe",        range: "Julian Alps",     lat: 46.3783,  lng: 13.8367,   firstAscent: 1778 },

  // ---- Cascade & West-coast volcanoes ----
  { id: "rainier",        name: "Mount Rainier",      elevation: 4392, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 46.8523,  lng: -121.7603, firstAscent: 1870 },
  { id: "shasta",         name: "Mount Shasta",       elevation: 4322, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 41.4092,  lng: -122.1949, firstAscent: 1854 },
  { id: "adams",          name: "Mount Adams",        elevation: 3743, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 46.2024,  lng: -121.4909, firstAscent: 1854 },
  { id: "hood",           name: "Mount Hood",         elevation: 3429, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 45.3735,  lng: -121.6959, firstAscent: 1857 },
  { id: "baker",          name: "Mount Baker",        elevation: 3286, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 48.7768,  lng: -121.8145, firstAscent: 1868 },
  { id: "glacier-peak",   name: "Glacier Peak",       elevation: 3213, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 48.1121,  lng: -121.1132, firstAscent: 1898 },
  { id: "jefferson",      name: "Mount Jefferson",    elevation: 3199, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 44.6743,  lng: -121.7996, firstAscent: 1888 },
  { id: "south-sister",   name: "South Sister",       elevation: 3157, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 44.1035,  lng: -121.7693, firstAscent: 1866 },
  { id: "st-helens",      name: "Mount St. Helens",   elevation: 2549, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 46.1914,  lng: -122.1956, firstAscent: 1853 },
  { id: "lassen",         name: "Lassen Peak",        elevation: 3187, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Cascades",        lat: 40.4882,  lng: -121.5050, firstAscent: 1851 },

  // ---- US classics ----
  { id: "whitney",        name: "Mount Whitney",      elevation: 4421, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Sierra Nevada",   lat: 36.5785,  lng: -118.2923, firstAscent: 1873 },
  { id: "elbert",         name: "Mount Elbert",       elevation: 4401, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Rocky Mountains", lat: 39.1178,  lng: -106.4454, firstAscent: 1874 },
  { id: "longs",          name: "Longs Peak",         elevation: 4346, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Rocky Mountains", lat: 40.2549,  lng: -105.6151, firstAscent: 1868 },
  { id: "grand-teton",    name: "Grand Teton",        elevation: 4199, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Teton Range",     lat: 43.7412,  lng: -110.8024, firstAscent: 1898 },
  { id: "mauna-kea",      name: "Mauna Kea",          elevation: 4207, country: "United States",   flag: "🇺🇸", continent: "Oceania",       range: "Hawaiʻi",         lat: 19.8206,  lng: -155.4681 },
  { id: "half-dome",      name: "Half Dome",          elevation: 2694, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Sierra Nevada",   lat: 37.7459,  lng: -119.5332, firstAscent: 1875 },
  { id: "katahdin",       name: "Mount Katahdin",     elevation: 1606, country: "United States",   flag: "🇺🇸", continent: "North America", range: "Appalachians",    lat: 45.9044,  lng: -68.9213, firstAscent: 1804 },
  { id: "washington-nh",  name: "Mount Washington",   elevation: 1917, country: "United States",   flag: "🇺🇸", continent: "North America", range: "White Mountains", lat: 44.2705,  lng: -71.3033, firstAscent: 1642 },

  // ---- Andes & South America ----
  { id: "huascaran",      name: "Huascarán",          elevation: 6768, country: "Peru",            flag: "🇵🇪", continent: "South America", range: "Cordillera Blanca", lat: -9.1219, lng: -77.6042, firstAscent: 1932 },
  { id: "illimani",       name: "Illimani",           elevation: 6438, country: "Bolivia",         flag: "🇧🇴", continent: "South America", range: "Cordillera Real", lat: -16.6533, lng: -67.7900,  firstAscent: 1898 },
  { id: "chimborazo",     name: "Chimborazo",         elevation: 6263, country: "Ecuador",         flag: "🇪🇨", continent: "South America", range: "Andes",           lat: -1.4692,  lng: -78.8175,  firstAscent: 1880 },
  { id: "huayna-potosi",  name: "Huayna Potosí",      elevation: 6088, country: "Bolivia",         flag: "🇧🇴", continent: "South America", range: "Cordillera Real", lat: -16.2661, lng: -68.1533,  firstAscent: 1919 },
  { id: "alpamayo",       name: "Alpamayo",           elevation: 5947, country: "Peru",            flag: "🇵🇪", continent: "South America", range: "Cordillera Blanca", lat: -8.8786, lng: -77.6536, firstAscent: 1957 },
  { id: "cotopaxi",       name: "Cotopaxi",           elevation: 5897, country: "Ecuador",         flag: "🇪🇨", continent: "South America", range: "Andes",           lat: -0.6809,  lng: -78.4378,  firstAscent: 1872 },
  { id: "cayambe",        name: "Cayambe",            elevation: 5790, country: "Ecuador",         flag: "🇪🇨", continent: "South America", range: "Andes",           lat: 0.0292,   lng: -77.9867,  firstAscent: 1880 },
  { id: "fitz-roy",       name: "Fitz Roy",           elevation: 3405, country: "Argentina / Chile", flag: "🇦🇷", continent: "South America", range: "Patagonia",     lat: -49.2711, lng: -73.0433,  firstAscent: 1952 },
  { id: "cerro-torre",    name: "Cerro Torre",        elevation: 3128, country: "Argentina / Chile", flag: "🇦🇷", continent: "South America", range: "Patagonia",     lat: -49.2925, lng: -73.0983,  firstAscent: 1974 },
  { id: "torres-paine",   name: "Torres del Paine",   elevation: 2500, country: "Chile",           flag: "🇨🇱", continent: "South America", range: "Patagonia",       lat: -50.9423, lng: -72.9986,  firstAscent: 1963 },

  // ---- Himalaya & Asia trekking classics ----
  { id: "ama-dablam",     name: "Ama Dablam",         elevation: 6812, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.8617,  lng: 86.8614,   firstAscent: 1961 },
  { id: "mera-peak",      name: "Mera Peak",          elevation: 6476, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.7089,  lng: 86.8675,   firstAscent: 1953 },
  { id: "island-peak",    name: "Island Peak",        elevation: 6189, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.9219,  lng: 86.9364,   firstAscent: 1953 },
  { id: "lobuche-east",   name: "Lobuche East",       elevation: 6119, country: "Nepal",           flag: "🇳🇵", continent: "Asia",          range: "Himalaya",        lat: 27.9600,  lng: 86.7900,   firstAscent: 1984 },
  { id: "khan-tengri",    name: "Khan Tengri",        elevation: 7010, country: "Kazakhstan / Kyrgyzstan", flag: "🇰🇿", continent: "Asia",  range: "Tian Shan",       lat: 42.2133,  lng: 80.1742,   firstAscent: 1931 },
  { id: "lenin-peak",     name: "Lenin Peak",         elevation: 7134, country: "Kyrgyzstan / Tajikistan", flag: "🇰🇬", continent: "Asia",  range: "Pamir",           lat: 39.3428,  lng: 72.8781,   firstAscent: 1928 },
  { id: "kazbek",         name: "Mount Kazbek",       elevation: 5054, country: "Georgia / Russia",flag: "🇬🇪", continent: "Asia",          range: "Caucasus",        lat: 42.6961,  lng: 44.5200,   firstAscent: 1868 },
  { id: "ararat",         name: "Mount Ararat",       elevation: 5137, country: "Türkiye",         flag: "🇹🇷", continent: "Asia",          range: "Armenian Highlands", lat: 39.7019, lng: 44.2983,  firstAscent: 1829 },
  { id: "fuji",           name: "Mount Fuji",         elevation: 3776, country: "Japan",           flag: "🇯🇵", continent: "Asia",          range: "Fuji Volcanic Zone", lat: 35.3606, lng: 138.7274, firstAscent: 663 },
  { id: "kinabalu",       name: "Mount Kinabalu",     elevation: 4095, country: "Malaysia",        flag: "🇲🇾", continent: "Asia",          range: "Crocker Range",   lat: 6.0748,   lng: 116.5587,  firstAscent: 1851 },
  { id: "rinjani",        name: "Mount Rinjani",      elevation: 3726, country: "Indonesia",       flag: "🇮🇩", continent: "Asia",          range: "Lesser Sunda",    lat: -8.4114,  lng: 116.4572 },
  { id: "yushan",         name: "Yushan",             elevation: 3952, country: "Taiwan",          flag: "🇹🇼", continent: "Asia",          range: "Yushan Range",    lat: 23.4700,  lng: 120.9572,  firstAscent: 1898 },

  // ---- Africa ----
  { id: "mount-kenya",    name: "Mount Kenya",        elevation: 5199, country: "Kenya",           flag: "🇰🇪", continent: "Africa",        range: "Rift Volcanoes",  lat: -0.1521,  lng: 37.3084,   firstAscent: 1899 },
  { id: "stanley",        name: "Mount Stanley",      elevation: 5109, country: "Uganda / DR Congo", flag: "🇺🇬", continent: "Africa",      range: "Rwenzori",        lat: 0.3861,   lng: 29.8717,   firstAscent: 1906 },
  { id: "ras-dashen",     name: "Ras Dashen",         elevation: 4550, country: "Ethiopia",        flag: "🇪🇹", continent: "Africa",        range: "Simien Mountains", lat: 13.2333, lng: 38.3733,   firstAscent: 1841 },
  { id: "toubkal",        name: "Mount Toubkal",      elevation: 4167, country: "Morocco",         flag: "🇲🇦", continent: "Africa",        range: "High Atlas",      lat: 31.0603,  lng: -7.9153,   firstAscent: 1923 },
  { id: "mount-meru",     name: "Mount Meru",         elevation: 4562, country: "Tanzania",        flag: "🇹🇿", continent: "Africa",        range: "Rift Volcanoes",  lat: -3.2467,  lng: 36.7486,   firstAscent: 1904 },
  { id: "teide",          name: "Mount Teide",        elevation: 3715, country: "Spain",           flag: "🇪🇸", continent: "Africa",        range: "Canary Islands",  lat: 28.2724,  lng: -16.6425 },

  // ---- Europe (beyond the Alps) ----
  { id: "mulhacen",       name: "Mulhacén",           elevation: 3479, country: "Spain",           flag: "🇪🇸", continent: "Europe",        range: "Sierra Nevada (ES)", lat: 37.0533, lng: -3.3117,  firstAscent: 1500 },
  { id: "aneto",          name: "Aneto",              elevation: 3404, country: "Spain",           flag: "🇪🇸", continent: "Europe",        range: "Pyrenees",        lat: 42.6311,  lng: 0.6575,    firstAscent: 1842 },
  { id: "etna",           name: "Mount Etna",         elevation: 3357, country: "Italy",           flag: "🇮🇹", continent: "Europe",        range: "Sicily",          lat: 37.7510,  lng: 14.9934 },
  { id: "olympus",        name: "Mount Olympus",      elevation: 2917, country: "Greece",          flag: "🇬🇷", continent: "Europe",        range: "Olympus Massif",  lat: 40.0859,  lng: 22.3583,   firstAscent: 1913 },
  { id: "gerlach",        name: "Gerlachovský štít",  elevation: 2655, country: "Slovakia",        flag: "🇸🇰", continent: "Europe",        range: "High Tatras",     lat: 49.1644,  lng: 20.1344,   firstAscent: 1834 },
  { id: "hvannadalshnukur", name: "Hvannadalshnúkur", elevation: 2110, country: "Iceland",         flag: "🇮🇸", continent: "Europe",        range: "Öræfajökull",     lat: 64.0144,  lng: -16.6781,  firstAscent: 1891 },
  { id: "galdhopiggen",   name: "Galdhøpiggen",       elevation: 2469, country: "Norway",          flag: "🇳🇴", continent: "Europe",        range: "Jotunheimen",     lat: 61.6364,  lng: 8.3125,    firstAscent: 1850 },
  { id: "ben-nevis",      name: "Ben Nevis",          elevation: 1345, country: "United Kingdom",  flag: "🇬🇧", continent: "Europe",        range: "Grampians",       lat: 56.7969,  lng: -5.0036,   firstAscent: 1771 },
  { id: "snowdon",        name: "Snowdon (Yr Wyddfa)", elevation: 1085, country: "United Kingdom", flag: "🇬🇧", continent: "Europe",        range: "Snowdonia",       lat: 53.0685,  lng: -4.0763 },
  { id: "carrauntoohil",  name: "Carrauntoohil",      elevation: 1038, country: "Ireland",         flag: "🇮🇪", continent: "Europe",        range: "MacGillycuddy's Reeks", lat: 51.9997, lng: -9.7427 },

  // ---- North America (beyond US) ----
  { id: "logan",          name: "Mount Logan",        elevation: 5959, country: "Canada",          flag: "🇨🇦", continent: "North America", range: "Saint Elias Mtns", lat: 60.5672, lng: -140.4055, firstAscent: 1925 },
  { id: "popocatepetl",   name: "Popocatépetl",       elevation: 5426, country: "Mexico",          flag: "🇲🇽", continent: "North America", range: "Trans-Mexican Belt", lat: 19.0225, lng: -98.6278 },
  { id: "iztaccihuatl",   name: "Iztaccíhuatl",       elevation: 5230, country: "Mexico",          flag: "🇲🇽", continent: "North America", range: "Trans-Mexican Belt", lat: 19.1789, lng: -98.6417, firstAscent: 1889 },
  { id: "robson",         name: "Mount Robson",       elevation: 3954, country: "Canada",          flag: "🇨🇦", continent: "North America", range: "Canadian Rockies", lat: 53.1105, lng: -119.1566, firstAscent: 1913 },
  { id: "assiniboine",    name: "Mount Assiniboine",  elevation: 3618, country: "Canada",          flag: "🇨🇦", continent: "North America", range: "Canadian Rockies", lat: 50.8697, lng: -115.6509, firstAscent: 1901 },

  // ---- Oceania & elsewhere ----
  { id: "aoraki",         name: "Aoraki / Mount Cook", elevation: 3724, country: "New Zealand",    flag: "🇳🇿", continent: "Oceania",       range: "Southern Alps",   lat: -43.5950, lng: 170.1418,  firstAscent: 1894 },
  { id: "taranaki",       name: "Mount Taranaki",     elevation: 2518, country: "New Zealand",     flag: "🇳🇿", continent: "Oceania",       range: "Taranaki",        lat: -39.2967, lng: 174.0633,  firstAscent: 1839 },
  { id: "cradle",         name: "Cradle Mountain",    elevation: 1545, country: "Australia",       flag: "🇦🇺", continent: "Oceania",       range: "Tasmania",        lat: -41.6839, lng: 145.9483 },
];

const PEAK_LISTS = [
  {
    id: "seven-summits",
    name: "Seven Summits",
    tagline: "The highest peak on every continent",
    color: "#5B8DEF",
    icon: "🌍",
    peaks: ["everest", "aconcagua", "denali", "kilimanjaro", "elbrus", "vinson", "puncak-jaya"],
    note: "Messner list. The Bass variant swaps Puncak Jaya for Mount Kosciuszko.",
  },
  {
    id: "eight-thousanders",
    name: "The 8,000ers",
    tagline: "All fourteen peaks above 8,000 metres",
    color: "#9B7BF3",
    icon: "🏔",
    peaks: ["everest", "k2", "kangchenjunga", "lhotse", "makalu", "cho-oyu", "dhaulagiri", "manaslu", "nanga-parbat", "annapurna", "gasherbrum-1", "broad-peak", "gasherbrum-2", "shishapangma"],
  },
  {
    id: "volcanic-seven",
    name: "Volcanic Seven Summits",
    tagline: "The highest volcano on every continent",
    color: "#F2784B",
    icon: "🌋",
    peaks: ["ojos", "kilimanjaro", "elbrus", "orizaba", "damavand", "giluwe", "sidley"],
  },
  {
    id: "alpine-classics",
    name: "Alpine Classics",
    tagline: "The great peaks of the Alps",
    color: "#3EC7A6",
    icon: "⛰",
    peaks: ["mont-blanc", "dufourspitze", "dom", "weisshorn", "matterhorn", "grand-combin", "finsteraarhorn", "grandes-jorasses", "jungfrau", "monch", "gran-paradiso", "piz-bernina", "eiger", "ortler", "grossglockner", "marmolada", "zugspitze", "triglav"],
  },
  {
    id: "cascade-volcanoes",
    name: "Cascade Volcanoes",
    tagline: "The great volcanoes of the US Pacific Northwest",
    color: "#E85D75",
    icon: "🗻",
    peaks: ["rainier", "shasta", "adams", "hood", "baker", "glacier-peak", "jefferson", "south-sister", "st-helens", "lassen"],
  },
  {
    id: "andes-giants",
    name: "Andes & Patagonia",
    tagline: "Giants and spires of South America",
    color: "#F2C14E",
    icon: "🦅",
    peaks: ["aconcagua", "ojos", "huascaran", "illimani", "chimborazo", "huayna-potosi", "alpamayo", "cotopaxi", "cayambe", "fitz-roy", "cerro-torre", "torres-paine"],
  },
];

const CONTINENTS = ["Asia", "Europe", "North America", "South America", "Africa", "Oceania", "Antarctica"];
