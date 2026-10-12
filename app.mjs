import {
  RULE_VERSION,
  STORAGE_KEY,
  LEVELS,
  EMERGENCY_FLAGS,
  SYMPTOMS,
  evaluateAssessment,
  symptomById,
  formatAssessmentSummary,
} from "./rules.mjs";

const state = {
  view: "home",
  step: 1,
  currentRecord: null,
  currentSaved: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function showView(view) {
  state.view = view;
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `view-${view}`));
  $$(".nav-link").forEach((button) => button.classList.toggle("is-active", button.dataset.viewTarget === view));
  if (view === "history") renderHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStep(step) {
  state.step = step;
  $$(".form-step").forEach((section) => section.classList.toggle("is-active", Number(section.dataset.step) === step));
  $$("[data-step-indicator]").forEach((item) => {
    const itemStep = Number(item.dataset.stepIndicator);
    item.classList.toggle("is-current", itemStep === step);
    item.classList.toggle("is-done", itemStep < step);
  });
  $("#view-check").scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectedSymptomIds() {
  return $$("input[name='symptom']:checked").map((input) => input.value);
}

function renderSymptoms() {
  $("#symptom-grid").innerHTML = SYMPTOMS.map((symptom) => `
    <label class="symptom-option">
      <input type="checkbox" name="symptom" value="${symptom.id}">
      <span class="symptom-content">
        <span class="symptom-icon" aria-hidden="true">${symptom.icon}</span>
        <span class="symptom-copy"><strong>${symptom.label}</strong><small>${symptom.summary}</small></span>
        <span class="check-mark" aria-hidden="true">✓</span>
      </span>
    </label>
  `).join("");
}

function renderEmergencyFlags() {
  $("#emergency-flags").innerHTML = EMERGENCY_FLAGS.map((flag) => `
    <label><input type="checkbox" name="emergency_flag" value="${flag.value}"><span>${flag.label}</span></label>
  `).join("");
}

function renderDynamicQuestions() {
  const selected = selectedSymptomIds();
  $("#dynamic-questions").innerHTML = selected.map((id) => {
    const symptom = symptomById(id);
    const questions = symptom.questions.map((question) => {
      const name = `${symptom.id}__${question.id}`;
      if (question.type === "number") {
        return `
          <div class="sub-question">
            <label class="question-label" for="${name}">${question.label}</label>
            <div class="number-wrap"><input id="${name}" name="${name}" type="number" min="${question.min}" max="${question.max}" step="${question.step}" inputmode="decimal" required><span>${question.unit}</span></div>
            ${question.help ? `<p class="help-text">${question.help}</p>` : ""}
          </div>`;
      }
      return `
        <div class="sub-question">
          <span class="question-label">${question.label}</span>
          ${question.options.map((option) => `<label class="radio-row"><input type="radio" name="${name}" value="${option.value}" required><span>${option.label}</span></label>`).join("")}
          ${question.help ? `<p class="help-text">${question.help}</p>` : ""}
        </div>`;
    }).join("");
    return `<fieldset class="question-card"><legend><span class="symptom-icon" aria-hidden="true">${symptom.icon}</span> ${symptom.label}<small>${symptom.summary}</small></legend>${questions}</fieldset>`;
  }).join("");
}

function collectPayload() {
  const answers = { __global: {} };
  answers.__global.hydration = $("input[name='global_hydration']:checked")?.value || "";
  answers.__global.daily_function = $("input[name='global_daily_function']:checked")?.value || "";
  for (const symptomId of selectedSymptomIds()) {
    const symptom = symptomById(symptomId);
    answers[symptomId] = {};
    for (const question of symptom.questions) {
      const name = `${symptom.id}__${question.id}`;
      answers[symptomId][question.id] = question.type === "radio"
        ? $(`input[name='${name}']:checked`)?.value || ""
        : $(`[name='${name}']`)?.value || "";
    }
  }
  return {
    selectedSymptoms: selectedSymptomIds(),
    emergencyFlags: $$("input[name='emergency_flag']:checked").map((input) => input.value),
    answers,
  };
}

function validateStep1() {
  if (selectedSymptomIds().length) {
    $("#symptom-error").textContent = "";
    return true;
  }
  $("#symptom-error").textContent = "请至少选择一项需要自查的症状。";
  $("#symptom-grid input").focus();
  return false;
}

function validateStep2() {
  const emergencyAnswered = $("#no-emergency").checked || $$("input[name='emergency_flag']:checked").length > 0;
  const invalid = $$("#dynamic-questions input:invalid, .question-card input[name^='global_']:invalid");
  if (!emergencyAnswered) {
    $("#detail-error").textContent = "请确认是否存在红旗症状。";
    $("#no-emergency").focus();
    return false;
  }
  if (invalid.length) {
    $("#detail-error").textContent = "还有关键问题未回答，请补充后继续。";
    invalid[0].focus();
    return false;
  }
  $("#detail-error").textContent = "";
  return true;
}

function createRecord(result) {
  const payload = collectPayload();
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    schemaVersion: 1,
    ruleVersion: RULE_VERSION,
    createdAt: new Date().toISOString(),
    chemoDate: $("#chemo-date").value,
    onset: $("#onset").value,
    notes: $("#notes").value.trim(),
    ...payload,
    result,
  };
}

