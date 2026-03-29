/* --- JAVASCRIPT SECTION START --- */
// Global variables to track the state
let SQL_ENGINE = null;
let loadedDbKey = ""; 
let db = null;
let subjectdb = null;
let subjectsList = new Set();
let hideTimeout;
const schoolNameCache = {}; // Global store for school names: { "pureID": "School Name" }
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function getSQLEngine() {
    if (!SQL_ENGINE) SQL_ENGINE = await initSqlJs(config);
    return SQL_ENGINE;
}

function getDBUrl(year, cls, dCode) {
    const user = "ramnivasbishnoi"; // https://ramnivasbishnoi.github.io/R29/अपना GitHub यूजरनेम यहाँ लिखें
    let repo = "";

    // सालों के हिसाब से रेपो चुनें (अपनी सुविधा अनुसार बदलें)
    if (year == 2026 && cls == 12) repo = "R26-12";
	else if (year >= 2001 && year <= 2003) repo = "R01";
	else if (year >= 2004 && year <= 2006) repo = "R02";
	else if (year >= 2007 && year <= 2009) repo = "R03";
	else if (year >= 2010 && year <= 2012) repo = "R04";
	else if (year >= 2013 && year <= 2015) repo = "R05";
	else if (year >= 2016 && year <= 2018) repo = "R06";
	else if (year >= 2019 && year <= 2021) repo = "R07";
	else if (year >= 2022 && year <= 2024) repo = "R08";
	else  repo = "R29";

    
    return `https://${user}.github.io/${repo}/AllResult${year}-${cls}-${dCode}.db`;
    
}
function getMasterUrl(year, cls) {
    const user = "ramnivasbishnoi"; // https://ramnivasbishnoi.github.io/R29/अपना GitHub यूजरनेम यहाँ लिखें
    let repo = "";

    // सालों के हिसाब से रेपो चुनें (अपनी सुविधा अनुसार बदलें)
    if (year == 2026 && cls == 12) repo = "R26-12";
	else if (year >= 2001 && year <= 2003) repo = "R01";
	else if (year >= 2004 && year <= 2006) repo = "R02";
	else if (year >= 2007 && year <= 2009) repo = "R03";
	else if (year >= 2010 && year <= 2012) repo = "R04";
	else if (year >= 2013 && year <= 2015) repo = "R05";
	else if (year >= 2016 && year <= 2018) repo = "R06";
	else if (year >= 2019 && year <= 2021) repo = "R07";
	else if (year >= 2022 && year <= 2024) repo = "R08";
	else  repo = "R29";

    
    return `https://${user}.github.io/${repo}/AllResult${year}-${cls}`;
    
}


async function forceResetAndReload() {
    showStatus("Clearing all caches & IndexedDB... Reloading fresh...", "info");
    const searchType = document.querySelector('input[name="search"]:checked').value;
    const searchInputEl = document.getElementById('searchInput'); 
    searchInputEl.disabled = false; 
    if (searchType === "roll"){
    searchInputEl.placeholder="Enter Roll (e.g. 1234 OR 1000-1234)"
    }else{
    searchInputEl.placeholder="Enter Name (e.g. RameshKumar)"
    }
    // 1. sql-wasm DB क्लोज करो
    if (db) { try { db.close(); } catch(e) {} db = null; subjectdb = null;}
  

    // 2. सभी ग्लोबल वैरिएबल क्लियर
    loadedDbKey = "";
    deepStore = {};
    masterSchoolNames = {};
    schoolNameCache = {};

    // 3. IndexedDB पूरी तरह क्लियर (sql.js का अपना DB)
    try {
const dbs = await indexedDB.databases();
for (const dbInfo of dbs) {
    if (dbInfo.name.includes("sql.js") || dbInfo.name.includes("sqlite")) {
        indexedDB.deleteDatabase(dbInfo.name);
        console.log("Deleted IndexedDB:", dbInfo.name);
    }
}
    } catch (e) {
console.warn("IndexedDB clear failed:", e);
    }

    // 4. Cache API से sql-wasm और DB फाइल क्लियर
    try {
if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
        if (name.includes("sql-wasm") || name.includes("AllResult")) {
            await caches.delete(name);
            console.log("Deleted Cache:", name);
        }
    }
}
    } catch (e) {
console.warn("Cache clear failed:", e);
    }

    // 5. Hard reload with cache-busting
    const url = window.location.href.split('?')[0] + '?forceFresh=' + Date.now() + '&nocache=' + Math.random();
    
    // सबसे पक्का: location.replace() + full reload
    window.location.replace(url);
    
    // वैकल्पिक: 300ms बाद reload(true)
    setTimeout(() => {
window.location.reload(true);
    }, 500);
}


function reRenderOnly() {
    if (window.lastResultSet && window.lastCls && window.lastYear) {
renderTable(window.lastResultSet, window.lastCls, window.lastYear);
    }
}


function toggleSearch(disabled) {
    const btn = document.getElementById('searchBtn');
    btn.disabled = disabled;
    
    
    const loader = document.getElementById('loaderOverlay'); // लोडर को पकड़ा

    // लोडर दिखाना या छुपाना
    loader.style.display = disabled ? "flex" : "none"; 
    
    
    btn.style.opacity = disabled ? "0.5" : "1";
    btn.style.cursor = disabled ? "not-allowed" : "pointer";
    btn.innerText = disabled ? "Wait...." : "Search";
    // सभी ड्रॉपडाउन और रेडियो बटन को डिसेबल/इनेबल करें
    const inputs = document.querySelectorAll('#yearSelect, input[name="class"], input[name="reset"], input[name="search"], #districtSelect, #centreSelect, #schoolSelect, #sub1, #sub2, #sub3');
    
    inputs.forEach(input => {
input.disabled = disabled;
    });
}
function toggleUSearch(disabled) {
    const btn = document.getElementById('searchBtn');
    const loader = document.getElementById('loaderOverlay'); // लोडर को पकड़ा

    // लोडर दिखाना या छुपाना
    loader.style.display = disabled ? "flex" : "none"; 

    btn.disabled = disabled;
    btn.style.opacity = disabled ? "0.5" : "1";
    btn.style.cursor = disabled ? "not-allowed" : "pointer";
    btn.innerText = disabled ? "Wait...." : "Search";

    const inputs = document.querySelectorAll('#yearSelect, input[name="class"], input[name="reset"], input[name="search"], #districtSelect, #centreSelect, #schoolSelect, #sub1, #sub2, #sub3');
    
    inputs.forEach(input => {
        input.disabled = disabled;
    });
}



let currentSort = { colIndex: -1, state: 0 }; 
let originalRows = []; 

function sortTable(header, colIndex) {
    const table = document.getElementById("resultTable");
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);
    
    // Use the actual cellIndex from the browser to avoid index mismatch
    const realIdx = header.cellIndex;

    // Capture the original state only once per search result
    if (originalRows.length === 0) originalRows = [...rows];

    // Cycle through states: 0 (Reset), 1 (Asc), 2 (Desc)
    if (currentSort.colIndex !== realIdx) {
currentSort.state = 1; 
    } else {
currentSort.state = (currentSort.state + 1) % 3;
    }
    currentSort.colIndex = realIdx;

    // UI Update: Clear existing arrows
    document.querySelectorAll('th.sortable').forEach(th => {
th.classList.remove('sort-asc', 'sort-desc');
    });

    let sortedRows;
    if (currentSort.state === 0) {
// STATE 0: Reset to original SQL order
sortedRows = originalRows;
    } else {
// STATE 1 or 2: Sort
header.classList.add(currentSort.state === 1 ? 'sort-asc' : 'sort-desc');
sortedRows = rows.sort((a, b) => {
    let valA = a.cells[realIdx].innerText.trim();
    let valB = b.cells[realIdx].innerText.trim();

    // 1. DATE SORTING (Handles DD-MM-YY or DD-MM-YYYY)
    const dateRegex = /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/;
    if (dateRegex.test(valA) && dateRegex.test(valB)) {
        const pA = valA.match(dateRegex);
        const pB = valB.match(dateRegex);
        // Convert to YYYYMMDD string for correct chronological comparison
        const yA = pA[3].length === 2 ? "20" + pA[3] : pA[3];
        const yB = pB[3].length === 2 ? "20" + pB[3] : pB[3];
        const isoA = yA + pA[2].padStart(2, '0') + pA[1].padStart(2, '0');
        const isoB = yB + pB[2].padStart(2, '0') + pB[1].padStart(2, '0');
        
        return currentSort.state === 1 ? isoA.localeCompare(isoB) : isoB.localeCompare(isoA);
    }

    // 2. NUMERIC SORTING (Handles Marks, Percentages, and Roll Numbers)
    let numA = parseFloat(valA.replace(/[^\d.-]/g, ''));
    let numB = parseFloat(valB.replace(/[^\d.-]/g, ''));

    if (!isNaN(numA) && !isNaN(numB)) {
        return currentSort.state === 1 ? numA - numB : numB - numA;
    }

    // 3. ALPHABETICAL/NATURAL SORTING (Handles Names)
    // {numeric: true} ensures "Name 2" comes before "Name 10"
    let comparison = valA.localeCompare(valB, undefined, {numeric: true, sensitivity: 'base'});
    return currentSort.state === 1 ? comparison : -comparison;
});
    }

    // Re-attach sorted rows to the table body
    tbody.append(...sortedRows);
    
    // Maintain sequential S.No (always in index 0)
    Array.from(tbody.rows).forEach((row, i) => {
row.cells[0].innerText = i + 1;
    });
}

    const ACCESS_TOKEN = "secure123"; // Must match the Python script
    const config = { locateFile: filename => `./${filename}?token=${ACCESS_TOKEN}` };
    let deepStore = {}; 
    let searchStatsStore = {};
    
    const lookup = {
    // 1: Arts, 2: Commerce, 3: Science
    stream: { 1: 'ARTS', 2: 'COMMERCE', 3: 'SCIENCE' },
    // 0: Regular, 1: Private
    reg: { 1: 'REGULAR', 2: 'PRIVATE' },
    // 0
    res: { 0: 'FAILED', 1: 'FIRST DIVISION', 14: 'FIRST DIVISION WITH GRACE', 2: 'SECOND DIVISION', 24: 'SECOND DIVISION WITH GRACE', 3: 'THIRD DIVISION', 34: 'THIRD DIVISION WITH GRACE', 5: 'PASS', 6: 'SUPP.', 7: 'ABSENT' },
    caste: { 10: '10 – MORE BACKWARD CASTES', 9: '9 – OTHER BACKWARD CASTES', 8: '8 – SCHEDULED TRIBE', 7: '7 – SCHEDULED CASTE', 6: '6 — MINORITY', 5: '5 – GENERAL'}
};

    const COLUMN_MAPPING = {
    //"ROLL": "Roll No",
    //"NAME": "Student Name",
    //"FATHER": "Father's Name",
    //"MOTHER": "Mother's Name",
    //"RESULT": "Division",
    "PASSPERCENT": "PERCENT",
    "GLOBAL_RANK": "RAJASTHAN RANK",	
    "DISTRICT_RANK": "DISTRICT RANK",	//`${distName.toUpperCase()} RANK`, // Becomes 'BARMER RANK'
    "CENTRE_RANK": "CENTRE RANK", //	SCHOOL_RANK	
    "STREAM_RANK": "STATE STREAM RANK",	//`SCH-${row[cols.findIndex(c => c.toUpperCase() === 'STREAM')]} RANK`
    "SCH_STREAM_RANK": "SCHOOL STREAM RANK",
    "SCHOOL_RANK": "SCHOOL RANK",
    //"ENROLNO": "Enrollment"
};



    // Initialize Year Dropdown
    const yearSelect = document.getElementById('yearSelect');
    for (let y = 2026; y >= 2001; y--) {
const opt = document.createElement('option'); opt.value = y; opt.innerText = y;
yearSelect.appendChild(opt);
    }
	
    yearSelect.value = "2026"; 
    
const districts = {
    '101': 'Ajmer', '102': 'Alwar', '103': 'Banswara', '104': 'Barmer', '105': 'Bharatpur',
    '106': 'Bhilwara', '107': 'Bikaner', '108': 'Bundi', '109': 'Chhittorgarh', '110': 'Churu',
    '111': 'Dungarpur', '112': 'Jaipur', '113': 'Jaisalmer', '114': 'Jalore', '115': 'Jhunjhunu',
    '116': 'Jhalawar', '117': 'Jodhpur', '118': 'Kota', '119': 'Nagaur', '120': 'Pali',
    '121': 'SawaiMadhopur', '122': 'Sikar', '123': 'Sirohi', '124': 'ShriGanganagar', '125': 'Tonk',
    '126': 'Udaipur', '127': 'Dholpur', '128': 'Dausa', '129': 'Baran', '130': 'Rajsamand',
    '131': 'Hanumangarh', '132': 'Karauli', '133': 'Pratapgarh',
    '134': 'Balotra', '135': 'Beawar', '136': 'Deeg', '137': 'Deedwana-Kuchaman',
    '138': 'Khairthal-Tijara', '139': 'Kotputli-Behror', '140': 'Phalodi', '141': 'Salumber'
};

const distSelect = document.getElementById('districtSelect');
Object.entries(districts).forEach(([code, name]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.innerText = `${code} - ${name}`;
    distSelect.appendChild(opt);
});


function cleanCentreName(rawName, districtName) {
    let name = rawName.toUpperCase();
    const distUpper = districtName ? districtName.toUpperCase() : "";

    // Keywords that, if found alone with the District, prevent District removal
    const keepKeywords = ["GOVT", "GOVERNMENT", "SR", "SEC", "SECONDARY", "SCH", "SCHOOL", "GIRLS", "PUBLIC", "BOYS"];
    
    // 1. Logic to check if we should "Protect" the District Name
    let shouldProtectDistrict = false;
    if (distUpper) {
// Create a test string by removing the district, brackets, and spaces
let testName = name.replace(new RegExp(`\\(?${distUpper}\\)?`, 'g'), '').replace(/[^A-Z]/g, ' ').trim();
let words = testName.split(/\s+/);
// Check if every remaining word in the name is one of our "Keep" keywords
// This handles cases like "Govt Sr Sec Sch Jodhpur"
shouldProtectDistrict = words.every(word => keepKeywords.includes(word)) && words.length > 0;
    }

    // 2. Remove District Name ONLY if it's NOT protected
    if (distUpper && !shouldProtectDistrict) {
name = name.replace(new RegExp(`\\(?${distUpper}\\)?`, 'g'), '');
    }

    // 3. General cleaning (Remove brackets and variations of 'School')
    name = name.replace(/\(|\)/g, '')
       .replace(/\bSCHOOL\b/g, '')
       .replace(/\bSCH\b/g, '')
       .replace(/\s,/g, ", ")
       .trim();

    // 4. Cleanup double spaces and return
    return name.replace(/\s+/g, ' ');
}


    function parseToUppercaseName(text) {
return text.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
    }

    function closeModal() { 
document.getElementById('detailModal').style.display = 'none'; 
    }

let loadingPromise = null;
async function getDatabase(year, cls) {
    const key = `${year}-${cls}-master`;
    if (db && loadedDbKey === key) return db;

    	// यदि पहले से कोई लोड चल रहा है, तो उसी का इंतजार करें
    if (loadingPromise) return loadingPromise;
loadingPromise = (async () => {
  try {
       showStatus(`Loading Data for ${year} ${cls}th...`, "info");
    
// 1. सबसे पहले डेटा लोड करें (पुराने DB को अभी बंद न करें)
const time = Date.now();
const dbUrl = getMasterUrl(year, cls);
const response = await fetch(`${dbUrl}-master.db?token=${ACCESS_TOKEN}&v=${time}`);
if (!response.ok) throw new Error("Data File not found.");
const buf = await response.arrayBuffer();
// 2. नया DB ऑब्जेक्ट तैयार करें
const SQL = await getSQLEngine();
const newDb = new SQL.Database(new Uint8Array(buf));

// 3. अब सुरक्षित रूप से पुराना कनेक्शन बंद करें (Transaction-like update)
if (db) db.close();
db = newDb; // नया DB असाइन करें
loadedDbKey = key;
// 4. Subject DB को भी सुरक्षित तरीके से हैंडल करें
if (subjectdb) subjectdb.close(); subjectdb = null;
//if (!subjectdb) showStatus("subjectdb file closed","error");
const subresponse = await fetch(`https://ramnivasbishnoi.github.io/R29/Subjects.db?token=${ACCESS_TOKEN}`);
//showStatus(`Subject DB Load: ${subresponse.status} ${subresponse.ok ? '(OK)' : '(FAILED)'}`, "info");
if (subresponse.ok) {
    const subuf = await subresponse.arrayBuffer();
    subjectdb = new SQL.Database(new Uint8Array(subuf));
}
showStatus(`Data loaded successfully.`, "info");
return db;

    } catch (err) {
showStatus(`Failed to load: ${err.message}`, "error");
throw err;
    } finally {
    loadingPromise = null; // लोड पूरा होने पर रिसेट करें
}
    })();
    
    return loadingPromise;
}

// यह नया फंक्शन जो DB के आधार पर लिस्ट अपडेट करेगा
async function updateDistrictDropdown(db) {
    try {
    if(!db) {showStatus("Data not found", "error"); return;}
const distSelect = document.getElementById('districtSelect');
const currentSelectedValue = distSelect.value; // 1. वर्तमान सिलेक्शन को सेव करें
// DB से वो सभी District Codes निकालें जो मौजूद हैं

    const cls = document.querySelector('input[name="class"]:checked').value;
    const year = document.getElementById('yearSelect').value;
    //const db = await getDatabase(year, cls);

const key = `${year}-${cls}-master`;
let res;
if(loadedDbKey === key) {
  res = db.exec("SELECT DISTINCT District FROM results");
} else {
	res = db.exec("SELECT DISTINCT DisCode FROM districts");
}
if (res.length === 0) return;

const dbCodes = res[0].values.map(row => String(row[0]));
//const distSelect = document.getElementById('districtSelect');
// पुरानी लिस्ट साफ़ करें और डिफ़ॉल्ट ऑप्शन डालें
distSelect.innerHTML = '<option value="">-- Select District --</option>';

// अपनी Hardcoded 'districts' लिस्ट से मैच करके Filter करें
Object.entries(districts).forEach(([code, name]) => {
    if (dbCodes.includes(code)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.innerText = `${code} - ${name}`;
        // 2. चेक करें कि क्या यह वही वैल्यू है जो यूजर ने चुनी थी
        if (code === currentSelectedValue) {
            opt.selected = true;
        }                       
        distSelect.appendChild(opt);
    }
});
console.log("District dropdown updated based on DB.");
    } catch (e) {
console.error("Error updating districts:", e);
showStatus(`Error 605 : ${e}`, "error");
    }
}



