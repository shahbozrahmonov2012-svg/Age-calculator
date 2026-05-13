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
const birthDatePickerInput = document.getElementById('birthDatePicker');
const mobileDateHint = document.getElementById('mobileDateHint');
const calendarEmojiButton = document.getElementById('calendarEmojiButton');

let selectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let updateInterval = null;
let isGpsDetecting = false;

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.matchMedia('(max-width: 520px)').matches;
}

function prepareBirthDateInput() {
  if (!birthDateInput) return;
  birthDateInput.type = 'text';
  birthDateInput.placeholder = 'DD.MM.YYYY';
  birthDateInput.setAttribute('inputmode', 'numeric');
  birthDateInput.setAttribute('maxlength', '10');
  birthDateInput.autocomplete = 'bday';
  birthDateInput.title = 'Enter your birth date as DD.MM.YYYY or use the calendar icon';
  birthDateInput.addEventListener('input', formatDateInput);
  birthDateInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      calculateAge();
    }
  });
  if (mobileDateHint) {
    mobileDateHint.classList.remove('hidden');
    mobileDateHint.textContent = 'Type numbers or use the calendar icon to choose your birth date.';
  }
}

function formatDateInput(event) {
  const raw = event.target.value.replace(/\D/g, '').slice(0, 8);
  let formatted = raw;
  if (raw.length >= 3) {
    formatted = `${raw.slice(0, 2)}.${raw.slice(2)}`;
  }
  if (raw.length >= 5) {
    formatted = `${raw.slice(0, 2)}.${raw.slice(2, 4)}.${raw.slice(4, 8)}`;
  }
  event.target.value = formatted;
}

function normalizeDateValue(dateValue) {
  if (!dateValue) return null;
  const cleaned = dateValue.trim().replace(/-/g, '.');
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('.');
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
    return dateValue.trim();
  }
  return null;
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return '';
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateValue);
  if (!match) return dateValue;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function openBirthDatePicker() {
  if (!birthDateInput) return;
  if (birthDatePickerInput && typeof birthDatePickerInput.showPicker === 'function') {
    const normalized = normalizeDateValue(birthDateInput.value);
    birthDatePickerInput.value = normalized || '';
    birthDatePickerInput.focus();
    birthDatePickerInput.showPicker();
    return;
  }

  birthDateInput.focus();
}

function parseDateInput(dateValue) {
  const normalized = normalizeDateValue(dateValue);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date && !isNaN(date.getTime()) ? date : null;
}

window.applyTimezoneFromInput = function() { return null; };

function calculateAge() {
  const birthDateValue = birthDateInput.value;
  if (!birthDateValue) {
    showMessage('Please select your birth date.');
    return;
  }

  const normalizedDate = normalizeDateValue(birthDateValue);
  if (!normalizedDate) {
    showMessage('Invalid date format. Use DD.MM.YYYY or YYYY-MM-DD.');
    return;
  }

  const birthDate = makeDateInTimeZone(normalizedDate, selectedTimeZone);
  const now = new Date();

  if (birthDate > now) {
    showMessage('Birth date cannot be in the future.');
    return;
  }

  const age = getExactAge(birthDate, now);
  const summary = formatAgeSummary(age);
  const breakdown = buildBreakdown(age);
  const equivalent = buildEquivalent(age);

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
  toggleDetailsBtn.textContent = '📊 Show all breakdown';
}

function showMessage(message) {
  resultCard.classList.remove('hidden');
  toggleDetailsBtn.classList.add('hidden');
  detailsContainer.classList.add('hidden');
  equivalentContainer.classList.add('hidden');
  summaryText.textContent = message;
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

function formatAgeSummary(age) {
  if (age.years > 0) {
    return `${age.years} ${age.years === 1 ? 'year' : 'years'}`;
  }
  if (age.months > 0) {
    return `${age.months} ${age.months === 1 ? 'month' : 'months'}`;
  }
  if (age.days > 0) {
    return `${age.days} ${age.days === 1 ? 'day' : 'days'}`;
  }
  if (age.hours > 0) {
    return `${age.hours} ${age.hours === 1 ? 'hour' : 'hours'}`;
  }
  if (age.minutes > 0) {
    return `${age.minutes} ${age.minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return `${age.seconds} ${age.seconds === 1 ? 'second' : 'seconds'}`;
}

function buildBreakdown(age) {
  const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  const labels = {
    years: 'Years',
    months: 'Months',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds'
  };
  return units.map(key => ({
    label: labels[key],
    value: `${age[key]} ${age[key] === 1 ? labels[key].slice(0, -1).toLowerCase() : labels[key].toLowerCase()}`
  }));
}

function buildEquivalent(age) {
  const result = [];
  const totalDays = age.days + age.months * 30 + age.years * 365;
  const totalHours = totalDays * 24 + age.hours;
  const totalMinutes = totalHours * 60 + age.minutes;
  const totalSeconds = totalMinutes * 60 + age.seconds;

  if (age.years > 0) {
    result.push({ label: 'Months', value: `${age.years * 12 + age.months}` });
    result.push({ label: 'Days', value: `${totalDays}` });
    if (age.hours > 0 || age.minutes > 0 || age.seconds > 0) {
      result.push({ label: 'Hours', value: `${totalHours}` });
      result.push({ label: 'Minutes', value: `${totalMinutes}` });
      result.push({ label: 'Seconds', value: `${totalSeconds}` });
    }
  } else if (age.months > 0) {
    result.push({ label: 'Days', value: `${totalDays}` });
    if (age.hours > 0 || age.minutes > 0 || age.seconds > 0) {
      result.push({ label: 'Hours', value: `${totalHours}` });
      result.push({ label: 'Minutes', value: `${totalMinutes}` });
      result.push({ label: 'Seconds', value: `${totalSeconds}` });
    }
  }

  return result;
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

// Add calendar emoji click handler
if (calendarEmojiButton && birthDateInput) {
  calendarEmojiButton.addEventListener('click', openBirthDatePicker);
  calendarEmojiButton.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openBirthDatePicker();
    }
  });
}

function initApp() {
  prepareBirthDateInput();
  if (birthDatePickerInput) {
    birthDatePickerInput.addEventListener('change', () => {
      if (birthDatePickerInput.value) {
        birthDateInput.value = formatDisplayDate(birthDatePickerInput.value);
      }
    });
  }
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

function toggleDetailView() {
  const isHidden = detailsContainer.classList.contains('hidden');
  detailsContainer.classList.toggle('hidden', !isHidden);
  toggleDetailsBtn.textContent = isHidden ? 'Hide breakdown' : 'Show all breakdown';
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
