(function () {
  const STORAGE_KEY = "cycleCompassResponses";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("cycle-compass") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pages = ["pageIntro", "pagePhase", "pageMood", "pageSymptoms"];
  const conditionalPages = [];
  const moodItems = [
    ["happy", "😊 Happy"], ["sad", "😢 Sad"], ["dramatic", "🎭 Dramatic"], ["calm", "🧘 Calm"],
    ["energetic", "⚡ Energetic"], ["confused", "❓ Confused"], ["mood swings", "🔁 Mood swings"], ["guilty", "🫣 Guilty"],
    ["depressed", "🌧️ Depressed"], ["anxious", "💭 Anxious"], ["irritated", "🔥 Irritated"], ["frisky", "💋 Frisky"]
  ];
  const symptomItems = [
    "cramps", "tender breasts", "headache", "backache", "acne", "vaginal itching",
    "joint pain", "brain fog", "dry skin", "dry eyes"
  ];
  const intensityEmojis = ["🙂", "😐", "😕", "😟", "😣", "😖", "😫", "😭", "🤒", "🚨"];
  const conditionItems = [
    "PCOS / PCOD", "Thyroid disorder", "Endometriosis", "Fibroids", "Pelvic inflammatory disease",
    "Premature ovarian insufficiency", "Perimenopause", "Eating or weight change", "High stress",
    "Medication / contraception", "Pregnancy possible", "I don't know"
  ];
  const phaseCopy = {
    Menstrual: {
      emoji: "🌧️",
      chance: "Low",
      text: "The uterine lining is shedding. Energy can feel lower, cramps or fatigue may appear, and pregnancy is usually less likely unless ovulation happens unusually early."
    },
    Follicular: {
      emoji: "🌱",
      chance: "Rising",
      text: "Estrogen often rises and energy may improve. Fertility usually increases as ovulation gets closer."
    },
    Ovulation: {
      emoji: "☀️",
      chance: "Highest",
      text: "This is the estimated fertile window. Pregnancy chances are typically highest around ovulation and the few days before it."
    },
    Luteal: {
      emoji: "🌙",
      chance: "Lower after ovulation",
      text: "Progesterone is higher. PMS symptoms, breast tenderness, acne, cravings, or mood changes can appear. Pregnancy chance generally falls after ovulation passes."
    }
  };

  const state = {
    pageIndex: 0,
    lastPeriod: "",
    cycleGap: 28,
    periodLength: 5,
    moods: [],
    symptoms: {},
    conditions: [],
    computed: null,
    lateNeedsFollowup: false
  };

  const $ = (id) => document.getElementById(id);
  $("lastPeriod").max = toInputDate(today);
  $("lastPeriod").value = toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8));

  buildMoods();
  buildSymptoms();
  buildConditions();
  setPages();
  render();

  $("nextBtn").addEventListener("click", next);
  $("backBtn").addEventListener("click", back);
  $("startAgain").addEventListener("click", () => window.location.reload());

  function buildMoods() {
    $("moodOptions").innerHTML = moodItems.map(([value, label]) => (
      `<button class="chip" type="button" data-value="${value}">${label}</button>`
    )).join("");
    $("moodOptions").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      toggleArray(state.moods, button.dataset.value);
      button.classList.toggle("selected");
    });
  }

  function buildSymptoms() {
    $("symptomOptions").innerHTML = symptomItems.map((item) => `
      <div class="symptom-row">
        <div class="symptom-name">${title(item)}</div>
        <div class="emoji-scale" data-symptom="${item}">
          ${intensityEmojis.map((emoji, index) => `<button type="button" title="Level ${index + 1}" data-level="${index + 1}">${emoji}</button>`).join("")}
        </div>
      </div>
    `).join("");
    $("symptomOptions").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const scale = button.closest(".emoji-scale");
      const symptom = scale.dataset.symptom;
      const level = Number(button.dataset.level);
      if (state.symptoms[symptom] === level) {
        delete state.symptoms[symptom];
      } else {
        state.symptoms[symptom] = level;
      }
      [...scale.children].forEach((child) => child.classList.toggle("active", Number(child.dataset.level) === state.symptoms[symptom]));
    });
  }

  function buildConditions() {
    $("conditionOptions").innerHTML = conditionItems.map((item) => (
      `<button class="chip" type="button" data-value="${item}">${item}</button>`
    )).join("");
    $("conditionOptions").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.value === "I don't know") {
        state.conditions = ["I don't know"];
        [...$("conditionOptions").children].forEach((child) => child.classList.toggle("selected", child.dataset.value === "I don't know"));
        return;
      }
      state.conditions = state.conditions.filter((item) => item !== "I don't know");
      toggleArray(state.conditions, button.dataset.value);
      [...$("conditionOptions").children].forEach((child) => child.classList.toggle("selected", state.conditions.includes(child.dataset.value)));
    });
  }

  function next() {
    if (state.pageIndex === 0 && !collectCycle()) return;
    const current = currentPageId();
    if (current === "pageSymptoms") {
      setPages();
    }
    if (current === "pageDiagnosis") {
      saveResponse();
    }
    if (state.pageIndex < pages.length - 1) state.pageIndex += 1;
    render();
  }

  function back() {
    if (state.pageIndex > 0) state.pageIndex -= 1;
    render();
  }

  function setPages() {
    collectCycle(true);
    conditionalPages.length = 0;
    if (state.lateNeedsFollowup) conditionalPages.push("pageConditions");
    pages.splice(0, pages.length, "pageIntro", "pagePhase", "pageMood", "pageSymptoms", ...conditionalPages, "pageDiagnosis", "pageThanks");
  }

  function collectCycle(silent) {
    const last = $("lastPeriod").value;
    const gap = Number($("cycleGap").value);
    const length = Number($("periodLength").value);
    if (!last || !gap || !length) {
      if (!silent) alert("Please answer the three cycle questions first.");
      return false;
    }
    state.lastPeriod = last;
    state.cycleGap = gap;
    state.periodLength = length;
    state.computed = computeCycle(last, gap, length);
    state.lateNeedsFollowup = state.computed.daysSinceLast > 45;
    renderPhase();
    return true;
  }

  function computeCycle(lastPeriod, cycleGap, periodLength) {
    const start = parseInputDate(lastPeriod);
    const daysSinceLast = Math.max(0, daysBetween(start, today));
    const cycleDay = (daysSinceLast % cycleGap) + 1;
    const nextPeriod = new Date(start);
    while (nextPeriod <= today) nextPeriod.setDate(nextPeriod.getDate() + cycleGap);
    const ovulationDay = Math.max(periodLength + 3, cycleGap - 14);
    const fertileStart = Math.max(1, ovulationDay - 5);
    const fertileEnd = Math.min(cycleGap, ovulationDay + 1);
    const fertileStartDate = addDays(start, fertileStart - 1);
    const fertileEndDate = addDays(start, fertileEnd - 1);
    let phase = "Luteal";
    if (cycleDay <= periodLength) phase = "Menstrual";
    else if (cycleDay >= fertileStart && cycleDay <= fertileEnd) phase = "Ovulation";
    else if (cycleDay < fertileStart) phase = "Follicular";
    const isLate = daysSinceLast > cycleGap + 7;
    return {
      phase,
      cycleDay,
      daysSinceLast,
      nextPeriod: toDisplayDate(nextPeriod),
      nextPeriodIso: toInputDate(nextPeriod),
      ovulationDay,
      fertileWindow: `${fertileStart}-${fertileEnd}`,
      fertileStart: toDisplayDate(fertileStartDate),
      fertileEnd: toDisplayDate(fertileEndDate),
      fertileStartIso: toInputDate(fertileStartDate),
      fertileEndIso: toInputDate(fertileEndDate),
      isLate
    };
  }

  function render() {
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    $(currentPageId()).classList.add("active");
    $("backBtn").disabled = state.pageIndex === 0;
    $("nextBtn").disabled = currentPageId() === "pageThanks";
    $("nextBtn").textContent = currentPageId() === "pageDiagnosis" ? "Save" : "Next";
    $("stepLabel").textContent = `Page ${state.pageIndex + 1} of ${pages.length}`;
    $("progressBar").style.width = `${((state.pageIndex + 1) / pages.length) * 100}%`;
    if (currentPageId() === "pageDiagnosis") renderDiagnosis();
  }

  function renderPhase() {
    const computed = state.computed;
    if (!computed) return;
    const copy = phaseCopy[computed.phase];
    $("phaseEmoji").textContent = copy.emoji;
    $("currentPhase").textContent = computed.phase;
    $("cycleDay").textContent = `Cycle day ${computed.cycleDay}`;
    $("phaseHeadline").textContent = `You are likely in the ${computed.phase.toLowerCase()} phase`;
    $("phaseDescription").textContent = copy.text;
    $("nextPeriodDate").textContent = computed.nextPeriod;
    $("pregnancyChance").textContent = copy.chance;
    $("lateStatus").textContent = computed.isLate ? "Possibly late" : "On estimate";
    $("ovulationWindow").textContent = `${computed.fertileStart} - ${computed.fertileEnd}`;
  }

  function renderDiagnosis() {
    collectCycle(true);
    const computed = state.computed;
    const selectedSymptoms = Object.entries(state.symptoms).sort((a, b) => b[1] - a[1]);
    const intense = selectedSymptoms.filter(([, level]) => level >= 7).map(([name]) => name);
    const lateText = computed.isLate
      ? "Your period looks later than your usual gap. Common reasons can include pregnancy, stress, sleep disruption, intense exercise, weight change, PCOS/PCOD, thyroid imbalance, contraception or medication changes, breastfeeding, perimenopause, and conditions such as fibroids or endometriosis."
      : "Your next period estimate is still within the timing expected from your usual cycle gap.";
    const conditionText = state.conditions.length
      ? ` You selected: ${state.conditions.join(", ")}. Use this as context for a healthcare conversation if late cycles repeat.`
      : "";
    $("diagnosisTitle").textContent = computed.isLate ? "Late-period insight" : `${computed.phase} phase support`;
    $("diagnosisBody").textContent = `${lateText}${conditionText} Based on your entries, your estimated next period is ${computed.nextPeriod}.`;

    const relief = new Set();
    if (state.symptoms.cramps || state.symptoms.backache) relief.add("Try a warm compress, gentle stretching, hydration, and rest for cramps or backache.");
    if (state.symptoms.headache || state.symptoms["brain fog"]) relief.add("Prioritize water, regular meals, sleep, and a lower-light break if headache or brain fog is high.");
    if (state.symptoms["tender breasts"]) relief.add("A supportive bra and reducing excess salt/caffeine may help breast tenderness.");
    if (state.symptoms.acne || state.symptoms["dry skin"] || state.symptoms["dry eyes"]) relief.add("Keep skincare simple, moisturize, and avoid harsh new products during sensitive days.");
    if (state.symptoms["vaginal itching"]) relief.add("Avoid scented products and consider medical advice if itching persists, burns, or comes with unusual discharge.");
    if (state.symptoms["joint pain"]) relief.add("Gentle movement, heat, and rest may help joint discomfort.");
    if (state.moods.includes("anxious") || state.moods.includes("depressed") || state.moods.includes("irritated")) relief.add("Use a calming routine, talk to someone trusted, and seek support if low mood or anxiety feels intense.");
    if (computed.isLate) relief.add("Take a pregnancy test if pregnancy is possible, and consider medical advice if periods stay absent for 90 days or late cycles keep repeating.");
    if (intense.length) relief.add(`Your highest intensity symptoms are ${intense.join(", ")}; track them and seek care if they are severe or unusual for you.`);
    if (!relief.size) relief.add("Keep tracking dates, mood, symptoms, sleep, stress, and flow so patterns become easier to notice.");
    $("reliefList").innerHTML = [...relief].map((item) => `<li>${item}</li>`).join("");
  }

  function saveResponse() {
    const responses = readResponses();
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      savedAt: new Date().toISOString(),
      lastPeriod: state.lastPeriod,
      cycleGap: state.cycleGap,
      periodLength: state.periodLength,
      moods: state.moods,
      symptoms: state.symptoms,
      conditions: state.conditions,
      computed: state.computed
    };
    responses.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
    if (channel) channel.postMessage({ type: "responses-updated" });
  }

  function currentPageId() {
    return pages[state.pageIndex];
  }

  function readResponses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function toggleArray(array, value) {
    const index = array.indexOf(value);
    if (index >= 0) array.splice(index, 1);
    else array.push(value);
  }

  function parseInputDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function toInputDate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function toDisplayDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function title(text) {
    return text.replace(/\b\w/g, (match) => match.toUpperCase());
  }
})();
