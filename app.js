import {
  signIn,
  signUp,
  onAuthChange,
  signOutUser,
  db,
  ref,
  push,
  update,
  get,
} from "./firebase.js";

const routes = {
  "#/app/dashboard": {
    title: "Dashboard",
    description: "Visão geral das finanças do mês selecionado.",
  },
  "#/app/transactions": {
    title: "Lançamentos",
    description: "Lista de entradas e saídas recentes.",
  },
  "#/app/cards": {
    title: "Cartões",
    description: "Acompanhe limites e gastos por cartão.",
  },
  "#/app/invoices": {
    title: "Faturas",
    description: "Resumo das faturas abertas e pagas.",
  },
  "#/app/import": {
    title: "Importar",
    description: "Importe arquivos OFX ou CSV rapidamente.",
  },
};

const categories = [
  { id: "market", label: "Mercado" },
  { id: "transport", label: "Transporte" },
  { id: "subscriptions", label: "Assinaturas" },
  { id: "health", label: "Saúde" },
  { id: "restaurants", label: "Restaurantes" },
  { id: "transfers", label: "Transferências" },
  { id: "income", label: "Receitas" },
  { id: "utilities", label: "Contas" },
  { id: "education", label: "Educação" },
  { id: "others", label: "Outros" },
];

const navItems = [
  { label: "Dashboard", hash: "#/app/dashboard" },
  { label: "Lançamentos", hash: "#/app/transactions" },
  { label: "Cartões", hash: "#/app/cards" },
  { label: "Faturas", hash: "#/app/invoices" },
  { label: "Importar", hash: "#/app/import" },
  { label: "Sair", action: "logout" },
];

const monthState = {
  current: "",
};

const authState = {
  user: null,
};

const merchantRulesState = {
  loaded: false,
  rules: {},
};

const monthStorageKey = "pvault2-month";

const monthToolbar = document.getElementById("month-toolbar");
const topTabs = document.getElementById("top-tabs");
const appView = document.getElementById("app-view");
let transactionModal = null;
const importState = {
  files: [],
  activeFileId: null,
  summary: null,
};

function createButton(label, options = {}) {
  const button = document.createElement("button");
  button.textContent = label;
  if (options.variant === "secondary") {
    button.classList.add("secondary");
  }
  if (options.onClick) {
    button.addEventListener("click", options.onClick);
  }
  if (options.type) {
    button.type = options.type;
  }
  return button;
}

function createCard(title, body, actions = []) {
  const card = document.createElement("section");
  card.className = "card";
  if (title) {
    const heading = document.createElement("h2");
    heading.textContent = title;
    card.append(heading);
  }
  if (body) {
    const paragraph = document.createElement("p");
    paragraph.textContent = body;
    card.append(paragraph);
  }
  if (actions.length) {
    const actionRow = document.createElement("div");
    actionRow.className = "actions";
    actions.forEach((action) => actionRow.append(action));
    card.append(actionRow);
  }
  return card;
}

function createInput(labelText, type, name) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const label = document.createElement("span");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.required = true;
  wrapper.append(label, input);
  return { wrapper, input };
}

function createSelect(labelText, name, options) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const label = document.createElement("span");
  label.textContent = labelText;
  const select = document.createElement("select");
  select.name = name;
  select.required = true;
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Selecione";
  select.append(emptyOption);
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    select.append(opt);
  });
  wrapper.append(label, select);
  return { wrapper, select };
}

function createTextArea(labelText, name) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const label = document.createElement("span");
  label.textContent = labelText;
  const textarea = document.createElement("textarea");
  textarea.name = name;
  wrapper.append(label, textarea);
  return { wrapper, textarea };
}

function createTabs() {
  topTabs.innerHTML = "";
  navItems.forEach((item) => {
    if (item.action === "logout") {
      const button = document.createElement("button");
      button.className = "tab";
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", async () => {
        await signOutUser();
        navigateTo("#/login");
      });
      topTabs.append(button);
      return;
    }

    const button = document.createElement("button");
    button.className = "tab";
    button.type = "button";
    button.textContent = item.label;
    button.setAttribute("data-hash", item.hash);
    button.addEventListener("click", () => {
      navigateTo(item.hash);
    });
    topTabs.append(button);
  });
}

function createTabButton(label, isActive, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab";
  button.textContent = label;
  button.classList.toggle("is-active", isActive);
  button.addEventListener("click", onClick);
  return button;
}

function updateActiveTab() {
  const activeHash = getRoute();
  Array.from(topTabs.querySelectorAll(".tab")).forEach((tab) => {
    const tabHash = tab.getAttribute("data-hash");
    if (!tabHash) {
      tab.classList.remove("is-active");
      return;
    }
    tab.classList.toggle("is-active", tabHash === activeHash);
  });
}

function createMonthToolbar() {
  monthToolbar.innerHTML = "";

  const prevButton = document.createElement("button");
  prevButton.className = "month-nav-button";
  prevButton.setAttribute("aria-label", "Mês anterior");
  prevButton.innerHTML = "‹";
  prevButton.addEventListener("click", goPrev);

  const display = document.createElement("div");
  display.className = "month-display";
  display.textContent = formatMonthLabel(monthState.current);
  display.setAttribute("title", "Clique para voltar ao mês atual (Ctrl+Click para selecionar)");

  const picker = document.createElement("input");
  picker.className = "month-picker";
  picker.type = "month";
  picker.value = monthState.current;
  picker.setAttribute("aria-label", "Selecionar mês");
  picker.addEventListener("change", (event) => {
    if (event.target.value) {
      setMonth(event.target.value);
    }
  });

  display.addEventListener("click", (event) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      picker.showPicker ? picker.showPicker() : picker.click();
    } else {
      setMonth(getDefaultMonth());
    }
  });

  const nextButton = document.createElement("button");
  nextButton.className = "month-nav-button";
  nextButton.setAttribute("aria-label", "Próximo mês");
  nextButton.innerHTML = "›";
  nextButton.addEventListener("click", goNext);

  monthToolbar.append(prevButton, display, picker, nextButton);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
  });
}

function getDefaultMonth() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

function getMonthFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("m");
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function getRoute() {
  return window.location.hash || "#/app/dashboard";
}

function setMonth(monthKey) {
  monthState.current = monthKey;
  sessionStorage.setItem(monthStorageKey, monthKey);

  const url = new URL(window.location.href);
  url.searchParams.set("m", monthKey);
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  renderMonthToolbar();
  renderRoute();
}