async function performSearch() {
    
    // Immediately show loading and disable UI
    toggleSearch(true); //LOCK Your existing lock function
    showStatus("Searching data... Please wait.", "info");
    
    const heading = document.getElementById("resultsTableWrapper");
    heading.scrollIntoView({ behavior: "smooth" });
    
    
    // 1. Reset Sorting Memory
    originalRows = []; 
    currentSort = { colIndex: -1, state: 0 };

    // 2. Get UI Inputs
    const searchInputEl = document.getElementById('searchInput'); 
    let inputVal = searchInputEl.value.trim();
    //let inputVal = document.getElementById('searchInput').value.trim();
    const distVal = document.getElementById('districtSelect').value;
    const centreVal = document.getElementById('centreSelect').value; 
    const schoolVal = document.getElementById('schoolSelect').value; 
    const cls = document.querySelector('input[name="class"]:checked').value;
    const year = document.getElementById('yearSelect').value;
    
    const districtName = districts[distVal] || "All Districts";
    // Get Selected School Name
    const schoolDropdown = document.getElementById('schoolSelect');
	const schoolNameFull = schoolDropdown.options[schoolDropdown.selectedIndex].text;
    const schoolName = schoolNameFull.split(' - ')[1] || schoolNameFull;
    // Get Selected Centre Name
    const centreDropdown = document.getElementById('centreSelect');
	const centreNameFull = centreDropdown.options[centreDropdown.selectedIndex].text;
    const centreName = centreNameFull.split(' - ')[1] || centreNameFull;
    
    // UI Elements
    const resultArea = document.getElementById('resultsArea');
    const statusMsg = document.getElementById('status-msg');
    const parsedDataEl = document.getElementById('parsed-data');

    // 3. Validation
    if (!inputVal && !schoolVal && !centreVal) { 
     showStatus(`Enter Roll Number, Name, \nor select a Centre/School first`, "error"); 
      //toggleSearch(false); //UN
      //return; 
    }
    if (!inputVal && !distVal && !centreVal && !schoolVal) {
        searchInputEl.disabled = true; 
        searchInputEl.placeholder = "Top 1000 All Rajasthan";
    } 
    else if (!inputVal && distVal && !centreVal && !schoolVal) {
        searchInputEl.disabled = true; 
        searchInputEl.placeholder = `Top 1000 of District ${districtName}`;
    } 
    
    
    resultArea.innerHTML = '';
    statusMsg.style.display = 'none';
    
    // 4. Build SQL Query and Debug Text
    let debugText = "";
    let mquery =`SELECT Roll, District FROM results WHERE 1=1`;
    let query = `SELECT r.*, c.District, c.CentreCode FROM results r 
         JOIN schools s ON r.School = s.School 
         JOIN centres c ON s.CentreCode = c.CentreCode 
         JOIN districts d ON c.District = d.District 
         WHERE 1=1 `;

    if (distVal) query += ` AND (d.DisCode = '${distVal}' OR d.District = '${distVal}') `;
    if (distVal) mquery += ` AND (District = '${distVal}' OR District = '${distVal}') `;
    if (centreVal) query += ` AND c.CentreCode = '${centreVal}' `;
    if (centreVal) mquery += ` AND Centre = '${centreVal}' `;
    if (schoolVal) query += ` AND s.School = '${schoolVal}' `;
    if (schoolVal) mquery += ` AND School = '${schoolVal}' `;

    const isNumber = /^\d+$/.test(inputVal);
    if (inputVal.includes('-')) {
		const parts = inputVal.split('-');
		let start = parts[0].trim();
		let end = parts[1].trim();
			if (start.length !== 7) { 
				start = start.padStart(7, '0');
			    end = end.padStart(7, '0');
			    //showStatus(`Roll must be 7 digits ${rolls}`, "error"); return; 
		    }
		query += ` AND r.Roll BETWEEN '${start}' AND '${end}'`;
		mquery += ` AND Roll BETWEEN '${start}' AND '${end}'`;
		debugText = `Range: ${start}-${end}`;
    } else if (isNumber) {
           if (inputVal.length !== 7) { inputVal = inputVal.padStart(7, '0'); //showStatus("Roll must be 7 digits.", "error"); return; 
           }
		query += ` AND r.Roll = '${inputVal}'`;
		mquery += ` AND Roll = '${inputVal}'`;
		debugText = `ROLL: ${inputVal}`;
    } else if (inputVal) {
        const hasCamel = /[a-z][A-Z]/.test(inputVal);
       // let input = document.getElementById('nameInput').value.trim();
        let name = "", father = "", mother = "";
 
		 // 1. NEW: Double Space Logic (Priority Check)
		 if (inputVal.includes("  ")) {
		     // Split by two or more spaces
		     const parts = inputVal.split(/\s{2,}/); 
		     name = parts[0] || "";
		     father = parts[1] || "";
		     mother = parts[2] || "";
		             let tokens = inputVal.split(/\s{2,}/).map(t => parseToUppercaseName(t));
		             query += ` AND r.Name LIKE '${tokens[0]}%'`;
		             mquery += ` AND Name LIKE '${tokens[0]}%'`;
		             if (tokens[1]) query += ` AND r.Father LIKE '${tokens[1]}%'`;
		             if (tokens[1]) mquery += ` AND Father LIKE '${tokens[1]}%'`;
		             if (tokens[2]) query += ` AND r.Mother LIKE '${tokens[2]}%'`;
		             debugText = `NAME: ${tokens[0]}`;
		             if (tokens[1]) debugText = `NAME: ${tokens[0]} FATHER: ${tokens[1]}`;
		             if (tokens[2]) debugText = `NAME: ${tokens[0]} FATHER: ${tokens[1]} MOTHER: ${tokens[2]}`;
		 } 
		 // 2. EXISTING: camelCase Logic (Fallback)
		 else if (!hasCamel) {
		             const upper = inputVal.toUpperCase();
		             if (!centreVal && !schoolVal && upper.length < 4) { showStatus("Name must be 4+ letters.", "error"); return; }
		             query += ` AND r.Name LIKE '${upper}%'`;
		             mquery += ` AND Name LIKE '${upper}%'`;
		             debugText = `NAME: ${upper}`;
		         } else {
		             let tokens = inputVal.split(/\s+/).map(t => parseToUppercaseName(t));
		             query += ` AND r.Name LIKE '${tokens[0]}%'`;
		             mquery += ` AND Name LIKE '${tokens[0]}%'`;
		             if (tokens[1]) query += ` AND r.Father LIKE '${tokens[1]}%'`;
		             if (tokens[1]) mquery += ` AND Father LIKE '${tokens[1]}%'`;
		             if (tokens[2]) query += ` AND r.Mother LIKE '${tokens[2]}%'`;
		             debugText = `NAME: ${tokens[0]}`;
		             if (tokens[1]) debugText = `NAME: ${tokens[0]} FATHER: ${tokens[1]}`;
		             if (tokens[2]) debugText = `NAME: ${tokens[0]} FATHER: ${tokens[1]} MOTHER: ${tokens[2]}`;
		         }
           }

    //const districtName = districts[distVal] || "All Districts";
    parsedDataEl.innerText = `${debugText}`;
    if(distVal)parsedDataEl.innerText = `${debugText} | ${districtName.toUpperCase()}`;
    if(centreVal)parsedDataEl.innerText = `${debugText} | Centre (${centreVal})`;
    if(schoolVal)parsedDataEl.innerText = `${debugText} | ${schoolVal}-${schoolName.toUpperCase()}`;

    // 5. Database Loading Logic (Persistent)
    // USE A TIMEOUT: This is the secret sauce. 
    // It gives the browser 50ms to render the "Searching..." message above
    // before the heavy SQL processing freezes the thread.
    setTimeout(async () => {
    try {
    	const time = Date.now();
		let results = null;
		let totDis;
		const SQL = await getSQLEngine();
		    // mquery के अंत में यह जोड़ें ताकि Toppers को शॉर्ट कर सकें
				if (!inputVal && !distVal && !centreVal && !schoolVal) {
				    mquery += ` ORDER BY CAST(GrandTotal AS INTEGER) DESC LIMIT 1000`;
				} else if (!inputVal && distVal && !centreVal && !schoolVal) {
				    mquery += ` ORDER BY CAST(GrandTotal AS INTEGER) DESC LIMIT 1000`;
               }
		if(!inputVal && !centreVal && !schoolVal) {
			//showStatus("730","info");
		    //await sleep(1000); 
			// 1. पहले मास्टर फाइल से डेटा/डिस्ट्रिक्ट पता करें
			
			const dbUrl = getMasterUrl(year, cls);
			const masterResponse = await fetch(`${dbUrl}-master.db?token=${ACCESS_TOKEN}&v=${time}`);
			const masterBuf = await masterResponse.arrayBuffer();
			//const SQL = await getSQLEngine();
			const masterDb = new SQL.Database(new Uint8Array(masterBuf));
			
		
		    // --- बदलाव: लूप और मर्जर का लॉजिक ---
		    let allValues = [];
		    let columns = [];
		
		    // 1. मास्टर से यूनिक डिस्ट्रिक्ट्स लें
			
	    const masterResult = masterDb.exec(mquery);
	            
	        if (masterResult.length === 0) {
	            showStatus("No record found. Please select District/Centre/School and try again.", "error");
	           toggleSearch(false);
	            return;
	        }
	         
       console.log(JSON.stringify(masterResult, null, 2));
      
    
		    // मास्टर रिजल्ट से डिस्ट्रिक्ट और रोल्स का मैप बनाना
		const distMap = {}; // { distCode: [roll1, roll2, ...] }
		const rows = masterResult[0].values;
		const distIdx = masterResult[0].columns.indexOf('District');
		const rollIdx = masterResult[0].columns.indexOf('Roll');
			
			rows.forEach(row => {
			    let dCode = String(row[distIdx]).trim();
			    let rRoll = row[rollIdx];
			    if (!distMap[dCode]) distMap[dCode] = [];
			    distMap[dCode].push(rRoll);
			});
		const count = masterResult[0].values.length;
		totDis = Object.keys(distMap).length;
        showStatus(`Found ${count} Result${count > 1 ? 's' : ''} in ${totDis} District${totDis > 1 ? 's' : ''},\n getting full result data...`, "info");
		console.log(JSON.stringify(distMap, null, 2));
		
		    // 2. हर डिस्ट्रिक्ट फाइल के लिए लूप चलाएं
		    for (const districtCode in distMap) {
		        try {
			        	const rolls = distMap[districtCode].join(','); // रोल्स की लिस्ट
			            const cleanCode = String(districtCode).trim();
			            const dbUrl = getDBUrl(year, cls, cleanCode);
			            const distResponse = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}&v=${time}`);
			            if(!distResponse.ok) {   showStatus(`908 District db not found ${dbUrl}`,"error");}
			            //showStatus(`798 : Dis: ${cleanCode}`,"info");
			            if (distResponse.ok) {
			                const distBuf = await distResponse.arrayBuffer();
			                const tempDb = new SQL.Database(new Uint8Array(distBuf));
			                //showStatus(`802 ###### ${dbUrl}`,"info");
			                //await sleep(3000);
			                // सर्च रन करें
			                const rollQuery = query + ` AND r.Roll IN (${rolls})`;
			                const res = tempDb.exec(rollQuery);
			                if (res.length > 0) {
			                    if (columns.length === 0) columns = res[0].columns;
			                    allValues = allValues.concat(res[0].values);
			                    console.log(JSON.stringify(res, null, 2));
			                    console.log("Result 810:", res); 
			                }
			               tempDb.close(); 
			            }
		        } catch (e) { console.error(`Error in ${districtCode}:`, e); showStatus(`926 Error ${districtCode}: ${e}`, "error");}
		    }
	            //showStatus("799 ######","info");
	//GrandTotal के अनुसार शॉर्ट करना
	const totalIdx = columns.indexOf('GrandTotal'); // कॉलम का नाम के अनुसार 'GrandTotal' का इंडेक्स 
    if (totalIdx !== -1) {
        allValues.sort((a, b) => {
            // CAST TO NUMBER: सुनिश्चित करें कि तुलना नंबर के रूप में हो रही है
            return Number(b[totalIdx]) - Number(a[totalIdx]);
        });
    }
	    // 3. फाइनल 'results' ऑब्जेक्ट बनाएं (जो renderTable को चाहिए)
		    results = [{
		        columns: columns,
		        values: allValues
		        }];
    //showStatus("805 ######","info");
    }
    else if(distVal && inputVal){ 
    // ======= IF DISTRICT IS SELECTED FROM DROP-DOWN 
    //    showStatus("802","info");
    //    await sleep(1000); 
    
        const dbUrl = getDBUrl(year, cls, distVal);
    	const distResponse = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}&v=${time}`);
    //    if (distResponse.ok) {showStatus(`941 ###### ${dbUrl}`,"info");
    //    await sleep(3000);}
        const distBuf = await distResponse.arrayBuffer();
        const distDb = new SQL.Database(new Uint8Array(distBuf));
        

    	results = distDb.exec(query);
    }
    
		    // अब आपका पुराना कोड यहाँ से शुरू होगा:
		    if (results[0].values.length === 0) {
		        showStatus("No results found.", "error");
		        return;
		    }
    
    //showStatus("811 ######","info");
    //await sleep(1000); 

   if (db) {
               //await updateDistrictDropdown(db);
               //showStatus("828 ######","info");
               //await sleep(1000); 
               //await updateGlobalCounts(db);
               //showStatus("831 ######","info");
               //await sleep(2000); 
              // updateSubjectList(db);
               //await sleep(2000); 
               }
               
    //showStatus("832 ######","info");
    //await sleep(1000); 
if (results.length === 0) {
    showStatus("No results found in this selection.", "error");
    document.getElementById('filterBox').style.display = 'none';
    return;
    }
    //showStatus("838 ######","info");
    //await sleep(1000); 
//Result Found So get stats
//const resultSet = results[0];
//////////
        //Result Found So get stats
        const resultAll = results[0];
        let resultSet; // = results[0];
        // Case 1: सब कुछ खाली है (Top 1000)
	//	if (!inputVal && !distVal && !centreVal && !schoolVal) {
	//	    resultSet = { columns: resultAll.columns, values: resultAll.values.slice(0, 1000) };
//		} 
		// Case 2: सिर्फ District चुना है (Top 1000)
//		else if (!inputVal && distVal && !centreVal && !schoolVal) {
//		    resultSet = { columns: resultAll.columns, values: resultAll.values.slice(0, 1000) };
//		} 
		// Case 3: बाकी सब (Centre/School/Roll/Name) - पूरा रिजल्ट दिखाएं
//		else {
		    resultSet = resultAll;
//		    }
//////////
db = await getDatabase(year, cls);
generateSearchStats(db, resultSet, cls);
// ------------------------------------------------
console.log("Current DB Status:", db); 
// 7. Contextual Counts
let distTotal = 0;  	
if(!distVal){
	//showStatus("839","info");
    //await sleep(1000); 
    const countQuery = distVal ? 
       `SELECT COUNT(*) FROM results r WHERE r.District = '${distVal}'` :
       `SELECT COUNT(*) FROM results`;
distTotal = db.exec(countQuery)[0].values[0][0];
console.log("Count Result:", distTotal); 
}
if(distVal){
   //showStatus("846","info");
  // await sleep(1000); 
	const distCode = distVal; // मान लिया कि distVal ही फाइल का हिस्सा है
			const dbUrl = getDBUrl(year, cls, distCode);
    const distResponse = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}&v=${time}`);   
    if (distResponse.ok) {
        const distBuf = await distResponse.arrayBuffer();
        db = new SQL.Database(new Uint8Array(distBuf)); // ग्लोबल 'db' असाइन हो गया
        loadedDbKey = "${year}-${cls}-${distCode}"; 
        showStatus("District Database Loaded Successfully", "info");
    } else {
        showStatus("Error: Could not load specific District Data", "error");
        return; // आगे नहीं बढ़ना है
    }
    
	console.log("distVal Status:", distVal); 
const countQuery = distVal ? 
    `SELECT COUNT(*) FROM results r JOIN schools s ON r.School = s.School JOIN centres c ON s.CentreCode = c.CentreCode JOIN districts d ON c.District = d.District WHERE d.District ='${distVal}' OR d.DisCode = '${distVal}'` :
    `SELECT COUNT(*) FROM results`;
distTotal = db.exec(countQuery)[0].values[0][0];
console.log("Count Result:", distTotal); 
}
let centreTotal = 0;
if(distVal){
	//showStatus("867","info");
    //await sleep(1000); 
const countcQuery = centreVal ? 
    `SELECT COUNT(*) FROM results r JOIN schools s ON r.School = s.School JOIN centres c ON s.CentreCode = c.CentreCode WHERE c.CentreCode = '${centreVal}'` :
    `SELECT COUNT(*) FROM results`;
centreTotal = db.exec(countcQuery)[0].values[0][0];
        }
let schoolTotal = 0;
if(distVal){
const countsQuery = schoolVal ? 
    `SELECT COUNT(*) FROM results r JOIN schools s ON r.School = s.School WHERE s.School = '${schoolVal}'` :
    `SELECT COUNT(*) FROM results`;
schoolTotal = db.exec(countsQuery)[0].values[0][0];
}
// 8. Process and Render
        	//showStatus("962 before Fetchschema","info");
            //await sleep(2000); 
subjectsList.clear();
await fetchSchemaData(db, resultSet); 
updateSubjectList(db);
        	//showStatus("965 after Fetchschema","info");
            //await sleep(2000); 
//await sleep(2000); 
const matchCount = resultSet.values.length;
if(!inputVal && !distVal && !centreVal && !schoolVal) {
showStatus(`Showing Top ${matchCount} in ${distTotal} in ${cls}th ${year}.`, "success");
}
else if(distVal && !inputVal && !centreVal && !schoolVal) {
showStatus(`Showing Top ${matchCount} in ${distTotal} in ${districtName} ${cls}th ${year}.`, "success");
} else {
showStatus(`Found ${matchCount} in ${distTotal}${totDis > 1 ? ' in' + totDis + ' Districts' : ''} in ${cls}th ${year}.`, "success");
}
if (distVal && inputVal)showStatus(`Found ${matchCount} in ${distTotal} in ${districtName} (${cls}th-${year}).`, "success");
if (centreVal)showStatus(`Found ${matchCount} in ${centreTotal} in ${centreName} (${cls}th-${year}).`, "success");
if (schoolVal)showStatus(`Found ${matchCount} in ${schoolTotal} in ${schoolName} (${cls}th-${year}).`, "success");
document.getElementById('filterBox').style.display = 'block';
window.currentCols = resultSet.columns; 
window.lastResultSet = resultSet;
window.lastCls = cls;
window.lastYear = year;
//renderTable(results[0], cls, year);
renderTable(resultSet, cls, year);

    } catch (err) {
showStatus(`Error 944: ${err.message}`, "error");
console.error(err);
                  }

       finally {
       toggleSearch(false); // UNLOCK
          }
       }, 50); 
}

async function fetchSchemaData(db, resultSet) {
    if (!resultSet || !resultSet?.columns) return;

    //showStatus("Processing Schema Data...", "info");
    // हम पहले 2-3 रो ही दिखाएंगे ताकि मैसेज बहुत लंबा न हो जाए
    const previewData = {
columns: resultSet.columns,
sampleValues: resultSet.values.slice(0, 2) 
    };
//    showStatus(`ResultSet Data: ${JSON.stringify(previewData)}`, "info");
 //   await sleep(3500); // देखने के लिए थोड़ा समय दें
    
    const year = document.getElementById('yearSelect').value;
    const cls = document.querySelector('input[name="class"]:checked').value;
    
    deepStore = {};
    const cols = resultSet.columns;
    const rows = resultSet.values;

    // 1. District Index चेक करें
    const distIdx = cols.indexOf('District');
    if (distIdx === -1) {
showStatus("Error: District column missing in results", "error");
return;
    }

    // 2. डेटा को ग्रुप करें
    const distGroups = {};
    rows.forEach(row => {
const dCode = String(row[distIdx]).trim();
if (!distGroups[dCode]) distGroups[dCode] = [];
distGroups[dCode].push(row);
    });

       //         	showStatus("1028","info");
           // await sleep(1000); 
    try {
const SQL = await getSQLEngine();

// 3. Subjects.db को सिर्फ एक बार (लूप के बाहर) लोड करें
const subRes = await fetch(`https://ramnivasbishnoi.github.io/R29/Subjects.db?token=${ACCESS_TOKEN}&v=${Date.now()}`);
const subBuf = await subRes.arrayBuffer();
const subjectdb = new SQL.Database(new Uint8Array(subBuf));

//        	showStatus("1038","info");
          //  await sleep(1000); 
for (const dCode in distGroups) {
    //showStatus(`Processing District: ${dCode}`, "info");
       let newDCode = parseInt(dCode);
       let response;
    // 4. डिस्ट्रिक्ट डेटाबेस लोड करें
			    let dbUrl;
	        if (newDCode < 100) {
	            newCode = newDCode + 100;
			    dbUrl = getDBUrl(year, cls, newCode);
        response = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}`);
	        }else { 
    dbUrl = getDBUrl(year, cls, dCode);
    response = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}`);
    }
    if (!response.ok) showStatus(`Dist file not found for ${dCode}`, "info");     await sleep(1500); //continue;
