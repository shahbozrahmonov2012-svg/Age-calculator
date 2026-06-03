/* =====================================================
   AGE CALCULATOR – script.js
   Features: Live clock, age, countdown, zodiac,
   life stats, age gap, history facts, share, PWA,
   particles (desktop only), scroll reveals.
   ===================================================== */

'use strict';

// ── DOM refs ──────────────────────────────────────────
const $ = id => document.getElementById(id);
const timezoneInput   = $('timezoneInput');
const timezoneList    = $('timezoneList');
const timezoneInfo    = $('timezoneInfo');
const gpsBadge        = $('gpsBadge');
const gpsIcon         = $('gpsIcon');
const calculateBtn    = $('calculateBtn');
const birthDateInput  = $('birthDate');
const chosenDateBadge = $('chosenDateBadge');
const calendarBtn     = $('calendarBtn');
const hiddenPicker    = $('hiddenDatePicker');
const resultsArea     = $('resultsArea');
const ageHeadline     = $('ageHeadline');
const ageLabel        = $('ageLabel');
const liveClock       = $('liveClock');
const resultGrid      = $('resultGrid');
const countdownDisplay= $('countdownDisplay');
const zodiacDisplay   = $('zodiacDisplay');
const lifeStatsDisplay= $('lifeStatsDisplay');
const breakdownGrid   = $('breakdownGrid');
const toggleBreakdown = $('toggleBreakdown');
const historyContent  = $('historyContent');
const gapBtn          = $('gapBtn');
const gapDate1        = $('gapDate1');
const gapDate2        = $('gapDate2');
const gapResult       = $('gapResult');
const lifeStatsExt    = $('lifeStatsExtended');
const shareWhatsapp   = $('shareWhatsapp');
const shareTwitter    = $('shareTwitter');
const shareCopy       = $('shareCopy');
const particleCanvas  = $('particleCanvas');

let selectedTZ    = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let tickInterval  = null;
let currentBirth  = null;
let isGps         = false;

// ── INIT ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  populateTZList();
  setTZ(selectedTZ);
  detectTZ();
  setupInputFormatting();
  setupScrollReveal();
  initParticles();   // desktop only – canvas hidden on mobile via CSS
  checkURLParams();
});

// ── TIMEZONE SETUP ────────────────────────────────────
function populateTZList() {
  const zones = typeof Intl?.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : ['UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
       'Asia/Tokyo','Asia/Tashkent','Asia/Dubai','Asia/Bangkok','Asia/Shanghai',
       'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
       'America/Sao_Paulo','Australia/Sydney','Africa/Cairo'];
  zones.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz;
    timezoneList.appendChild(opt);
  });
  timezoneInput.value = selectedTZ;
}

function setTZ(tz) {
  if (!isValidTZ(tz)) tz = 'UTC';
  selectedTZ = tz;
  timezoneInput.value = tz;
  if (tickInterval) clearInterval(tickInterval);
  updateTZInfo();
  tickInterval = setInterval(updateTZInfo, 1000);
}

function updateTZInfo() {
  const now = new Date();
  const opts = {
    year:'numeric',month:'short',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',
    hour12:false,timeZone:selectedTZ
  };
  timezoneInfo.textContent = `${selectedTZ} • ${new Intl.DateTimeFormat('en-US',opts).format(now)}`;
}

function isValidTZ(tz) {
  try { Intl.DateTimeFormat(undefined,{timeZone:tz}); return true; }
  catch { return false; }
}

timezoneInput.addEventListener('change', () => { if(isValidTZ(timezoneInput.value.trim())) setTZ(timezoneInput.value.trim()); });
timezoneInput.addEventListener('input', () => { if(isValidTZ(timezoneInput.value.trim())) setTZ(timezoneInput.value.trim()); });

// ── GPS ───────────────────────────────────────────────
gpsBadge.addEventListener('click', () => {
  if (isGps) return;
  isGps = true;
  gpsBadge.classList.add('loading');
  gpsBadge.style.opacity = '0.6';
  timezoneInfo.textContent = 'Detecting location…';

  if (!navigator.geolocation) {
    endGps(); timezoneInfo.textContent = 'GPS not available.'; return;
  }
  const t = setTimeout(() => { endGps(); timezoneInfo.textContent = 'Timed out. Try again.'; }, 12000);
  navigator.geolocation.getCurrentPosition(
    async pos => {
      clearTimeout(t);
      try {
        const tz = await tzFromCoords(pos.coords.latitude, pos.coords.longitude);
        setTZ(tz);
        timezoneInfo.textContent = `Detected: ${tz}`;
      } catch {
        setTZ(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      }
      endGps();
    },
    err => {
      clearTimeout(t);
      const msgs = {1:'Enable location permissions.',2:'Location unavailable.',3:'Timed out.'};
      timezoneInfo.textContent = msgs[err.code] || 'Could not detect location.';
      endGps();
    },
    {timeout:10000,enableHighAccuracy:true}
  );
});

function endGps() {
  isGps = false;
  gpsBadge.classList.remove('loading');
  gpsBadge.style.opacity = '1';
}

async function tzFromCoords(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/timezone-by-location?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const d = await res.json();
    if (d.ianaTimeId) return d.ianaTimeId;
  } catch {}
  // Fallback: estimate from longitude
  const offset = Math.round(lon / 15);
  const map = {
    0:'UTC',1:'Europe/London',2:'Europe/Paris',3:'Europe/Moscow',4:'Asia/Dubai',
    5:'Asia/Tashkent',6:'Asia/Dhaka',7:'Asia/Bangkok',8:'Asia/Shanghai',
    9:'Asia/Tokyo',10:'Australia/Sydney',12:'Pacific/Auckland',
    '-4':'America/New_York','-5':'America/Chicago','-6':'America/Denver',
    '-7':'America/Los_Angeles','-9':'Pacific/Honolulu'
  };
  return map[String(offset)] || 'UTC';
}