function renderResult(record) {
  const { level, reasons } = record.result;
  const config = LEVELS[level];
  const symptomNames = record.selectedSymptoms.map((id) => symptomById(id)?.label).filter(Boolean);
  const escalation = level === "observe"
    ? "如体温达到治疗团队告知的阈值、症状加重、无法饮水或日常活动明显受限，请立即联系主管医生。出现胸痛、严重呼吸困难、意识异常或大量出血时拨打 120。"
    : level === "contact"
      ? "如出现胸痛、严重呼吸困难、意识异常、抽搐、面舌肿胀、晕厥或大量出血，请立即升级为急诊处置。"
      : "不要等待症状自行缓解，也不要独自驾车。";
  $("#result-panel").innerHTML = `
    <div class="result-card">
      <div class="result-hero ${level}">
        <span class="result-symbol" aria-hidden="true">${config.icon}</span>
        <div><p>${config.short}</p><h2 id="result-title">${config.label}</h2></div>
      </div>
      <div class="result-body">
        <section class="result-section full"><h3>现在该怎么做</h3><p>${config.action}</p></section>
        <section class="result-section"><h3>为什么得到这个建议</h3><ul>${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></section>
        <section class="result-section"><h3>联系医护时请报告</h3><ul><li>最近一次化疗日期：${escapeHtml(record.chemoDate || "未填写")}</li><li>症状开始时间：${escapeHtml(record.onset || "未填写")}</li><li>本次自查症状：${escapeHtml(symptomNames.join("、"))}</li><li>体温、次数、饮水与活动受限情况</li></ul></section>
        <section class="result-section full"><h3>何时需要升级处理</h3><p>${escalation}</p></section>
        <section class="result-section full"><h3>重要联系</h3><p>主管医生：请填写科室号码　｜　24 小时热线：请填写科室号码　｜　急救电话：<a href="tel:120"><strong>120</strong></a></p></section>
        <section class="result-section full"><h3>非诊断声明</h3><p>这是教学演示结果，不是正式 CTCAE 分级或医学诊断，不能替代医生评估。若你对结果不放心，请选择更高等级的医疗帮助。</p></section>
      </div>
      <div class="result-actions">
        <button class="button button-primary" type="button" data-save-result>保存本次记录</button>
        <button class="button button-ghost" type="button" data-copy-result>复制摘要</button>
        <button class="button button-ghost" type="button" data-print-result>打印本次</button>
        <button class="button button-ghost" type="button" data-new-check>再次自查</button>
        <span class="save-state" aria-live="polite"></span>
      </div>
    </div>`;

  $("[data-save-result]").addEventListener("click", saveCurrentRecord);
  $("[data-copy-result]").addEventListener("click", () => copyText(formatAssessmentSummary(record)));
  $("[data-print-result]").addEventListener("click", () => printSummary(record));
  $("[data-new-check]").addEventListener("click", resetAssessment);
}

function getRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function saveCurrentRecord() {
  if (!state.currentRecord || state.currentSaved) return;
  const records = getRecords();
  records.unshift(state.currentRecord);
  setRecords(records);
  state.currentSaved = true;
  $(".save-state").textContent = "✓ 已保存在本机";
  $("[data-save-result]").disabled = true;
  showToast("本次记录已保存在当前浏览器");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("摘要已复制");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast("摘要已复制");
  }
}

function printSummary(record) {
  let printArea = $("#print-area");
  if (!printArea) {
    printArea = document.createElement("section");
    printArea.id = "print-area";
    document.body.append(printArea);
  }
  printArea.innerHTML = `<h1>化疗不良反应自查摘要</h1><pre>${escapeHtml(formatAssessmentSummary(record))}</pre>`;
  document.body.classList.add("print-single");
  window.print();
  setTimeout(() => document.body.classList.remove("print-single"), 300);
}