//    if (response.ok) showStatus(`Dist file found for ${dCode}`, "info");     await sleep(1500); 
//                	showStatus("1046","info");
          //  await sleep(1000);         
    const buf = await response.arrayBuffer();
    const distDb = new SQL.Database(new Uint8Array(buf));

  //              	showStatus("1051","info");
          //  await sleep(1000); 
    // Exam Date निकालें (हर डिस्ट्रिक्ट फाइल से या एक बार)
    let examDate = "-";
    try {
        const exR = distDb.exec("SELECT ResultDate FROM exam_info LIMIT 1");
        if (exR.length) examDate = exR[0].values[0][0];
    } catch(e) {
        	showStatus(`1056 ${e}`,"info");
      //   await sleep(1000); 
}
    // 5. इस डिस्ट्रिक्ट के स्टूडेंट्स को प्रोसेस करें
    for (const row of distGroups[dCode]) {
        const roll = row[cols.indexOf('Roll')];
        const stime = row[cols.indexOf('time')] || "N/A";
        let marks = [];
   //             	showStatus("1064","info");
        //    await sleep(1000); 

        const prefixes = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'E1', 'E2', 'E3', 'E4', 'E5'];
  //              	showStatus("1072","info");
 //   await sleep(1000); 
 //   if(subjectDb)	showStatus("yes sub db","info");
//    await sleep(1000); 
    //    prefixes.forEach(p => 
for (const p of prefixes){
            let id = row[cols.indexOf(`${p}_ID`)];
            if (id) {
 //       	showStatus("1082","info");
         //   await sleep(1000); 
                 //add Subject ID to the Subjects list 
                 subjectsList.add(id);

                // यहाँ 'subjectDb' इस्तेमाल करें (जो ऊपर लोड किया है)
             //   try {
                const subData = subjectdb.exec(`SELECT SubjectName, IsExtra FROM subjects WHERE SubjectID = ${id}`);
             //   }catch(e){
  //              	showStatus("1089","info");
        //    await sleep(1000); 
             //}
                const subName = subData.length ? subData[0].values[0][0] : "Unknown";
                const isExtra = subData.length ? subData[0].values[0][1] : 0;
    //            	showStatus("1094","info");
   // await sleep(1000); 

                marks.push([
                    subName, isExtra, 
                    row[cols.indexOf(`${p}_TH`)], row[cols.indexOf(`${p}_TH2`)], 
                    row[cols.indexOf(`${p}_SS`)], row[cols.indexOf(`${p}_PR`)], 
                    row[cols.indexOf(`${p}_TT`)]
                ]);
            }
   //             	showStatus("1104","info");
  //  await sleep(1000); 

        } //);

   //             	showStatus("1109","info");
 //   await sleep(1000); 
        const schoolID = row[cols.indexOf('School')];
       // try{
        const hierarchy = distDb.exec(`
            SELECT s.SchoolName, c.CentreCode, d.DistrictName, d.District, d.DisCode 
            FROM schools s 
            JOIN centres c ON s.CentreCode = c.CentreCode 
            JOIN districts d ON c.District = d.District 
            WHERE s.School = '${schoolID}'`);
       //     }catch(e){
   //     	showStatus(`1120 ${e}`,"info");
  //  await sleep(3000); }
   //             	showStatus("1122","info");
 //   await sleep(1000); 
  //  try{
        deepStore[roll] = {
            rawRow: row,
            academic: hierarchy.length ? {
                "School Name": hierarchy[0].values[0][0],
                "Centre": hierarchy[0].values[0][1],
                "District Name": hierarchy[0].values[0][2],
                "District": hierarchy[0].values[0][3],
                "DisCode": hierarchy[0].values[0][4],
                "School": schoolID,
                "ResultVerified": stime
            } : {},
            marks: marks,
            resultDate: examDate 
    //            	showStatus("1135","info");
 //   await sleep(1000); 
        };
   //       }catch(e){
   //             	showStatus(`1140 ${e}`,"info");
  //  await sleep(1000); }
        // --- फंक्शन के अंत में हर Roll का डेटा दिखाना ---
   //     showStatus(`Processed Roll ${roll}: ${JSON.stringify(deepStore[roll])}`, "info");
     //   await sleep(4500); // देखने के लिए थोड़ा समय दें
    }
    // मेमोरी खाली करें
    distDb.close();
}
subjectdb.close();
     //   showStatus(`All data processed: ${deepStore}`, "success");
   // await sleep(10500); // देखने के लिए थोड़ा समय दें
    //    showStatus("Schema Data Ready", "success");
    } catch (e) {
showStatus(`Error: ${e.message}`, "error");
console.error(e);
    }
}


//SearchStats for PDF Rank e.g. OUT OF XXXXXX
function generateSearchStats(db, resultSet, cls) {

    if (!resultSet?.values || !resultSet?.columns) {
console.warn("Invalid resultSet");
return;
    }
    const year = document.getElementById('yearSelect').value;
    const key = `${year}-${cls}-master`;

    const cols = resultSet.columns;
    const rows = resultSet.values;

    const getIndex = name => cols.findIndex(c => c.toUpperCase() === name);

    const distIndex   = getIndex("DISTRICT");
    const centreIndex = getIndex("CENTRECODE");
    const schoolIndex = getIndex("SCHOOL");

    const uniqueDistricts = new Set();
    const uniqueCentres   = new Set();
    const uniqueSchools   = new Set();

const normalizeDistrict = d => {
    d = String(d || "").trim();
    if (/^\d{1,2}$/.test(d)) {
return String(parseInt(d) + 100);
    }
    return d;
};

    for (let row of rows) {
if (distIndex !== -1)   uniqueDistricts.add(normalizeDistrict(row[distIndex])); //uniqueDistricts.add(row[distIndex]);
if (centreIndex !== -1) uniqueCentres.add(row[centreIndex]);
if (schoolIndex !== -1) uniqueSchools.add(row[schoolIndex]);
    }

    // ==========// INIT STORE // ========

    searchStatsStore = {
AllStudents: 0,
AllStream: {},
DistrictAll: {},
DistrictStreamAll:{},
CentreAll: {},
CentreStreamAll:{},
SchoolAll: {},
SchoolStreamAll: {}
    };

    // =======// 1️⃣ ALL STUDENTS (FULL DB) //======

    searchStatsStore.AllStudents =
db.exec("SELECT COUNT(*) FROM results")[0].values[0][0];

    // =======// 2️⃣ ALL STREAM (CLASS 12 ONLY) //=========

    if (cls === "12") {

const streamResult = db.exec(`
    SELECT Stream, COUNT(*) 
    FROM results
    GROUP BY Stream
`);

if (streamResult.length > 0) {
    streamResult[0].values.forEach(row => {
        const streamCode = row[0];
        const total = row[1];
        const streamName = lookup.stream?.[streamCode] || streamCode;
        searchStatsStore.AllStream[streamName] = total;
    });
}
    }

    // ======= // 3️⃣ DISTRICT TOTALS //=============

    if (uniqueDistricts.size > 0) {

const distList = Array.from(uniqueDistricts)
    .map(d => `'${d}'`)
    .join(",");
    let distResult = null;
if(loadedDbKey === key){
 distResult = db.exec(`
    SELECT District, COUNT(*) 
    FROM results r
    WHERE District IN (${distList})
    GROUP BY District
`);
}
else {
        distResult = db.exec(`
    SELECT d.DisCode, COUNT(*) 
    FROM results r
    JOIN schools s ON r.School = s.School
   JOIN centres c ON s.CentreCode = c.CentreCode
    JOIN districts d ON c.District = d.District
    WHERE d.DisCode IN (${distList})
    GROUP BY d.DisCode
`);
    }

if (distResult.length > 0) {
    distResult[0].values.forEach(row => {
        searchStatsStore.DistrictAll[row[0]] = row[1];
    });
}

//----
if (cls === "12") {
    //District
let districtStreamResult = null;
if(loadedDbKey === key){
    districtStreamResult = db.exec(`
    SELECT District, Stream, COUNT(*) 
    FROM results r
    WHERE District IN (${distList})
    GROUP BY District, Stream
`);
}
else {
             districtStreamResult = db.exec(`
    SELECT d.DisCode, Stream, COUNT(*) 
    FROM results r
    JOIN schools s ON r.School = s.School
    JOIN centres c ON s.CentreCode = c.CentreCode
    JOIN districts d ON c.District = d.District
    WHERE d.DisCode IN (${distList})
    GROUP BY d.DisCode, Stream
`);
    }
    if (districtStreamResult.length > 0) {

        districtStreamResult[0].values.forEach(row => {

            const district = row[0];
            const streamCode = row[1];
            const total = row[2];

            const streamName = lookup.stream?.[streamCode] || streamCode;

            if (!searchStatsStore.DistrictStreamAll[district]) {
                searchStatsStore.DistrictStreamAll[district] = {};
                }

            searchStatsStore.DistrictStreamAll[district][streamName] = total;
          });
       }
    }
//----

    }

    // ===============================
    // 4️⃣ CENTRE TOTALS
    // ===============================

    if (uniqueCentres.size > 0) {

const centreList = Array.from(uniqueCentres)
    .map(c => `'${c}'`)
    .join(",");

let centreResult = null;
if(loadedDbKey === key){
centreResult = db.exec(`
    SELECT Centre, COUNT(*) 
    FROM results r
    WHERE Centre IN (${centreList})
    GROUP BY Centre
`);
}
else {
 centreResult = db.exec(`
    SELECT c.CentreCode, COUNT(*) 
    FROM results r
    JOIN schools s ON r.School = s.School
    JOIN centres c ON s.CentreCode = c.CentreCode
    WHERE c.CentreCode IN (${centreList})
    GROUP BY c.CentreCode
`);
  }

if (centreResult.length > 0) {
    centreResult[0].values.forEach(row => {
        searchStatsStore.CentreAll[row[0]] = row[1];
    });
}
            
//----
if (cls === "12") {
    //Centre
let centreStreamResult = null;
if(loadedDbKey === key){
  centreStreamResult = db.exec(`
    SELECT Centre, Stream, COUNT(*) 
    FROM results r
    WHERE Centre IN (${centreList})
    GROUP BY Centre, Stream
`);
}
else {
	
}
    
    if (centreStreamResult.length > 0) {

        centreStreamResult[0].values.forEach(row => {

            const centre = row[0];
            const streamCode = row[1];
            const total = row[2];

            const streamName = lookup.stream?.[streamCode] || streamCode;

            if (!searchStatsStore.CentreStreamAll[centre]) {
                searchStatsStore.CentreStreamAll[centre] = {};
                }

            searchStatsStore.CentreStreamAll[centre][streamName] = total;
          });
       }
    }
//----
    
    }

    // ===============================
    // 5️⃣ SCHOOL TOTALS
    // ===============================

    if (uniqueSchools.size > 0) {

const schoolList = Array.from(uniqueSchools)
    .map(s => `'${s}'`)
    .join(",");

let schoolResult = null;
if(loadedDbKey === key){
       schoolResult = db.exec(`
    SELECT School, COUNT(*) 
    FROM results
    WHERE School IN (${schoolList})
    GROUP BY School
`);
}
else {
	
}

if (schoolResult.length > 0) {
    schoolResult[0].values.forEach(row => {
        searchStatsStore.SchoolAll[row[0]] = row[1];
    });
}

// ===============================
// 6️⃣ SCHOOL STREAM TOTALS (CLASS 12)
// ===============================

if (cls === "12") {
    
    //School
let schoolStreamResult = null;
if(loadedDbKey === key){
    schoolStreamResult = db.exec(`
        SELECT School, Stream, COUNT(*) 
        FROM results
        WHERE School IN (${schoolList})
        GROUP BY School, Stream
    `);
}
else {
	
}

    if (schoolStreamResult.length > 0) {

        schoolStreamResult[0].values.forEach(row => {

            const school = row[0];
            const streamCode = row[1];
            const total = row[2];

            const streamName = lookup.stream?.[streamCode] || streamCode;

            if (!searchStatsStore.SchoolStreamAll[school]) {
                searchStatsStore.SchoolStreamAll[school] = {};
                }

            searchStatsStore.SchoolStreamAll[school][streamName] = total;
            });
       }
    }
}

    console.log(JSON.stringify(searchStatsStore, null, 2));
}


function getPureSchoolID(fullCode, distCode) {
    let s = String(fullCode);
    let d = String(distCode);
    
    // If it's the 7-digit format (e.g., 1140252)
    if (s.length === 7) {
return s.substring(3); // Returns '0252'
    }
    
    // If it's the legacy format (e.g., 14252 or 4012)
    // Strip the district code from the front
    if (s.startsWith(d)) {
return s.substring(d.length); // Returns '252' or '012'
    }
    
    return s;
}

async function updateSubjectList() {
    const subSelectors = [document.getElementById('sub1'), document.getElementById('sub2'), document.getElementById('sub3')];
    const cls = document.querySelector('input[name="class"]:checked').value;
    try {
    if(!subjectdb) {
      showStatus(`Subjects Data Not available`, "error"); 
      await sleep(1000);
      return;
     }
		// 1. Array बनाएँ
		const idsArray = Array.from(subjectsList);
		
		// 2. डायनामिक क्वेरी बनाएँ (कम से कम बदलाव)
		let sql = `SELECT SubjectID, SubjectName FROM subjects WHERE IsExtra = 0 AND ClassID = ${cls}`;
		
		// अगर लिस्ट में IDs हैं, तो फिल्टर जोड़ें
		if (idsArray.length > 0) {
		    sql += ` AND SubjectID IN (${idsArray.join(',')})`;
		}
		
		sql += ` ORDER BY SubjectName ASC`;
		
		// 3. अब क्वेरी रन करें
		const res = subjectdb.exec(sql);
		
       // const res = subjectdb.exec(`SELECT SubjectID, SubjectName FROM subjects WHERE IsExtra = 0 AND ClassID = ${cls} ORDER BY SubjectName ASC`);
subSelectors.forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Subject --</option>';
    if (res.length > 0) {
        res[0].values.forEach(row => {
            const opt = document.createElement('option');
            opt.value = row[0];
            opt.innerText = row[1];
            sel.appendChild(opt);
        });
    }
    sel.value = currentVal;
});
document.getElementById('subjectFilters').style.display = 'flex';
syncSubjects();
    } catch (e) { 
      console.error("Subject table not found", e.message); 
      showStatus(`Error 1459: ${e}`, "error"); 
      await sleep(1000);
      await sleep(1000);
      }
}
function syncSubjects() {
    const ids = ['sub1', 'sub2', 'sub3'];
    const selects = ids.map(id => document.getElementById(id));
    
    // 1. देखें कि कौन-कौन सी IDs चुनी जा चुकी हैं
    const selectedValues = selects.map(s => s.value).filter(v => v !== "");

    selects.forEach(currentSelect => {
const options = currentSelect.querySelectorAll('option');
options.forEach(opt => {
    if (opt.value === "") return; // डिफ़ॉल्ट ऑप्शन को मत छोड़ो

    // 2. अगर यह ऑप्शन किसी दूसरे सिलेक्ट में चुना हुआ है, तो इसे यहाँ छिपा दो
    // लेकिन अगर इसी सिलेक्ट में यह चुना हुआ है, तो दिखने दो (ताकि अन-सिलेक्ट कर सकें)
    const isChosenElsewhere = selectedValues.includes(opt.value) && currentSelect.value !== opt.value;
    
    opt.style.display = isChosenElsewhere ? 'none' : 'block';
    opt.disabled = isChosenElsewhere; // कुछ ब्राउजर्स के लिए सेफ साइड
});
    });
}


