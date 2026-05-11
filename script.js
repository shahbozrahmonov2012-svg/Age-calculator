const timezoneInput = document.getElementById('timezoneInput');
const timezoneList = document.getElementById('timezoneList');
const timezoneInfo = document.getElementById('timezoneInfo');
const gpsBadge = document.getElementById('gpsBadge');
const calculateBtn = document.getElementById('calculateBtn');
const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
const resultCard = document.getElementById('result');
const summaryText = document.getElementById('summaryText');
const detailsContainer = document.getElementById('details');
const equivalentContainer = document.getElementById('equivalent');
const birthDateInput = document.getElementById('birthDate');

let selectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let updateInterval = null;
let isGpsDetecting = false;

// Xato bermasligi uchun bo'sh funksiya (agar HTML-da chaqirilgan bo'lsa)
window.applyTimezoneFromInput = function() { return null; };

if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
        const birthDateValue = birthDateInput.value;
        
        if (!birthDateValue) {
            alert("Iltimos, sanani kiriting!");
            return;
        }

        const birth = new Date(birthDateValue);
        const now = new Date();

        // Farqni hisoblash
        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        let days = now.getDate() - birth.getDate();

        if (days < 0) {
            months--;
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        // Ekranga chiqarish
        const summaryText = document.getElementById('summaryText');
        if (summaryText) {
            summaryText.innerHTML = `<span style="color: #ff00ff">${years}</span> years`;
        }

        // Boshqa ma'lumotlarni yangilash (Months, Days, Hours...)
        updateDetails(birth, now);

        // Natijani ko'rsatish
        resultCard.classList.remove('hidden');
        resultCard.style.display = 'block'; // Majburiy ko'rsatish
    });
}

function updateDetails(birth, now) {
    const diff = now - birth;
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // HTML ichidagi elementlarga qiymat berish (ID lar mavjudligini tekshirib)
    const elements = {
        'totalMonths': Math.floor(totalDays / 30.44),
        'totalDays': totalDays,
        'totalHours': Math.floor(diff / (1000 * 60 * 60)),
        'totalMinutes': Math.floor(diff / (1000 * 60)),
        'totalSeconds': Math.floor(diff / 1000)
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerText = value.toLocaleString();
    }
}

window.addEventListener('load', initApp);
timezoneInput.addEventListener('change', applyTimezoneFromInput);
timezoneInput.addEventListener('input', () => {
  const value = timezoneInput.value.trim();
  if (value && isValidTimeZone(value)) {
    setTimeZone(value);
  }
});
gpsBadge.addEventListener('click', manualGpsDetection);
calculateBtn.addEventListener('click', calculateAge);
toggleDetailsBtn.addEventListener('click', toggleDetailView);

function initApp() {
  populateTimeZoneList();
  setTimeZone(selectedTimeZone);
  detectLocationAndSetTimeZone();
}

function populateTimeZoneList() {
  const timeZones = getTimeZones();
  timeZones.forEach(tz => {
    const option = document.createElement('option');
    option.value = tz;
    timezoneList.appendChild(option);
  });
  timezoneInput.value = selectedTimeZone;
}

function applyTimezoneFromInput() {
  const value = timezoneInput.value.trim();
  if (value && isValidTimeZone(value)) {
    setTimeZone(value);
  }
}

function manualGpsDetection() {
  // Always allow GPS detection, even if previous one is pending
  isGpsDetecting = true;
  if (updateInterval) clearInterval(updateInterval); // Pause time updates
  timezoneInfo.textContent = 'Detecting location...';
  gpsBadge.classList.add('loading');
  gpsBadge.style.opacity = '0.6';
  
  // Auto-reset flag after 12 seconds to allow retrying
  const resetTimeout = setTimeout(() => {
    if (isGpsDetecting) {
      isGpsDetecting = false;
      gpsBadge.classList.remove('loading');
      gpsBadge.style.opacity = '1';
      timezoneInfo.textContent = 'Location detection timed out. Try again.';
      updateInterval = setInterval(updateLocalTime, 1000); // Restart time updates
    }
  }, 12000);
  
  detectLocationAndSetTimeZone(true, resetTimeout);
}

function getTimeZones() {
  if (typeof Intl?.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
    'Asia/Tokyo', 'Asia/Tashkent', 'Asia/Dubai', 'Asia/Bangkok', 'Asia/Shanghai',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Australia/Sydney', 'Africa/Cairo', 'India/Kolkata'
  ];
}