function shiftMonth(delta) {
  const [year, month] = monthState.current.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}`;
}

function goPrev() {
  setMonth(shiftMonth(-1));
}

function goNext() {
  setMonth(shiftMonth(1));
}

function renderMonthToolbar() {
  createMonthToolbar();
}

function renderLogin() {
  appView.innerHTML = "";

  const container = document.createElement("div");
  container.style.maxWidth = "420px";
  container.style.margin = "3rem auto 0";
  container.style.padding = "0 1rem";

  const card = createCard(
    "Entrar no PVault",
    "Controle suas finanças de forma simples."
  );

  const form = document.createElement("form");
  form.className = "form";

  const emailField = createInput("Email", "email", "email");
  const passwordField = createInput("Senha", "password", "password");

  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  feedback.textContent = "";

  const actionRow = document.createElement("div");
  actionRow.className = "actions";
  actionRow.style.gap = "0.5rem";

  const loginButton = createButton("Entrar", { type: "button" });
  loginButton.style.flex = "1";
  
  const registerButton = createButton("Criar conta", {
    type: "button",
    variant: "secondary",
  });
  registerButton.style.flex = "1";

  const runAuth = async (mode) => {
    feedback.textContent = "";
    const email = emailField.input.value.trim();
    const password = passwordField.input.value.trim();

    if (!email || !password) {
      feedback.textContent = "Informe email e senha.";
      return;
    }

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigateTo("#/app/dashboard");
    } catch (error) {
      feedback.textContent = "Não foi possível autenticar. Verifique os dados.";
    }
  };

  loginButton.addEventListener("click", () => runAuth("login"));
  registerButton.addEventListener("click", () => runAuth("register"));

  actionRow.append(loginButton, registerButton);
  form.append(emailField.wrapper, passwordField.wrapper, feedback, actionRow);
  card.append(form);
  container.append(card);

  appView.append(container);
  updateActiveTab();
}

function createTransactionModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay hidden";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h2");
  title.textContent = "Nova transação";

  const form = document.createElement("form");
  form.className = "form";

  const dateField = createInput("Data", "date", "date");
  const descriptionField = createInput("Descrição", "text", "description");
  const amountField = createInput("Valor", "number", "amount");
  amountField.input.step = "0.01";

  const kindField = createSelect("Tipo", "kind", [
    { label: "Receita", value: "income" },
    { label: "Despesa", value: "expense" },
    { label: "Transferência", value: "transfer" },
  ]);
  kindField.select.value = "expense";

  const categoryField = createSelect(
    "Categoria",
    "categoryId",
    categories.map((item) => ({ value: item.id, label: item.label }))
  );
  const cardField = createInput("Cartão (opcional)", "text", "cardId");
  const invoiceField = createInput("Mês da fatura (opcional)", "month", "invoiceMonthKey");
  cardField.input.required = false;
  invoiceField.input.required = false;
  categoryField.select.required = false;

  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  feedback.textContent = "";

  const ruleLabel = document.createElement("label");
  ruleLabel.className = "checkbox";
  const ruleCheckbox = document.createElement("input");
  ruleCheckbox.type = "checkbox";
  const ruleText = document.createElement("span");
  ruleText.textContent = "Sempre categorizar assim";
  ruleLabel.append(ruleCheckbox, ruleText);

  const actions = document.createElement("div");
  actions.className = "actions";
  const cancelButton = createButton("Cancelar", {
    variant: "secondary",
    type: "button",
    onClick: () => closeTransactionModal(),
  });
  const saveButton = createButton("Salvar", { type: "submit" });
  actions.append(cancelButton, saveButton);

  form.append(
    dateField.wrapper,
    descriptionField.wrapper,
    amountField.wrapper,
    kindField.wrapper,
    categoryField.wrapper,
    cardField.wrapper,
    invoiceField.wrapper,
    ruleLabel,
    feedback,
    actions
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    const payload = buildTransactionPayload({
      date: dateField.input,
      description: descriptionField.input,
      amount: amountField.input,
      kind: kindField.select,
      categoryId: categoryField.select,
      cardId: cardField.input,
      invoiceMonthKey: invoiceField.input,
    });

    if (!payload.date || !payload.description || Number.isNaN(payload.amount)) {
      feedback.textContent = "Preencha data, descrição e valor corretamente.";
      return;
    }
    if ((payload.cardId && !payload.invoiceMonthKey) || (!payload.cardId && payload.invoiceMonthKey)) {
      feedback.textContent = "Informe cartão e mês da fatura juntos.";
      return;
    }

    try {
      if (!payload.categoryId) {
        payload.categoryId = suggestCategory(payload);
      }
      if (transactionModal?.txId) {
        await transactionRepository.updateTransaction(
          transactionModal.txId,
          payload
        );
      } else {
        await transactionRepository.createTransaction(payload);
      }
      if (ruleCheckbox.checked && payload.categoryId) {
        await saveMerchantRule(payload.description, payload.categoryId);
      }
      closeTransactionModal();
      await renderRoute();
    } catch (error) {
      feedback.textContent = "Não foi possível salvar a transação.";
    }
  });

  modal.append(title, form);
  overlay.append(modal);
  document.body.append(overlay);

  return {
    overlay,
    title,
    form,
    fields: {
      date: dateField.input,
      description: descriptionField.input,
      amount: amountField.input,
      kind: kindField.select,
      categoryId: categoryField.select,
      cardId: cardField.input,
      invoiceMonthKey: invoiceField.input,
    },
    feedback,
    txId: null,
  };
}

function openTransactionModal(tx = null) {
  if (!transactionModal) {
    transactionModal = createTransactionModal();
  }
  const modal = transactionModal;
  modal.txId = tx?.id || null;
  modal.title.textContent = tx ? "Editar transação" : "Nova transação";
  modal.fields.date.value = tx?.date || "";
  modal.fields.description.value = tx?.description || "";
  modal.fields.amount.value = tx?.amount ?? "";
  modal.fields.kind.value = tx?.kind || "expense";
  modal.fields.categoryId.value = tx?.categoryId || "";
  modal.fields.cardId.value = tx?.cardId || "";
  modal.fields.invoiceMonthKey.value = tx?.invoiceMonthKey || "";
  modal.feedback.textContent = "";

  modal.overlay.classList.remove("hidden");
}

function closeTransactionModal() {
  if (transactionModal) {
    transactionModal.overlay.classList.add("hidden");
  }
}

function buildTransactionPayload(fields) {
  const payload = {
    date: fields.date.value,
    description: fields.description.value.trim(),
    amount: Number(fields.amount.value),
    kind: fields.kind.value,
    categoryId: fields.categoryId.value || undefined,
    cardId: fields.cardId.value.trim() || undefined,
    invoiceMonthKey: fields.invoiceMonthKey.value || undefined,
    monthKey: monthState.current,
  };
  return payload;
}

function buildCardPayload(fields) {
  return {
    name: fields.name.value.trim(),
    closingDay: Number(fields.closingDay.value),
    dueDay: Number(fields.dueDay.value),
    limitCents: Number(fields.limitCents.value),
  };
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => value.trim());
}

function detectDelimiter(line) {
  const commaCount = (line.match(/,/g) || []).length;
  const semiCount = (line.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
}

function decodeFileBuffer(buffer) {
  const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
  const utf8Text = utf8Decoder.decode(buffer);
  if (utf8Text.includes("\uFFFD")) {
    const winDecoder = new TextDecoder("windows-1252", { fatal: false });
    return winDecoder.decode(buffer);
  }
  return utf8Text;
}

function normalizeHeader(value) {
  return normalizeDescription(value).replace(/[^a-z0-9]/g, "");
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const cleaned = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  const brMatch = cleaned.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  return null;
}

function parseAmount(value) {
  if (!value) {
    return null;
  }
  const sanitized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const amount = Number(sanitized);
  return Number.isFinite(amount) ? amount : null;
}

function buildTxCandidate(raw, data) {
  return stripUndefined({
    date: data.date,
    description: data.description,
    amount: data.amount,
    kind: data.kind,
    categoryId: data.categoryId,
    cardId: data.cardId,
    invoiceMonthKey: data.invoiceMonthKey,
    monthKey: monthState.current,
    sourceRaw: raw,
  });
}

function classifyRow(raw, candidate) {
  if (!candidate.date) {
    return { status: "warning", reasonCode: "MISSING_DATE" };
  }
  if (!parseDate(candidate.date)) {
    return { status: "warning", reasonCode: "INVALID_DATE" };
  }
  if (candidate.amount === null || candidate.amount === undefined) {
    return { status: "warning", reasonCode: "MISSING_AMOUNT" };
  }
  if (!Number.isFinite(candidate.amount)) {
    return { status: "warning", reasonCode: "INVALID_AMOUNT" };
  }
  if (Number(candidate.amount) === 0) {
    return { status: "ignored", reasonCode: "ZERO_AMOUNT" };
  }
  if (!candidate.description) {
    return { status: "warning", reasonCode: "MISSING_DESCRIPTION" };
  }
  const descNormalized = normalizeDescription(candidate.description);
  if (descNormalized.includes("saldo")) {
    return { status: "ignored", reasonCode: "BALANCE_LINE" };
  }
  if (
    descNormalized.includes("pagamento cartao") ||
    descNormalized.includes("pagamento cartão")
  ) {
    return { status: "warning", reasonCode: "CARD_PAYMENT" };
  }
  return { status: "valid", reasonCode: "OK" };
}

function parseNubankCsv(headers, rows) {
  const headerMap = headers.reduce((acc, header, index) => {
    acc[normalizeHeader(header)] = index;
    return acc;
  }, {});
  const dateIndex = headerMap.data || headerMap.date;
  const titleIndex = headerMap.titulo || headerMap.title || headerMap.descricao;
  const amountIndex = headerMap.valor || headerMap.amount || headerMap.value;

  return rows.map((row) => {
    const date = parseDate(row[dateIndex]);
    const description = row[titleIndex]?.trim();
    const amount = parseAmount(row[amountIndex]);
    const kind = amount !== null && amount < 0 ? "expense" : "income";
    return {
      raw: row,
      candidate: buildTxCandidate(row, {
        date,
        description,
        amount: amount !== null ? Math.abs(amount) : null,
        kind,
      }),
    };
  });
}

function parseBancoBrasilCsv(headers, rows) {
  const headerMap = headers.reduce((acc, header, index) => {
    acc[normalizeHeader(header)] = index;
    return acc;
  }, {});
  const dateIndex = headerMap.data;
  const descIndex = headerMap.lancamento || headerMap.lançamento;
  const detailIndex = headerMap.detalhes || headerMap.descricao || headerMap.descrição;
  const amountIndex = headerMap.valor;

  return rows.map((row) => {
    const date = parseDate(row[dateIndex]);
    const description = [row[descIndex], row[detailIndex]]
      .filter(Boolean)
      .join(" - ");
    const amount = parseAmount(row[amountIndex]);
    const kind = amount !== null && amount < 0 ? "expense" : "income";
    return {
      raw: row,
      candidate: buildTxCandidate(row, {
        date,
        description,
        amount: amount !== null ? Math.abs(amount) : null,
        kind,
      }),
    };
  });
}

function detectCsvParser(headers) {
  const normalized = headers.map((header) => normalizeHeader(header));
  if (normalized.includes("titulo") || normalized.includes("title")) {
    return "nubank";
  }
  if (normalized.includes("lancamento") || normalized.includes("lançamento")) {
    return "bb";
  }
  return null;
}

function getCategoryLabel(categoryId) {
  const found = categories.find((item) => item.id === categoryId);
  return found ? found.label : "Sem categoria";
}

function normalizeDescription(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMerchantKey(description) {
  return normalizeDescription(description).split(" ").slice(0, 3).join("-");
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function parseInstallment(description) {
  if (!description) {
    return null;
  }
  const normalized = normalizeDescription(description);
  const match = normalized.match(/(?:parcela\s*)?(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!match) {
    return null;
  }
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 1) {
    return null;
  }
  return { current, total };
}

function addMonths(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}`;
}