async function updateGlobalCounts(db) {
	const cls = document.querySelector('input[name="class"]:checked').value;
    const year = document.getElementById('yearSelect').value;
    
	const key = `${year}-${cls}-master`;
    //if(loadedDbKey) showStatus(`${loadedDbKey} = ${key}`, "info");
    //if (loadedDbKey === key) showStatus(` Equal : ${loadedDbKey} = ${key}`, "info");
    try {
    if(!db) return;
const distVal = document.getElementById('districtSelect').value;
const centVal = document.getElementById('centreSelect').value;
const schVal = document.getElementById('schoolSelect').value;
// क्लास की वैल्यू चेक करें
       // const clsElement = document.querySelector('input[name="class"]:checked');
      //  const cls = clsElement ? parseInt(clsElement.value) : null;

       //for district list as per db
       
       if (db) {
   //showStatus(` 1057 Database: ${db}`, "error");
 //  await updateDistrictDropdown(db);
           }

// 1. Build a dynamic WHERE clause based on selection hierarchy
let filter = "WHERE 1=1"; // Default "always true" 
if (schVal) {
    filter += ` AND r.School = '${schVal}'`;
} else if (centVal) {
	if(loadedDbKey === key) {
    filter += ` AND r.Centre = '${centVal}'`;
    } else {
    	filter += ` AND r.CentreCode = '${centVal}'`;
    }
} else if (distVal) {
    filter += ` AND r.District = '${distVal}'`;
}

// 2. We use JOINs for all counts so the District/Centre filter works
// We calculate all totals in one clean pass
let sql = null;
if(loadedDbKey === key) {
 sql = `
    SELECT 
        COUNT(r.Roll) as total,
        SUM(CASE WHEN r.RegType = 1 THEN 1 ELSE 0 END) as reg,
        SUM(CASE WHEN r.RegType = 2 THEN 1 ELSE 0 END) as pvt,
        SUM(CASE WHEN r.Result IN (1,2,3,5,14,24,34) THEN 1 ELSE 0 END) as pass,
        SUM(CASE WHEN r.Result = 0 THEN 1 ELSE 0 END) as fail,
        SUM(CASE WHEN r.Result = 6 THEN 1 ELSE 0 END) as supp,
        SUM(CASE WHEN r.Result = 7 THEN 1 ELSE 0 END) as abs,
        SUM(CASE WHEN r.Stream = 1 THEN 1 ELSE 0 END) as arts,
        SUM(CASE WHEN r.Stream = 2 THEN 1 ELSE 0 END) as comm,
        SUM(CASE WHEN r.Stream = 3 THEN 1 ELSE 0 END) as sci,
        COUNT(DISTINCT r.School) as schCount,
        COUNT(DISTINCT r.Centre) as centCount
    FROM results r
    ${filter}
`;
}
else {
	sql = `
    SELECT 
        COUNT(r.Roll) as total,
        SUM(CASE WHEN r.RegType = 1 THEN 1 ELSE 0 END) as reg,
        SUM(CASE WHEN r.RegType = 2 THEN 1 ELSE 0 END) as pvt,
        SUM(CASE WHEN r.Result IN (1,2,3,5,14,24,34) THEN 1 ELSE 0 END) as pass,
        SUM(CASE WHEN r.Result = 0 THEN 1 ELSE 0 END) as fail,
        SUM(CASE WHEN r.Result = 6 THEN 1 ELSE 0 END) as supp,
        SUM(CASE WHEN r.Result = 7 THEN 1 ELSE 0 END) as abs,
        SUM(CASE WHEN r.Stream = 1 THEN 1 ELSE 0 END) as arts,
        SUM(CASE WHEN r.Stream = 2 THEN 1 ELSE 0 END) as comm,
        SUM(CASE WHEN r.Stream = 3 THEN 1 ELSE 0 END) as sci,
        COUNT(DISTINCT s.School) as schCount,
        COUNT(DISTINCT c.CentreCode) as centCount
    FROM results r
    LEFT JOIN schools s ON r.School = s.School
    LEFT JOIN centres c ON s.CentreCode = c.CentreCode
    LEFT JOIN districts d ON c.District = d.District
    ${filter}
`;
}

const res = db.exec(sql);

       if (res.length > 0 && res[0].values.length > 0) {
   const [total, reg, pvt, pass, fail, supp, abs, arts, comm, sci, schCount, centCount] = res[0].values[0];

   // 1. एक टेबल एलिमेंट बनाएँ
   const table = document.createElement('table');
   table.style.borderCollapse = 'separate'; 
   table.style.borderSpacing = '0';      table.style.borderRadius = '10px';        
   table.style.overflow = 'hidden';        table.style.border = '1px solid #ddd';    
   table.style.width = '100%';
   table.style.font = '8px';

   // 2. टेबल का डेटा तैयार करें (Row-wise)
   // पहली 3 रो कॉमन हैं, चौथी रो तभी आएगी जब Class 12 हो
   let rows = [
       ["Total Students", "Centres", "Schools"],
       [total.toLocaleString(), centCount, schCount],
       [`Regular`, `Supplementary`, `Pass`],
       [`${reg}`, `${supp}`, `${pass}`],
       [`Private: ${pvt}`, `Absent: ${abs}`, `Fail: ${fail}`]
   ];
   // अगर Class 12 है, तो Streams वाली रो जोड़ें
   if (cls === 12) {
       rows.push([`ARTS`, `COMMERCE`, `SCIENCE`],
                           [`${arts}`, `${comm}`, `${sci}`]);
   }

   // 3. लूप चलाकर टेबल में Rows और Cells डालें
   rows.forEach((rowData) => {
       const row = table.insertRow();
       rowData.forEach((cellData) => {
           const cell = row.insertCell();
           cell.innerHTML = cellData;
           cell.style.padding = '6px';
           cell.style.border = '1px solid #ddd';
           cell.style.padding = '9px 5px';   
           cell.style.textAlign = 'center';   
       });
   });

   // 4. किसी एक Container (जैसे result-div) में टेबल दिखाएं
   // यहाँ मैं 'totalStudentsCount' वाले div को इस्तेमाल कर रहा हूँ
   const container = document.getElementById('totalStudentsCount');
   container.innerHTML = ""; // पुराना डेटा साफ़ करें
   container.appendChild(table);

       }

    } catch (e) {
console.error("Filter Error:", e);
showStatus(`Error 1598: ${e}`, "error");
    }
}
function resetFilters() {
    // Clear the dropdowns
    document.getElementById('districtSelect').value = "";
    document.getElementById('centreSelect').value = "";
    document.getElementById('schoolSelect').value = "";
    
    // Clear the search results table if any
    const tableBody = document.querySelector('#resultsTable tbody');
    if (tableBody) tableBody.innerHTML = "";

    // Refresh the counters to show global totals
     updateGlobalCounts(window.myDatabase);
 
}



async function handleDistrictChange() {
    toggleSearch(true);
    
    const searchType = document.querySelector('input[name="search"]:checked').value;
    const searchInputEl = document.getElementById('searchInput'); 
    searchInputEl.disabled = false; 
    if (searchType === "roll"){
    searchInputEl.placeholder="Enter Roll (e.g. 1234 OR 1000-1234)"
    }else{
    searchInputEl.placeholder="Enter Name (e.g. RameshKumar)"
    }
    const distSelect = document.getElementById('districtSelect');
    const newDistCode = distSelect.value;
    const districtName = districts[newDistCode] || "";
    const savedSchoolCode = document.getElementById('schoolSelect').value;
    const targetPureID = savedSchoolCode ? String(savedSchoolCode).slice(-4) : null;

    const centreSelect = document.getElementById('centreSelect');
    const schoolSelect = document.getElementById('schoolSelect');
    centreSelect.innerHTML = '<option value="">-- All Centres --</option>';
    schoolSelect.innerHTML = '<option value="">-- All Schools --</option>';

    if (!newDistCode) { 
centreSelect.innerHTML = '<option value="">-- All Centres --</option>';
schoolSelect.innerHTML = '<option value="">-- All Schools --</option>';
    document.getElementById('centreGroup').style.display = 'none';
    document.getElementById('schoolGroup').style.display = 'none';
// Use the currently loaded global database to update counts
if (db) {
    await updateGlobalCounts(db);
    await updateVerificationDate(db);
     }
   toggleSearch(false);
   return; 
       }

    try {
const SQL = await getSQLEngine();
const cls = document.querySelector('input[name="class"]:checked').value;
const selectedYear = parseInt(document.getElementById('yearSelect').value);
const time = Date.now();
			    const dbUrl = getDBUrl(selectedYear, cls, newDistCode);
const response = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}&v=${time}`);
const buf = await response.arrayBuffer();
const tempDb = new SQL.Database(new Uint8Array(buf));

//db = await getDatabase(selectedYear, cls);
// ADD THIS LINE HERE
await updateGlobalCounts(db); 
await updateVerificationDate(db);
const rawData = tempDb.exec(`
    SELECT c.CentreCode, s.School, s.SchoolName, c.District, COUNT(s.School) OVER(PARTITION BY c.CentreCode) as SchCount
    FROM centres c
    JOIN schools s ON c.CentreCode = s.CentreCode
    JOIN districts d ON c.District = d.District
    WHERE d.DisCode = '${newDistCode}' OR d.District = '${newDistCode}'
    ORDER BY s.SchoolName ASC
`);

if (rawData.length > 0) {
    const rows = rawData[0].values;
    const centresMap = {};
    let foundSavedSchoolCode = null;
    let foundSavedSchoolCentre = null;

    const normalize7Digit = (code, dCode) => {
        const s = String(code || "").trim();
        const d = String(dCode || "").trim();
        if (s.length === 7 && s.startsWith("1")) return s;
        let pure = (d && s.startsWith(d) && s.length > d.length) ? s.substring(d.length) : s;
        let distNum = parseInt(d, 10);
        const newDist = distNum < 100 ? distNum + 100 : distNum;
        return `${newDist}${pure.padStart(4, '0')}`;
    };

    for (const r of rows) {
        let [cCode, sCode, sName, cDist, count] = r;
        const pureID = String(sCode).slice(-4);
        const normalizedSCode = normalize7Digit(sCode, cDist);
        
        // --- CACHE & DEEP SEARCH LOGIC ---
        const isBadName = !sName || sName.trim().length < 5 || /SCHOOL|ALL/i.test(sName);
        
        if (selectedYear < 2001 && isBadName) {
            // Check if we already found this name previously
            if (schoolNameCache[pureID]) {
                sName = schoolNameCache[pureID];
            } else {
                // Not in cache, perform Deep Search
                for (let y = 2021; y <= 2025; y++) {
                    try {
                    	const time = Date.now();
                        const dbUrl = getMasterUrl(y, cls);
                        const refRes = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}&v=${time}`);
                        if (refRes.ok) {
                            const refBuf = await refRes.arrayBuffer();
                            const refDb = new SQL.Database(new Uint8Array(refBuf));
                            const search = refDb.exec(`SELECT SchoolName FROM schools WHERE School LIKE '%${pureID}' LIMIT 1`);
                            if (search.length > 0 && search[0].values[0][0]) {
                                sName = search[0].values[0][0];
                                schoolNameCache[pureID] = sName; // SAVE TO CACHE
                                refDb.close();
                                break; 
                            }
                            refDb.close();
                        }
                    } catch (e) { continue; }
                }
            }
        }

        const sOpt = document.createElement('option');
        sOpt.value = sCode; 
        sOpt.innerText = `${normalizedSCode} - ${sName}`;
        schoolSelect.appendChild(sOpt);

        if (!centresMap[cCode]) centresMap[cCode] = { schools: [], count: count };
        centresMap[cCode].schools.push({ sCode: sCode, code: normalizedSCode, name: sName });

        if (targetPureID && pureID === targetPureID) {
            foundSavedSchoolCode = sCode;
            foundSavedSchoolCentre = cCode;
        }
    }

    Object.keys(centresMap).sort().forEach(cCode => {
        const centre = centresMap[cCode];
        let chosenName = "";
        const cSuffix = String(cCode).slice(-3);
        const suffixMatch = centre.schools.find(s => String(s.sCode).slice(-3) === cSuffix);

        if (suffixMatch) { chosenName = suffixMatch.name; } 
        else {
            const govSchools = centre.schools.filter(s => /GOVT|GOVERNMENT/i.test(s.name));
            if (govSchools.length === 1) { chosenName = govSchools[0].name; } 
            else {
                const targetNum = parseInt(cSuffix);
                const list = govSchools.length > 0 ? govSchools : centre.schools;
                const nearest = list.reduce((prev, curr) => {
                    const prevDiff = Math.abs(parseInt(String(prev.sCode).slice(-3)) - targetNum);
                    const currDiff = Math.abs(parseInt(String(curr.sCode).slice(-3)) - targetNum);
                    return currDiff < prevDiff ? curr : prev;
                });
                chosenName = nearest.name;
            }
        }
        const displayName = cleanCentreName(chosenName, districtName);
        const cOpt = document.createElement('option');
        cOpt.value = cCode;
        cOpt.innerText = `${cCode} - (${centre.count}) - ${displayName}`;
        centreSelect.appendChild(cOpt);
    });

    document.getElementById('centreGroup').style.display = 'flex';
    document.getElementById('schoolGroup').style.display = 'flex';

    if (foundSavedSchoolCode) {
        centreSelect.value = foundSavedSchoolCentre;
        await handleCentreChange(); 
        schoolSelect.value = foundSavedSchoolCode;
    }
}
tempDb.close();
    } catch (e) { console.error(e); showStatus(`Error 1769: ${e}`, "error");}
    finally {toggleSearch(false); }
}


async function handleCentreChange() {
	toggleSearch(true); // LOCK
	
    const searchType = document.querySelector('input[name="search"]:checked').value;
    const searchInputEl = document.getElementById('searchInput'); 
    searchInputEl.disabled = false; 
    if (searchType === "roll"){
    searchInputEl.placeholder="Enter Roll (e.g. 1234 OR 1000-1234)"
    }else{
    searchInputEl.placeholder="Enter Name (e.g. RameshKumar)"
    }
    
    const centreVal = document.getElementById('centreSelect').value;
    const schoolSelect = document.getElementById('schoolSelect');
    
    if (!centreVal) {
const currentSchool = schoolSelect.value;
await handleDistrictChange(); 
schoolSelect.value = currentSchool;
toggleSearch(false); // UNLOCK
return;
    }

    try {
	        const SQL = await getSQLEngine();
	        const cls = document.querySelector('input[name="class"]:checked').value;
	        const year = parseInt(document.getElementById('yearSelect').value);
	        const distCode = document.getElementById('districtSelect').value;
	        
	        // Fresh DB लोड (cache-buster के साथ बेहतर)
	        const cacheBuster = new Date().getTime();
			    const dbUrl = getDBUrl(year, cls, distCode);
	        const response = await fetch(`${dbUrl}?token=${ACCESS_TOKEN}&_=${cacheBuster}`);
	        const buf = await response.arrayBuffer();
	        const tempDb = new SQL.Database(new Uint8Array(buf));
	
	        //#const res = tempDb.exec(`SELECT School, SchoolName FROM schools WHERE CentreCode = '${centreVal}' ORDER BY SchoolName ASC`);
	        const res = tempDb.exec(`SELECT s.School, s.SchoolName, c.District 
	            FROM schools s
	            JOIN centres c ON s.CentreCode = c.CentreCode
	            JOIN districts d ON c.District = d.District WHERE s.CentreCode = '${centreVal}' ORDER BY SchoolName ASC`);
	
		            /**
					 * Normalizes School IDs to a consistent 7-digit format (1XXYYYY)
					 * @param {string|number} code - The raw school code (e.g., 14130)
					 * @param {string|number} dCode - The district code (e.g., 14)
					 * @returns {string} - The 7-digit normalized ID (e.g., 1140130)
					 */
			const normalize7Digit = (code, dCode) => {
				    // 1. Sanitize inputs: Convert to string, remove whitespace, handle empty/null
				    const s = String(code || "").trim();
				    const d = String(dCode || "").trim();
				    // 2. Early exit: If it's already a valid 7-digit normalized ID, return it
				    if (s.length === 7 && s.startsWith("1")) {  return s;  }
				    // 3. Extract the "Pure" ID (the part after the district code)
				    // We only slice if the school code actually starts with the district code
				    // and is longer than the district code itself.
				    let pure = s;
				    if (d && s.startsWith(d) && s.length > d.length) {        pure = s.substring(d.length);    }
				    // 4. Normalize the District Prefix (The "1XX" part)
				    // Ensures District 14 becomes 114, and District 114 stays 114.
				    let distNum = parseInt(d, 10);
				    if (isNaN(distNum)) return s; // Fallback if data is corrupted
				    
				    const newDist = distNum < 100 ? distNum + 100 : distNum;
				
				    // 5. Final Assembly
				    // Pad the pure ID to exactly 4 digits. 
				    // Example: Dist 14, School 130 -> 114 + 0130 = 1140130
				    return `${newDist}${pure.padStart(4, '0')}`;
				};
	
	        //##const res = tempDb.exec(`SELECT School, SchoolName FROM schools WHERE CentreCode = '${centreVal}' ORDER BY SchoolName ASC`);
	        
	        schoolSelect.innerHTML = '<option value="">-- All Schools --</option>';
	        if (res.length > 0) {
	            res[0].values.forEach(row => {
	                const opt = document.createElement('option');
	                const sCode = row[0];
	                const normalized = normalize7Digit(sCode, row[2]);
	                opt.value = sCode; //normalized;
	                opt.innerText = `${normalized} - ${row[1]}`;
	                schoolSelect.appendChild(opt);
	            });
	
	        }
	        tempDb.close();
	    } catch (e) { console.error(e); showStatus(`Error 1860: ${e}`, "error");}
		finally {
		//if(tempDb)	tempDb.close();
		toggleSearch(false); // UNLOCK
		}
}


