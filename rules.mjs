export const RULE_VERSION = "demo-ctcae-v1.0.0";
export const STORAGE_KEY = "chemo-followup-records-v1";

export const LEVELS = {
  observe: {
    rank: 1,
    label: "居家观察",
    short: "目前可先观察",
    icon: "✓",
    action: "记录症状变化，适量补充液体并按治疗团队既往指导护理。若症状持续、加重或出现下列升级信号，请立即提高处置级别。",
  },
  contact: {
    rank: 2,
    label: "联系主管医生",
    short: "请立即或今日内联系",
    icon: "!",
    action: "请立即或今日内联系主管医生或 24 小时治疗热线，不要等到下次复诊。若无法联系且症状继续加重，请前往急诊。",
  },
  emergency: {
    rank: 3,
    label: "立即急诊",
    short: "现在就寻求急救",
    icon: "!",
    action: "请立即拨打 120 或尽快前往急诊。不要独自驾车；如条件允许，携带治疗记录、用药清单和肿瘤治疗联系卡。",
  },
};

export const EMERGENCY_FLAGS = [
  { value: "severe_breathing", label: "严重呼吸困难、说话困难或嘴唇发紫", reason: "出现严重呼吸困难或发绀" },
  { value: "chest_pain", label: "持续或新发明显胸痛", reason: "出现持续或新发明显胸痛" },
  { value: "neuro", label: "意识不清、抽搐、无法唤醒或新发单侧无力", reason: "出现意识或急性神经系统异常" },
  { value: "heavy_bleeding", label: "大量或压迫后仍无法止住的出血", reason: "出现无法控制的大量出血" },
  { value: "airway_swelling", label: "面部、舌头肿胀或喉头紧缩", reason: "出现可能影响气道的肿胀" },
  { value: "shock", label: "晕厥、冷汗、皮肤湿冷或站立不稳", reason: "出现晕厥或明显循环不稳定表现" },
];

const radio = (id, label, options, help = "") => ({ id, label, type: "radio", required: true, options, help });
const number = (id, label, min, max, step, unit, help = "") => ({ id, label, type: "number", required: true, min, max, step, unit, help });