function suggestCategory(tx) {
  const description = normalizeDescription(tx.description || "");
  if (!description) {
    return null;
  }

  const merchantKey = getMerchantKey(description);
  const override = merchantRulesState.rules[merchantKey];
  if (override) {
    return override;
  }

  const rules = [
    { match: ["uber", "99", "taxi", "metro", "onibus"], categoryId: "transport" },
    { match: ["ifood", "rappi", "restaurante", "lanchonete", "burger"], categoryId: "restaurants" },
    { match: ["farmacia", "droga", "hospital", "clinica", "medico"], categoryId: "health" },
    { match: ["netflix", "spotify", "prime", "assinatura"], categoryId: "subscriptions" },
    { match: ["supermercado", "mercado", "hortifruti"], categoryId: "market" },
    { match: ["conta", "energia", "agua", "internet", "telefone"], categoryId: "utilities" },
    { match: ["mensalidade", "curso", "faculdade"], categoryId: "education" },
    { match: ["salario", "pagamento", "recebimento"], categoryId: "income" },
  ];

  const rule = rules.find((item) =>
    item.match.some((keyword) => description.includes(keyword))
  );

  if (rule) {
    return rule.categoryId;
  }

  if (tx.kind === "transfer") {
    return "transfers";
  }

  return null;
}

async function loadMerchantRules() {
  if (!authState.user) {
    merchantRulesState.rules = {};
    merchantRulesState.loaded = false;
    return;
  }
  const uid = getUserId();
  const snapshot = await get(ref(db, `/users/${uid}/meta/merchantRules`));
  merchantRulesState.rules = snapshot.exists() ? snapshot.val() : {};
  merchantRulesState.loaded = true;
}

async function saveMerchantRule(description, categoryId) {
  if (!authState.user) {
    return;
  }
  const merchantKey = getMerchantKey(description);
  if (!merchantKey) {
    return;
  }
  merchantRulesState.rules[merchantKey] = categoryId;
  const uid = getUserId();
  await update(ref(db), {
    [`/users/${uid}/meta/merchantRules/${merchantKey}`]: categoryId,
  });
}