async function onYearOrClassChange() {
toggleSearch(true);
	const year = document.getElementById('yearSelect').value;
    const cls = document.querySelector('input[name="class"]:checked').value;
   
   try {
		
		     if (db) {
		        db.close();
		        db = null;
		       }
		    db = await getDatabase(year, cls);
		
		    await updateDistrictDropdown(db);
		    await updateVerificationDate(db);
		    await updateGlobalCounts(db);
		    await handleDistrictChange();
    }
    finally {
toggleSearch(false); // खत्म होते ही रिलीज करें
    }
}


// 1. जब रेडियो बटन बदला जाए (Placeholder और Value साफ करने के लिए)
function onSearchChange() {
    const searchType = document.querySelector('input[name="search"]:checked').value;
    const searchInput = document.getElementById('searchInput');
    //searchInput.value = ""; // पिछला इनपुट साफ करें
    
    if (searchType === "roll") {
searchInput.placeholder = "Enter Roll (e.g. 1234 OR 1000-1234)";
// 'numeric' मोड से नंबर और डैश वाला कीबोर्ड खुलेगा
searchInput.setAttribute("inputmode", "numeric");
    } else {
searchInput.placeholder = "Enter Name (e.g. RameshKumar)";
// 'text' मोड से सामान्य कीबोर्ड खुलेगा
searchInput.setAttribute("inputmode", "text");
    }
}

// 2. इनपुट फील्ड में टाइपिंग के दौरान वैलिडेशन (तुरंत अपडेट)
document.getElementById('searchInput').addEventListener('input', function (e) {
    const searchType = document.querySelector('input[name="search"]:checked').value;
    let value = e.target.value;

    if (searchType === "roll") {
// सिर्फ नंबर और सिंगल डैश (-) की अनुमति
// यह रेगुलर एक्सप्रेशन डैश और नंबर के अलावा सब हटा देगा
e.target.value = value.replace(/[^0-9-]/g, '');
// यह सुनिश्चित करने के लिए कि एक से ज्यादा डैश न हों
if ((e.target.value.match(/-/g) || []).length > 1) {
    e.target.value = value.slice(0, -1);
}
    } else if (searchType === "name") {
// सिर्फ अल्फाबेट (A-Z, a-z) और स्पेस की अनुमति
e.target.value = value.replace(/[^a-zA-Z\s]/g, '');
    }
});


async function updateVerificationDate(db){
try {
	// 1. इनपुट वैल्यूज लें
		const cls = document.querySelector('input[name="class"]:checked').value;
	    const year = document.getElementById('yearSelect').value;
	    
		const key = `${year}-${cls}-master`;
	    //if(loadedDbKey) showStatus(`${loadedDbKey} = ${key}`, "info");
		const distVal = document.getElementById('districtSelect').value;
		const centreVal = document.getElementById('centreSelect').value;
		const schoolVal = document.getElementById('schoolSelect').value;
	if(!db) {showStatus("Data not available", "error"); return; }
	// 2. डायनामिक क्वेरी बनाएँ
	let query;
	const params = [];
	if (loadedDbKey === key){
		query = `SELECT time FROM results
		             WHERE 1=1`; // 1=1 एक 'dummy' कंडीशन है ताकि आगे AND लगाना आसान हो
		
		if (distVal) { query += " AND District = ?"; params.push(distVal); }
		if (centreVal) { query += " AND Centre = ?"; params.push(centreVal); }
		if (schoolVal) { query += " AND School = ?"; params.push(schoolVal); }
	
	} else {
		query = `SELECT r.time FROM results r
		             JOIN schools s ON r.School = s.School
		             JOIN centres c ON s.CentreCode = c.CentreCode
		             JOIN districts d ON c.District = d.District
		             WHERE 1=1`; // 1=1 एक 'dummy' कंडीशन है ताकि आगे AND लगाना आसान हो
		
		if (distVal) { query += " AND d.District = ?"; params.push(distVal); }
		if (centreVal) { query += " AND c.CentreCode = ?"; params.push(centreVal); }
		if (schoolVal) { query += " AND s.School = ?"; params.push(schoolVal); }
	}
	// 3. क्वेरी चलाएं
	
	const res = db.exec(query, params);
	
	
	if (res.length > 0) {
		    const rows = res[0].values;
		
		    const result = rows.reduce((acc, row) => {
		        const timeStr = row[0];
		        if (!timeStr) return acc; // खाली टाइम को इग्नोर करें
		
		        const current = new Date(timeStr.replace(/-/g, "/"));
		        
		        if (!isNaN(current)) {
		            if (!acc.latestDate || current > acc.latestDate) {
		                acc.latestDate = current;
		                acc.latestStr = timeStr;
		            }
		            if (!acc.oldestDate || current < acc.oldestDate) {
		                acc.oldestDate = current;
		                acc.oldestStr = timeStr;
		            }
		        }
		        return acc;
		    }, { latestDate: null, oldestDate: null, latestStr: "", oldestStr: "" });
		
		    document.getElementById("last").innerHTML = "Latest Result Verification: <br/><span style='font-weight:bold; color:green;'>" + result.latestStr + "</span>";
		    document.getElementById("first").innerHTML = "Oldest Result Verification: <br/><span style='font-weight:bold; color:red;'>" + result.oldestStr + "</span>";
		}
		else {
		    // अगर कोई डेटा न मिले
		    document.getElementById("last").innerText = "";
		    document.getElementById("first").innerText = "";
		}
	} catch(e){
	    showStatus(`Error 1996: ${e}`, "error");
	}
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. District Change (already has a function, so we just link it)
    document.getElementById('districtSelect').addEventListener('change', handleDistrictChange);

    // 2. Centre Change (updates counts for selected centre)
    document.getElementById('centreSelect').addEventListener('change', async () => {
await handleCentreChange();
if (db) await updateGlobalCounts(db); await updateVerificationDate(db);
    });

    // 3. School Change (updates counts for specific school)
    document.getElementById('schoolSelect').addEventListener('change', async () => {
if (db) await updateGlobalCounts(db); await updateVerificationDate(db);
    });
});

    // year/class change listener
    document.getElementById('yearSelect').addEventListener('change', onYearOrClassChange);
    document.getElementById('cls10').addEventListener('change', onYearOrClassChange);
    document.getElementById('cls12').addEventListener('change', onYearOrClassChange);

// Add this to the end of your DOMContentLoaded
async function initialLoad() {
    toggleSearch(true);
    const year = document.getElementById('yearSelect').value;
    const cls = document.querySelector('input[name="class"]:checked').value;
    // Pre-load the DB so counters work even before the first search
    try {
	        db = await getDatabase(year, cls);
	        await updateDistrictDropdown(db);
	        await updateGlobalCounts(db);
	        await updateVerificationDate(db);
	      } catch(e) { console.log("Initial load skipped"); showStatus(`Error 2056: ${e}`, "error");}
		    finally {
		        toggleSearch(false); // खत्म होते ही रिलीज करें
		    }
}
initialLoad();
(function() {
    const targetDate = new Date(2026, 2, 30, 13, 18, 18).getTime(); // 28 Mar 2026 1:15:18 PM
    const timerEl = document.getElementById('timer');
    const yearSelect = document.getElementById('yearSelect');

   const cls = document.querySelector('input[name="class"]:checked').value;

    const interval = setInterval(() => {
const now = new Date().getTime();
const diff = targetDate - now;

if (diff <= 0) {
    clearInterval(interval);
    timerEl.innerText = ""; // टाइमर हटा दें
    yearSelect.value = "2026"; // साल बदलें
    document.querySelector(`input[name="class"][value="12"]`).checked = true;    if(typeof onYearOrClassChange === "function") onYearOrClassChange(); // फंक्शन ट्रिगर करें
    return;
}

// समय की गणना (Days, Hours, Minutes, Seconds)
const d = Math.floor(diff / (1000 * 60 * 60 * 24));
const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
const s = Math.floor((diff % (1000 * 60)) / 1000);

// सिर्फ जरूरी हिस्सा दिखाएँ (अगर दिन हैं तो दिन, वरना सिर्फ समय)
timerEl.innerText = (d > 0 ? d + "d " : "") + `${h}:${m}:${s}`;
    }, 1000);
})();



async function fetchFallbackData(type, studentRow, cols, currentCls, currentYear) {
    const SQL = await getSQLEngine();
    let dbFile = "";
    let query = "";
    let dbyear = "";

    const name = studentRow[cols.findIndex(c => c.toUpperCase() === 'NAME')];
    const father = studentRow[cols.findIndex(c => c.toUpperCase() === 'FATHER')];
    const mother = studentRow[cols.findIndex(c => c.toUpperCase() === 'MOTHER')];
    
    if (type === 'DOB') {
dbyear = `${parseInt(currentYear)-2}`;
dbFile = `AllResult${dbyear}-10.db`;
query = `SELECT DOB FROM results WHERE Name LIKE '${name}%' AND Father LIKE '${father}%' AND Mother LIKE '${mother}%' LIMIT 1`;
    }
    // --- ADD THIS BLOCK ---
    else if (type === 'CASTE') {
// Look in the Class 10 DB of 2 years ago (standard for 12thies) 
// or current year Class 10 if looking for a 10th student
dbyear = currentCls === '12' ? `${parseInt(currentYear)-2}` : currentYear;
dbFile = `AllResult${dbyear}-10.db`;
query = `SELECT Caste FROM results WHERE Name LIKE '${name}%' AND Father LIKE '${father}%' AND Mother LIKE '${mother}%' LIMIT 1`;
    }
    else if (type === 'SCHOOL') {
const targetYear = parseInt(currentYear) <= 2021 ? 2021 : 2025;
dbFile = `AllResult${targetYear}-${currentCls}.db`;
dbyear = `${targetYear}`;
let rawSchool = String(studentRow[cols.findIndex(c => c.toLowerCase() === 'school')]);
let distCode = String(studentRow[cols.findIndex(c => c.toLowerCase() === 'district')]);
let normalizedSchool = rawSchool;

if (rawSchool.length !== 7) {
    let newDist = parseInt(distCode) < 100 ? parseInt(distCode) + 100 : distCode;
    let schoolPart = rawSchool.startsWith(distCode) ? rawSchool.substring(distCode.length) : rawSchool;
    normalizedSchool = `${newDist}${schoolPart.padStart(4, '0')}`;
}
query = `SELECT SchoolName FROM schools WHERE School = '${normalizedSchool}' LIMIT 1`;
    }

    showStatus(`Searching ${type} in ${dbyear}...`, "info");

    try {
    	const time = Date.now();
const resp = await fetch(`${dbFile}?token=${ACCESS_TOKEN}&v=${time}`);
if (!resp.ok) return { value: null, error: `File ${dbFile} not found` };
const buf = await resp.arrayBuffer();
const fDb = new SQL.Database(new Uint8Array(buf));
const res = fDb.exec(query);
fDb.close();

if (res.length && res[0].values.length) {
    return { value: res[0].values[0][0], error: null };
} else {
    return { value: null, error: `${type} not in ${dbyear} archive` };
}
    } catch (e) { 
return { value: null, error: e.message };
    }
}


function renderTable(resultSet, cls, year) {
    if (!resultSet || !resultSet.columns) {
document.getElementById('resultsArea').innerHTML = "No data to display.";
return;
    }
    
	// 1. पहले चेक करें कि क्या स्कूल सिलेक्टेड है
	const schoolSelected = document.getElementById('schoolSelect').value !== "";
    const cols = resultSet.columns, vals = resultSet.values;
    const nameIdx = cols.findIndex(c => c.toLowerCase() === 'name');
    
    // Get currently selected filter subjects
    const selectedSubIds = [
document.getElementById('sub1').value,
document.getElementById('sub2').value,
document.getElementById('sub3').value
    ].filter(id => id !== "");
    
    const visibleIndices = [];

    // Filter visible columns
    for (let i = 0; i < cols.length; i++) {
const n = cols[i].toUpperCase();

// Check if this column is one of the S1_ID to S6_ID columns
const isSubjectIdCol = /^[SE]\d_ID$/.test(n);
const isSubjectTotalCol = /^[SE]\d_TT$/.test(n);

// LOGIC: If it's a "Total Marks" (TT) column, check if the corresponding ID column 
// matches one of our selected subjects in the filter.
if (isSubjectTotalCol) {
    const prefix = n.split('_')[0]; // e.g., "S1"
    const idIdx = cols.indexOf(`${prefix}_ID`);
    
    // Check if any row in the current result has the selected Subject ID in this slot
    // We check the first row for efficiency, or you can check all
    const matchesSelected = vals.some(row => selectedSubIds.includes(String(row[idIdx])));
    
    if (matchesSelected) {
        visibleIndices.push(i);
        continue;
    }
}

// Standard hiding logic for other columns
if (schoolSelected && n === "SCHOOL") continue; // अगर स्कूल चुना है, तो SCHOOL कॉलम स्किप करें
const isMarkCol = /^[SE]\d_/.test(n); 
const isTechCol = ['TIME', 'CENTRECODE', 'DISTRICT', 'YEAR', 'CLASS', 'REGTYPE', 'MSREF', 'ENROLNO', 'GRMARKS', 'DIVIMP', 'CATEGORY'].includes(n);
if (isMarkCol || isTechCol || (cls === "10" && n === "STREAM") || (cls === "12" && (n === "DOB" || n === "CASTE"))) continue;
visibleIndices.push(i);
    if (cls === "10" && n === "SCHOOL_RANK") break;
    if (visibleIndices.length >= 25) break;
    }

// --- ADDED BATCH DOWNLOAD BUTTON ---
const results = resultSet.values; // Assuming this is an array
let html = '';

// Check if there is more than one result
if (results.length > 1) {
    html = `
    <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
<button onclick="downloadBatchPDF('${cls}', '${year}')" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">
    Download All Results (Batch PDF - ${results.length})
</button>
    </div>`;
}

    html += `<table id="resultTable"><thead><tr><th>S.No</th>`;
    
    // --- UPDATED COLUMN NAMES LOGIC ---
    visibleIndices.forEach(idx => { 
const dbName = cols[idx].toUpperCase();
let friendlyName = COLUMN_MAPPING[dbName] || dbName; // Use map or fallback to DB name
// If it's a subject marks column, get the Subject Name from the first row
if (/^[SE]\d_TT$/.test(dbName)) {
    const prefix = dbName.split('_')[0];
    const idIdx = cols.indexOf(`${prefix}_ID`);
    const subId = vals[0][idIdx];
    
    // Fetch subject name from deepStore or a quick lookup
    const subRes = subjectdb.exec(`SELECT SubjectName FROM subjects WHERE SubjectID = ${subId}`);
    if (subRes.length) {
        friendlyName = subRes[0].values[0][0].replace('T. L', '').trim();
    }
}
html += `<th class="sortable" onclick="sortTable(this)">${friendlyName}</th>`; 
    });
    
    html += `</tr></thead><tbody>`;
    //#

    //#
    vals.forEach((row, i) => {
html += `<tr><td>${i+1}</td>`;
visibleIndices.forEach(idx => {
    let rawValue = row[idx]; // || "-";
    let v = (rawValue === null || rawValue === undefined) ? "-" : rawValue;
    const colName = cols[idx].toUpperCase(); // Get the column name

 //--- SubjectsFilter

    //# 

// Inside vals.forEach loop in renderTable
if (colName === "RESULT") {
    const originalVal = v;
    // 1. Get the lookup name
    let lookupValue = lookup.res[originalVal];
    
    // 2. Force to String and THEN replace
    v = String(lookupValue || originalVal)
.replace('DIVISION', 'Div')
.replace('FIRST', '1st')
.replace('SECOND', '2nd')
.replace('THIRD', '3rd')
.replace('WITH GRACE', '+ Grace');

    // 3. Add color coding
    let color = "#333";
    if (originalVal == 0) color = "#dc3545";
    if ([1, 14, 2, 24, 3, 34, 5].includes(Number(originalVal))) color = "#28a745";
    if (originalVal == 6) color = "#ffc107";
    
    v = `<span style="color: ${color}; font-weight: bold;">${v}</span>`;
}

if (colName === "CASTE") {
    let lookupValue = lookup.caste[v];
    // Force to String before replacing
    v = String(lookupValue || v)
.replace('MORE BACKWARD CASTES', '(MBC)')
.replace('OTHER BACKWARD CASTES', '(OBC)')
.replace('SCHEDULED TRIBE', '(ST)')
.replace('SCHEDULED CASTE', '(SC)');
}


if (colName === "STREAM") {
    // if not found, it keeps the original value
    v = lookup.stream[v] !== undefined ? lookup.stream[v] : v;
}
 //       if (colName === "CASTE") {
  //          // if not found, it keeps the original value
     //       v = lookup.caste[v] !== undefined ? lookup.caste[v] : v;
   //         v = v.replace('MORE BACKWARD CASTES','(MBC)').replace('OTHER BACKWARD CASTES','(OBC)').replace('SCHEDULED TRIBE','(ST)').replace('SCHEDULED CASTE','(SC)');
    //  caste: { 10: '10 – MORE BACKWARD CASTES', 9: '9 – OTHER BACKWARD CASTES', 8: '8 – SCHEDULED TRIBE', 7: '7 – SCHEDULED CASTE', 6: '6 – MINORITY', 5: '5 – GENERAL'}
  //      }
// ----------------------------------------------

 // -----------------------------------------------
    if (idx === nameIdx) { 
        html += `<td><span class="name-link" onclick='showModal(${JSON.stringify(row)}, ${JSON.stringify(cols)}, "${cls}")'>${v}</span></td>`; 
    } 
    else html += `<td>${v}</td>`;
});
html += `</tr>`;
    });
    document.getElementById('resultsArea').innerHTML = html + `</tbody></table>`;
    
    const heading = document.getElementById("resultsArea");
    heading.scrollIntoView({ behavior: "smooth" });
    
}