function detectLocationAndSetTimeZone(isManual = false, resetTimeout = null) {
  if (!navigator.geolocation) {
    isGpsDetecting = false;
    gpsBadge.classList.remove('loading');
    gpsBadge.style.opacity = '1';
    if (resetTimeout) clearTimeout(resetTimeout);
    if (isManual) {
      timezoneInfo.textContent = 'GPS not available on this device.';
    }
    setTimeZone(selectedTimeZone);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const timezone = await getTimezoneFromCoords(lat, lon);
        setTimeZone(timezone);
        if (isManual) {
          timezoneInfo.textContent = `Location detected: ${timezone}`;
        }
      } catch (error) {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setTimeZone(browserTz);
        if (isManual) {
          timezoneInfo.textContent = `Using timezone: ${browserTz}`;
        }
      } finally {
        isGpsDetecting = false;
        gpsBadge.classList.remove('loading');
        gpsBadge.style.opacity = '1';
        if (resetTimeout) clearTimeout(resetTimeout);
        updateInterval = setInterval(updateLocalTime, 1000); // Restart time updates
      }
    },
    error => {
      isGpsDetecting = false;
      gpsBadge.classList.remove('loading');
      gpsBadge.style.opacity = '1';
      if (resetTimeout) clearTimeout(resetTimeout);
      if (isManual) {
        if (error.code === error.PERMISSION_DENIED) {
          timezoneInfo.textContent = 'Please enable location permissions in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          timezoneInfo.textContent = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          timezoneInfo.textContent = 'Location detection timed out. Please try again.';
        } else {
          timezoneInfo.textContent = 'Could not detect location. Try again.';
        }
      }
      setTimeZone(selectedTimeZone);
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

async function getTimezoneFromCoords(lat, lon) {
  try {
    // Try multiple free APIs
    const apis = [
      `https://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lon}`,
      `https://api.bigdatacloud.net/data/timezone-by-location?latitude=${lat}&longitude=${lon}&key=bdc_free`,
      `https://api.ipgeolocation.io/timezone?apiKey=demo&lat=${lat}&lng=${lon}`
    ];

    for (const apiUrl of apis) {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.zoneName) {
          return data.zoneName;
        }

        if (data.timezone && data.timezone.name) {
          return data.timezone.name;
        }

        if (data.timezone && data.timezone.timezone) {
          return data.timezone.timezone;
        }
      } catch (apiError) {
        continue; // Try next API
      }
    }

    throw new Error('All APIs failed');
  } catch (error) {
    // Final fallback: estimate timezone from longitude
    const offset = Math.round(lon / 15);
    const sign = offset >= 0 ? '-' : '+';
    const absOffset = Math.abs(offset);

    // Map common offsets to timezone names
    const timezoneMap = {
      0: 'UTC',
      1: 'Europe/London',
      2: 'Europe/Paris',
      3: 'Europe/Moscow',
      4: 'Asia/Dubai',
      5: 'Asia/Tashkent',
      6: 'Asia/Dhaka',
      7: 'Asia/Bangkok',
      8: 'Asia/Shanghai',
      9: 'Asia/Tokyo',
      10: 'Australia/Sydney',
      11: 'Pacific/Noumea',
      12: 'Pacific/Auckland',
      '-1': 'Atlantic/Azores',
      '-2': 'America/Noronha',
      '-3': 'America/Sao_Paulo',
      '-4': 'America/New_York',
      '-5': 'America/Chicago',
      '-6': 'America/Denver',
      '-7': 'America/Los_Angeles',
      '-8': 'America/Anchorage',
      '-9': 'Pacific/Honolulu',
      '-10': 'Pacific/Honolulu',
      '-11': 'Pacific/Pago_Pago',
      '-12': 'Pacific/Kwajalein'
    };

    return timezoneMap[offset.toString()] || `Etc/GMT${sign}${absOffset}`;
  }
}

// Removed - now handled inline in addEventListener

function isValidTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (error) {
    return false;
  }
}

function setTimeZone(timeZone) {
  if (!isValidTimeZone(timeZone)) {
    timeZone = 'UTC';
  }
  selectedTimeZone = timeZone;
  timezoneInput.value = timeZone;
  timezoneInput.blur();
  
  if (updateInterval) clearInterval(updateInterval);
  updateLocalTime();
  updateInterval = setInterval(updateLocalTime, 1000);
}

function updateLocalTime() {
  const now = new Date();
  const options = {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    timeZone: selectedTimeZone
  };
  const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
  timezoneInfo.textContent = `${selectedTimeZone} • ${formatted}`;
}

function calculateAge() {
  const birthInput = document.getElementById('birthDate');
  
  if (!birthInput.value) {
    showMessage('Please select your birth date.');
    return;
  }

  const birthDate = makeDateInTimeZone(birthInput.value, selectedTimeZone);
  const now = new Date();

  if (birthDate > now) {
    showMessage('Birth date cannot be in the future.');
    return;
  }

  const age = getExactAge(birthDate, now);
  const primaryUnit = getPrimaryUnit(age);
  const summary = formatAgeSummary(age, primaryUnit);
  const breakdown = buildBreakdown(age, primaryUnit);
  const equivalent = buildEquivalent(age, primaryUnit);

  summaryText.textContent = summary;
  
  if (equivalent.length > 0) {
    equivalentContainer.innerHTML = `
      <div class="equivalent-title">Also as:</div>
      ${equivalent.map(item => `<div class="equivalent-item"><span>${item.label}</span><strong>${item.value}</strong></div>`).join('')}
    `;
  } else {
    equivalentContainer.innerHTML = '';
  }

  detailsContainer.innerHTML = breakdown
    .map(item => `<div class="detail-item"><span>${item.label}</span><strong>${item.value}</strong></div>`)
    .join('');

  resultCard.classList.remove('hidden');
  toggleDetailsBtn.classList.remove('hidden');
  equivalentContainer.classList.remove('hidden');
  detailsContainer.classList.add('hidden');
  toggleDetailsBtn.textContent = 'Show all breakdown';
}

