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
let cardModal = null;
const importState = {
  files: [],
  activeFileId: null,
  summary: null,
};

// Helper para criar ícones SVG do Fluent Icons
function createFluentIcon(pathData, size = 20, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("fill", "currentColor");
  if (className) svg.setAttribute("class", className);
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  
  return svg;
}

// Biblioteca de ícones Fluent (paths otimizados para 20x20)
const FluentIcons = {
  ChevronLeft: "M13.3536 16.3536C13.5488 16.1583 13.5488 15.8417 13.3536 15.6464L7.70711 10L13.3536 4.35355C13.5488 4.15829 13.5488 3.84171 13.3536 3.64645C13.1583 3.45118 12.8417 3.45118 12.6464 3.64645L6.64645 9.64645C6.45118 9.84171 6.45118 10.1583 6.64645 10.3536L12.6464 16.3536C12.8417 16.5488 13.1583 16.5488 13.3536 16.3536Z",
  ChevronRight: "M7.64645 3.64645C7.45118 3.84171 7.45118 4.15829 7.64645 4.35355L13.2929 10L7.64645 15.6464C7.45118 15.8417 7.45118 16.1583 7.64645 16.3536C7.84171 16.5488 8.15829 16.5488 8.35355 16.3536L14.3536 10.3536C14.5488 10.1583 14.5488 9.84171 14.3536 9.64645L8.35355 3.64645C8.15829 3.45118 7.84171 3.45118 7.64645 3.64645Z",
  Dismiss: "M4.08859 4.21569C3.87466 4.00176 3.53009 4.00176 3.31616 4.21569C3.10223 4.42962 3.10223 4.77419 3.31616 4.98812L9.32804 11L3.31616 17.0119C3.10223 17.2258 3.10223 17.5704 3.31616 17.7843C3.53009 17.9982 3.87466 17.9982 4.08859 17.7843L10.1005 11.7724L16.1124 17.7843C16.3263 17.9982 16.6709 17.9982 16.8848 17.7843C17.0987 17.5704 17.0987 17.2258 16.8848 17.0119L10.8729 11L16.8848 4.98812C17.0987 4.77419 17.0987 4.42962 16.8848 4.21569C16.6709 4.00176 16.3263 4.00176 16.1124 4.21569L10.1005 10.2276L4.08859 4.21569Z",
  Edit: "M17.7266 2.27344C16.5718 1.11862 14.678 1.11862 13.5232 2.27344L2.92453 12.8721C2.63906 13.1576 2.44524 13.5214 2.36858 13.918L1.51652 17.846C1.38311 18.4993 1.92313 19.0393 2.57645 18.906L6.50405 18.0539C6.90063 17.9773 7.26445 17.7834 7.54992 17.498L18.1486 6.89932C19.3034 5.7445 19.3034 3.8507 18.1486 2.69588L17.7266 2.27344ZM14.2303 2.98055C15.0006 2.21026 16.2491 2.21026 17.0194 2.98055L17.4415 3.40299C18.2118 4.17328 18.2118 5.42182 17.4415 6.19211L16.7595 6.87413L13.5483 3.66289L14.2303 2.98055ZM12.8412 4.37L16.0524 7.58124L6.84281 16.7908C6.69203 16.9416 6.49866 17.0424 6.28787 17.0797L3.0699 17.7482L3.73843 14.5302C3.77573 14.3194 3.87647 14.126 4.02725 13.9753L12.8412 4.37Z",
  Delete: "M8.5 3C8.22386 3 8 3.22386 8 3.5C8 3.77614 8.22386 4 8.5 4H11.5C11.7761 4 12 3.77614 12 3.5C12 3.22386 11.7761 3 11.5 3H8.5ZM4 5C3.72386 5 3.5 5.22386 3.5 5.5C3.5 5.77614 3.72386 6 4 6H16C16.2761 6 16.5 5.77614 16.5 5.5C16.5 5.22386 16.2761 5 16 5H4ZM5.5 7C5.77614 7 6 7.22386 6 7.5V16.5C6 17.3284 6.67157 18 7.5 18H12.5C13.3284 18 14 17.3284 14 16.5V7.5C14 7.22386 14.2239 7 14.5 7C14.7761 7 15 7.22386 15 7.5V16.5C15 17.8807 13.8807 19 12.5 19H7.5C6.11929 19 5 17.8807 5 16.5V7.5C5 7.22386 5.22386 7 5.5 7ZM9 9.5C9 9.22386 8.77614 9 8.5 9C8.22386 9 8 9.22386 8 9.5V15.5C8 15.7761 8.22386 16 8.5 16C8.77614 16 9 15.7761 9 15.5V9.5ZM11.5 9C11.7761 9 12 9.22386 12 9.5V15.5C12 15.7761 11.7761 16 11.5 16C11.2239 16 11 15.7761 11 15.5V9.5C11 9.22386 11.2239 9 11.5 9Z",
  Add: "M10 3C10.2761 3 10.5 3.22386 10.5 3.5V9.5H16.5C16.7761 9.5 17 9.72386 17 10C17 10.2761 16.7761 10.5 16.5 10.5H10.5V16.5C10.5 16.7761 10.2761 17 10 17C9.72386 17 9.5 16.7761 9.5 16.5V10.5H3.5C3.22386 10.5 3 10.2761 3 10C3 9.72386 3.22386 9.5 3.5 9.5H9.5V3.5C9.5 3.22386 9.72386 3 10 3Z"
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
  input.autocomplete = type === "email" ? "email" : type === "password" ? "current-password" : "off";
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
  prevButton.appendChild(createFluentIcon(FluentIcons.ChevronLeft));
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
  nextButton.appendChild(createFluentIcon(FluentIcons.ChevronRight));
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
  // Extrair query params do hash (#/app/invoices?cardId=...)
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) return null;
  
  const queryString = hash.substring(queryStart + 1);
  const params = new URLSearchParams(queryString);
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

  const card = createCard(
    "Entrar no PVault",
    "Controle suas finanças de forma simples."
  );

  const form = document.createElement("form");
  form.className = "form";

  const emailField = createInput("Email", "email", "email");
  const passwordField = createInput("Senha", "password", "password");

  const rememberMeLabel = document.createElement("label");
  rememberMeLabel.className = "checkbox";
  const rememberMeCheckbox = document.createElement("input");
  rememberMeCheckbox.type = "checkbox";
  rememberMeCheckbox.checked = true;
  const rememberMeText = document.createElement("span");
  rememberMeText.textContent = "Manter conectado por 7 dias";
  rememberMeLabel.append(rememberMeCheckbox, rememberMeText);

  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  feedback.textContent = "";

  const actionRow = document.createElement("div");
  actionRow.className = "actions";
  actionRow.style.gap = "0.5rem";

  const loginButton = createButton("Entrar", { type: "submit" });
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
    const rememberMe = rememberMeCheckbox.checked;

    if (!email || !password) {
      feedback.textContent = "Informe email e senha.";
      return;
    }

    try {
      if (mode === "login") {
        await signIn(email, password, rememberMe);
      } else {
        await signUp(email, password, rememberMe);
      }
      navigateTo("#/app/dashboard");
    } catch (error) {
      feedback.textContent = "Não foi possível autenticar. Verifique os dados.";
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runAuth("login");
  });
  
  registerButton.addEventListener("click", () => runAuth("register"));

  actionRow.append(loginButton, registerButton);
  form.append(emailField.wrapper, passwordField.wrapper, rememberMeLabel, feedback, actionRow);
  card.append(form);

  appView.append(card);
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
  
  const cardField = createSelect("Cartão (opcional)", "cardId", []);
  const invoiceField = createSelect("Mês da fatura (opcional)", "invoiceMonthKey", []);
  
  cardField.select.required = false;
  invoiceField.select.required = false;
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
      cardId: cardField.select,
      invoiceMonthKey: invoiceField.select,
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
      cardId: cardField.select,
      invoiceMonthKey: invoiceField.select,
    },
    feedback,
    txId: null,
  };
}