function detectTZ(manual=false) {
  setTZ(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
}

// ── DATE INPUT FORMATTING ─────────────────────────────
function setupInputFormatting() {
  [birthDateInput, gapDate1, gapDate2].forEach(inp => {
    inp.addEventListener('input', autoFormatDate);
    inp.addEventListener('keydown', e => { if(e.key==='Enter') calculateBtn.click(); });
  });

  birthDateInput.addEventListener('input', () => {
    const v = birthDateInput.value;
    chosenDateBadge.textContent = isValidDateStr(v) ? formatDisplayDate(v) : 'No date chosen';
  });

  // Calendar button opens hidden date picker
  if (calendarBtn && hiddenPicker) {
    calendarBtn.addEventListener('click', () => hiddenPicker.click());
    hiddenPicker.addEventListener('change', () => {
      if (hiddenPicker.value) {
        birthDateInput.value = hiddenPicker.value;
        chosenDateBadge.textContent = formatDisplayDate(hiddenPicker.value);
      }
    });
  }
}

function autoFormatDate(e) {
  const pos = e.target.selectionStart;
  let raw = e.target.value.replace(/\D/g,'').slice(0,8);
  let out = raw;
  if (raw.length > 4) out = raw.slice(0,4) + '-' + raw.slice(4);
  if (raw.length > 6) out = raw.slice(0,4) + '-' + raw.slice(4,6) + '-' + raw.slice(6);
  e.target.value = out;
}

function isValidDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function formatDisplayDate(s) {
  const [y,m,d] = s.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m,10)-1]} ${y}`;
}

function parseDateStr(s) {
  if (!isValidDateStr(s)) return null;
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y, m-1, d, 0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

// ── CALCULATE ─────────────────────────────────────────
calculateBtn.addEventListener('click', calculateAge);

function calculateAge() {
  const val = birthDateInput.value.trim();
  if (!val) { alert('Please enter your birth date.'); return; }
  const birth = parseDateStr(val);
  if (!birth) { alert('Invalid date. Use YYYY-MM-DD.'); return; }
  if (birth > new Date()) { alert('Birth date cannot be in the future.'); return; }

  currentBirth = birth;

  // Show results
  resultsArea.classList.remove('hidden');

  // Render sections
  renderResultGrid(birth);
  renderCountdown(birth);
  renderZodiac(birth);
  renderLifeStats(birth);
  renderBreakdown(birth);
  renderHistory(birth);
  renderLifeStatsExtended(birth);
  setupShare(val);

  // Live clock
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if (currentBirth) updateLiveClock(currentBirth);
    updateTZInfo();
  }, 1000);
  updateLiveClock(birth);

  resultsArea.scrollIntoView({behavior:'smooth', block:'start'});
  initScrollReveal();
}

// ── EXACT AGE CALC ────────────────────────────────────
function getExactAge(birth, now) {
  let yy = now.getFullYear() - birth.getFullYear();
  let mo = now.getMonth()    - birth.getMonth();
  let dd = now.getDate()     - birth.getDate();
  let hh = now.getHours()    - birth.getHours();
  let mi = now.getMinutes()  - birth.getMinutes();
  let ss = now.getSeconds()  - birth.getSeconds();

  if (ss < 0) { ss += 60; mi--; }
  if (mi < 0) { mi += 60; hh--; }
  if (hh < 0) { hh += 24; dd--; }
  if (dd < 0) { dd += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); mo--; }
  if (mo < 0) { mo += 12; yy--; }

  return {years:yy, months:mo, days:dd, hours:hh, minutes:mi, seconds:ss};
}

function totalDaysAlive(birth, now) {
  return Math.floor((now - birth) / 86400000);
}

// ── LIVE CLOCK ────────────────────────────────────────
function updateLiveClock(birth) {
  const now = new Date();
  const a = getExactAge(birth, now);
  liveClock.textContent =
    `${a.years}y ${String(a.months).padStart(2,'0')}mo ${String(a.days).padStart(2,'0')}d `+
    `${String(a.hours).padStart(2,'0')}h ${String(a.minutes).padStart(2,'0')}min ${String(a.seconds).padStart(2,'0')}s`;

  ageHeadline.textContent = a.years;
  ageLabel.textContent = a.years === 1 ? 'year old' : 'years old';
}

// ── RESULT GRID ───────────────────────────────────────
function renderResultGrid(birth) {
  const now = new Date();
  const a = getExactAge(birth, now);
  const td = totalDaysAlive(birth, now);
  const cells = [
    {val: a.years,              lbl:'Years'},
    {val: a.months,             lbl:'Months'},
    {val: a.days,               lbl:'Days'},
    {val: a.hours,              lbl:'Hours'},
    {val: a.minutes,            lbl:'Minutes'},
    {val: a.seconds,            lbl:'Seconds'}
  ];
  resultGrid.innerHTML = cells.map(c => `
    <div class="result-cell reveal">
      <span class="result-cell-val">${fmt(c.val)}</span>
      <span class="result-cell-label">${c.lbl}</span>
    </div>`).join('');
}

// ── BIRTHDAY COUNTDOWN ────────────────────────────────
function renderCountdown(birth) {
  const now = new Date();
  let next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (next <= now) next = new Date(now.getFullYear()+1, birth.getMonth(), birth.getDate());
  const diff = next - now;
  const dDays  = Math.floor(diff / 86400000);
  const dHours = Math.floor((diff % 86400000) / 3600000);
  const dMins  = Math.floor((diff % 3600000) / 60000);
  const dSecs  = Math.floor((diff % 60000) / 1000);
  const isToday = dDays === 0 && dHours === 0 && dMins === 0;

  countdownDisplay.innerHTML = isToday
    ? `<div style="text-align:center;font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--c-warn)">🎂 Happy Birthday Today! 🎉</div>`
    : [
        {val:dDays,  lbl:'Days'},
        {val:dHours, lbl:'Hours'},
        {val:dMins,  lbl:'Minutes'},
        {val:dSecs,  lbl:'Seconds'},
      ].map(u=>`<div class="countdown-unit">
        <span class="countdown-val">${String(u.val).padStart(2,'0')}</span>
        <span class="countdown-lbl">${u.lbl}</span>
      </div>`).join('');
}

// ── ZODIAC ────────────────────────────────────────────
const ZODIAC = [
  {name:'Capricorn', sym:'♑', emoji:'🐐', from:[12,22], to:[1,19],  element:'Earth', ruling:'Saturn',     trait:'Disciplined & Ambitious'},
  {name:'Aquarius',  sym:'♒', emoji:'🏺', from:[1,20],  to:[2,18],  element:'Air',   ruling:'Uranus',     trait:'Visionary & Independent'},
  {name:'Pisces',    sym:'♓', emoji:'🐟', from:[2,19],  to:[3,20],  element:'Water', ruling:'Neptune',    trait:'Compassionate & Dreamy'},
  {name:'Aries',     sym:'♈', emoji:'🐏', from:[3,21],  to:[4,19],  element:'Fire',  ruling:'Mars',       trait:'Bold & Energetic'},
  {name:'Taurus',    sym:'♉', emoji:'🐂', from:[4,20],  to:[5,20],  element:'Earth', ruling:'Venus',      trait:'Patient & Reliable'},
  {name:'Gemini',    sym:'♊', emoji:'👯', from:[5,21],  to:[6,20],  element:'Air',   ruling:'Mercury',    trait:'Curious & Adaptable'},
  {name:'Cancer',    sym:'♋', emoji:'🦀', from:[6,21],  to:[7,22],  element:'Water', ruling:'Moon',       trait:'Nurturing & Intuitive'},
  {name:'Leo',       sym:'♌', emoji:'🦁', from:[7,23],  to:[8,22],  element:'Fire',  ruling:'Sun',        trait:'Confident & Creative'},
  {name:'Virgo',     sym:'♍', emoji:'🌾', from:[8,23],  to:[9,22],  element:'Earth', ruling:'Mercury',    trait:'Analytical & Kind'},
  {name:'Libra',     sym:'♎', emoji:'⚖️', from:[9,23],  to:[10,22], element:'Air',   ruling:'Venus',      trait:'Harmonious & Fair'},
  {name:'Scorpio',   sym:'♏', emoji:'🦂', from:[10,23], to:[11,21], element:'Water', ruling:'Pluto',      trait:'Intense & Magnetic'},
  {name:'Sagittarius',sym:'♐',emoji:'🏹', from:[11,22], to:[12,21], element:'Fire',  ruling:'Jupiter',    trait:'Free-spirited & Optimistic'},
];

const CHINESE = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
const CHINESE_EMOJI = ['🐀','🐂','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐓','🐶','🐷'];

function getZodiac(birth) {
  const m = birth.getMonth()+1, d = birth.getDate();
  for (const z of ZODIAC) {
    const [fm,fd] = z.from, [tm,td] = z.to;
    if ((m===fm && d>=fd)||(m===tm && d<=td)) return z;
  }
  return ZODIAC[0];
}

function renderZodiac(birth) {
  const z = getZodiac(birth);
  const cy = ((birth.getFullYear()-1900) % 12 + 12) % 12;
  const cSign = CHINESE[cy], cEmoji = CHINESE_EMOJI[cy];
  const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][birth.getDay()];

  zodiacDisplay.innerHTML = `
    <div class="zodiac-main">
      <span class="zodiac-symbol">${z.emoji}</span>
      <div>
        <div class="zodiac-name">${z.sym} ${z.name}</div>
        <div class="zodiac-sub">${z.trait}</div>
      </div>
    </div>
    <div class="zodiac-row"><span class="lbl">Element</span><span class="val">${z.element}</span></div>
    <div class="zodiac-row"><span class="lbl">Ruling Planet</span><span class="val">${z.ruling}</span></div>
    <div class="zodiac-row"><span class="lbl">Chinese Zodiac</span><span class="val">${cEmoji} ${cSign}</span></div>
    <div class="zodiac-row"><span class="lbl">Born on</span><span class="val">${day}</span></div>
  `;
}

// ── LIFE STATS ────────────────────────────────────────
function renderLifeStats(birth) {
  const now = new Date();
  const td = totalDaysAlive(birth, now);
  const avgLife = 75 * 365;
  const pctLived = Math.min(100, Math.round((td/avgLife)*100));
  const heartbeats = Math.round(td * 100800);
  const breaths    = Math.round(td * 20 * 1440);
  const sleepDays  = Math.round(td * 8/24);
  const steps      = Math.round(td * 7500);

  const bars = [
    {lbl:'Life lived (est. 75y)',  val:`${pctLived}%`,   pct:pctLived},
    {lbl:'Sleep days',             val:fmt(sleepDays),   pct: Math.min(100, Math.round(sleepDays/(avgLife/3)*100))},
    {lbl:'Heartbeats (est.)',      val:shortNum(heartbeats)+'B', pct:pctLived},
  ];

  lifeStatsDisplay.innerHTML = bars.map(b=>`
    <div class="stat-bar-item">
      <div class="stat-bar-top">
        <span class="stat-bar-lbl">${b.lbl}</span>
        <span class="stat-bar-val">${b.val}</span>
      </div>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width:0%" data-width="${b.pct}%"></div>
      </div>
    </div>`).join('');

  // Animate bars after render
  requestAnimationFrame(()=>{
    document.querySelectorAll('.stat-bar-fill').forEach(el=>{
      el.style.width = el.dataset.width;
    });
  });
}

// ── BREAKDOWN ─────────────────────────────────────────
function renderBreakdown(birth) {
  const now = new Date();
  const a = getExactAge(birth, now);
  const td = totalDaysAlive(birth, now);
  const th = td*24 + a.hours;
  const tm = th*60 + a.minutes;
  const ts = tm*60 + a.seconds;

  const items = [
    {lbl:'Years',    val:fmt(a.years)},
    {lbl:'Months',   val:fmt(a.years*12+a.months)},
    {lbl:'Weeks',    val:fmt(Math.floor(td/7))},
    {lbl:'Days',     val:fmt(td)},
    {lbl:'Hours',    val:fmt(th)},
    {lbl:'Minutes',  val:fmt(tm)},
    {lbl:'Seconds',  val:fmt(ts)},
    {lbl:'Leap years', val:leapYearsLived(birth, now)},
    {lbl:'Weekdays lived', val:fmt(Math.floor(td*5/7))},
    {lbl:'Weekends lived', val:fmt(Math.floor(td*2/7))},
  ];

  breakdownGrid.innerHTML = items.map(i=>`
    <div class="breakdown-cell">
      <span class="bc-lbl">${i.lbl}</span>
      <span class="bc-val">${i.val}</span>
    </div>`).join('');
}

toggleBreakdown.addEventListener('click', () => {
  const hidden = breakdownGrid.classList.contains('hidden');
  breakdownGrid.classList.toggle('hidden', !hidden);
  toggleBreakdown.querySelector('.chevron').classList.toggle('open', hidden);
});

// ── HISTORY FACTS ─────────────────────────────────────
const historyData = {
  1950:{song:'Goodnight, Irene – Gordon Jenkins',movie:'All About Eve',tech:'First credit card',sport:'Uruguay wins FIFA World Cup',pop:'2.5B'},
  1951:{song:'Too Young – Nat King Cole',movie:'A Streetcar Named Desire',tech:'First commercial computer (UNIVAC)',sport:'Sugar Ray Robinson unifies titles',pop:'2.58B'},
  1952:{song:'Cry – Johnnie Ray',movie:'Singin in the Rain',tech:'Polio vaccine developed',sport:'Helsinki Olympics',pop:'2.63B'},
  1953:{song:'Vaya con Dios – Les Paul',movie:'Roman Holiday',tech:'DNA double helix discovered',sport:'Rocky Marciano retains title',pop:'2.68B'},
  1954:{song:'Sh-Boom – Crew-Cuts',movie:'Rear Window',tech:'First nuclear submarine USS Nautilus',sport:'West Germany wins FIFA World Cup',pop:'2.74B'},
  1955:{song:'Rock Around the Clock – Bill Haley',movie:'Rebel Without a Cause',tech:'Microwave oven for home use',sport:'Brooklyn Dodgers win World Series',pop:'2.77B'},
  1956:{song:'Don\'t Be Cruel – Elvis Presley',movie:'The Ten Commandments',tech:'First hard disk drive (IBM)',sport:'Melbourne Olympics',pop:'2.80B'},
  1957:{song:'All Shook Up – Elvis Presley',movie:'The Bridge on the River Kwai',tech:'Sputnik launched',sport:'Milwaukee Braves win World Series',pop:'2.87B'},
  1958:{song:'Volare – Domenico Modugno',movie:'Vertigo',tech:'NASA founded',sport:'Brazil wins FIFA World Cup',pop:'2.91B'},
  1959:{song:'Mack the Knife – Bobby Darin',movie:'Some Like It Hot',tech:'First Barbie doll',sport:'Ingemar Johansson beats Patterson',pop:'2.98B'},
  1960:{song:'Theme from A Summer Place',movie:'Psycho',tech:'First oral contraceptive',sport:'Rome Olympics',pop:'3.03B'},
  1961:{song:'Tossin and Turnin – Bobby Lewis',movie:'Breakfast at Tiffanys',tech:'First human in space (Gagarin)',sport:'Floyd Patterson regains title',pop:'3.08B'},
  1962:{song:'Stranger on the Shore',movie:'Lawrence of Arabia',tech:'First US orbital flight (Glenn)',sport:'Brazil wins FIFA World Cup',pop:'3.14B'},
  1963:{song:'Sugar Shack – Jimmy Gilmer',movie:'Cleopatra',tech:'First geosynchronous satellite',sport:'Sonny Liston beats Patterson',pop:'3.20B'},
  1964:{song:'I Want to Hold Your Hand – Beatles',movie:'My Fair Lady',tech:'IBM System/360 launched',sport:'Tokyo Olympics',pop:'3.26B'},
  1965:{song:'Wooly Bully – Sam the Sham',movie:'The Sound of Music',tech:'First spacewalk (Leonov)',sport:'Green Bay Packers win Super Bowl',pop:'3.34B'},
  1966:{song:'The Ballad of the Green Berets',movie:'A Man for All Seasons',tech:'First lunar soft landing (Luna 9)',sport:'England wins FIFA World Cup',pop:'3.42B'},
  1967:{song:'To Sir, With Love – Lulu',movie:'The Graduate',tech:'First heart transplant',sport:'Green Bay Packers win Super Bowl II',pop:'3.50B'},
  1968:{song:'Hey Jude – Beatles',movie:'2001: A Space Odyssey',tech:'First 911 call made',sport:'Mexico City Olympics',pop:'3.56B'},
  1969:{song:'Sugar Sugar – The Archies',movie:'Midnight Cowboy',tech:'Moon landing (Apollo 11)',sport:'NY Jets win Super Bowl III',pop:'3.63B'},
  1970:{song:'Bridge Over Troubled Water – Simon & Garfunkel',movie:'Patton',tech:'First Earth Day',sport:'Brazil wins FIFA World Cup',pop:'3.71B'},
  1971:{song:'Joy to the World – Three Dog Night',movie:'The French Connection',tech:'Floppy disk introduced',sport:'Dallas Cowboys win Super Bowl VI',pop:'3.78B'},
  1972:{song:'The First Time Ever I Saw Your Face',movie:'The Godfather',tech:'First email sent',sport:'Munich Olympics',pop:'3.85B'},
  1973:{song:'Tie a Yellow Ribbon – Tony Orlando',movie:'The Sting',tech:'Ethernet invented',sport:'Miami Dolphins win Super Bowl VII',pop:'3.93B'},
  1974:{song:'The Way We Were – Streisand',movie:'Chinatown',tech:'Barcode scanner introduced',sport:'West Germany wins FIFA World Cup',pop:'4.00B'},
  1975:{song:'Love Will Keep Us Together – Captain & Tennille',movie:'Jaws',tech:'Microsoft founded',sport:'Cincinnati Reds win World Series',pop:'4.08B'},
  1976:{song:'Silly Love Songs – Wings',movie:'Rocky',tech:'First Apple computer',sport:'Montreal Olympics',pop:'4.15B'},
  1977:{song:'Tonight\'s the Night – Rod Stewart',movie:'Star Wars',tech:'Atari 2600 launched',sport:'Dallas Cowboys win Super Bowl XII',pop:'4.22B'},
  1978:{song:'Shadow Dancing – Andy Gibb',movie:'Grease',tech:'First test-tube baby born',sport:'Argentina wins FIFA World Cup',pop:'4.30B'},
  1979:{song:'My Sharona – The Knack',movie:'Apocalypse Now',tech:'Sony Walkman released',sport:'Pittsburgh Steelers win Super Bowl XIII',pop:'4.38B'},
  1980:{song:'Call Me – Blondie',movie:'The Empire Strikes Back',tech:'Post-it Note released',sport:'Lake Placid Olympics – Miracle on Ice',pop:'4.43B'},
  1981:{song:'Physical – Olivia Newton-John',movie:'Raiders of the Lost Ark',tech:'First IBM PC',sport:'San Francisco 49ers win Super Bowl XVI',pop:'4.53B'},
  1982:{song:'Physical – Olivia Newton-John',movie:'E.T. the Extra-Terrestrial',tech:'CD player released',sport:'Italy wins FIFA World Cup',pop:'4.61B'},
  1983:{song:'Every Breath You Take – The Police',movie:'Return of the Jedi',tech:'Internet born (TCP/IP)',sport:'Washington Redskins win Super Bowl XVII',pop:'4.69B'},
  1984:{song:'When Doves Cry – Prince',movie:'Beverly Hills Cop',tech:'Apple Macintosh launched',sport:'Los Angeles Olympics',pop:'4.77B'},
  1985:{song:'Careless Whisper – Wham!',movie:'Back to the Future',tech:'Windows 1.0 released',sport:'Chicago Bears win Super Bowl XX',pop:'4.85B'},
  1986:{song:'That\'s What Friends Are For',movie:'Top Gun',tech:'Chernobyl disaster',sport:'Argentina wins FIFA World Cup',pop:'4.93B'},
  1987:{song:'Walk Like an Egyptian – Bangles',movie:'Full Metal Jacket',tech:'First disposable camera',sport:'Minnesota Twins win World Series',pop:'5.01B'},
  1988:{song:'Faith – George Michael',movie:'Rain Man',tech:'First GPS satellite (modern)',sport:'Seoul Olympics',pop:'5.12B'},
  1989:{song:'Look Away – Chicago',movie:'Batman',tech:'World Wide Web invented',sport:'San Francisco 49ers win Super Bowl XXIV',pop:'5.20B'},
  1990:{song:'Hold On – Wilson Phillips',movie:'Home Alone',tech:'Hubble Space Telescope launched',sport:'West Germany wins FIFA World Cup',pop:'5.31B'},
  1991:{song:'Everything I Do – Bryan Adams',movie:'The Silence of the Lambs',tech:'Linux kernel released',sport:'Chicago Bulls win NBA Championship',pop:'5.39B'},
  1992:{song:'End of the Road – Boyz II Men',movie:'Aladdin',tech:'SMS text message sent',sport:'Barcelona Olympics',pop:'5.48B'},
  1993:{song:'I Will Always Love You – Whitney Houston',movie:'Schindler\'s List',tech:'Mosaic web browser released',sport:'Dallas Cowboys win Super Bowl XXVII',pop:'5.57B'},
  1994:{song:'The Sign – Ace of Base',movie:'The Lion King',tech:'Amazon founded',sport:'Brazil wins FIFA World Cup',pop:'5.66B'},
  1995:{song:'Gangsta\'s Paradise – Coolio',movie:'Toy Story',tech:'eBay & Yahoo founded',sport:'San Francisco 49ers win Super Bowl XXIX',pop:'5.74B'},
  1996:{song:'Macarena – Los Del Rio',movie:'Jerry Maguire',tech:'First cloned mammal (Dolly)',sport:'Atlanta Olympics',pop:'5.83B'},
  1997:{song:'Candle in the Wind 97 – Elton John',movie:'Titanic',tech:'Deep Blue beats Kasparov',sport:'Denver Broncos win Super Bowl XXXII',pop:'5.91B'},
  1998:{song:'Too Close – Next',movie:'Saving Private Ryan',tech:'Google founded',sport:'France wins FIFA World Cup',pop:'5.97B'},
  1999:{song:'Believe – Cher',movie:'The Matrix',tech:'Napster launched',sport:'San Antonio Spurs win NBA title',pop:'6.06B'},
  2000:{song:'Independent Women Pt. I – Destiny\'s Child',movie:'Gladiator',tech:'Y2K bug averted',sport:'Sydney Olympics',pop:'6.14B'},
  2001:{song:'Hanging by a Moment – Lifehouse',movie:'Harry Potter & Sorcerer\'s Stone',tech:'Wikipedia launched',sport:'New England Patriots win Super Bowl XXXVI',pop:'6.23B'},
  2002:{song:'How You Remind Me – Nickelback',movie:'Spider-Man',tech:'iTunes Store opens',sport:'Brazil wins FIFA World Cup',pop:'6.31B'},
  2003:{song:'In Da Club – 50 Cent',movie:'Return of the King',tech:'Skype launched',sport:'San Antonio Spurs win NBA title',pop:'6.39B'},
  2004:{song:'Yeah! – Usher',movie:'The Incredibles',tech:'Facebook founded',sport:'Athens Olympics',pop:'6.47B'},
  2005:{song:'We Belong Together – Mariah Carey',movie:'Batman Begins',tech:'YouTube founded',sport:'Pittsburgh Steelers win Super Bowl XL',pop:'6.54B'},
  2006:{song:'Bad Day – Daniel Powter',movie:'The Departed',tech:'Twitter launched',sport:'Italy wins FIFA World Cup',pop:'6.62B'},
  2007:{song:'Irreplaceable – Beyoncé',movie:'No Country for Old Men',tech:'iPhone launched',sport:'Indianapolis Colts win Super Bowl XLI',pop:'6.70B'},
  2008:{song:'Low – Flo Rida',movie:'The Dark Knight',tech:'Android OS launched',sport:'Beijing Olympics',pop:'6.77B'},
  2009:{song:'Boom Boom Pow – Black Eyed Peas',movie:'Avatar',tech:'Bitcoin created',sport:'New Orleans Saints win Super Bowl XLIV',pop:'6.85B'},
  2010:{song:'TiK ToK – Ke$ha',movie:'Inception',tech:'Instagram launched',sport:'Spain wins FIFA World Cup',pop:'6.92B'},
  2011:{song:'Rolling in the Deep – Adele',movie:'Harry Potter & Deathly Hallows Pt2',tech:'Siri launched',sport:'Green Bay Packers win Super Bowl XLV',pop:'7.00B'},
  2012:{song:'Somebody That I Used to Know – Gotye',movie:'The Avengers',tech:'Siri on iPad; Retina MacBook',sport:'London Olympics',pop:'7.08B'},
  2013:{song:'Thrift Shop – Macklemore',movie:'Frozen',tech:'Snapchat rises; 3D printing booms',sport:'Seattle Seahawks win Super Bowl XLVIII',pop:'7.16B'},
  2014:{song:'Happy – Pharrell Williams',movie:'Interstellar',tech:'Amazon Echo launched',sport:'Germany wins FIFA World Cup',pop:'7.24B'},
  2015:{song:'Uptown Funk – Mark Ronson & Bruno Mars',movie:'The Force Awakens',tech:'Apple Watch launched',sport:'New England Patriots win Super Bowl XLIX',pop:'7.38B'},
  2016:{song:'One Dance – Drake',movie:'Zootopia',tech:'Pokemon Go launches',sport:'Rio Olympics',pop:'7.46B'},
  2017:{song:'Shape of You – Ed Sheeran',movie:'Beauty and the Beast',tech:'AirPods release',sport:'New England Patriots win Super Bowl LI',pop:'7.55B'},
  2018:{song:'God\'s Plan – Drake',movie:'Black Panther',tech:'GPT-1 released',sport:'France wins FIFA World Cup',pop:'7.63B'},
  2019:{song:'Old Town Road – Lil Nas X',movie:'Avengers: Endgame',tech:'5G networks launch',sport:'Kansas City Chiefs win Super Bowl LIV',pop:'7.71B'},
  2020:{song:'Blinding Lights – The Weeknd',movie:'Tenet',tech:'COVID-19 pandemic; Zoom rises',sport:'Tampa Bay Lightning win Stanley Cup',pop:'7.79B'},
  2021:{song:'Drivers License – Olivia Rodrigo',movie:'Spider-Man: No Way Home',tech:'NFT boom; ChatGPT forerunner',sport:'Tokyo Olympics (delayed)',pop:'7.87B'},
  2022:{song:'As It Was – Harry Styles',movie:'Top Gun: Maverick',tech:'ChatGPT launched',sport:'Argentina wins FIFA World Cup',pop:'7.95B'},
  2023:{song:'Flowers – Miley Cyrus',movie:'Barbie / Oppenheimer',tech:'GPT-4 released',sport:'Kansas City Chiefs win Super Bowl LVII',pop:'8.04B'},
  2024:{song:'Espresso – Sabrina Carpenter',movie:'Deadpool & Wolverine',tech:'GPT-4o & Gemini Ultra',sport:'Spain wins UEFA Euro 2024',pop:'8.12B'},
  2025:{song:'APT. – Rose & Bruno Mars',movie:'Minecraft Movie',tech:'Claude 3.7 & Gemini 2.0 launch',sport:'Kansas City Chiefs win Super Bowl LIX',pop:'8.20B'},
};

function renderHistory(birth) {
  const yr = birth.getFullYear();
  const data = historyData[yr] || historyData[yr - (yr % 10)];
  if (!data) {
    if(historyContent) historyContent.innerHTML = `<p class="muted-text">No historical data for ${yr}.</p>`;
    return;
  }
  const items = [
    {emoji:'🎵', lbl:'#1 Song',      val:data.song},
    {emoji:'🎬', lbl:'Top Movie',     val:data.movie},
    {emoji:'💻', lbl:'Tech Event',    val:data.tech},
    {emoji:'🏆', lbl:'Sports',        val:data.sport},
    {emoji:'🌍', lbl:'World Population', val:data.pop},
    {emoji:'🗓️', lbl:'Birth Year',   val:yr},
  ];
  if(historyContent) historyContent.innerHTML = items.map(i=>`
    <div class="history-item reveal">
      <span class="h-emoji">${i.emoji}</span>
      <span class="h-label">${i.lbl}</span>
      <span class="h-val">${i.val}</span>
    </div>`).join('');
}

// ── LIFE STATS EXTENDED ───────────────────────────────
function renderLifeStatsExtended(birth) {
  if (!lifeStatsExt) return;
  const now = new Date();
  const td = totalDaysAlive(birth, now);
  const a = getExactAge(birth, now);
  const stats = [
    {emoji:'❤️',  val:shortNum(Math.round(td * 100800)), lbl:'Heartbeats'},
    {emoji:'💨',  val:shortNum(Math.round(td * 20 * 1440)), lbl:'Breaths taken'},
    {emoji:'👣',  val:shortNum(Math.round(td * 7500)), lbl:'Steps walked (est.)'},
    {emoji:'😴',  val:fmt(Math.round(td * 8/24)), lbl:'Days sleeping (8h/day)'},
    {emoji:'🍽️', val:fmt(Math.round(td * 3)), lbl:'Meals eaten (3/day)'},
    {emoji:'☀️',  val:fmt(Math.round(a.years * 365.25 / 7)), lbl:'Weekends lived'},
    {emoji:'📅',  val:fmt(td), lbl:'Total days alive'},
    {emoji:'🌙',  val:fmt(Math.round(td * 29.5 / 30)), lbl:'Full moons since birth (est.)'},
    {emoji:'🌲',  val:a.years, lbl:'Seasons × 4 survived'},
  ];
  lifeStatsExt.innerHTML = `<div class="lse-grid">`+
    stats.map(s=>`
      <div class="lse-card reveal">
        <span class="lse-emoji">${s.emoji}</span>
        <span class="lse-val">${s.val}</span>
        <span class="lse-lbl">${s.lbl}</span>
      </div>`).join('')
    +`</div>`;
}

// ── AGE GAP ───────────────────────────────────────────
gapBtn.addEventListener('click', () => {
  const b1 = parseDateStr(gapDate1.value.trim());
  const b2 = parseDateStr(gapDate2.value.trim());
  if (!b1 || !b2) { alert('Enter valid dates for both persons.'); return; }

  const older = b1 < b2 ? b1 : b2;
  const younger = b1 < b2 ? b2 : b1;
  const g = getExactAge(older, younger);
  const dDiff = Math.floor((younger - older) / 86400000);

  gapResult.classList.remove('hidden');
  gapResult.innerHTML = `
    <span class="gap-number">${g.years}y ${g.months}m ${g.days}d</span>
    <div class="gap-desc">The age difference between these two people</div>
    <div class="gap-detail">
      <div class="gap-detail-item"><strong>${fmt(dDiff)}</strong><span>Total Days</span></div>
      <div class="gap-detail-item"><strong>${fmt(g.years*12+g.months)}</strong><span>Total Months</span></div>
      <div class="gap-detail-item"><strong>${fmt(Math.floor(dDiff/7))}</strong><span>Total Weeks</span></div>
    </div>`;
});

// ── SHARE ─────────────────────────────────────────────
function setupShare(birthVal) {
  const url = `${location.origin}${location.pathname}?birth=${birthVal}`;
  const text = `I'm exactly ${ageHeadline.textContent} years old! Calculate yours →`;

  shareWhatsapp.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(text+' '+url)}`, '_blank');
  shareTwitter.onclick  = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  shareCopy.onclick     = () => {
    navigator.clipboard.writeText(url).then(()=>{
      shareCopy.textContent = '✅ Copied!';
      setTimeout(()=>shareCopy.textContent='📋 Copy Link', 2000);
    });
  };
}

// ── URL PARAMS (auto-fill from share link) ────────────
function checkURLParams() {
  const p = new URLSearchParams(location.search);
  if (p.has('birth')) {
    const v = p.get('birth');
    if (isValidDateStr(v)) {
      birthDateInput.value = v;
      chosenDateBadge.textContent = formatDisplayDate(v);
      setTimeout(()=>calculateBtn.click(), 400);
    }
  }
}

// ── SCROLL REVEAL ─────────────────────────────────────
function setupScrollReveal() {
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:0.12});
  document.querySelectorAll('.card').forEach(el=>{ el.classList.add('reveal'); obs.observe(el); });
}

function initScrollReveal() {
  setTimeout(()=>{
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
    },{threshold:0.1});
    document.querySelectorAll('.reveal:not(.visible)').forEach(el=>obs.observe(el));
  },100);
}

// ── PARTICLES (desktop only) ──────────────────────────
function initParticles() {
  const isMobile = window.matchMedia('(max-width:639px)').matches;
  if (isMobile || !particleCanvas) return;

  const ctx = particleCanvas.getContext('2d');
  particleCanvas.width  = window.innerWidth;
  particleCanvas.height = window.innerHeight;

  const colors = ['rgba(94,240,255,0.6)','rgba(255,94,240,0.5)','rgba(94,255,156,0.5)','rgba(255,190,94,0.4)'];
  const particles = Array.from({length:60},()=>({
    x: Math.random()*particleCanvas.width,
    y: Math.random()*particleCanvas.height,
    r: Math.random()*1.5+0.5,
    vx: (Math.random()-0.5)*0.3,
    vy: (Math.random()-0.5)*0.3,
    color: colors[Math.floor(Math.random()*colors.length)],
    opacity: Math.random()*0.5+0.2,
  }));

  function draw() {
    ctx.clearRect(0,0,particleCanvas.width,particleCanvas.height);
    particles.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if(p.x<0||p.x>particleCanvas.width) p.vx*=-1;
      if(p.y<0||p.y>particleCanvas.height) p.vy*=-1;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize',()=>{
    particleCanvas.width  = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  });
}

// ── HELPERS ───────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString();
}

function shortNum(n) {
  if (n >= 1e12) return (n/1e12).toFixed(1)+'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3)  return (n/1e3).toFixed(0)+'K';
  return String(n);
}

function leapYearsLived(birth, now) {
  let count = 0;
  for (let y = birth.getFullYear(); y <= now.getFullYear(); y++) {
    if ((y%4===0&&y%100!==0)||(y%400===0)) count++;
  }
  return count;
}