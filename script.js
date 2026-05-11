const timezoneInput = document.getElementById("timezoneInput");
const timezoneList = document.getElementById("timezoneList");
const timezoneInfo = document.getElementById("timezoneInfo");

const calculateBtn = document.getElementById("calculateBtn");

const result = document.getElementById("result");
const summaryText = document.getElementById("summaryText");

window.onload = () => {
  loadTimezones();
  detectTimezone();
};

function loadTimezones(){

  const zones = Intl.supportedValuesOf("timeZone");

  zones.forEach(zone=>{

    const option = document.createElement("option");

    option.value = zone;

    timezoneList.appendChild(option);

  });

}

function detectTimezone(){

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  timezoneInput.value = tz;

  timezoneInfo.textContent = tz;

}

calculateBtn.onclick = ()=>{

  const birthDate = document.getElementById("birthDate").value;

  if(!birthDate){
    alert("Choose birth date");
    return;
  }

  const birth = new Date(birthDate);

  const now = new Date();

  let years = now.getFullYear()-birth.getFullYear();

  summaryText.textContent = years + " Years Old";

  result.classList.remove("hidden");

};