async function openTransactionModal(tx = null) {
  if (!transactionModal) {
    transactionModal = createTransactionModal();
  }
  const modal = transactionModal;
  modal.txId = tx?.id || null;
  modal.title.textContent = tx ? "Editar transação" : "Nova transação";
  
  // Popular select de cartões
  const cards = await cardRepository.listCards();
  modal.fields.cardId.innerHTML = '<option value="">Nenhum</option>';
  cards.forEach(card => {
    const option = document.createElement("option");
    option.value = card.id;
    option.textContent = card.name;
    modal.fields.cardId.appendChild(option);
  });
  
  // Popular select de meses de fatura (próximos 12 meses)
  modal.fields.invoiceMonthKey.innerHTML = '<option value="">Nenhum</option>';
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    modal.fields.invoiceMonthKey.appendChild(option);
  }
  
  // Função para calcular a fatura em aberto baseado no cartão e data
  const calculateOpenInvoice = (cardId, transactionDate) => {
    if (!cardId) return "";
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.closingDay) return "";
    
    const txDate = new Date(transactionDate);
    const txDay = txDate.getDate();
    const closingDay = Number(card.closingDay);
    
    // Se a transação é antes do dia de fechamento, fatura do mês atual
    // Se é depois, fatura do próximo mês
    let invoiceMonth = txDate.getMonth();
    let invoiceYear = txDate.getFullYear();
    
    if (txDay > closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 11) {
        invoiceMonth = 0;
        invoiceYear += 1;
      }
    }
    
    return `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`;
  };
  
  const todayStr = today.toISOString().split('T')[0];
  
  modal.fields.date.value = tx?.date || todayStr;
  modal.fields.description.value = tx?.description || "";
  modal.fields.amount.value = tx?.amount ?? "";
  modal.fields.kind.value = tx?.kind || "expense";
  modal.fields.categoryId.value = tx?.categoryId || "";
  modal.fields.cardId.value = tx?.cardId || "";
  modal.fields.invoiceMonthKey.value = tx?.invoiceMonthKey || "";
  modal.feedback.textContent = "";
  
  // Atualizar automaticamente o mês da fatura quando o cartão ou data mudar
  const updateInvoiceMonth = () => {
    const selectedCard = modal.fields.cardId.value;
    const selectedDate = modal.fields.date.value;
    if (selectedCard && selectedDate) {
      const calculatedMonth = calculateOpenInvoice(selectedCard, selectedDate);
      if (calculatedMonth) {
        modal.fields.invoiceMonthKey.value = calculatedMonth;
      }
    } else {
      modal.fields.invoiceMonthKey.value = "";
    }
  };
  
  // Listeners para atualização automática
  modal.fields.cardId.addEventListener('change', updateInvoiceMonth);
  modal.fields.date.addEventListener('change', updateInvoiceMonth);
  
  // Se for nova transação e tiver cartão selecionado, calcular fatura automaticamente
  if (!tx && modal.fields.cardId.value) {
    updateInvoiceMonth();
  }

  // Ocultar FAB temporariamente
  const fab = document.querySelector(".fab");
  if (fab) {
    fab.style.display = "none";
  }

  modal.overlay.classList.remove("hidden");
}