function generateSummaryPage(doc, batchData, cls, year) {
    const cols = window.currentCols;
    const resIdx = cols.indexOf('Result');
    const nameIdx = cols.indexOf('Name');
    const rollIdx = cols.indexOf('Roll');
    const percIdx = cols.indexOf('PassPercent');
    const schIdx = cols.indexOf('School');
    
    // 1. Identify Context (School or Centre)
    const schoolVal = document.getElementById('schoolSelect').value;
    const centreVal = document.getElementById('centreSelect').value;
    const sample = batchData[0].academic;
    const isSchoolMode = !!schoolVal;

    // 2. Statistics Calculation
    const stats = { total: batchData.length, div1: 0, div2: 0, div3: 0, grace: 0, supp: 0, fail: 0, abs: 0 };
    let subjectMax = {};
    let graceList = [], suppList = [], failList = [];

    batchData.forEach(student => {
const r = student.rawRow[resIdx];
if (r == 1) stats.div1++;
else if (r == 2) stats.div2++;
else if (r == 3) stats.div3++;
else if ([14, 24, 34].includes(Number(r))) { stats.grace++; graceList.push(student); }
else if (r == 6) { stats.supp++; suppList.push(student); }
else if (r == 0) { stats.fail++; failList.push(student); }
else if (r == 7) stats.abs++;

// Subject Topper Logic (Main + Extras with TH)
student.marks.forEach(m => {
    const isExtra = m[1] == 1;
    const hasTH = (m[2] && m[2] !== '-') || (m[3] && m[3] !== '-');
    if (!isExtra || (isExtra && hasTH)) {
        const subName = m[0].replace('T. L', '').trim();
        const score = parseInt(m[6]) || 0;
        if (!subjectMax[subName] || score > subjectMax[subName].score) {
            subjectMax[subName] = { score, name: student.rawRow[nameIdx], roll: student.rawRow[rollIdx], row: student.rawRow };
        }
    }
});
    });

    // 3. Header & Institute Details
    doc.setFontSize(20); doc.setTextColor(44, 62, 80);
    doc.text("EXAMINATION SUMMARY REPORT", 105, 20, {align: "center"});
    
    doc.setFontSize(12); doc.setTextColor(0);
    if (isSchoolMode) {
doc.text(`INSTITUTION: ${sample["School Name"]} (${sample["School"]})`, 105, 30, {align: "center"});
doc.text(`District: ${sample["District Name"]} | Centre: ${sample["Centre"]}`, 105, 36, {align: "center"});
    } else {
doc.text(`EXAM CENTRE: ${sample["Centre"]} - ${sample["District Name"]}`, 105, 30, {align: "center"});
const schoolsInCentre = [...new Set(batchData.map(d => d.academic["School Name"]))].length;
doc.text(`Total Enrolled: ${stats.total} | Schools in Centre: ${schoolsInCentre}`, 105, 36, {align: "center"});
    }

    // 4. Chart (Updated with Absent)
    drawPerformanceChart(doc, stats); 

    // 5. Top Performers (Top 10 or 10% whichever is higher)
    const topCount = Math.max(10, Math.ceil(batchData.length * 0.10));
    const toppers = [...batchData]
.sort((a, b) => parseFloat(b.rawRow[percIdx]) - parseFloat(a.rawRow[percIdx]))
.slice(0, topCount);

    doc.setFontSize(14); doc.text(`TOP PERFORMERS (Top ${topCount})`, 14, 105);
    doc.autoTable({
startY: 110,
head: [['Roll', 'Name', '%', 'S-Rank', 'C-Rank', 'D-Rank', 'State']],
body: toppers.map(t => [
    t.rawRow[rollIdx], 
    t.rawRow[nameIdx], 
    t.rawRow[percIdx] + '%',
    t.rawRow[cols.indexOf('SCHOOL_RANK')] || '-',
    t.rawRow[cols.indexOf('CENTRE_RANK')] || '-',
    t.rawRow[cols.indexOf('DISTRICT_RANK')] || '-',
    t.rawRow[cols.indexOf('GLOBAL_RANK')] || '-'
]),
theme: 'striped', headStyles: { fillColor: [41, 128, 185] }
    });

    // 6. Subject Toppers
    doc.addPage();
    doc.text("SUBJECT TOPPERS", 14, 20);
    doc.autoTable({
startY: 25,
head: [['Subject', 'Roll', 'Name', 'Marks', 'S-Rank', 'D-Rank']],
body: Object.entries(subjectMax).map(([sub, data]) => [
    sub, data.roll, data.name, data.score,
    data.row[cols.indexOf('SCHOOL_RANK')] || '-',
    data.row[cols.indexOf('DISTRICT_RANK')] || '-'
]),
headStyles: { fillColor: [39, 174, 96] }
    });

    // 7. Critical Analysis (Grace, Supp, Fail)
    const criticalData = [
...graceList.map(s => [s.rawRow[rollIdx], s.rawRow[nameIdx], 'Grace', s.rawRow[cols.indexOf('GRMARKS')] || 'Yes']),
...suppList.map(s => [s.rawRow[rollIdx], s.rawRow[nameIdx], 'Supp.', 'Required']),
...failList.map(s => [s.rawRow[rollIdx], s.rawRow[nameIdx], 'Fail', '-'])
    ];

    if (criticalData.length > 0) {
doc.text("RESULT ANALYSIS (GRACE / SUPP / FAIL)", 14, doc.lastAutoTable.finalY + 15);
doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Roll', 'Name', 'Status', 'Details']],
    body: criticalData,
    headStyles: { fillColor: [192, 57, 43] }
});
    }
}


function drawPerformanceChart(doc, stats) {
    const chartX = 25;
    const chartY = 85;
    const chartWidth = 160;
    const chartHeight = 40;
    
    const data = [
{ label: '1st Div', count: stats.div1, color: [40, 167, 69] },
{ label: '2nd Div', count: stats.div2, color: [100, 180, 100] },
{ label: '3rd Div', count: stats.div3, color: [150, 200, 150] },
{ label: 'Grace', count: stats.grace, color: [255, 193, 7] },
{ label: 'Supp.', count: stats.supp, color: [255, 150, 0] },
{ label: 'Fail', count: stats.fail, color: [220, 53, 69] },
{ label: 'Abs.', count: stats.abs, color: [100, 100, 100] } // Gray for Absent
    ];

    const maxVal = Math.max(...data.map(d => d.count), 1);
    const barWidth = 12;
    const gap = (chartWidth - (data.length * barWidth)) / (data.length + 1);

    doc.setDrawColor(200);
    doc.line(chartX, chartY, chartX + chartWidth, chartY);

    data.forEach((item, i) => {
const bX = chartX + gap + (i * (barWidth + gap));
const bHeight = (item.count / maxVal) * chartHeight;
doc.setFillColor(item.color[0], item.color[1], item.color[2]);
doc.rect(bX, chartY - bHeight, barWidth, bHeight, 'F');
doc.setFontSize(7);
doc.text(String(item.count), bX + (barWidth/2), chartY - bHeight - 2, {align: "center"});
doc.text(item.label, bX + (barWidth/2), chartY + 5, {align: "center"});
    });
}