function getMonthSequence(startMonthKey, count) {
  const [year, month] = startMonthKey.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${nextMonth}`;
  });
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCurrencyFromCents(amount) {
  const value = Number(amount) || 0;
  return formatCurrency(value / 100);
}

function formatDateLabel(dateString) {
  if (!dateString) {
    return "";
  }
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}

function getTransactionMeta(tx) {
  const category = getCategoryLabel(tx.categoryId);
  const metaParts = [];
  if (tx.cardId) {
    metaParts.push(`Cartão: ${tx.cardId}`);
  }
  if (tx.invoiceMonthKey) {
    metaParts.push(`Fatura: ${tx.invoiceMonthKey}`);
  }
  const meta = metaParts.length ? ` • ${metaParts.join(" • ")}` : "";
  return `${category}${meta}`;
}

function sortByDateDesc(list) {
  return [...list].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return dateB - dateA;
  });
}

function renderTransactionList(title, items, options = {}) {
  const wrapper = document.createElement("section");
  wrapper.className = "card";
  const heading = document.createElement("h2");
  heading.textContent = title;

  const list = document.createElement("div");
  list.className = "transaction-list";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum lançamento encontrado.";
    wrapper.append(heading, empty);
    return wrapper;
  }

  items.forEach((tx) => {
    const row = document.createElement("div");
    row.className = "transaction-row";

    const main = document.createElement("div");
    const titleLine = document.createElement("strong");
    titleLine.textContent = tx.description || "Sem descrição";
    const metaLine = document.createElement("div");
    metaLine.className = "transaction-meta";
    metaLine.textContent = `${getTransactionMeta(tx)} • ${formatDateLabel(tx.date)}`;
    main.append(titleLine, metaLine);

    const amount = document.createElement("div");
    amount.className = "transaction-amount";
    amount.textContent = formatCurrency(tx.amount);

    row.append(main, amount);

    if (options.showActions) {
      const actions = document.createElement("div");
      actions.className = "transaction-actions";
      const editButton = createButton("Editar", {
        variant: "secondary",
        onClick: () => openTransactionModal(tx),
      });
      const deleteButton = createButton("Excluir", {
        variant: "secondary",
        onClick: async () => {
          if (window.confirm("Deseja excluir esta transação?")) {
            await transactionRepository.deleteTransaction(tx.id);
            await renderRoute();
          }
        },
      });
      const categoryEditor = document.createElement("div");
      categoryEditor.className = "category-editor";
      const categorySelect = document.createElement("select");
      categorySelect.className = "category-select";
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "Categoria";
      categorySelect.append(emptyOption);
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.label;
        categorySelect.append(option);
      });
      categorySelect.value = tx.categoryId || "";

      const ruleLabel = document.createElement("label");
      ruleLabel.className = "checkbox";
      const ruleCheckbox = document.createElement("input");
      ruleCheckbox.type = "checkbox";
      const ruleText = document.createElement("span");
      ruleText.textContent = "Sempre assim";
      ruleLabel.append(ruleCheckbox, ruleText);

      const saveCategoryButton = createButton("Salvar categoria", {
        variant: "secondary",
        onClick: async () => {
          const newCategoryId = categorySelect.value || undefined;
          await transactionRepository.updateTransaction(tx.id, {
            categoryId: newCategoryId,
          });
          if (ruleCheckbox.checked && newCategoryId) {
            await saveMerchantRule(tx.description || "", newCategoryId);
          }
          await renderRoute();
        },
      });

      categoryEditor.append(categorySelect, ruleLabel, saveCategoryButton);

      actions.append(editButton, deleteButton);
      row.append(actions);
      row.append(categoryEditor);
    }

    list.append(row);
  });

  wrapper.append(heading, list);
  return wrapper;
}

function renderTransferSection(transfers, options = {}) {
  if (!transfers.length) {
    return null;
  }
  const details = document.createElement("details");
  details.className = "card transfer-block";
  const summary = document.createElement("summary");
  summary.textContent = `Transferências (${transfers.length})`;
  details.append(summary);
  const list = renderTransactionList("Transferências", transfers, options);
  const listBody = list.querySelector(".transaction-list");
  if (listBody) {
    details.append(listBody);
  }
  return details;
}

async function renderDashboard() {
  const transactions = await transactionRepository.listMonthTransactions(
    monthState.current
  );

  const income = transactions.filter((tx) => tx.kind === "income");
  const expenses = transactions.filter((tx) => tx.kind === "expense");
  const transfers = transactions.filter((tx) => tx.kind === "transfer");

  const totalIncome = income.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalExpense = expenses.reduce(
    (sum, tx) => sum + (Number(tx.amount) || 0),
    0
  );
  const balance = totalIncome - totalExpense;

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "summary-grid";
  
  const createStatCard = (label, value, isPositive) => {
    const card = document.createElement("div");
    card.className = "card stat-card";
    
    const labelEl = document.createElement("div");
    labelEl.className = "stat-label";
    labelEl.textContent = label;
    
    const valueEl = document.createElement("div");
    valueEl.className = "stat-value";
    if (isPositive !== undefined) {
      valueEl.classList.add(isPositive ? "positive" : "negative");
    }
    valueEl.textContent = formatCurrency(value);
    
    card.append(labelEl, valueEl);
    return card;
  };
  
  summaryGrid.append(
    createStatCard("Receitas", totalIncome, true),
    createStatCard("Despesas", totalExpense, false),
    createStatCard("Saldo", balance, balance >= 0)
  );

  const incomeList = renderTransactionList(
    "Receitas",
    sortByDateDesc(income)
  );
  const expenseList = renderTransactionList(
    "Despesas",
    sortByDateDesc(expenses)
  );

  const transferBlock = renderTransferSection(sortByDateDesc(transfers));

  appView.append(summaryGrid, incomeList, expenseList);
  if (transferBlock) {
    appView.append(transferBlock);
  }
}

async function renderTransactions() {
  const transactions = await transactionRepository.listMonthTransactions(
    monthState.current
  );

  const all = sortByDateDesc(transactions);
  
  const addButton = createButton("+ Nova", {
    onClick: () => openTransactionModal(),
  });

  const list = renderTransactionList("Transações", all, {
    action: addButton,
    showActions: false,
  });

  appView.append(list);
}

async function renderCards() {
  const cardForm = document.createElement("form");
  cardForm.className = "card form";
  const formTitle = document.createElement("h2");
  formTitle.textContent = "Novo cartão";

  const nameField = createInput("Nome", "text", "name");
  const closingField = createInput("Dia de fechamento", "number", "closingDay");
  const dueField = createInput("Dia de vencimento", "number", "dueDay");
  const limitField = createInput("Limite (centavos)", "number", "limitCents");
  limitField.input.step = "1";

  const cardFeedback = document.createElement("p");
  cardFeedback.className = "form-feedback";
  cardFeedback.textContent = "";

  const actions = document.createElement("div");
  actions.className = "actions";
  const saveButton = createButton("Salvar cartão", { type: "submit" });
  actions.append(saveButton);

  cardForm.append(
    formTitle,
    nameField.wrapper,
    closingField.wrapper,
    dueField.wrapper,
    limitField.wrapper,
    cardFeedback,
    actions
  );

  cardForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    cardFeedback.textContent = "";
    const payload = buildCardPayload({
      name: nameField.input,
      closingDay: closingField.input,
      dueDay: dueField.input,
      limitCents: limitField.input,
    });

    if (
      !payload.name ||
      Number.isNaN(payload.closingDay) ||
      Number.isNaN(payload.dueDay) ||
      Number.isNaN(payload.limitCents)
    ) {
      cardFeedback.textContent = "Preencha todos os campos do cartão.";
      return;
    }

    try {
      await cardRepository.createCard(payload);
      nameField.input.value = "";
      closingField.input.value = "";
      dueField.input.value = "";
      limitField.input.value = "";
      await renderRoute();
    } catch (error) {
      cardFeedback.textContent = "Não foi possível salvar o cartão.";
    }
  });

  const cards = await cardRepository.listCards();

  const cardsSection = document.createElement("section");
  cardsSection.className = "card";
  const cardsTitle = document.createElement("h2");
  cardsTitle.textContent = "Cartões ativos";

  const cardsGrid = document.createElement("div");
  cardsGrid.className = "cards-grid";

  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum cartão cadastrado.";
    cardsSection.append(cardsTitle, empty);
  } else {
    await Promise.all(
      cards.map(async (card) => {
        const unpaidTotalCents = await cardRepository.getUnpaidTotalCents(
          card.id
        );
        const availableCents = (Number(card.limitCents) || 0) - unpaidTotalCents;

        const cardItem = document.createElement("div");
        cardItem.className = "card-item";

        const title = document.createElement("h3");
        title.textContent = card.name || "Cartão";
        title.title = card.name || "Cartão";

        const limit = document.createElement("p");
        limit.textContent = `Limite: ${formatCurrencyFromCents(card.limitCents)}`;

        const unpaid = document.createElement("p");
        unpaid.textContent = `Em aberto (não pago): ${formatCurrencyFromCents(
          unpaidTotalCents
        )}`;

        const available = document.createElement("p");
        available.textContent = `Disponível: ${formatCurrencyFromCents(
          availableCents
        )}`;

        const link = document.createElement("a");
        link.className = "button secondary";
        link.href = `#/app/invoices?cardId=${card.id}&m=${monthState.current}`;
        link.textContent = "Ver faturas";

        cardItem.append(title, limit, unpaid, available, link);
        cardsGrid.append(cardItem);
      })
    );
    cardsSection.append(cardsTitle, cardsGrid);
  }

  appView.append(cardForm, cardsSection);
}