function closeTransactionModal() {
  if (transactionModal) {
    transactionModal.overlay.classList.add("hidden");
  }
  
  // Mostrar FAB novamente
  const fab = document.querySelector(".fab");
  if (fab) {
    fab.style.display = "";
  }
}

function createCardModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay hidden";

  const modal = document.createElement("div");
  modal.className = "modal";

  const header = document.createElement("div");
  header.className = "modal-header";

  const title = document.createElement("h2");
  title.className = "modal-title";
  title.textContent = "Editar cartão";

  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-button";
  closeBtn.appendChild(createFluentIcon(FluentIcons.Dismiss));
  closeBtn.setAttribute("aria-label", "Fechar");
  closeBtn.addEventListener("click", closeCardModal);

  header.append(title, closeBtn);

  const form = document.createElement("form");
  form.className = "form";

  const nameField = createInput("Nome do cartão", "text", "name");
  nameField.input.placeholder = "Ex: Visa Gold";

  const fieldsRow = document.createElement("div");
  fieldsRow.style.display = "grid";
  fieldsRow.style.gridTemplateColumns = "1fr 1fr";
  fieldsRow.style.gap = "1rem";

  const closingField = createInput("Dia fechamento", "number", "closingDay");
  closingField.input.min = "1";
  closingField.input.max = "31";
  closingField.input.placeholder = "Ex: 10";

  const dueField = createInput("Dia vencimento", "number", "dueDay");
  dueField.input.min = "1";
  dueField.input.max = "31";
  dueField.input.placeholder = "Ex: 15";

  fieldsRow.append(closingField.wrapper, dueField.wrapper);

  const limitField = createInput("Limite (R$)", "number", "limitCents");
  limitField.input.step = "0.01";
  limitField.input.placeholder = "Ex: 5000.00";

  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  feedback.textContent = "";

  const actions = document.createElement("div");
  actions.className = "actions";

  const cancelBtn = createButton("Cancelar", { type: "button" });
  cancelBtn.classList.add("secondary");
  cancelBtn.addEventListener("click", closeCardModal);

  const saveBtn = createButton("Salvar", { type: "submit" });

  actions.append(cancelBtn, saveBtn);
  form.append(nameField.wrapper, fieldsRow, limitField.wrapper, feedback, actions);

  modal.append(header, form);
  overlay.append(modal);
  document.body.append(overlay);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "";

    const cardId = overlay.cardId;
    if (!cardId) return;

    const limitInReais = Number(limitField.input.value);
    const payload = {
      name: nameField.input.value.trim(),
      closingDay: Number(closingField.input.value),
      dueDay: Number(dueField.input.value),
      limitCents: Math.round(limitInReais * 100),
    };

    if (
      !payload.name ||
      Number.isNaN(payload.closingDay) ||
      Number.isNaN(payload.dueDay) ||
      Number.isNaN(payload.limitCents)
    ) {
      feedback.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    try {
      await cardRepository.updateCard(cardId, payload);
      closeCardModal();
      await renderRoute();
    } catch (error) {
      feedback.textContent = "Não foi possível atualizar o cartão.";
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCardModal();
  });

  return {
    overlay,
    title,
    form,
    fields: {
      name: nameField.input,
      closingDay: closingField.input,
      dueDay: dueField.input,
      limitCents: limitField.input,
    },
    feedback,
  };
}