function renderHistory() {
  const records = getRecords();
  const list = $("#history-list");
  $("#clear-history").hidden = !records.length;
  if (!records.length) {
    list.innerHTML = `<div class="empty-state"><span aria-hidden="true">记</span><h2>还没有随访记录</h2><p>完成一次症状自查并选择“保存本次记录”后，会显示在这里。</p><button class="button button-primary" type="button" data-empty-start>开始第一次自查</button></div>`;
    $("[data-empty-start]").addEventListener("click", resetAssessment);
    return;
  }
  list.innerHTML = records.map((record) => {
    const config = LEVELS[record.result.level] || LEVELS.contact;
    const names = record.selectedSymptoms.map((id) => symptomById(id)?.label).filter(Boolean).join("、");
    return `<article class="history-card ${record.result.level}">
      <div><time datetime="${record.createdAt}">${new Date(record.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</time><span class="history-level">${config.label}</span></div>
      <div><h2>${escapeHtml(names)}</h2><p>${escapeHtml(record.result.reasons.join("；"))}</p></div>
      <div class="history-actions"><button class="icon-button" type="button" data-copy-id="${record.id}">复制</button><button class="icon-button" type="button" data-print-id="${record.id}">打印</button><button class="icon-button danger-text" type="button" data-delete-id="${record.id}">删除</button></div>
    </article>`;
  }).join("");
}

function deleteRecord(id) {
  if (!window.confirm("确定删除这条随访记录吗？删除后无法恢复。")) return;
  setRecords(getRecords().filter((record) => record.id !== id));
  renderHistory();
  showToast("记录已删除");
}

function clearHistory() {
  if (!window.confirm("确定清空全部随访记录吗？此操作无法恢复。")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  showToast("全部本地记录已清空");
}

function resetAssessment() {
  $("#assessment-form").reset();
  $("#dynamic-questions").innerHTML = "";
  $("#symptom-error").textContent = "";
  $("#detail-error").textContent = "";
  $("#context-error").textContent = "";
  $("#note-count").textContent = "0";
  state.currentRecord = null;
  state.currentSaved = false;
  showView("check");
  setStep(1);
}

function handleSubmit(event) {
  event.preventDefault();
  if (!$("#understand").checked) {
    $("#context-error").textContent = "请确认你已阅读并理解非诊断声明。";
    $("#understand").focus();
    return;
  }
  $("#context-error").textContent = "";
  const result = evaluateAssessment(collectPayload());
  if (!result.complete) {
    $("#detail-error").textContent = result.missing.join("；");
    setStep(2);
    return;
  }
  state.currentRecord = createRecord(result);
  state.currentSaved = false;
  renderResult(state.currentRecord);
  setStep(4);
}

function bindEvents() {
  $$(`[data-view-target]`).forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewTarget)));
  $$(`[data-start-check]`).forEach((button) => button.addEventListener("click", resetAssessment));
  $$(`[data-reset-check]`).forEach((button) => button.addEventListener("click", () => {
    if (window.confirm("确定重新开始吗？当前未保存的填写内容将被清空。")) resetAssessment();
  }));
  $$("[data-next]").forEach((button) => button.addEventListener("click", () => {
    if (state.step === 1) {
      if (!validateStep1()) return;
      renderDynamicQuestions();
      setStep(2);
    } else if (state.step === 2 && validateStep2()) {
      setStep(3);
    }
  }));
  $$(`[data-prev]`).forEach((button) => button.addEventListener("click", () => setStep(state.step - 1)));
  $("#assessment-form").addEventListener("submit", handleSubmit);
  $("#notes").addEventListener("input", (event) => $("#note-count").textContent = event.target.value.length);

  $("#emergency-flags").addEventListener("change", () => {
    if ($$("input[name='emergency_flag']:checked").length) $("#no-emergency").checked = false;
  });
  $("#no-emergency").addEventListener("change", (event) => {
    if (event.target.checked) $$("input[name='emergency_flag']").forEach((input) => input.checked = false);
  });

  $("#history-list").addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const records = getRecords();
    if (target.dataset.copyId) {
      const record = records.find((item) => item.id === target.dataset.copyId);
      if (record) copyText(formatAssessmentSummary(record));
    }
    if (target.dataset.printId) {
      const record = records.find((item) => item.id === target.dataset.printId);
      if (record) printSummary(record);
    }
    if (target.dataset.deleteId) deleteRecord(target.dataset.deleteId);
  });
  $("#clear-history").addEventListener("click", clearHistory);
}

renderSymptoms();
renderEmergencyFlags();
bindEvents();
renderHistory();