export const SYMPTOMS = [
  {
    id: "fever",
    icon: "温",
    label: "发热或感染表现",
    summary: "体温、寒战、咳嗽、尿痛等",
    questions: [
      number("temperature", "当前或本次最高体温", 34, 43, 0.1, "°C", "本演示版以 38.0°C 为联系阈值；以治疗团队给你的阈值为准。"),
      radio("infection_signs", "是否有寒战、明显乏力，或咳嗽、咽痛、尿痛等感染表现？", [
        { value: "no", label: "没有" },
        { value: "yes", label: "有", risk: "contact", reason: "出现寒战或感染表现" },
      ]),
    ],
  },
  {
    id: "breathing",
    icon: "呼",
    label: "呼吸困难或胸部不适",
    summary: "气短、胸痛、心悸、咳血",
    questions: [
      radio("breathing_level", "呼吸不适对活动的影响？", [
        { value: "mild", label: "仅活动后轻微气短，休息可缓解" },
        { value: "moderate", label: "日常活动时明显气短或比平时加重", risk: "contact", reason: "呼吸不适已影响日常活动" },
        { value: "severe", label: "静息也气短、说话困难或嘴唇发紫", risk: "emergency", reason: "出现严重呼吸困难" },
      ]),
      radio("chest_or_blood", "是否有胸痛或咳血？", [
        { value: "no", label: "没有" },
        { value: "chest", label: "有持续或新发胸痛", risk: "emergency", reason: "出现持续或新发明显胸痛" },
        { value: "blood", label: "有咳血", risk: "emergency", reason: "出现咳血" },
      ]),
    ],
  },
  {
    id: "bleeding",
    icon: "血",
    label: "出血或瘀斑",
    summary: "鼻出血、牙龈出血、异常瘀青",
    questions: [
      radio("bleeding_level", "出血或瘀斑的情况？", [
        { value: "mild", label: "少量瘀斑或很快停止的少量出血" },
        { value: "unexpected", label: "反复鼻/牙龈出血、血尿/血便或大片瘀斑", risk: "contact", reason: "出现异常或反复出血" },
        { value: "heavy", label: "大量出血、压迫后仍不止、呕血或咳血", risk: "emergency", reason: "出现无法控制的大量出血或呕血/咳血" },
      ]),
    ],
  },
  {
    id: "nausea",
    icon: "吐",
    label: "恶心或呕吐",
    summary: "次数、止吐药效果、能否饮水",
    questions: [
      number("vomit_count", "过去 24 小时呕吐次数", 0, 50, 1, "次"),
      radio("antiemetic_effect", "按既往医嘱使用止吐药后是否仍持续呕吐？", [
        { value: "no", label: "没有持续呕吐或已缓解" },
        { value: "yes", label: "仍持续呕吐", risk: "contact", reason: "按既往医嘱使用止吐药后仍持续呕吐" },
      ]),
    ],
  },
  {
    id: "diarrhea",
    icon: "泻",
    label: "腹泻",
    summary: "较平时增加次数、夜间腹泻",
    questions: [
      number("extra_stools", "过去 24 小时比平时多排稀便多少次？", 0, 50, 1, "次"),
      radio("diarrhea_alert", "是否持续超过 24 小时、夜间腹泻或带血？", [
        { value: "no", label: "都没有" },
        { value: "persistent", label: "持续超过 24 小时或夜间腹泻", risk: "contact", reason: "腹泻持续超过 24 小时或发生在夜间" },
        { value: "blood", label: "便中带血或黑便", risk: "contact", reason: "出现血便或黑便" },
      ]),
    ],
  },
  {
    id: "constipation",
    icon: "腹",
    label: "便秘或腹痛",
    summary: "排便间隔、腹痛腹胀、呕吐",
    questions: [
      number("days_no_stool", "距离上次排便已有", 0, 30, 1, "天"),
      radio("abdominal_alert", "是否有持续剧烈腹痛，或明显腹胀同时伴呕吐？", [
        { value: "no", label: "没有" },
        { value: "yes", label: "有", risk: "emergency", reason: "出现持续剧烈腹痛或腹胀伴呕吐" },
      ]),
    ],
  },
  {
    id: "mouth",
    icon: "口",
    label: "口腔疼痛或溃疡",
    summary: "黏膜疼痛、溃疡、进食影响",
    questions: [
      radio("mouth_intake", "口腔症状对进食饮水的影响？", [
        { value: "mild", label: "轻微不适，仍能正常进食饮水" },
        { value: "soft", label: "只能吃软食或饮水明显减少", risk: "contact", reason: "口腔症状已明显影响进食饮水" },
        { value: "none", label: "几乎无法进食或饮水", risk: "contact", reason: "口腔症状导致几乎无法进食饮水" },
      ]),
    ],
  },
  {
    id: "fatigue",
    icon: "乏",
    label: "乏力或头晕",
    summary: "活动能力、站立、晕厥",
    questions: [
      radio("fatigue_level", "乏力或头晕对生活的影响？", [
        { value: "mild", label: "休息后缓解，能完成日常活动" },
        { value: "limited", label: "明显限制日常活动或站立不稳", risk: "contact", reason: "乏力或头晕已明显限制日常活动" },
        { value: "faint", label: "发生晕厥、冷汗或无法站立", risk: "emergency", reason: "出现晕厥或无法站立" },
      ]),
    ],
  },
  {
    id: "pain",
    icon: "痛",
    label: "疼痛",
    summary: "程度、突然加重、止痛效果",
    questions: [
      radio("pain_level", "疼痛的程度和变化？", [
        { value: "mild", label: "轻度，未影响日常活动" },
        { value: "moderate", label: "新发、持续加重或已影响日常活动", risk: "contact", reason: "疼痛新发、持续加重或影响日常活动" },
        { value: "sudden", label: "突发剧烈疼痛或难以忍受", risk: "emergency", reason: "出现突发剧烈或难以忍受的疼痛" },
      ]),
    ],
  },
  {
    id: "skin",
    icon: "肤",
    label: "皮疹或手足症状",
    summary: "红疹、水疱、脱皮、面舌肿胀",
    questions: [
      radio("skin_level", "皮肤或手足症状的范围和影响？", [
        { value: "mild", label: "局部轻微红痒，不影响活动" },
        { value: "moderate", label: "范围扩大、疼痛、水疱或影响走路/用手", risk: "contact", reason: "皮肤或手足症状范围扩大或影响活动" },
        { value: "severe", label: "大面积脱皮，或伴面舌肿胀/喉头紧缩", risk: "emergency", reason: "出现大面积皮肤损伤或可能影响气道的肿胀" },
      ]),
    ],
  },
  {
    id: "neuro",
    icon: "神",
    label: "神经系统异常",
    summary: "麻木、无力、意识或行动改变",
    questions: [
      radio("neuro_level", "出现了哪种情况？", [
        { value: "tingling", label: "轻微手足麻木或刺痛，不影响活动" },
        { value: "function", label: "麻木无力影响走路、扣纽扣或拿东西", risk: "contact", reason: "神经症状已影响日常功能" },
        { value: "acute", label: "意识不清、抽搐、无法唤醒或新发单侧无力", risk: "emergency", reason: "出现意识或急性神经系统异常" },
      ]),
    ],
  },
  {
    id: "urinary",
    icon: "尿",
    label: "排尿异常",
    summary: "尿痛、血尿、尿量减少",
    questions: [
      radio("urinary_level", "排尿异常的情况？", [
        { value: "mild", label: "轻微尿频，无尿痛或血尿" },
        { value: "pain", label: "尿痛、血尿，或明显比平时少", risk: "contact", reason: "出现尿痛、血尿或尿量明显减少" },
        { value: "none", label: "8 小时以上几乎无尿", risk: "contact", reason: "8 小时以上几乎无尿" },
      ]),
    ],
  },
  {
    id: "line",
    icon: "管",
    label: "输液港/PICC 周围异常",
    summary: "红肿、疼痛、渗液、破损",
    questions: [
      radio("line_level", "导管或输液港周围的情况？", [
        { value: "mild", label: "轻微不适，无红肿渗液" },
        { value: "infection", label: "红、肿、热、痛或有渗液", risk: "contact", reason: "导管或输液港周围出现红肿热痛或渗液" },
        { value: "damage", label: "导管破损、脱出或局部持续出血", risk: "contact", reason: "导管破损、脱出或局部持续出血" },
      ]),
    ],
  },
];