function openCardModal(card) {
  if (!cardModal) {
    cardModal = createCardModal();
  }
  const modal = cardModal;
  modal.overlay.cardId = card.id;
  modal.title.textContent = "Editar cartão";

  modal.fields.name.value = card.name || "";
  modal.fields.closingDay.value = card.closingDay || "";
  modal.fields.dueDay.value = card.dueDay || "";
  modal.fields.limitCents.value = card.limitCents ? (card.limitCents / 100).toFixed(2) : "";
  modal.feedback.textContent = "";

  modal.overlay.classList.remove("hidden");
}

function closeCardModal() {
  if (cardModal) {
    cardModal.overlay.classList.add("hidden");
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

    const content = document.createElement("div");
    content.className = "transaction-content";

    const main = document.createElement("div");
    const titleLine = document.createElement("strong");
    titleLine.textContent = tx.description || "Sem descrição";
    const metaLine = document.createElement("div");
    metaLine.className = "transaction-meta";
    metaLine.textContent = `${getTransactionMeta(tx)} • ${formatDateLabel(tx.date)}`;
    main.append(titleLine, metaLine);

    const amount = document.createElement("div");
    amount.className = "transaction-amount";
    if (tx.kind === "income") {
      amount.classList.add("income");
    } else if (tx.kind === "expense") {
      amount.classList.add("expense");
    }
    amount.textContent = formatCurrency(tx.amount);

    content.append(main, amount);

    const actions = document.createElement("div");
    actions.className = "transaction-actions-hidden";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-button";
    editBtn.appendChild(createFluentIcon(FluentIcons.Edit));
    editBtn.setAttribute("aria-label", "Editar");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openTransactionModal(tx);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-button danger";
    deleteBtn.appendChild(createFluentIcon(FluentIcons.Delete));
    deleteBtn.setAttribute("aria-label", "Excluir");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Excluir "${tx.description}"?`)) {
        await transactionRepository.deleteTransaction(tx.id);
        await renderRoute();
      }
    });

    actions.append(editBtn, deleteBtn);
    row.append(content, actions);

    // Swipe gesture
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleStart = (e) => {
      startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      isDragging = true;
      content.style.transition = 'none';
    };

    const handleMove = (e) => {
      if (!isDragging) return;
      currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff < 0) {
        content.style.transform = `translateX(${Math.max(diff, -120)}px)`;
      }
    };

    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      content.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      const diff = currentX - startX;
      
      if (diff < -60) {
        content.style.transform = 'translateX(-120px)';
        row.classList.add('swiped');
      } else {
        content.style.transform = 'translateX(0)';
        row.classList.remove('swiped');
      }
    };

    content.addEventListener('mousedown', handleStart);
    content.addEventListener('touchstart', handleStart, { passive: true });
    content.addEventListener('mousemove', handleMove);
    content.addEventListener('touchmove', handleMove, { passive: true });
    content.addEventListener('mouseup', handleEnd);
    content.addEventListener('touchend', handleEnd);
    content.addEventListener('mouseleave', handleEnd);

    content.addEventListener("click", (e) => {
      if (Math.abs(currentX - startX) < 5) {
        openTransactionModal(tx);
      }
    });
    content.style.cursor = "pointer";

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
  
  // Ícones SVG para os cards
  const incomeIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const expenseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20L12 4M12 20L18 14M12 20L6 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const balanceIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/></svg>`;
  
  const createStatCard = (label, value, type, icon) => {
    const card = document.createElement("div");
    card.className = `card stat-card ${type}`;
    
    const iconEl = document.createElement("div");
    iconEl.className = "stat-icon";
    iconEl.innerHTML = icon;
    
    const labelEl = document.createElement("div");
    labelEl.className = "stat-label";
    labelEl.textContent = label;
    
    const valueEl = document.createElement("div");
    valueEl.className = "stat-value";
    if (type === "income") {
      valueEl.classList.add("positive");
    } else if (type === "expense") {
      valueEl.classList.add("negative");
    } else if (type === "balance") {
      valueEl.classList.add(value >= 0 ? "positive" : "negative");
    }
    valueEl.textContent = formatCurrency(value);
    
    card.append(iconEl, labelEl, valueEl);
    return card;
  };
  
  summaryGrid.append(
    createStatCard("Receitas", totalIncome, "income", incomeIcon),
    createStatCard("Despesas", totalExpense, "expense", expenseIcon),
    createStatCard("Saldo", balance, "balance", balanceIcon)
  );

  // Resumo de transações recentes
  const recentTransactions = sortByDateDesc(transactions).slice(0, 5);
  const recentSection = renderTransactionList(
    "Últimas transações",
    recentTransactions,
    { showActions: true }
  );

  appView.append(summaryGrid, recentSection);
}

async function renderTransactions() {
  const transactions = await transactionRepository.listMonthTransactions(
    monthState.current
  );

  const all = sortByDateDesc(transactions);

  const list = renderTransactionList("Transações", all, {
    showActions: false,
  });

  appView.append(list);
}

async function renderCards() {
  const cardForm = document.createElement("form");
  cardForm.className = "card form";
  
  const header = document.createElement("div");
  header.className = "section-header";
  const formTitle = document.createElement("h3");
  formTitle.className = "section-title";
  formTitle.textContent = "Novo cartão";
  header.append(formTitle);

  const nameField = createInput("Nome do cartão", "text", "name");
  nameField.input.placeholder = "Ex: Visa Gold";
  
  const fieldsRow = document.createElement("div");
  fieldsRow.style.display = "grid";
  fieldsRow.style.gridTemplateColumns = "1fr 1fr";
  fieldsRow.style.gap = "1rem";
  
  const closingField = createInput("Dia fechamento", "number", "closingDay");
  closingField.input.min = "1";
  closingField.input.max = "31";
  closingField.input.placeholder = "Ex: 10";
  
  const dueField = createInput("Dia vencimento", "number", "dueDay");
  dueField.input.min = "1";
  dueField.input.max = "31";
  dueField.input.placeholder = "Ex: 15";
  
  fieldsRow.append(closingField.wrapper, dueField.wrapper);
  
  const limitField = createInput("Limite (R$)", "number", "limitCents");
  limitField.input.step = "0.01";
  limitField.input.placeholder = "Ex: 5000.00";

  const cardFeedback = document.createElement("p");
  cardFeedback.className = "form-feedback";
  cardFeedback.textContent = "";

  const actions = document.createElement("div");
  actions.className = "actions";
  const saveButton = createButton("Adicionar cartão", { type: "submit" });
  saveButton.style.width = "100%";
  actions.append(saveButton);

  cardForm.append(
    header,
    nameField.wrapper,
    fieldsRow,
    limitField.wrapper,
    cardFeedback,
    actions
  );

  cardForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    cardFeedback.textContent = "";
    
    const limitInReais = Number(limitField.input.value);
    const payload = {
      name: nameField.input.value.trim(),
      closingDay: Number(closingField.input.value),
      dueDay: Number(dueField.input.value),
      limitCents: Math.round(limitInReais * 100),
    };

    if (
      !payload.name ||
      Number.isNaN(payload.closingDay) ||
      Number.isNaN(payload.dueDay) ||
      Number.isNaN(payload.limitCents)
    ) {
      cardFeedback.textContent = "Preencha todos os campos corretamente.";
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
  
  const cardsHeader = document.createElement("div");
  cardsHeader.className = "section-header";
  const cardsTitle = document.createElement("h3");
  cardsTitle.className = "section-title";
  cardsTitle.textContent = "Meus cartões";
  cardsHeader.append(cardsTitle);

  const cardsGrid = document.createElement("div");
  cardsGrid.className = "cards-grid";

  if (!cards.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const emptyText = document.createElement("p");
    emptyText.className = "text-secondary";
    emptyText.textContent = "Nenhum cartão cadastrado";
    empty.append(emptyText);
    cardsSection.append(cardsHeader, empty);
  } else {
    await Promise.all(
      cards.map(async (card) => {
        const unpaidTotalCents = await cardRepository.getUnpaidTotalCents(
          card.id
        );
        const availableCents = (Number(card.limitCents) || 0) - unpaidTotalCents;

        const cardWrapper = document.createElement("div");
        cardWrapper.style.position = "relative";
        cardWrapper.style.overflow = "hidden";

        const cardItem = document.createElement("div");
        cardItem.className = "card-item";
        cardItem.style.position = "relative";
        cardItem.style.zIndex = "2";
        cardItem.style.background = "var(--surface)";

        const title = document.createElement("h3");
        title.textContent = card.name || "Cartão";

        const limit = document.createElement("div");
        limit.className = "card-item-label";
        limit.textContent = "Limite";
        
        const limitValue = document.createElement("div");
        limitValue.className = "card-item-value";
        limitValue.textContent = formatCurrencyFromCents(card.limitCents);

        const unpaid = document.createElement("div");
        unpaid.className = "card-item-label";
        unpaid.textContent = "Em aberto";
        unpaid.style.marginTop = "0.5rem";
        
        const unpaidValue = document.createElement("div");
        unpaidValue.className = "card-item-value";
        unpaidValue.textContent = formatCurrencyFromCents(unpaidTotalCents);

        const available = document.createElement("div");
        available.className = "card-item-label";
        available.textContent = "Disponível";
        available.style.marginTop = "0.5rem";
        
        const availableValue = document.createElement("div");
        availableValue.className = "card-item-value";
        availableValue.style.color = availableCents > 0 ? "var(--success)" : "var(--danger)";
        availableValue.textContent = formatCurrencyFromCents(availableCents);

        const link = document.createElement("button");
        link.className = "button";
        link.style.width = "100%";
        link.style.marginTop = "1rem";
        link.textContent = "Ver faturas";
        link.addEventListener("click", () => {
          navigateTo(`#/app/invoices?cardId=${card.id}&m=${monthState.current}`);
        });

        cardItem.append(title, limit, limitValue, unpaid, unpaidValue, available, availableValue, link);

        const actions = document.createElement("div");
        actions.className = "card-actions-hidden";

        const editBtn = document.createElement("button");
        editBtn.className = "icon-button";
        editBtn.appendChild(createFluentIcon(FluentIcons.Edit));
        editBtn.setAttribute("aria-label", "Editar cartão");
        editBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          openCardModal(card);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-button danger";
        deleteBtn.appendChild(createFluentIcon(FluentIcons.Delete));
        deleteBtn.setAttribute("aria-label", "Excluir cartão");
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm(`Excluir cartão "${card.name}"? Isso não excluirá as transações associadas.`)) {
            try {
              await cardRepository.deleteCard(card.id);
              await renderRoute();
            } catch (error) {
              alert("Não foi possível excluir o cartão.");
            }
          }
        });

        actions.append(editBtn, deleteBtn);
        cardWrapper.append(cardItem, actions);

        // Swipe gesture
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        const handleStart = (e) => {
          startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
          isDragging = true;
          cardItem.style.transition = 'none';
        };

        const handleMove = (e) => {
          if (!isDragging) return;
          currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
          const diff = currentX - startX;
          if (diff < 0) {
            cardItem.style.transform = `translateX(${Math.max(diff, -140)}px)`;
          }
        };

        const handleEnd = () => {
          if (!isDragging) return;
          isDragging = false;
          cardItem.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          const diff = currentX - startX;
          
          if (diff < -60) {
            cardItem.style.transform = 'translateX(-140px)';
            cardWrapper.classList.add('swiped');
          } else {
            cardItem.style.transform = 'translateX(0)';
            cardWrapper.classList.remove('swiped');
          }
        };

        cardItem.addEventListener('mousedown', handleStart);
        cardItem.addEventListener('touchstart', handleStart, { passive: true });
        cardItem.addEventListener('mousemove', handleMove);
        cardItem.addEventListener('touchmove', handleMove, { passive: true });
        cardItem.addEventListener('mouseup', handleEnd);
        cardItem.addEventListener('touchend', handleEnd);
        cardItem.addEventListener('mouseleave', handleEnd);

        cardsGrid.append(cardWrapper);
      })
    );
    cardsSection.append(cardsHeader, cardsGrid);
  }

  appView.append(cardForm, cardsSection);
}

