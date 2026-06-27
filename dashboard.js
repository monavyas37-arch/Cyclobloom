(function () {
  const STORAGE_KEY = "cycleCompassResponses";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("cycle-compass") : null;
  const phases = ["Menstrual", "Follicular", "Ovulation", "Luteal"];

  if (channel) channel.onmessage = render;
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) render();
  });
  document.getElementById("clearData").addEventListener("click", () => {
    if (!confirm("Clear all saved demo responses from this browser?")) return;
    localStorage.removeItem(STORAGE_KEY);
    render();
    if (channel) channel.postMessage({ type: "responses-updated" });
  });

  render();
  setInterval(render, 2500);

  function render() {
    const responses = readResponses();
    const total = responses.length;
    setText("totalResponses", total);
    setText("lateRate", pct(responses.filter((item) => item.computed && item.computed.isLate).length, total));
    setText("fertileRate", pct(responses.filter((item) => item.computed && item.computed.phase === "Ovulation").length, total));
    setText("avgGap", total ? `${Math.round(avg(responses.map((item) => Number(item.cycleGap) || 0)))} days` : "0 days");
    drawBars("phaseBars", countBy(responses, (item) => item.computed && item.computed.phase, phases), total);
    drawBars("moodBars", countMany(responses, "moods"), total);
    drawBars("symptomBars", countSymptoms(responses), total);
    drawBars("conditionBars", countMany(responses, "conditions"), total);
    drawRows(responses);
  }

  function readResponses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function drawBars(id, counts, total) {
    const entries = Object.entries(counts).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const el = document.getElementById(id);
    if (!entries.length) {
      el.innerHTML = `<p class="empty-state">No saved responses yet. Submit the tracker once to see live metrics.</p>`;
      return;
    }
    el.innerHTML = entries.map(([label, value]) => {
      const width = total ? Math.max(8, (value / total) * 100) : 0;
      return `
        <div class="bar-row">
          <div class="bar-meta"><span>${label}</span><span>${value}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        </div>
      `;
    }).join("");
  }

  function drawRows(responses) {
    const rows = responses.slice().reverse().slice(0, 12).map((item) => {
      const symptoms = Object.entries(item.symptoms || {})
        .sort((a, b) => b[1] - a[1])
        .map(([name, level]) => `${name} (${level}/10)`)
        .join(", ");
      return `
        <tr>
          <td>${new Date(item.savedAt).toLocaleString()}</td>
          <td>${item.computed ? item.computed.phase : "-"}</td>
          <td>${item.computed ? item.computed.nextPeriod : "-"}</td>
          <td>${item.computed && item.computed.isLate ? "Yes" : "No"}</td>
          <td>${(item.moods || []).join(", ") || "-"}</td>
          <td>${symptoms || "-"}</td>
        </tr>
      `;
    }).join("");
    document.getElementById("responseRows").innerHTML = rows || `<tr><td colspan="6">No responses yet.</td></tr>`;
  }

  function countBy(items, selector, seed) {
    const counts = {};
    seed.forEach((key) => { counts[key] = 0; });
    items.forEach((item) => {
      const key = selector(item);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  function countMany(items, key) {
    const counts = {};
    items.forEach((item) => {
      (item[key] || []).forEach((value) => {
        counts[value] = (counts[value] || 0) + 1;
      });
    });
    return counts;
  }

  function countSymptoms(items) {
    const counts = {};
    items.forEach((item) => {
      Object.keys(item.symptoms || {}).forEach((value) => {
        counts[value] = (counts[value] || 0) + 1;
      });
    });
    return counts;
  }

  function pct(value, total) {
    return total ? `${Math.round((value / total) * 100)}%` : "0%";
  }

  function avg(values) {
    const usable = values.filter(Boolean);
    return usable.reduce((sum, value) => sum + value, 0) / Math.max(1, usable.length);
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }
})();