const unique = (items) => [...new Set(items)];

export function evaluateAssessment(payload) {
  const selected = Array.isArray(payload.selectedSymptoms) ? payload.selectedSymptoms : [];
  const answers = payload.answers || {};
  const emergencyFlags = Array.isArray(payload.emergencyFlags) ? payload.emergencyFlags : [];
  const missing = [];
  const findings = [];

  if (!selected.length) missing.push("请至少选择一项需要自查的症状");

  for (const flag of emergencyFlags) {
    const config = EMERGENCY_FLAGS.find((item) => item.value === flag);
    if (config) findings.push({ level: "emergency", reason: config.reason });
  }

  const hydration = answers.__global?.hydration;
  const dailyFunction = answers.__global?.daily_function;
  if (!hydration) missing.push("请回答饮水情况");
  if (!dailyFunction) missing.push("请回答日常活动情况");
  if (hydration === "unable") findings.push({ level: "contact", reason: "因症状几乎无法饮水或不能留住液体" });
  if (dailyFunction === "unable") findings.push({ level: "contact", reason: "症状已导致无法完成基本自我照护" });

  for (const symptomId of selected) {
    const symptom = SYMPTOMS.find((item) => item.id === symptomId);
    if (!symptom) continue;
    const symptomAnswers = answers[symptomId] || {};
    for (const question of symptom.questions) {
      const value = symptomAnswers[question.id];
      if (question.required && (value === undefined || value === null || value === "")) {
        missing.push(`${symptom.label}：${question.label}`);
        continue;
      }
      if (question.type === "radio") {
        const option = question.options.find((item) => item.value === value);
        if (option?.risk) findings.push({ level: option.risk, reason: option.reason });
      }
    }
  }

  const fever = answers.fever || {};
  const temperature = Number(fever.temperature);
  if (selected.includes("fever") && Number.isFinite(temperature)) {
    if (temperature >= 38) findings.push({ level: "contact", reason: `体温达到 ${temperature.toFixed(1)}°C（演示阈值 38.0°C）` });
    if (temperature < 36 && fever.infection_signs === "yes") findings.push({ level: "contact", reason: `体温低于 36.0°C 且伴明显不适或感染表现` });
  }

  const nausea = answers.nausea || {};
  if (selected.includes("nausea") && Number(nausea.vomit_count) >= 3) {
    findings.push({ level: "contact", reason: `过去 24 小时呕吐 ${Number(nausea.vomit_count)} 次` });
  }

  const diarrhea = answers.diarrhea || {};
  if (selected.includes("diarrhea") && Number(diarrhea.extra_stools) >= 4) {
    findings.push({ level: "contact", reason: `过去 24 小时稀便较平时增加 ${Number(diarrhea.extra_stools)} 次` });
  }

  const constipation = answers.constipation || {};
  if (selected.includes("constipation") && Number(constipation.days_no_stool) >= 3) {
    findings.push({ level: "contact", reason: `已 ${Number(constipation.days_no_stool)} 天未排便` });
  }

  if (missing.length) {
    return { complete: false, level: "contact", missing: unique(missing), reasons: ["关键信息尚未填写完整，不能安全给出较低等级建议"] };
  }

  const level = findings.reduce((highest, item) => LEVELS[item.level].rank > LEVELS[highest].rank ? item.level : highest, "observe");
  const reasons = unique(findings.filter((item) => item.level === level).map((item) => item.reason));
  if (!reasons.length) reasons.push("当前填写内容未触发本演示规则中的升级条件");
  return { complete: true, level, reasons };
}

export function symptomById(id) {
  return SYMPTOMS.find((item) => item.id === id);
}

export function formatAssessmentSummary(record) {
  const level = LEVELS[record.result.level];
  const selectedNames = record.selectedSymptoms.map((id) => symptomById(id)?.label).filter(Boolean).join("、");
  return [
    "化疗不良反应自查摘要（教学演示）",
    `记录时间：${new Date(record.createdAt).toLocaleString("zh-CN", { hour12: false })}`,
    `化疗日期：${record.chemoDate || "未填写"}`,
    `症状开始：${record.onset || "未填写"}`,
    `自查症状：${selectedNames || "未填写"}`,
    `行动建议：${level.label}｜${level.short}`,
    `触发原因：${record.result.reasons.join("；")}`,
    `补充备注：${record.notes || "无"}`,
    `规则版本：${record.ruleVersion}`,
    "提示：本结果不是诊断，不能替代医生评估；如情况加重，请及时联系治疗团队或急诊。",
  ].join("\n");
}