async function renderInvoices() {
  const cardId = getQueryParam("cardId");

  if (!cardId) {
    const empty = createCard(
      "Selecione um cartão",
      "Use a tela de cartões para escolher uma fatura."
    );
    appView.append(empty);
    return;
  }

  const card = await cardRepository.getCard(cardId);
  const cardTitle = createCard(
    card?.name || "Faturas",
    "Acompanhe o status das faturas e transações."
  );

  const monthList = document.createElement("div");
  monthList.className = "invoice-months";
  const monthKeys = getMonthSequence(monthState.current, 6);
  monthKeys.forEach((monthKey) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab";
    button.textContent = formatMonthLabel(monthKey);
    button.classList.toggle("is-active", monthKey === monthState.current);
    button.addEventListener("click", () => setMonth(monthKey));
    monthList.append(button);
  });

  const invoiceTransactions = await transactionRepository.listInvoiceTransactions(
    cardId,
    monthState.current
  );
  const invoiceItems = invoiceTransactions.filter((tx) =>
    ["expense", "income"].includes(tx.kind)
  );
  const total = invoiceItems.reduce((sum, tx) => {
    const value = Number(tx.amount) || 0;
    return tx.kind === "income" ? sum - value : sum + value;
  }, 0);

  const meta = await cardRepository.getInvoiceMeta(cardId, monthState.current);
  const paid = Boolean(meta?.paid);

  const invoiceSummary = document.createElement("section");
  invoiceSummary.className = "card";
  const summaryTitle = document.createElement("h2");
  summaryTitle.textContent = `Fatura ${formatMonthLabel(monthState.current)}`;
  const totalLine = document.createElement("p");
  totalLine.textContent = `Total: ${formatCurrency(total)}`;
  const statusLine = document.createElement("p");
  statusLine.textContent = `Status: ${paid ? "paga" : "aberta"}`;

  const payButton = createButton("Marcar como paga", {
    variant: paid ? "secondary" : undefined,
    onClick: async () => {
      await cardRepository.setInvoicePaid(cardId, monthState.current, {
        paid: true,
        totalCents: Math.round(total * 100),
      });
      await renderRoute();
    },
  });
  payButton.disabled = paid;

  invoiceSummary.append(summaryTitle, totalLine, statusLine, payButton);

  const txList = renderTransactionList(
    "Transações da fatura",
    sortByDateDesc(invoiceItems),
    { showActions: true }
  );

  appView.append(cardTitle, monthList, invoiceSummary, txList);
}

function isRowImportable(row) {
  if (row.status === "ignored") {
    return false;
  }
  if (
    ["MISSING_DATE", "INVALID_DATE", "MISSING_AMOUNT", "INVALID_AMOUNT", "MISSING_DESCRIPTION"].includes(
      row.reasonCode
    )
  ) {
    return false;
  }
  return true;
}

function updateRowStatus(row) {
  const result = classifyRow(row.raw, row.txCandidate);
  row.status = result.status;
  row.reasonCode = result.reasonCode;
  row.isImportable = isRowImportable(row);
  if (!row.isImportable) {
    row.isSelected = false;
  }
}

function applySuggestionIfMissing(row) {
  if (!row.txCandidate.categoryId) {
    row.txCandidate.categoryId = suggestCategory(row.txCandidate);
  }
}

async function parseCsvFile(file) {
  const buffer = await file.arrayBuffer();
  const text = decodeFileBuffer(buffer);
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  if (!lines.length) {
    return [];
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));
  const parser = detectCsvParser(headers);

  let parsedRows = [];
  if (parser === "nubank") {
    parsedRows = parseNubankCsv(headers, rows);
  } else if (parser === "bb") {
    parsedRows = parseBancoBrasilCsv(headers, rows);
  } else {
    parsedRows = rows.map((row) => {
      const date = parseDate(row[0]);
      const description = row[1]?.trim();
      const amount = parseAmount(row[2]);
      const kind = amount !== null && amount < 0 ? "expense" : "income";
      return {
        raw: row,
        candidate: buildTxCandidate(row, {
          date,
          description,
          amount: amount !== null ? Math.abs(amount) : null,
          kind,
        }),
      };
    });
  }

  return parsedRows.map((entry, index) => {
    const rawLine = lines[index + 1] || entry.raw?.join(delimiter);
    const txCandidate = entry.candidate;
    applySuggestionIfMissing({ txCandidate });
    const result = classifyRow(rawLine, txCandidate);
    return {
      id: `${file.name}-${index}`,
      raw: rawLine,
      txCandidate,
      status: result.status,
      reasonCode: result.reasonCode,
      isSelected: result.status === "valid",
      isImportable: isRowImportable({ status: result.status, reasonCode: result.reasonCode }),
    };
  });
}