async function renderInvoices() {
  const cardId = getQueryParam("cardId");
  
  // Seletor de cartões
  const cards = await cardRepository.listCards();
  const cardSelectorWrapper = document.createElement("div");
  cardSelectorWrapper.className = "form-group";
  
  const cardSelectorLabel = document.createElement("label");
  cardSelectorLabel.textContent = "Filtrar por cartão";
  cardSelectorLabel.style.fontWeight = "600";
  cardSelectorLabel.style.marginBottom = "0.5rem";
  cardSelectorLabel.style.display = "block";
  
  const cardSelector = document.createElement("select");
  cardSelector.className = "card-filter-select";
  
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Selecione um cartão";
  cardSelector.appendChild(defaultOption);
  
  cards.forEach(card => {
    const option = document.createElement("option");
    option.value = card.id;
    option.textContent = card.name;
    if (card.id === cardId) {
      option.selected = true;
    }
    cardSelector.appendChild(option);
  });
  
  cardSelector.addEventListener("change", async (e) => {
    const selectedCardId = e.target.value;
    if (selectedCardId) {
      navigateTo(`#/app/invoices?cardId=${selectedCardId}`);
    } else {
      navigateTo(`#/app/invoices`);
    }
  });
  
  cardSelectorWrapper.append(cardSelectorLabel, cardSelector);
  appView.append(cardSelectorWrapper);

  if (!cardId) {
    const empty = createCard(
      "Resumo das faturas abertas e pagas.",
      "Use o seletor acima para escolher um cartão e visualizar suas faturas."
    );
    appView.append(empty);
    return;
  }

  const card = await cardRepository.getCard(cardId);
  if (!card) {
    const empty = createCard(
      "Cartão não encontrado",
      "O cartão selecionado não existe ou foi removido."
    );
    appView.append(empty);
    return;
  }
  
  const cardTitle = createCard(
    card.name || "Faturas",
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

  // Remover FAB anterior se existir
  const existingFab = document.querySelector(".fab");
  if (existingFab) {
    existingFab.remove();
  }

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

  // Adicionar FAB para transações em rotas relevantes
  if (["#/app/dashboard", "#/app/transactions"].includes(routeKey)) {
    const fab = document.createElement("button");
    fab.className = "fab";
    fab.appendChild(createFluentIcon(FluentIcons.Add, 24));
    fab.setAttribute("aria-label", "Adicionar transação");
    fab.addEventListener("click", () => openTransactionModal());
    document.body.append(fab);
  }

  updateActiveTab();
}

function normalizeRoute(hash) {
  // Remover query params para normalização
  const baseHash = hash.split('?')[0];
  
  if (baseHash === "#" || baseHash === "") {
    return "#/app/dashboard";
  }
  if (baseHash === "#/dashboard") {
    return "#/app/dashboard";
  }
  if (baseHash === "#/transactions") {
    return "#/app/transactions";
  }
  if (baseHash === "#/cards") {
    return "#/app/cards";
  }
  if (baseHash === "#/invoices" || baseHash === "#/app/invoices") {
    return "#/app/invoices";
  }
  if (baseHash === "#/import") {
    return "#/app/import";
  }
  return baseHash;
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

  async function updateCard(cardId, updates) {
    const uid = getUserId();
    const cardPath = `/users/${uid}/cards/${cardId}`;
    await update(ref(db), {
      [cardPath]: stripUndefined({ ...updates, id: cardId })
    });
  }

  async function deleteCard(cardId) {
    const uid = getUserId();
    await update(ref(db), {
      [`/users/${uid}/cards/${cardId}`]: null
    });
  }

  return {
    createCard,
    listCards,
    getCard,
    updateCard,
    deleteCard,
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