async function downloadBatchPDF(cls, year) {
    const table = document.getElementById("resultTable");
    if (!table) return;

    // Get current search columns from the last performSearch run
    // We need to store these globally when search finishes
    if (!window.currentCols) {
showStatus("Please perform a search first.", "error");
return;
    }

    const rows = Array.from(table.tBodies[0].rows);
    const visibleRows = rows.filter(r => r.style.display !== "none");

    if (visibleRows.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    showStatus(`Generating ${visibleRows.length} Results...`, "info");

    for (let i = 0; i < visibleRows.length; i++) {
const roll = visibleRows[i].cells[1].innerText.trim(); // Assuming Roll is Col 2
// We need the raw database row array for this roll
// You can store this in deepStore during fetchSchemaData
let studentRow = deepStore[roll].rawRow; 
const cols = window.currentCols;
//----
   // 1. DOB की जांच और रिकवरी
    let dobIdx = cols.findIndex(c => c.toUpperCase() === 'DOB');
    if (cls == 12 && studentRow[dobIdx] === '0' || !studentRow[dobIdx] || studentRow[dobIdx] === '--') {
// अगर DOB नहीं है, तो fetchFallbackData चलाओ
const res = await fetchFallbackData('DOB', studentRow, cols, cls, year);
if (res.value) {
    studentRow[dobIdx] = res.value; // डेटा मिल गया तो अपडेट कर दो
    //deepStore[roll].rawRow[dobIdx] = res.value;
}
    }

    // 2. Caste की जांच और रिकवरी (यदि आवश्यक हो)
    let casteIdx = cols.findIndex(c => c.toUpperCase() === 'CASTE');
    if (cls == 12 && studentRow[casteIdx] === '0' || !studentRow[casteIdx]) {
const res = await fetchFallbackData('CASTE', studentRow, cols, cls, year);
if (res.value) {
    studentRow[casteIdx] = res.value;
}
    }
//----

if (i > 0) doc.addPage();
generateResultPage(doc, roll, cls, year, studentRow, window.currentCols);
    }
    
    	const inputVal = document.getElementById('searchInput').value.trim();
// Get the selected district value
    	const distVal = document.getElementById('districtSelect').value;
// Get Centre
const centreVal = document.getElementById('centreSelect').value; 
// Get selected school
    	const schoolVal = document.getElementById('schoolSelect').value; 
   
if(!inputVal){
	if(schoolVal){
		    doc.save(`${schoolVal}_Batch_${year}-${cls}.pdf`);
                  }
   else {    
   doc.save(`${centreVal}_Batch_${year}-${cls}.pdf`);
                  }

             }
else{
    doc.save(`Batch_${inputVal}_${year}-${cls}.pdf`);
    }
    showStatus("Download Complete", "success");
}


function generateResultPage(doc, roll, cls, year, row, cols) {
    const deep = deepStore[roll]; 
    if (!deep || !row || !cols) return; // Fixed: Use 'deep' instead of 'data'

    let yPos = 15;
    let clsName = cls === '12' ? 'TWELFTH' : 'TENTH';
        const sIdx = cols.findIndex(c => c.toUpperCase() === 'STREAM');
        const streamCode = row[sIdx] || '';
        const streamName = lookup.stream[streamCode] || streamCode; // Fallback to code if not in map

// Draw Page Border
doc.setLineWidth(0.5);
doc.setDrawColor(0);
doc.rect(5, 5, 200, 287); // (x, y, width, height)
    // TOP INFO BAR   ${row[cols.findIndex(c => c.toUpperCase() === 'RESULTDATE')]}
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    if(cls === '12') {
        clsName = `TWELFTH`;
        doc.text(`STREAM: ${streamName}`, 25, yPos);
    }
    if(cls === '10'){
        clsName = `TENTH`;
    }
    doc.text(`RESULT DATE: ${deep.resultDate}`, 185, yPos, {align:"right"});
    yPos += 10;

    // HEADER
    doc.setFontSize(16); doc.text("BOARD OF SECONDARY EDUCATION RAJASTHAN", 105, yPos, {align:"center"}); yPos+=8;
    doc.setFontSize(12); doc.text(`ANNUAL EXAMINATION ${year}`, 105, yPos, {align:"center"});
    yPos+=5; doc.setDrawColor(0); doc.line(20, yPos, 190, yPos); doc.setFillColor(245); doc.rect(95, yPos-3, 20, 6, 'FD', {align:'center'}); doc.setFontSize(10); doc.text(`${clsName}`,105, yPos+1,{align:'center'}); yPos+=10;

// WATERMARK STARTS 

// --- WATERMARK SECTION START ---
doc.saveGraphicsState(); // Save current state
doc.setGState(new doc.GState({opacity: 0.1})); // Set transparency (0.1 is very light)
doc.setFontSize(50);
doc.setTextColor(150); // Light gray
doc.setFont("helvetica", "bold");

// Rotate 45 degrees around the center of the page
// Page width is ~210mm, height is ~297mm
doc.text("BOSE RAJASTHAN AJMER", 140, 230, {
    align: "center",
    angle: 45
});
doc.setFontSize(30);
doc.setTextColor(150); // Light gray
doc.setFont("helvetica", "bold");
doc.text("RAM NIVAS BISHNOI", 130, 231, {
    align: "center",
    angle: 45
});

doc.restoreGraphicsState(); // Restore state so other text isn't transparent
// --- WATERMARK SECTION END ---


// WATERMARK ENDS


// STUDENT DETAILS - Shortened & Corrected
doc.setFontSize(9);
let counter = 0;
const skipCols = [ 'S1_ID','S1_TH','S1_TH2','S1_SS','S1_PR','S1_TT','S2_ID','S2_TH','S2_TH2','S2_SS','S2_PR','S2_TT','S3_ID','S3_TH','S3_TH2','S3_SS','S3_PR','S3_TT','S4_ID','S4_TH','S4_TH2','S4_SS','S4_PR','S4_TT','S5_ID','S5_TH','S5_TH2','S5_SS','S5_PR','S5_TT','S6_ID','S6_TH','S6_TH2','S6_SS','S6_PR','S6_TT','E1_ID','E1_TH','E1_TH2','E1_SS','E1_PR','E1_TT','E2_ID','E2_TH','E2_TH2','E2_SS','E2_PR','E2_TT','E3_ID','E3_TH','E3_TH2','E3_SS','E3_PR','E3_TT','E4_ID','E4_TH','E4_TH2','E4_SS','E4_PR','E4_TT','E5_ID','E5_TH','E5_TH2','E5_SS','E5_PR','E5_TT','E6_ID','E6_TH','E6_TH2','E6_SS','E6_PR','E6_TT','CLASS','YEAR','STREAM','RESULT','TOTAL','PERCENT','RANK','SCHOOL','GRMARKS','DISTRICT','CENTRECODE','TIME'];

cols.forEach((c, i) => {
    const label = c.toUpperCase();
    const val = row[i];
    if (val === undefined || val === null || val === "" || skipCols.some(s => label.includes(s))) return;

    let tx = (counter % 2 === 0) ? 25 : 110;
    let ty = yPos + (Math.floor(counter / 2) * 7);

    // Apply lookups before drawing
    let dVal = val;
    if (label === 'REGTYPE') dVal = lookup.reg[val] || val;
    if (label === 'CASTE') dVal = lookup.caste[val] || val;

    doc.setFont("helvetica", "bold"); 
    doc.text(`${c}:`, tx, ty);
    doc.setFont("helvetica", "normal"); 
    doc.text(`${String(dVal)}`, tx + 25, ty); // 25mm gap is better for 2-column layout
    counter++;
});
yPos += (Math.ceil(counter / 2) * 7) + 5;


    // INSTITUTION BOX
    doc.setDrawColor(255, 36, 0); doc.rect(20, yPos, 170, 15, 'S');
const schoolName = deep.academic["School Name"] || '-';
const dist_name = deep.academic["District Name"] || '-';
let schName = schoolName.replace(`(${dist_name.toUpperCase()})`, '').trim();
// यह कोड ')' के बाद स्पेस जोड़ता है, अगर वहाँ पहले से स्पेस न हो
schName = schName.replace(/\)(?!\s)/g, ") ");

// यह कोड '(' के पहले स्पेस जोड़ता है, अगर वहाँ पहले से स्पेस न हो
schName = schName.replace(/(?<!\s)\(/g, " (");

schName = schName.replace(/\s*,\s*/g, ", ");
    doc.setFont("helvetica", "bold"); doc.text("School:", 25, yPos+5); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,255); doc.setFontSize(10); doc.text(`(${deep.academic["School"]}) ${schName}`, 40, yPos+5);  doc.setTextColor(0); doc.setFontSize(9); 
    doc.text(`District: (${deep.academic["District"]}) ${dist_name}`, 25, yPos+12); doc.text(`Centre: ${deep.academic["Centre"] || '-'}`, 110, yPos+12);
    yPos += 15; // 22;

// MARKS LOGIC
if(deep.marks.length) {
    const clean = (val) => (!val || val === '0' || val === 0 || val === '-' || val === 'None') ? '' : val;

    // Filter subjects using the IsExtra flag (m[1])
    const mainSubjects = deep.marks.filter(m => m[1] === 0 || m[1] === '0');
    const addSubjects = deep.marks.filter(m => m[1] === 1 || m[1] === '1');

    // Dynamic Column Detection based on Main Subjects
    const hasTH = mainSubjects.some(m => clean(m[2]) !== '');
    const hasTH2 = mainSubjects.some(m => clean(m[3]) !== '');
    const hasSS = mainSubjects.some(m => clean(m[4]) !== '');
    const hasPR = mainSubjects.some(m => clean(m[5]) !== '');

    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("", 20, yPos); yPos += 2; //MAIN SUBJECTS HEADING 
    
    const tableTop = yPos;
    const rowHeight = 8;
    
    // 1. DRAW HEADER
    doc.setFillColor(60); doc.rect(20, yPos, 170, rowHeight, 'F');
    doc.setTextColor(255); doc.setFontSize(9);
    doc.text("MAIN SUBJECTS", 25, yPos + 5);
    
    if(!hasTH2) doc.text(hasTH2 ? "TH 1" : "TH", 100, yPos + 5, {align: "center"});
    if(hasTH2) doc.text(hasTH2 ? "TH 1" : "TH", 90, yPos + 5, {align: "center"});
    if(hasTH2) doc.text("TH 2", 110, yPos + 5, {align: "center"});
    if(!hasPR) doc.text("SS", 140, yPos + 5, {align: "center"});
    if(hasPR) doc.text("SS", 130, yPos + 5, {align: "center"});
    if(hasPR) doc.text("PR", 150, yPos + 5, {align: "center"});
    doc.text("TOTAL", 175, yPos + 5, {align: "center"});
    
    doc.setTextColor(0);
    yPos += rowHeight;

//#

//#

    // 2. DRAW MAIN ROWS
    mainSubjects.forEach(m => {
    	
    const totalValue = String(m[6] || ""); // TT (Total) column
    const prValue = String(m[5] || ""); // PR (Practical) column 

// 1. वैल्यूज निकालें
let th1 = parseInt(clean(m[2])) || 0;
let th2 = hasTH2 ? (parseInt(clean(m[3])) || 0) : 0;
let ss = parseInt(clean(m[4])) || 0;

// Grace marks ढूंढने का सुरक्षित तरीका
//const grIdx = cols.findIndex(c => c.toUpperCase() === 'GRMARKS');
//let grace = (grIdx !== -1) ? (parseInt(row[grIdx]) || 0) : 0;
const ggtotalIdx = cols.findIndex(c => c.toUpperCase() === 'GRMARKS');
const grace = ggtotalIdx !== -1 ? (parseInt(row[ggtotalIdx]) || 0) : 0;
let currentSum = th1 + th2 + ss;
let currentSumWithGrace = currentSum + grace;

const rawValue = row[cols.findIndex(c => c.toUpperCase() === 'RESULT')];
const rawRes = (rawValue === null || rawValue === undefined) ? "-" : rawValue; //row[cols.findIndex(c => c.toUpperCase() === 'RESULT')] || '-';
const finalResult = (rawRes === 1 ? 'FIRST DIVISION' : rawRes === 0 ? 'FAILED' : rawRes === 6 ? 'SUPPL.' : rawRes === 2 ? 'SECOND DIVISION' : rawRes === 3 ? 'THIRD DIVISION' : rawRes === 5 ? 'PASSED' : rawRes === 14 ? 'FIRST DIVISION WITH GRACE' : rawRes === 24 ? 'SECOND DIVISION WITH GRACE' : rawRes === 34 ? 'THIRD DIVISION WITH GRACE' : rawRes === 7 ? 'ABSENT' : rawRes);

// क्या Total (TT) में पहले से कोई ग्रेड अक्षर है?
const hasLetterInTotal = /[a-zA-Z]/.test(totalValue); 

let th1Display = clean(m[2]); // दिखाने के लिए मूल वैल्यू
let statusChar = ""; // स्टेटस स्टोर करने के लिए खाली वेरिएबल

// लॉजिक चेक
if (currentSum < 33 && !hasLetterInTotal) {
	if(hasPR) { 
		if(grace > 0) {
			if (currentSum < 23) {
				statusChar = 'G';
         }
 }
    }
    if (currentSumWithGrace >= 33 && grace > 0) {
// अगर ग्रेस मिलाकर 33 हो रहा है
if (hasPR) { 
    if((currentSum - ss) < 9) {statusChar = 'G';}
    }
//else {statusChar = 'G';}
    } else {
// अगर ग्रेस के बाद भी 33 नहीं हुआ, तो S या F
if (hasPR) { 
   if (rawRes === "" || rawRes === 0) {
           if((currentSum - ss) < 9) {statusChar = 'F';}
                }
         }
else {
	if((currentSum - ss) < 16) {
                      statusChar = 'F';
                                                }
              else {
                      statusChar = 'S';
                       }
         }
    }
    
    // अब वैल्यू के साथ अक्षर जोड़ें (उदा: "22S", "30G")
    th1Display = th1Display + statusChar;
}

const hasLetter = /[a-zA-Z]/.test(clean(m[2])); 
if (hasLetter) th1Display = clean(m[2]);

// अब PDF में 'th1Display' को प्रिंट करें न कि 'clean(m[2])' को

    const subName = String(m[0] || ""); // SUBJECT NAME
    let sName = subName.replace('T. L','');
    // 1. Determine Background Color based on letters
    // Format: [Red, Green, Blue]
    let bgColor = null; 
    let textColor = [0, 0, 0]; // Default Black text

    const thValue = String(th1Display || "");
if (thValue.includes('G')) {
    bgColor = [255, 255, 200]; // Yellow (Light)
    textColor = [150, 120, 0]; // Dark Gold/Brown text
    } 
    else if (thValue.includes('S')) {
bgColor = [255, 220, 240]; // Pink (Light)
textColor = [150, 0, 100]; // Deep Pink/Purple text
    } 
       else if (thValue.includes('F')) {
bgColor = [255, 200, 200]; // Red (Light)
textColor = [200, 0, 0];   // Dark Red text
    } 
    
    if(hasPR) { 
if (prValue.includes('G')) {
    bgColor = [255, 255, 200]; // Yellow (Light)
    textColor = [150, 120, 0]; // Dark Gold/Brown text
    } 
}
    if (totalValue.includes('F')) {
bgColor = [255, 200, 200]; // Red (Light)
textColor = [200, 0, 0];   // Dark Red text
    } 
    else if (totalValue.includes('G')) {
bgColor = [255, 255, 200]; // Yellow (Light)
textColor = [150, 120, 0]; // Dark Gold/Brown text
    } 
    else if (totalValue.includes('S')) {
bgColor = [255, 220, 240]; // Pink (Light)
textColor = [150, 0, 100]; // Deep Pink/Purple text
    } 
    else if (totalValue.includes('D')) {
bgColor = [220, 255, 220]; // Green (Light)
textColor = [0, 100, 0];   // Dark Green text
    }

    // 2. Draw the background if a match was found
    if (bgColor) {
doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
// Fill the row rectangle (x=20, width=170)
doc.rect(20, yPos, 170, rowHeight, 'F');
    }

    // 3. Set text color (either the special one or reset to Black)
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // 4. Draw the subject name and marks
doc.setFont("helvetica", "normal");
doc.text(sName, 22, yPos + 5);       // Subject (m[0]) : `${clean(m[0])}`
if (hasTH) {
       // If there is NO TH2, center it at 100. If there IS a TH2, put it at 90.
       let xPos = !hasTH2 ? 100 : 90; 
       doc.text(String(th1Display), xPos, yPos + 5, {align: "center"}); //`${clean(m[2])}`
       }
if(hasTH2) doc.text(`${clean(m[3])}`, 110, yPos + 5, {align:"center"}); // TH2 (m[3])

if (hasSS) {
       // If there is NO PR, center it at 140. If there IS a PR, put it at 130.
       let xPos = !hasPR ? 140 : 130; 
       doc.text(`${clean(m[4])}`, xPos, yPos + 5, {align: "center"});
       }

if(hasPR) doc.text(prValue, 150, yPos + 5, {align:"center"});  // PR (m[5])

    // 5. Draw the TOTAL column in BOLD
    doc.setFont("helvetica", "bold");
    doc.text(totalValue, 175, yPos + 5, {align: "center"});

    // 6. Reset for next row
    doc.setTextColor(0, 0, 0); // Reset pen to Black
    doc.setDrawColor(0); 
    doc.line(20, yPos + rowHeight, 190, yPos + rowHeight);
    
      //  doc.setFont("helvetica", "bold");
       // doc.text(`${clean(m[6])}`, 175, yPos + 5, {align:"center"});      // Total (m[6])
//doc.setDrawColor(0); //(200); //bottom line of table 
       // doc.line(20, yPos + rowHeight, 190, yPos + rowHeight);
yPos += rowHeight;
    });

    
    // --- 3. DRAW SYMMETRICAL TABLE BORDER ---
const tableBottom = yPos;
const tableHeight = tableBottom - tableTop;

doc.setDrawColor(0);
doc.setLineWidth(0.5); // Set a consistent thin line

// Instead of 3-4 separate lines, draw one closed Rectangle.
// This ensures the corner joints are perfectly 'Mitered' (symmetrical).
doc.rect(20, tableTop, 170, tableHeight); 

// --- 4. DRAW INTERNAL VERTICAL DIVIDERS ---
// These should start slightly inside the top/bottom to avoid double-thickness at the tips
doc.line(80, tableTop, 80, tableBottom);   
if(hasTH2) doc.line(100, tableTop, 100, tableBottom); 
doc.line(120, tableTop, 120, tableBottom); 
if(hasPR) doc.line(140, tableTop, 140, tableBottom); 
doc.line(160, tableTop, 160, tableBottom); 


// --- UPDATED SUMMARY BOX LOGIC ---
yPos += 1;
doc.setFillColor(230, 240, 255); 
doc.rect(20, yPos, 170, 10, 'FD');
doc.setFontSize(10); 
doc.setFont("helvetica", "bold");

const totalIdx = cols.findIndex(c => c.toUpperCase().includes('TOTAL'));
const total = row[totalIdx] || mainSubjects.reduce((a,b)=>a+(parseInt(b[6])||0),0);
const perc = row[cols.findIndex(c => c.toUpperCase().includes('PERCENT'))] || '-';

// Result Mapping
    const rawValue = Number(row[cols.findIndex(c => c.toUpperCase() === 'RESULT')]);
const rawRes = (rawValue === null || rawValue === undefined) ? "-" : rawValue; //row[cols.findIndex(c => c.toUpperCase() === 'RESULT')] || '-';
const finalRes = (rawRes === 1 ? 'FIRST DIVISION' : rawRes === 0 ? 'FAILED' : rawRes === 6 ? 'SUPPL.' : rawRes === 2 ? 'SECOND DIVISION' : rawRes === 3 ? 'THIRD DIVISION' : rawRes === 5 ? 'PASSED' : rawRes === 14 ? 'FIRST DIVISION WITH GRACE' : rawRes === 24 ? 'SECOND DIVISION WITH GRACE' : rawRes === 34 ? 'THIRD DIVISION WITH GRACE' : rawRes === 7 ? 'ABSENT' : rawRes);

// --- DYNAMIC WIDTH CALCULATION ---
const resultText = `${finalRes}`;
const resultWidth = doc.getTextWidth(resultText); // Calculates width in mm

// Define dynamic X positions
let resultX = 40; //25;
let percentX = Math.max(85, resultX + resultWidth + 10); // Ensures at least 10mm gap
let totalX = 145;

// Draw the texts
//doc.text(resultText, resultX, yPos + 6);
//#
// 1. Get the raw result code from the row array
const resIdx = cols.findIndex(c => c.toUpperCase() === 'RESULT');
const resCode = String(row[resIdx]); // e.g., "0", "1", "6"
doc.text(`RESULT: `, 23, yPos + 6);
// 2. Decide the color based on the code
if (resCode === "0") {
    doc.setTextColor(217, 83, 79); // Red for FAILED
} else if (resCode === "7") {
    doc.setTextColor(217, 83, 79); // Red for ABSENT
} else if (resCode === "6") {
    doc.setTextColor(240, 173, 78); // Orange for SUPPLEMENTARY
} else {
    doc.setTextColor(40, 167, 69); // Green for ALL PASS DIVISIONS
}

// 3. Draw the text with the selected color
doc.text(`${resultText}`, resultX, yPos + 6);

// 4. IMPORTANT: Reset color to Black immediately so other text isn't colored
doc.setTextColor(0, 0, 0); 

//#
doc.text(`PERCENT: ${perc} %`, percentX, yPos + 6);
doc.text(`GRAND TOTAL: ${total}`, totalX, yPos + 6);

yPos += 12;

// --- PERCENT WATERMARK SECTION START ---
doc.saveGraphicsState(); // Save current state
doc.setGState(new doc.GState({opacity: 0.1})); // Set transparency (0.1 is very light)
doc.setFontSize(80);
doc.setTextColor(150); // Light gray
doc.setFont("helvetica", "bold");

// Rotate 45 degrees around the center of the page
// Page width is ~210mm, height is ~297mm
if (perc > 90){
doc.text(`${perc} %`, 95, 80, {
    align: "center",
  //  angle: 45
});
}
doc.setFontSize(20);
doc.setTextColor(150); // Light gray
doc.setFont("helvetica", "bold");
doc.text("WhatsApp 9799085769", 115, 230, {
    align: "center",
  //  angle: 45
});

doc.restoreGraphicsState(); // Restore state so other text isn't transparent

// --- PERCENT WATERMARK SECTION END ---

// --- END OF UPDATE ---


    // 4. GRACE MARKS (Only if exists)
    const gtotalIdx = cols.findIndex(c => c.toUpperCase() === 'GRMARKS');
    const gtotalValue = gtotalIdx !== -1 ? row[gtotalIdx] : null;

    if (gtotalValue && gtotalValue !== '0' && gtotalValue !== '-' && gtotalValue !== 0) {
    	doc.setFillColor(230, 240, 255); doc.rect(20, yPos, 50, 8, 'FD');
doc.setFontSize(10); doc.text(`GRACE MARKS: ${gtotalValue}`, 25, yPos+5);
yPos += 10;
    }
    
// 5. ADDITIONAL SUBJECTS (IsExtra = 1)
if(!addSubjects.length) {
yPos += 10;
}
if(addSubjects.length) {
    yPos += 5;
    const clean = (val) => (!val || val === '0' || val === 0 || val === '-' || val === 'None') ? '' : val;

    // Scan additional subjects for dynamic columns
    const hasAddTH = addSubjects.some(m => clean(m[2]) !== '');
    const hasAddTH2 = addSubjects.some(m => clean(m[3]) !== '');
    const hasAddPR = addSubjects.some(m => clean(m[5]) !== '');
    const hasAddSS = addSubjects.some(m => clean(m[4]) !== '');

    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("", 20, yPos); yPos += 1; //ADDITIONAL SUBJECTS HEADING 
    
    const addTableTop = yPos;
    const addRowHeight = 7; // Slightly shorter rows for additional section

    // 1. DRAW HEADER
    doc.setFillColor(100); doc.rect(20, yPos, 170, addRowHeight, 'F');
    doc.setTextColor(255); doc.setFontSize(8);


    doc.text("ADDITIONAL SUBJECTS", 25, yPos + 4.5);
    	let thX = !hasAddTH2 ? 100 : 90;
let ssX = !hasAddPR ? 140 : 130;
    //if(!hasAddTH2 && hasAddTH) doc.text(hasAddTH2 ? "TH 1" : "TH", 100, yPos + 4.5, {align:"center"});
    if(hasAddTH) doc.text(hasAddTH2 ? "TH 1" : "TH", thX, yPos + 4.5, {align:"center"});
    if(hasAddTH2) doc.text("TH 2", 110, yPos + 4.5, {align:"center"});
    //if(!hasAddPR && hasAddSS)  doc.text("SS", 140, yPos + 4.5, {align:"center"});
    if(hasAddSS)  doc.text("SS", ssX, yPos + 4.5, {align:"center"});
    if(hasAddPR)  doc.text("PR", 150, yPos + 4.5, {align:"center"});
    doc.text("GRADE / TOTAL", 175, yPos + 4.5, {align:"center"});
    
    doc.setTextColor(0);
    yPos += addRowHeight;

    // 2. DRAW ROWS
    addSubjects.forEach(m => {
    	let thX = !hasAddTH2 ? 100 : 90;
let ssX = !hasAddPR ? 140 : 130;
const val2 = String(m[2] || "");
const val4 = String(m[4] || "");
const val6 = String(m[6] || "");
// अगर तीनों बराबर हैं, तो isDuplicate को true कर देंगे
//const isDuplicate = (val2 === val4 && val4 === val6);
const isDuplicate = val2 !== "" && val4 !== "" && (val2 === val4 && val4 === val6);
doc.setFont("helvetica", "normal");
doc.text(`${clean(m[0])}`, 22, yPos + 4.5);
if(hasAddTH) doc.text(`${clean(m[2])}`, thX, yPos + 4.5, {align: "center"});
if(hasAddTH2) doc.text(`${clean(m[3])}`, 110, yPos + 4.5, {align: "center"});
const textToShow = isDuplicate ? "" : val4;
if(hasAddSS) doc.text(textToShow, ssX, yPos + 4.5, {align: "center"}); //`${clean(m[4])}`

if(hasAddPR)  doc.text(`${clean(m[5])}`, 150, yPos + 4.5, {align:"center"});
doc.setFont("helvetica", "bold");
doc.text(`${clean(m[6])}`, 175, yPos + 4.5, {align:"center"});
doc.setDrawColor(0); //(220);
doc.line(20, yPos + addRowHeight, 190, yPos + addRowHeight);
yPos += addRowHeight;
    });

    // --- 3. DRAW SYMMETRICAL TABLE BORDER ---
const addTableBottom = yPos;
const addTableHeight = addTableBottom - addTableTop;

doc.setDrawColor(0);
doc.setLineWidth(0.5); // Set a consistent thin line

// Instead of 3-4 separate lines, draw one closed Rectangle.
// This ensures the corner joints are perfectly 'Mitered' (symmetrical).
doc.rect(20, addTableTop, 170, addTableHeight); 

// --- 4. DRAW INTERNAL VERTICAL DIVIDERS ---
// These should start slightly inside the top/bottom to avoid double-thickness at the tips
doc.line(80, addTableTop, 80, addTableBottom);   
    if(hasAddTH2 && hasAddTH) doc.line(100, addTableTop, 100, addTableBottom); 
    if(hasAddTH) doc.line(120, addTableTop, 120, addTableBottom); 
    if(hasAddPR) doc.line(140, addTableTop, 140, addTableBottom); 
doc.line(160, addTableTop, 160, addTableBottom); 

    yPos += 5;
}

}

if(!deep.marks.length){

// --- UPDATED SUMMARY BOX LOGIC ---
yPos += 10;
doc.setDrawColor(0);doc.setFillColor(230, 240, 255); doc.rect(20, yPos, 170, 10, 'FD');doc.setFontSize(10); doc.setFont("helvetica", "bold");

// Result Mapping
    const rawValue = Number(row[cols.findIndex(c => c.toUpperCase() === 'RESULT')]);
const rawRes = (rawValue === null || rawValue === undefined) ? "-" : rawValue; //row[cols.findIndex(c => c.toUpperCase() === 'RESULT')] || '-';
const finalRes = (rawRes === 1 ? 'FIRST DIVISION' : rawRes === 0 ? 'FAILED' : rawRes === 6 ? 'SUPPL.' : rawRes === 2 ? 'SECOND DIVISION' : rawRes === 3 ? 'THIRD DIVISION' : rawRes === 5 ? 'PASSED' : rawRes === 14 ? 'FIRST DIVISION WITH GRACE' : rawRes === 24 ? 'SECOND DIVISION WITH GRACE' : rawRes === 34 ? 'THIRD DIVISION WITH GRACE' : rawRes === 7 ? 'ABSENT' : rawRes);

// --- DYNAMIC WIDTH CALCULATION ---
const resultText = `${finalRes}`;
const resultWidth = doc.getTextWidth(resultText); // Calculates width in mm

// 1. Get the raw result code from the row array
const resIdx = cols.findIndex(c => c.toUpperCase() === 'RESULT');
const resCode = String(row[resIdx]); // e.g., "0", "1", "6"
doc.text(`RESULT: `,92, yPos + 6);

// Define dynamic X positions
let resultX = 108; //25;

// 2. Decide the color based on the code
if (resCode === "0") {
    doc.setTextColor(217, 83, 79); // Red for FAILED
} else if (resCode === "7") {
    doc.setTextColor(217, 83, 79); // Red for ABSENT
} else if (resCode === "6") {
    doc.setTextColor(240, 173, 78); // Orange for SUPPLEMENTARY
} else {
    doc.setTextColor(40, 167, 69); // Green for ALL PASS DIVISIONS
}

// 3. Draw the text with the selected color
doc.text(`${resultText}`, resultX, yPos + 6);

// 4. IMPORTANT: Reset color to Black immediately so other text isn't colored
doc.setTextColor(0, 0, 0); 

//#
yPos += 15;
// --- END OF UPDATE ---

}

// RANK SECTION
yPos += 1;
let ranks = [];
const distName = deep.academic["District Name"] || "DISTRICT"; // Get actual name like 'BARMER'
const dName = distName.toUpperCase();
const streamNameClean = streamName.replace('SCIENCE', 'SCI').replace('COMMERCE', 'COMM');

// Map the DB column names to the names you want on the PDF
const rankMap = {
	 'GLOBAL_RANK': 'RAJASTHAN',
     'STREAM_RANK': `${streamName} RANK`,
     'DISTRICT_RANK': `${dName} RANK`,
     'DIST_STREAM_RANK': `${dName}-${streamNameClean}`,
     'CENTRE_RANK': 'CENTRE RANK',
     'CEN_STREAM_RANK': `CENTRE-${streamNameClean}`,
     'SCHOOL_RANK': 'SCHOOL RANK',
     'SCH_STREAM_RANK': `SCHOOL-${streamNameClean}`
};

//for stats

const getStatsForRank = (key) => {
    switch (key) {
case 'GLOBAL_RANK':
    return searchStatsStore.AllStudents;

case 'STREAM_RANK': 
    return searchStatsStore.AllStream?.[streamName] || 0;

case 'DISTRICT_RANK':
    return searchStatsStore.DistrictAll?.[distrCode] || 0; //[deep.academic["District"]] || 0;

       case 'DIST_STREAM_RANK':
    return searchStatsStore.DistrictStreamAll?.[distrCode]?.[streamName] || 0;
    
case 'CENTRE_RANK':
    return searchStatsStore.CentreAll?.[deep.academic["Centre"]] || 0;

       case 'CEN_STREAM_RANK':
    return searchStatsStore.CentreStreamAll?.[deep.academic["Centre"]]?.[streamName] || 0;

case 'SCHOOL_RANK':
    return searchStatsStore.SchoolAll?.[deep.academic["School"]] || 0;

case 'SCH_STREAM_RANK':
    return searchStatsStore.SchoolStreamAll?.[deep.academic["School"]]?.[streamName] || 0;

default:
    return 0;
    }
};

// 1. जिला कोड को सही से हैंडल करें (1 -> 101, 21 -> 121)
let rawDist = String(deep.academic["District"] || "").trim();
let distrCode = rawDist;
if (rawDist.length > 0 && rawDist.length < 3) {
    distrCode = String(parseInt(rawDist) + 100);
}

// 2. डेटा को पहले एक अस्थायी लिस्ट में निकालें
//----
let tempRanks = [];
Object.keys(rankMap).forEach(key => {
    let idx = cols.findIndex(c => c.toUpperCase().includes(key));
    if (idx !== -1) {
let val = row[idx];
if (val && val !== '0' && val !== 0 && val !== '-') {
    tempRanks.push({ key, value: val });
}
    }
});

// 3. अब लम्बाई के आधार पर Labels तय करें और 'ranks' एरे भरें
const isShort = tempRanks.length < 6;

tempRanks.forEach(item => {
    let label = "";


    // डायनेमिक लेबलिंग लॉजिक
    switch (item.key) {
case 'GLOBAL_RANK': label = isShort ? 'RAJASTHAN RANK' : 'RAJASTHAN'; break;
case 'STREAM_RANK': label = isShort ? `${streamName} RANK` : streamName; break;
case 'DISTRICT_RANK': label = isShort ? `${dName} RANK` : dName; break;
case 'DIST_STREAM_RANK': label = isShort ? `${dName} ${streamNameClean} RANK` : `${dName}-${streamNameClean}`; break;
case 'CENTRE_RANK': label = 'CENTRE RANK'; break;
case 'CEN_STREAM_RANK': label = `CENTRE-${streamNameClean}`; break;
case 'SCHOOL_RANK': label = 'SCHOOL RANK'; break;
case 'SCH_STREAM_RANK': label = isShort ? `SCH-${streamNameClean} RANK` : `SCHOOL-${streamNameClean}`; break;
default: label = item.key;
    }

    ranks.push({
label: label,
value: item.value,
stats: getStatsForRank(item.key)
    });
});

//----

// Only draw the section if there is at least one valid rank
if (ranks.length > 0) {
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(10);
    doc.setTextColor(0); // Ensure title is Black
    doc.text("RANK DETAILS", 20, yPos); 
doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.text(`Result Verified on: ${deep.academic["ResultVerified"]}`, 75, yPos);  
doc.setFont("helvetica", "bold"); 
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Data Processed by Ram Nivas Bishnoi", 185, yPos, {align:'right'});
    doc.setFont("helvetica", "bold");
    yPos += 3;

    const pageWidth = 170; 
    const spacing = pageWidth / ranks.length; 
    const boxHeight = 15; //10

    ranks.forEach((item, i) => {
let xPos = 20 + (i * spacing);
let boxWidth = spacing - 3;

// Calculate the horizontal center of THIS specific box
let centerX = xPos + (boxWidth / 2);

// 1. Draw the Box
doc.setDrawColor(180);
doc.setFillColor(248, 249, 250);
doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD');

// 2. Draw Label (Centered)
doc.setFontSize(6);
doc.setTextColor(100); // Gray color for the label
doc.setFont("helvetica", "bold");
doc.text(item.label, centerX, yPos + 3.5, { align: "center" });

// 3. Draw Value (Centered)
doc.setFontSize(9);
doc.setTextColor(0); // Black color for the value
doc.setFont("helvetica", "bold");
doc.text(String(item.value), centerX, yPos + 8, { align: "center" });
     
// 4. Draw Stats (Centered)
doc.setFontSize(6);
doc.setTextColor(100); // Gray color for the status
doc.setFont("helvetica", "normal");
doc.text(`OUT OF ${item.stats}`, centerX, yPos + 12, { align: "center" });
    });
    
    yPos += boxHeight + 10;
}
    // Disclaimer at the Bottom of the MARKSHEET 
    doc.setFontSize(5);
    doc.setTextColor(0); // Ensure title is Black
    doc.setFont("helvetica", "italic");doc.text("Disclaimer :  We are not responsible for any inadvertent error that may have crept in the Data being published on Net. This Marksheet is for immediate information to the examinees and CANNOT be treated as original. Please verify from RBSE.", 105, 290, { align: "center" }); doc.setFontSize(8);

	doc.setFontSize(8);
	doc.setTextColor(150); // Light gray
	doc.setFont("helvetica", "italic");
	doc.text("www.instagram.com/RamNivas29", 8, 230, {
	    //align: "center",
	     angle: 90
	});

    // --- PASTE YOUR ENTIRE DRAWING LOGIC HERE ---
    // Copy everything from inside your current `dlBtn.onclick = () => { ... }`
    // Starting from: doc.setLineWidth(0.5);
    // Ending at: yPos += boxHeight + 10;
    
    // Everywhere you have 'row' and 'cols', it will now work because they are passed in!
}



   async function showModal(row, cols, cls) {
const rollIdx = cols.findIndex(c => c.toLowerCase() === 'roll');
const roll = row[rollIdx];
const nameIdx = cols.findIndex(c => c.toLowerCase() === 'name'); // Find name index
const name = row[nameIdx];
const year = document.getElementById('yearSelect').value; // Get current selected year
const className = cls === '10' ? 'Secondary' : 'Senior Secondary';

    // Update the heading to show context
    document.querySelector('.modal-header h3').innerText = `Student Record - ${className} [${year}]`;
const deep = deepStore[roll] || { academic: {}, marks: [], resultDate: "-" };
    


    let recovered = []; // This will hold all status strings (Success and Errors)

    // 1. Check/Fetch DOB
    const dobIdx = cols.findIndex(c => c.toUpperCase() === 'DOB');
    let dobValue = (dobIdx !== -1) ? row[dobIdx] : "";
    
    if (cls == 12 && !dobValue || dobValue === "None" || dobValue === "-" || dobValue === "--" || dobValue === "Unavailable in Archive") {
		const fallback = await fetchFallbackData('DOB', row, cols, cls, year);
		if (fallback && fallback.value) {
		    dobValue = fallback.value;
		    if(dobIdx !== -1) row[dobIdx] = dobValue; 
		    recovered.push(`✔ DOB: ${dobValue}`);
		    //recovered.push(`<span style="color:#155724">✔ DOB: ${dobValue}</span>`);
		} else {
		    dobValue = "Not Found";
		    if(dobIdx !== -1) row[dobIdx] = dobValue;
		    // This captures the reason (e.g., "File not found" or "No match")
		    const reason = fallback ? fallback.error : "Archive connection failed";
		    recovered.push(`✘ DOB: ${reason}`);
		    //recovered.push(`<span style="color:#721c24">✘ DOB: ${reason}</span>`);
		}
    }

    // 2. Check/Fetch School Name
    let schoolName = deep.academic["School Name"];
    if (!schoolName || schoolName === "None" || schoolName === "" || schoolName === "Institution Name Not Found") {
		const fallback = await fetchFallbackData('SCHOOL', row, cols, cls, year);
		if (fallback && fallback.value) {
		    deep.academic["School Name"] = fallback.value;
		    recovered.push(`✔ School Found`);
		    //recovered.push(`<span style="color:#155724">✔ School Found</span>`);
		} else {
		    deep.academic["School Name"] = "Institution Name Not Found";
		    const reason = fallback ? fallback.error : "School list unavailable";
		    recovered.push(`✘ School: ${reason}`);
		    //recovered.push(`<span style="color:#721c24">✘ School: ${reason}</span>`);
		}
    }
    // 3. Check/Fetch Caste
    const casteIdx = cols.findIndex(c => c.toUpperCase() === 'CASTE');
    let casteValue = (casteIdx !== -1) ? row[casteIdx] : "";

    if (cls == 12 && !casteValue || casteValue === "None" || casteValue === "-" || casteValue === "--" || casteValue === "0") {
        const fallbackCaste = await fetchFallbackData('CASTE', row, cols, cls, year);
		    
		if (fallbackCaste && fallbackCaste.value) {
		    casteValue = fallbackCaste.value;
		    // Update the row object so the Modal display picks it up
		    if(casteIdx !== -1) row[casteIdx] = casteValue; 
		    else { 
		        // If CASTE column didn't exist in current DB, push it to display
		        cols.push('CASTE'); 
		        row.push(casteValue); 
		    }
		    recovered.push(`✔ Caste Found`);
		    //recovered.push(`<span style="color:#155724">✔ Caste Found</span>`);
		} else {
			recovered.push(`✘ Caste Not Found`);
		    //recovered.push(`<span style="color:#721c24">✘ Caste Not Found</span>`);
		}
    }


    // --- FINAL DISPLAY ---
    if (recovered.length > 0) {
// We join with a separator so you see both DOB status and School status
showStatus(recovered.join(" | "), "info");
    }
    // -------------------------


let pBody = "", sBody = "";

    // 1. PRIMARY INFO (Left Side) - Handle Mappings
cols.forEach((c, i) => {

    const n = c.toUpperCase();
    const val = row[i];
       
// Filter logic
if(!val || [ 'S1_ID','S1_TH','S1_TH2','S1_SS','S1_PR','S1_TT','S2_ID','S2_TH','S2_TH2','S2_SS','S2_PR','S2_TT','S3_ID','S3_TH','S3_TH2','S3_SS','S3_PR','S3_TT','S4_ID','S4_TH','S4_TH2','S4_SS','S4_PR','S4_TT','S5_ID','S5_TH','S5_TH2','S5_SS','S5_PR','S5_TT','S6_ID','S6_TH','S6_TH2','S6_SS','S6_PR','S6_TT','E1_ID','E1_TH','E1_TH2','E1_SS','E1_PR','E1_TT','E2_ID','E2_TH','E2_TH2','E2_SS','E2_PR','E2_TT','E3_ID','E3_TH','E3_TH2','E3_SS','E3_PR','E3_TT','E4_ID','E4_TH','E4_TH2','E4_SS','E4_PR','E4_TT','E5_ID','E5_TH','E5_TH2','E5_SS','E5_PR','E5_TT','E6_ID','E6_TH','E6_TH2','E6_SS','E6_PR','E6_TT','CLASS','YEAR','DISTRICT','CENTRECODE','SCHOOL','TIME'].includes(n) || (cls === "10" && n === "STREAM") || (cls === "12" && (n === "DISTRICT" || n === "SCHOOL" ))) return;
// Map codes to full names
let displayVal = val;
// Apply Integer Lookups
    if (n === 'STREAM') {
displayVal = lookup.stream[val] || (val === 0 || val === "None" ? "-" : val);
    }
    else if (n === 'RESULT') {
    	displayVal = lookup.res[val] !== undefined ? lookup.res[val] : val;
} 
    else if (n === 'CASTE') {
    	displayVal = lookup.caste[val] !== undefined ? lookup.caste[val] : val;
} 
    else if (n === 'REGTYPE') { // Ensure this matches your DB column name
displayVal = lookup.reg[val] !== undefined ? lookup.reg[val] : val;
    }

    pBody += `<div class="detail-row"><div class="detail-label">${c}</div><div class="detail-value">${displayVal}</div></div>`;

});
Object.entries(deep.academic).forEach(([k,v]) => { sBody += `<div class="detail-row"><div class="detail-label">${k}</div><div class="detail-value">${v}</div></div>`; });

if(deep.marks.length) {
    const clean = (val) => (!val || val === '0' || val === 0 || val === '-' || val === 'None') ? '' : val;

    // 1. Separate the marks into two groups
    const mainSubs = deep.marks.filter(m => m[1] == 0 || m[1] == '0');
    const extraSubs = deep.marks.filter(m => m[1] == 1 || m[1] == '1');
    

       // 3. Helper function to build table rows
    const buildRows = (subsList, title) => {
if (subsList.length === 0) return "";

     // Scan for columns (based on all marks)
    const hasTH = subsList.some(m => clean(m[2]) !== '');
    const hasTH2 = subsList.some(m => clean(m[3]) !== '');
    const hasSS = subsList.some(m => clean(m[4]) !== '');
    const hasPR = subsList.some(m => clean(m[5]) !== '');
    
let sectionHtml = `<div style="margin-top:10px; font-weight:bold; font-size:10px; color:#555;">${title}</div>`;
sectionHtml += `<table class="marks-table"><thead>
    <tr><th style="text-align: left; padding-left: 8px;">Subject</th>  ${hasTH ? `<th>TH${hasTH2 ? ' 1' : ''}</th>` : ''}
    ${hasTH2 ? '<th>TH 2</th>' : ''}   ${hasSS  ? '<th>SS</th>' : ''} ${hasPR ? '<th>PR</th>' : ''}<th>Total</th></tr>
</thead><tbody>`;
subsList.forEach(m => { 
    sectionHtml += `<tr>
        <td style="text-align:left">${clean(m[0])}</td>
             ${hasTH ? `<td>${clean(m[2])}</td>` : ''}
        ${hasTH2 ? `<td>${clean(m[3])}</td>` : ''}
          ${hasSS  ? `<td>${clean(m[4])}</td>` : ''}
        ${hasPR ? `<td>${clean(m[5])}</td>` : ''}
        <td><b>${clean(m[6])}</b></td>
    </tr>`; 
});
return sectionHtml + `</tbody></table>`;
    };

    // 4. Add Main Subjects first, then Extra Subjects
    sBody += buildRows(mainSubs, "MAIN SUBJECTS");
    sBody += buildRows(extraSubs, "ADDITIONAL SUBJECTS");
    

}
document.getElementById('modalPrimary').innerHTML = pBody;
document.getElementById('modalSecondary').innerHTML = sBody || "No data.";
document.getElementById('detailModal').style.display = 'flex';
const dlBtn = document.getElementById('modalDL');
dlBtn.onclick = () => {
	try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    generateResultPage(doc, roll, cls, year, row, cols);

    // IMMEDIATE DOWNLOAD
    console.log("PDF Generation Successful");
    doc.save(`${cls}th_${name}_Results_${roll}_${year}.pdf`);
       } catch (error) {
          // यह हिस्सा एरर को पकड़कर स्क्रीन पर दिखाएगा
           console.error("Detailed Error:", error);
           alert("PDF Error: " + error.message + "\n\nकृपया जाँचें कि क्या सभी डेटा सही से लोड हुआ है।");
      }
};
    }

    function filterTable() {
const f = document.getElementById('tableFilter').value.toUpperCase();
const rows = document.querySelector("#resultTable tbody").rows;
for (let r of rows) { r.style.display = r.innerText.toUpperCase().includes(f) ? "" : "none"; }
    }


function showStatus(message, type) {

    const statusDiv = document.getElementById("statusMessage");
    const statusText = document.getElementById("statusText");

    clearTimeout(hideTimeout);

    // Reset animation by removing and reflowing
    statusDiv.style.display = "none";
    void statusDiv.offsetWidth;  // animation reset trick

    statusText.innerText = message;
    statusDiv.className = "status-box " + type;
    statusDiv.style.display = "block";


    // 🔎 Check condition
  //  const isResultVisible =
  //      resultTable &&
 //       resultTable.style.display !== "None" &&
    //    resultTable.offsetHeight > 0;

if (type === "info") {
// Auto-hide only if condition NOT matched
hideTimeout = setTimeout(() => {
    statusDiv.style.display = "none";
}, 30000);
    }
}

    function showStatuSs(msg, type) {
const el = document.getElementById('status-msg');
el.innerHTML = msg; el.className = type; el.style.display = 'block';
//setTimeout(() => {
//el.style.display = "none";
//}, 3000);
    }
    /* --- JAVASCRIPT SECTION END --- */