function renderImportRow(row) {
  const rowItem = document.createElement("div");
  rowItem.className = "import-row";

  const header = document.createElement("div");
  header.className = "import-row-header";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = row.isSelected;
  checkbox.disabled = !row.isImportable;
  checkbox.addEventListener("change", () => {
    row.isSelected = checkbox.checked;
    renderRoute();
  });

  const info = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = row.txCandidate?.description || "Sem descrição";
  const meta = document.createElement("div");
  meta.className = "transaction-meta";
  meta.textContent = `${row.reasonCode}`;
  info.append(title, meta);

  const statusBadge = document.createElement("span");
  statusBadge.className = `badge badge-${row.status}`;
  statusBadge.textContent = row.status;

  header.append(checkbox, info, statusBadge);

  const editor = document.createElement("div");
  editor.className = "import-editor";

  const dateField = createInput("Data", "text", "date");
  dateField.input.value = row.txCandidate?.date || "";
  const descField = createInput("Descrição", "text", "description");
  descField.input.value = row.txCandidate?.description || "";
  const amountField = createInput("Valor", "text", "amount");
  amountField.input.value =
    row.txCandidate?.amount !== null && row.txCandidate?.amount !== undefined
      ? row.txCandidate.amount
      : "";

  const categoryField = createSelect(
    "Categoria",
    "categoryId",
    categories.map((item) => ({ value: item.id, label: item.label }))
  );
  categoryField.select.required = false;
  categoryField.select.value = row.txCandidate?.categoryId || "";

  const includeTransfer = document.createElement("button");
  includeTransfer.type = "button";
  includeTransfer.className = "button secondary";
  includeTransfer.textContent = "Incluir como transferência";
  includeTransfer.addEventListener("click", () => {
    row.txCandidate.kind = "transfer";
    updateRowStatus(row);
    renderRoute();
  });

  [dateField.input, descField.input, amountField.input].forEach((input) => {
    input.addEventListener("change", () => {
      row.txCandidate.date = parseDate(dateField.input.value) || dateField.input.value;
      row.txCandidate.description = descField.input.value.trim();
      row.txCandidate.amount = parseAmount(amountField.input.value);
      row.txCandidate.kind =
        row.txCandidate.amount !== null && row.txCandidate.amount < 0
          ? "expense"
          : "income";
      if (row.txCandidate.amount !== null) {
        row.txCandidate.amount = Math.abs(row.txCandidate.amount);
      }
      row.txCandidate.categoryId = categoryField.select.value || undefined;
      applySuggestionIfMissing(row);
      updateRowStatus(row);
      renderRoute();
    });
  });
  categoryField.select.addEventListener("change", () => {
    row.txCandidate.categoryId = categoryField.select.value || undefined;
    updateRowStatus(row);
    renderRoute();
  });

  editor.append(
    dateField.wrapper,
    descField.wrapper,
    amountField.wrapper,
    categoryField.wrapper
  );

  if (row.reasonCode === "CARD_PAYMENT") {
    editor.append(includeTransfer);
  }

  const rawDetails = document.createElement("details");
  const rawSummary = document.createElement("summary");
  rawSummary.textContent = "Ver linha original";
  const rawText = document.createElement("pre");
  rawText.textContent = row.raw;
  rawDetails.append(rawSummary, rawText);

  rowItem.append(header, editor, rawDetails);
  return rowItem;
}

function computeImportCounts(rows) {
  const counts = {
    valid: 0,
    warning: 0,
    ignored: 0,
    selected: 0,
    selectedImportable: 0,
  };
  rows.forEach((row) => {
    counts[row.status] += 1;
    if (row.isSelected) {
      counts.selected += 1;
      if (row.isImportable) {
        counts.selectedImportable += 1;
      }
    }
  });
  return counts;
}

async function renderImport() {
  appView.innerHTML = "";

  const uploadCard = document.createElement("section");
  uploadCard.className = "card";
  const uploadTitle = document.createElement("h2");
  uploadTitle.textContent = "Importar CSV";
  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.multiple = true;
  uploadInput.accept = ".csv";
  uploadInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    const parsedFiles = await Promise.all(
      files.map(async (file) => {
        const results = await parseCsvFile(file);
        return {
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          results,
          activeTab: "valid",
        };
      })
    );
    importState.files = parsedFiles;
    importState.activeFileId = parsedFiles[0]?.id || null;
    importState.summary = null;
    renderRoute();
  });

  uploadCard.append(uploadTitle, uploadInput);

  if (!importState.files.length) {
    appView.append(uploadCard, createCard("Nenhum arquivo", "Envie um CSV para começar."));
    return;
  }

  const fileTabs = document.createElement("div");
  fileTabs.className = "import-tabs";
  importState.files.forEach((file) => {
    fileTabs.append(
      createTabButton(file.name, importState.activeFileId === file.id, () => {
        importState.activeFileId = file.id;
        renderRoute();
      })
    );
  });

  const activeFile = importState.files.find(
    (file) => file.id === importState.activeFileId
  );
  const results = activeFile?.results || [];
  const counts = computeImportCounts(results);

  const statusTabs = document.createElement("div");
  statusTabs.className = "import-tabs";
  ["valid", "warning", "ignored"].forEach((status) => {
    statusTabs.append(
      createTabButton(
        status === "valid" ? "Válidas" : status === "warning" ? "Avisos" : "Ignoradas",
        activeFile?.activeTab === status,
        () => {
          activeFile.activeTab = status;
          renderRoute();
        }
      )
    );
  });

  const stats = document.createElement("div");
  stats.className = "import-stats";
  stats.textContent = `Válidas: ${counts.valid} • Avisos: ${counts.warning} • Ignoradas: ${counts.ignored} • Selecionadas: ${counts.selected} • Selecionadas importáveis: ${counts.selectedImportable}`;

  const list = document.createElement("div");
  list.className = "import-list";
  results
    .filter((row) => row.status === activeFile.activeTab)
    .forEach((row) => list.append(renderImportRow(row)));

  const actionBar = document.createElement("div");
  actionBar.className = "actions";
  const importButton = createButton("Importar selecionadas");
  importButton.addEventListener("click", async () => {
    const importableRows = results.filter(
      (row) => row.isSelected && row.isImportable
    );
    const outcomes = await Promise.all(
      importableRows.map(async (row) => {
        try {
          const created = await transactionRepository.createTransaction(
            row.txCandidate
          );
          return { id: created.id || "ok", rowId: row.id, status: "success" };
        } catch (error) {
          return {
            id: null,
            rowId: row.id,
            status: "error",
            message: error.message || "Falha ao importar.",
          };
        }
      })
    );
    importState.summary = outcomes;
    renderRoute();
  });
  actionBar.append(importButton);

  appView.append(uploadCard, fileTabs, statusTabs, stats, list, actionBar);

  if (importState.summary) {
    const summaryCard = document.createElement("section");
    summaryCard.className = "card";
    const title = document.createElement("h2");
    title.textContent = "Resultado da importação";
    const summaryList = document.createElement("div");
    summaryList.className = "import-summary";
    importState.summary.forEach((entry) => {
      const item = document.createElement("div");
      item.textContent =
        entry.status === "success"
          ? `Linha ${entry.rowId}: gravada (${entry.id}).`
          : `Linha ${entry.rowId}: ${entry.message}`;
      summaryList.append(item);
    });
    summaryCard.append(title, summaryList);
    appView.append(summaryCard);
  }
}

async function renderRoute() {
  const routeKey = normalizeRoute(getRoute());

  if (routeKey === "#/login") {
    renderLogin();
    return;
  }

  if (routeKey.startsWith("#/app/") && !authState.user) {
    redirectToLogin();
    return;
  }

  const route = routes[routeKey] || routes["#/app/dashboard"];

  const headline = createCard(route.title, route.description);
  appView.innerHTML = "";
  appView.append(headline);

  if (routeKey === "#/app/dashboard") {
    await renderDashboard();
  } else if (routeKey === "#/app/transactions") {
    await renderTransactions();
  } else if (routeKey === "#/app/cards") {
    await renderCards();
  } else if (routeKey === "#/app/invoices") {
    await renderInvoices();
  } else if (routeKey === "#/app/import") {
    await renderImport();
  } else {
    const info = createCard(
      "Mês ativo",
      `Você está visualizando ${formatMonthLabel(monthState.current)}.`,
      [createButton("Alterar mês", { variant: "secondary" })]
    );
    appView.append(info);
  }

  updateActiveTab();
}