function toggleDetailView() {
  const isHidden = detailsContainer.classList.contains('hidden');
  detailsContainer.classList.toggle('hidden', !isHidden);
  toggleDetailsBtn.textContent = isHidden ? 'Hide breakdown' : 'Show all breakdown';
}

function showMessage(message) {
  resultCard.classList.remove('hidden');
  toggleDetailsBtn.classList.add('hidden');
  detailsContainer.classList.add('hidden');
  equivalentContainer.classList.add('hidden');
  summaryText.textContent = message;
}

function makeDateInTimeZone(dateString, timeZone) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetMinutes = getTimeZoneOffset(new Date(utcMidnight), timeZone);
  return new Date(utcMidnight - offsetMinutes * 60_000);
}

function getTimeZoneOffset(utcDate, timeZone) {
  const options = {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(utcDate);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const asLocal = new Date(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
  return (asLocal - utcDate) / 60000;
}

function getExactAge(birthDate, now) {
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  let days = now.getDate() - birthDate.getDate();
  let hours = now.getHours() - birthDate.getHours();
  let minutes = now.getMinutes() - birthDate.getMinutes();
  let seconds = now.getSeconds() - birthDate.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }

  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }

  if (hours < 0) {
    hours += 24;
    days -= 1;
  }

  if (days < 0) {
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += previousMonth;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days, hours, minutes, seconds };
}

function getPrimaryUnit(age) {
  if (age.years > 0) return 'years';
  if (age.months > 0) return 'months';
  if (age.days > 0) return 'days';
  if (age.hours > 0) return 'hours';
  if (age.minutes > 0) return 'minutes';
  return 'seconds';
}

function formatAgeSummary(age, unit) {
  const value = age[unit];
  return `${value} ${pluralize(value, unit)}`;
}

function buildBreakdown(age, primaryUnit) {
  const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  const labels = {
    years: 'Years',
    months: 'Months',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds'
  };

  const startIndex = units.indexOf(primaryUnit);
  const result = [];

  for (let i = startIndex; i < units.length; i += 1) {
    const key = units[i];
    const value = age[key];
    if (value > 0 || i === startIndex) {
      result.push({
        label: labels[key],
        value: `${value} ${pluralize(value, key)}`
      });
    }
  }

  return result;
}

function buildEquivalent(age, primaryUnit) {
  const result = [];
  const totalDays = age.days + age.months * 30 + age.years * 365;
  const totalHours = totalDays * 24 + age.hours;
  const totalMinutes = totalHours * 60 + age.minutes;
  const totalSeconds = totalMinutes * 60 + age.seconds;

  if (primaryUnit === 'years' && (age.months > 0 || age.days > 0 || age.hours > 0 || age.minutes > 0 || age.seconds > 0)) {
    result.push({ label: 'Months', value: `${age.years * 12 + age.months}` });
    result.push({ label: 'Days', value: `${totalDays}` });
    if (age.hours > 0 || age.minutes > 0 || age.seconds > 0) {
      result.push({ label: 'Hours', value: `${totalHours}` });
      result.push({ label: 'Minutes', value: `${totalMinutes}` });
      result.push({ label: 'Seconds', value: `${totalSeconds}` });
    }
  } else if (primaryUnit === 'months') {
    result.push({ label: 'Days', value: `${totalDays}` });
    if (age.hours > 0 || age.minutes > 0 || age.seconds > 0) {
      result.push({ label: 'Hours', value: `${totalHours}` });
      result.push({ label: 'Minutes', value: `${totalMinutes}` });
      result.push({ label: 'Seconds', value: `${totalSeconds}` });
    }
  } else if (primaryUnit === 'days') {
    result.push({ label: 'Hours', value: `${totalHours}` });
    result.push({ label: 'Minutes', value: `${totalMinutes}` });
    if (age.seconds > 0) {
      result.push({ label: 'Seconds', value: `${totalSeconds}` });
    }
  } else if (primaryUnit === 'hours') {
    result.push({ label: 'Minutes', value: `${totalMinutes}` });
    if (age.seconds > 0) {
      result.push({ label: 'Seconds', value: `${totalSeconds}` });
    }
  } else if (primaryUnit === 'minutes') {
    result.push({ label: 'Seconds', value: `${totalSeconds}` });
  }

  return result;
}

function pluralize(value, unit) {
  const singular = {
    years: 'year',
    months: 'month',
    days: 'day',
    hours: 'hour',
    minutes: 'minute',
    seconds: 'second'
  };
  return value === 1 ? singular[unit] : unit;
}