function normalizeRoute(hash) {
  if (hash === "#" || hash === "") {
    return "#/app/dashboard";
  }
  if (hash === "#/dashboard") {
    return "#/app/dashboard";
  }
  if (hash === "#/transactions") {
    return "#/app/transactions";
  }
  if (hash === "#/cards") {
    return "#/app/cards";
  }
  if (hash === "#/invoices") {
    return "#/app/invoices";
  }
  if (hash === "#/import") {
    return "#/app/import";
  }
  return hash;
}

function redirectToLogin() {
  navigateTo("#/login");
}

function navigateTo(hash) {
  if (window.location.hash === hash) {
    renderRoute();
    return;
  }
  window.location.hash = hash;
}

function syncMonthFromStorage() {
  const urlMonth = getMonthFromUrl();
  if (urlMonth) {
    monthState.current = urlMonth;
    sessionStorage.setItem(monthStorageKey, urlMonth);
    return;
  }
  const stored = sessionStorage.getItem(monthStorageKey);
  monthState.current = stored || getDefaultMonth();
  setMonth(monthState.current);
}

function handleHashChange() {
  renderRoute();
}

function initAuth() {
  onAuthChange((user) => {
    authState.user = user;
    if (!user && getRoute().startsWith("#/app/")) {
      redirectToLogin();
      return;
    }
    loadMerchantRules();
    renderRoute();
  });
}

function stripUndefined(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const sanitized = Array.isArray(payload) ? [] : {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
}

function getUserId() {
  if (!authState.user) {
    throw new Error("Usuário não autenticado.");
  }
  return authState.user.uid;
}

function getInvoiceTotalCents(transactions) {
  return transactions.reduce((sum, tx) => {
    const value = Number(tx.amount) || 0;
    const cents = Math.round(value * 100);
    return tx.kind === "income" ? sum - cents : sum + cents;
  }, 0);
}

function createCardRepository() {
  async function createCard(card) {
    const uid = getUserId();
    const cardRef = push(ref(db, `/users/${uid}/cards`));
    const cardId = cardRef.key;
    const payload = stripUndefined({ ...card, id: cardId, unpaidTotalCents: 0 });
    await update(ref(db), { [`/users/${uid}/cards/${cardId}`]: payload });
    return payload;
  }

  async function listCards() {
    const uid = getUserId();
    const snapshot = await get(ref(db, `/users/${uid}/cards`));
    if (!snapshot.exists()) {
      return [];
    }
    return Object.values(snapshot.val());
  }

  async function getCard(cardId) {
    const uid = getUserId();
    const snapshot = await get(ref(db, `/users/${uid}/cards/${cardId}`));
    return snapshot.exists() ? snapshot.val() : null;
  }

  async function getInvoiceMeta(cardId, monthKey) {
    const uid = getUserId();
    const snapshot = await get(
      ref(db, `/users/${uid}/invoices/${cardId}/${monthKey}/meta`)
    );
    return snapshot.exists() ? snapshot.val() : null;
  }

  async function setInvoicePaid(cardId, monthKey, payload) {
    const uid = getUserId();
    const metaPath = `/users/${uid}/invoices/${cardId}/${monthKey}/meta`;
    const updates = {};
    updates[metaPath] = stripUndefined({
      ...(await getInvoiceMeta(cardId, monthKey)),
      paid: true,
      paidAt: Date.now(),
      totalCents: payload.totalCents,
    });
    await update(ref(db), updates);
    await recomputeCardUnpaidTotal(cardId);
  }

  async function recomputeInvoiceMeta(cardId, monthKey) {
    const txList = await transactionRepository.listInvoiceTransactions(
      cardId,
      monthKey
    );
    const invoiceItems = txList.filter((tx) =>
      ["expense", "income"].includes(tx.kind)
    );
    const totalCents = getInvoiceTotalCents(invoiceItems);
    const uid = getUserId();
    const metaPath = `/users/${uid}/invoices/${cardId}/${monthKey}/meta`;
    const current = await getInvoiceMeta(cardId, monthKey);
    await update(ref(db), {
      [metaPath]: stripUndefined({
        ...current,
        monthKey,
        totalCents,
        updatedAt: Date.now(),
      }),
    });
    await recomputeCardUnpaidTotal(cardId);
  }

  async function recomputeCardUnpaidTotal(cardId) {
    const uid = getUserId();
    const snapshot = await get(ref(db, `/users/${uid}/invoices/${cardId}`));
    if (!snapshot.exists()) {
      await update(ref(db), {
        [`/users/${uid}/cards/${cardId}/unpaidTotalCents`]: 0,
      });
      return 0;
    }
    const invoices = snapshot.val();
    let total = 0;
    Object.values(invoices).forEach((invoice) => {
      const meta = invoice?.meta;
      if (meta && !meta.paid) {
        total += Number(meta.totalCents) || 0;
      }
    });
    await update(ref(db), {
      [`/users/${uid}/cards/${cardId}/unpaidTotalCents`]: total,
    });
    return total;
  }

  async function getUnpaidTotalCents(cardId) {
    await recomputeCardUnpaidTotal(cardId);
    const uid = getUserId();
    const snapshot = await get(
      ref(db, `/users/${uid}/cards/${cardId}/unpaidTotalCents`)
    );
    return snapshot.exists() ? Number(snapshot.val()) || 0 : 0;
  }

  return {
    createCard,
    listCards,
    getCard,
    getInvoiceMeta,
    setInvoicePaid,
    recomputeInvoiceMeta,
    recomputeCardUnpaidTotal,
    getUnpaidTotalCents,
  };
}

function createTransactionRepository(cardRepo) {
  function buildInstallmentGroupId(payload, installment) {
    const merchantKey = getMerchantKey(payload.description || "");
    const base = [
      merchantKey,
      payload.date,
      payload.amount,
      installment.total,
      payload.cardId || "nocard",
    ].join("|");
    return hashString(base);
  }

  function buildTransactionUpdates(uid, txId, payload) {
    const updates = {};
    updates[`/users/${uid}/tx/${txId}`] = payload;

    if (payload.monthKey) {
      updates[`/users/${uid}/txByMonth/${payload.monthKey}/${txId}`] = true;
    }

    if (payload.cardId && payload.invoiceMonthKey) {
      updates[
        `/users/${uid}/cardTxByInvoice/${payload.cardId}/${payload.invoiceMonthKey}/${txId}`
      ] = true;
      updates[
        `/users/${uid}/invoices/${payload.cardId}/${payload.invoiceMonthKey}/meta`
      ] = stripUndefined({
        monthKey: payload.invoiceMonthKey,
        updatedAt: Date.now(),
      });
    }

    return updates;
  }

  async function createTransaction(tx) {
    const uid = getUserId();
    const withSuggestion = { ...tx };
    if (!withSuggestion.categoryId) {
      withSuggestion.categoryId = suggestCategory(withSuggestion);
    }
    const installment = parseInstallment(withSuggestion.description);
    const monthKey = withSuggestion.monthKey;
    const baseInvoiceMonth = withSuggestion.invoiceMonthKey || monthKey;

    if (installment && installment.current >= 1) {
      const amountCents = Math.round((Number(withSuggestion.amount) || 0) * 100);
      const perInstallment = Math.floor(amountCents / installment.total);
      const remainder = amountCents % installment.total;
      const groupId = buildInstallmentGroupId(withSuggestion, installment);
      const updates = {};
      const recomputeTargets = new Set();

      for (let index = installment.current; index <= installment.total; index += 1) {
        const offset = index - installment.current;
        const monthForInstallment = addMonths(monthKey, offset);
        const invoiceMonthKey = withSuggestion.cardId
          ? addMonths(baseInvoiceMonth, offset)
          : undefined;
        const installmentCents =
          perInstallment + (index - 1 < remainder ? 1 : 0);
        const txRef = push(ref(db, `/users/${uid}/tx`));
        const txId = txRef.key;
        const payload = stripUndefined({
          ...withSuggestion,
          id: txId,
          amount: installmentCents / 100,
          monthKey: monthForInstallment,
          invoiceMonthKey,
          isProjected: offset > 0,
          installment: {
            current: index,
            total: installment.total,
            groupId,
          },
        });
        Object.assign(updates, buildTransactionUpdates(uid, txId, payload));
        if (payload.cardId && payload.invoiceMonthKey) {
          recomputeTargets.add(`${payload.cardId}::${payload.invoiceMonthKey}`);
        }
      }

      await update(ref(db), updates);
      await Promise.all(
        Array.from(recomputeTargets).map((key) => {
          const [cardId, invoiceMonthKey] = key.split("::");
          return cardRepo.recomputeInvoiceMeta(cardId, invoiceMonthKey);
        })
      );
      return { ...withSuggestion };
    }

    const txRef = push(ref(db, `/users/${uid}/tx`));
    const txId = txRef.key;
    const payload = stripUndefined({ ...withSuggestion, id: txId });
    const updates = buildTransactionUpdates(uid, txId, payload);

    await update(ref(db), updates);
    if (payload.cardId && payload.invoiceMonthKey) {
      await cardRepo.recomputeInvoiceMeta(payload.cardId, payload.invoiceMonthKey);
    }
    return { ...payload, id: txId };
  }

  async function updateTransaction(txId, patch) {
    const uid = getUserId();
    const txPath = `/users/${uid}/tx/${txId}`;
    const snapshot = await get(ref(db, txPath));
    if (!snapshot.exists()) {
      throw new Error("Transação não encontrada.");
    }
    const current = snapshot.val();
    const sanitizedPatch = stripUndefined(patch);
    const next = { ...current, ...sanitizedPatch };

    const updates = {};
    updates[txPath] = stripUndefined(next);

    if (current.monthKey && current.monthKey !== next.monthKey) {
      updates[`/users/${uid}/txByMonth/${current.monthKey}/${txId}`] = null;
    }
    if (next.monthKey && current.monthKey !== next.monthKey) {
      updates[`/users/${uid}/txByMonth/${next.monthKey}/${txId}`] = true;
    }

    const currentCardKey = current.cardId && current.invoiceMonthKey;
    const nextCardKey = next.cardId && next.invoiceMonthKey;

    if (
      currentCardKey &&
      (current.cardId !== next.cardId ||
        current.invoiceMonthKey !== next.invoiceMonthKey)
    ) {
      updates[
        `/users/${uid}/cardTxByInvoice/${current.cardId}/${current.invoiceMonthKey}/${txId}`
      ] = null;
    }

    if (
      nextCardKey &&
      (current.cardId !== next.cardId ||
        current.invoiceMonthKey !== next.invoiceMonthKey)
    ) {
      updates[
        `/users/${uid}/cardTxByInvoice/${next.cardId}/${next.invoiceMonthKey}/${txId}`
      ] = true;
      updates[
        `/users/${uid}/invoices/${next.cardId}/${next.invoiceMonthKey}/meta`
      ] = stripUndefined({
        monthKey: next.invoiceMonthKey,
        updatedAt: Date.now(),
      });
    }

    await update(ref(db), updates);
    if (current.cardId && current.invoiceMonthKey) {
      await cardRepo.recomputeInvoiceMeta(
        current.cardId,
        current.invoiceMonthKey
      );
    }
    if (next.cardId && next.invoiceMonthKey) {
      await cardRepo.recomputeInvoiceMeta(next.cardId, next.invoiceMonthKey);
    }
    return next;
  }

  async function deleteTransaction(txId) {
    const uid = getUserId();
    const txPath = `/users/${uid}/tx/${txId}`;
    const snapshot = await get(ref(db, txPath));
    if (!snapshot.exists()) {
      return;
    }
    const current = snapshot.val();
    const updates = {};
    updates[txPath] = null;

    if (current.monthKey) {
      updates[`/users/${uid}/txByMonth/${current.monthKey}/${txId}`] = null;
    }

    if (current.cardId && current.invoiceMonthKey) {
      updates[
        `/users/${uid}/cardTxByInvoice/${current.cardId}/${current.invoiceMonthKey}/${txId}`
      ] = null;
    }

    await update(ref(db), updates);
    if (current.cardId && current.invoiceMonthKey) {
      await cardRepo.recomputeInvoiceMeta(
        current.cardId,
        current.invoiceMonthKey
      );
    }
  }

  async function listMonthTransactions(monthKey) {
    const uid = getUserId();
    const listRef = ref(db, `/users/${uid}/txByMonth/${monthKey}`);
    const snapshot = await get(listRef);
    if (!snapshot.exists()) {
      return [];
    }
    const ids = Object.keys(snapshot.val());
    const results = await Promise.all(
      ids.map(async (id) => {
        const txSnap = await get(ref(db, `/users/${uid}/tx/${id}`));
        return txSnap.exists() ? txSnap.val() : null;
      })
    );
    return results.filter(Boolean);
  }

  async function listInvoiceTransactions(cardId, invoiceMonthKey) {
    const uid = getUserId();
    const listRef = ref(
      db,
      `/users/${uid}/cardTxByInvoice/${cardId}/${invoiceMonthKey}`
    );
    const snapshot = await get(listRef);
    if (!snapshot.exists()) {
      return [];
    }
    const ids = Object.keys(snapshot.val());
    const results = await Promise.all(
      ids.map(async (id) => {
        const txSnap = await get(ref(db, `/users/${uid}/tx/${id}`));
        return txSnap.exists() ? txSnap.val() : null;
      })
    );
    return results.filter(Boolean);
  }

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    listMonthTransactions,
    listInvoiceTransactions,
  };
}

const cardRepository = createCardRepository();
const transactionRepository = createTransactionRepository(cardRepository);

window.pvaultRepository = {
  transactions: transactionRepository,
  cards: cardRepository,
};

function init() {
  createTabs();
  syncMonthFromStorage();
  renderMonthToolbar();
  initAuth();
  window.addEventListener("hashchange", handleHashChange);
  renderRoute();
}

init();
