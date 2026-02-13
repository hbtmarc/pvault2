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
  set,
  serverTimestamp,
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
  "#/app/balanco": {
    title: "Balanço",
    description: "Pagamentos e recebimentos do mês selecionado.",
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
    title: "Ajustes",
    description: "Importe arquivos OFX ou CSV rapidamente.",
  },
};

const categories = {
  gerais: [
    { id: "income", label: "Receitas" },
    { id: "market", label: "Mercado" },
    { id: "shopping", label: "Compras" },
    { id: "transport", label: "Transporte" },
    { id: "restaurants", label: "Restaurantes" },
    { id: "health", label: "Saúde" },
    { id: "utilities", label: "Contas" },
    { id: "housing", label: "Moradia" },
    { id: "education", label: "Educação" },
    { id: "transfers", label: "Transferências" },
  ],
  complementares: [
    { id: "subscriptions", label: "Assinaturas" },
    { id: "leisure", label: "Lazer" },
    { id: "clothing", label: "Vestuário" },
    { id: "investments", label: "Investimentos" },
    { id: "beauty", label: "Beleza" },
    { id: "pets", label: "Pets" },
    { id: "technology", label: "Tecnologia" },
    { id: "travel", label: "Viagens" },
    { id: "gifts", label: "Presentes" },
    { id: "taxes", label: "Impostos" },
    { id: "insurance", label: "Seguros" },
    { id: "gym", label: "Academia" },
    { id: "phone", label: "Telefonia" },
    { id: "work", label: "Trabalho" },
    { id: "donations", label: "Doações" },
    { id: "others", label: "Outros" },
  ],
};

const navItems = [
  { label: "Dashboard", hash: "#/app/dashboard" },
  { label: "Lançamentos", hash: "#/app/transactions" },
  { label: "Balanço", hash: "#/app/balanco" },
  { label: "Cartões", hash: "#/app/cards" },
  { label: "Faturas", hash: "#/app/invoices" },
  { label: "Ajustes", hash: "#/app/import" },
  { label: "Sair", action: "logout" },
];

const monthState = {
  current: "",
};

const authState = {
  user: null,
  ready: false,
};

const settlementState = {
  incomeFilter: "all",
  expenseFilter: "all",
  busy: false,
};

const dashboardState = {
  incomeSort: "date-desc",
  expenseSort: "date-desc",
  invoiceSort: "value-desc",
  incomeGrouped: false,
  expenseGrouped: false,
  invoiceGrouped: false,
};

const merchantRulesState = {
  loaded: false,
  rules: {},
};

const monthStorageKey = "pvault2-month";

// Controle de concorrência para renderização
let renderCounter = 0;
let isRendering = false;

const viewState = {
  routeKey: "",
  refresh: null,
};

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
  Add: "M10 3C10.2761 3 10.5 3.22386 10.5 3.5V9.5H16.5C16.7761 9.5 17 9.72386 17 10C17 10.2761 16.7761 10.5 16.5 10.5H10.5V16.5C10.5 16.7761 10.2761 17 10 17C9.72386 17 9.5 16.7761 9.5 16.5V10.5H3.5C3.22386 10.5 3 10.2761 3 10C3 9.72386 3.22386 9.5 3.5 9.5H9.5V3.5C9.5 3.22386 9.72386 3 10 3Z",
  Calendar: "M14.5 3C14.7761 3 15 3.22386 15 3.5V4H16C17.1046 4 18 4.89543 18 6V16C18 17.1046 17.1046 18 16 18H4C2.89543 18 2 17.1046 2 16V6C2 4.89543 2.89543 4 4 4H5V3.5C5 3.22386 5.22386 3 5.5 3C5.77614 3 6 3.22386 6 3.5V4H14V3.5C14 3.22386 14.2239 3 14.5 3ZM5 5H4C3.44772 5 3 5.44772 3 6V8H17V6C17 5.44772 16.5523 5 16 5H15H14H6H5ZM17 9H3V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V9Z",
  TextSortAscending: "M3.5 3C3.22386 3 3 3.22386 3 3.5C3 3.77614 3.22386 4 3.5 4H11.5C11.7761 4 12 3.77614 12 3.5C12 3.22386 11.7761 3 11.5 3H3.5ZM3 7.5C3 7.22386 3.22386 7 3.5 7H9.5C9.77614 7 10 7.22386 10 7.5C10 7.77614 9.77614 8 9.5 8H3.5C3.22386 8 3 7.77614 3 7.5ZM3.5 11C3.22386 11 3 11.2239 3 11.5C3 11.7761 3.22386 12 3.5 12H7.5C7.77614 12 8 11.7761 8 11.5C8 11.2239 7.77614 11 7.5 11H3.5ZM3 15.5C3 15.2239 3.22386 15 3.5 15H5.5C5.77614 15 6 15.2239 6 15.5C6 15.7761 5.77614 16 5.5 16H3.5C3.22386 16 3 15.7761 3 15.5ZM14.8536 4.14645C14.6583 3.95118 14.3417 3.95118 14.1464 4.14645L11.6464 6.64645C11.4512 6.84171 11.4512 7.15829 11.6464 7.35355C11.8417 7.54882 12.1583 7.54882 12.3536 7.35355L14 5.70711V16.5C14 16.7761 14.2239 17 14.5 17C14.7761 17 15 16.7761 15 16.5V5.70711L16.6464 7.35355C16.8417 7.54882 17.1583 7.54882 17.3536 7.35355C17.5488 7.15829 17.5488 6.84171 17.3536 6.64645L14.8536 4.14645Z",
  TextSortDescending: "M3.5 3C3.22386 3 3 3.22386 3 3.5C3 3.77614 3.22386 4 3.5 4H5.5C5.77614 4 6 3.77614 6 3.5C6 3.22386 5.77614 3 5.5 3H3.5ZM3 7.5C3 7.22386 3.22386 7 3.5 7H7.5C7.77614 7 8 7.22386 8 7.5C8 7.77614 7.77614 8 7.5 8H3.5C3.22386 8 3 7.77614 3 7.5ZM3.5 11C3.22386 11 3 11.2239 3 11.5C3 11.7761 3.22386 12 3.5 12H9.5C9.77614 12 10 11.7761 10 11.5C10 11.2239 9.77614 11 9.5 11H3.5ZM3 15.5C3 15.2239 3.22386 15 3.5 15H11.5C11.7761 15 12 15.2239 12 15.5C12 15.7761 11.7761 16 11.5 16H3.5C3.22386 16 3 15.7761 3 15.5ZM14.8536 15.8536C14.6583 16.0488 14.3417 16.0488 14.1464 15.8536L11.6464 13.3536C11.4512 13.1583 11.4512 12.8417 11.6464 12.6464C11.8417 12.4512 12.1583 12.4512 12.3536 12.6464L14 14.2929V3.5C14 3.22386 14.2239 3 14.5 3C14.7761 3 15 3.22386 15 3.5V14.2929L16.6464 12.6464C16.8417 12.4512 17.1583 12.4512 17.3536 12.6464C17.5488 12.8417 17.5488 13.1583 17.3536 13.3536L14.8536 15.8536Z",
  Money: "M10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7ZM8 10C8 8.89543 8.89543 8 10 8C11.1046 8 12 8.89543 12 10C12 11.1046 11.1046 12 10 12C8.89543 12 8 11.1046 8 10ZM3 6C3 4.34315 4.34315 3 6 3H14C15.6569 3 17 4.34315 17 6V14C17 15.6569 15.6569 17 14 17H6C4.34315 17 3 15.6569 3 14V6ZM6 4C4.89543 4 4 4.89543 4 6V14C4 15.1046 4.89543 16 6 16H14C15.1046 16 16 15.1046 16 14V6C16 4.89543 15.1046 4 14 4H6Z",
  NumberSymbol: "M7.5 3C7.77614 3 8 3.22386 8 3.5V7H11.5V3.5C11.5 3.22386 11.7239 3 12 3C12.2761 3 12.5 3.22386 12.5 3.5V7H16.5C16.7761 7 17 7.22386 17 7.5C17 7.77614 16.7761 8 16.5 8H12.5V12H16.5C16.7761 12 17 12.2239 17 12.5C17 12.7761 16.7761 13 16.5 13H12.5V16.5C12.5 16.7761 12.2761 17 12 17C11.7239 17 11.5 16.7761 11.5 16.5V13H8V16.5C8 16.7761 7.77614 17 7.5 17C7.22386 17 7 16.7761 7 16.5V13H3.5C3.22386 13 3 12.7761 3 12.5C3 12.2239 3.22386 12 3.5 12H7V8H3.5C3.22386 8 3 7.77614 3 7.5C3 7.22386 3.22386 7 3.5 7H7V3.5C7 3.22386 7.22386 3 7.5 3ZM8 8V12H11.5V8H8Z",
  Stack: "M3.5 6C3.22386 6 3 6.22386 3 6.5C3 6.77614 3.22386 7 3.5 7H16.5C16.7761 7 17 6.77614 17 6.5C17 6.22386 16.7761 6 16.5 6H3.5ZM3 10.5C3 10.2239 3.22386 10 3.5 10H16.5C16.7761 10 17 10.2239 17 10.5C17 10.7761 16.7761 11 16.5 11H3.5C3.22386 11 3 10.7761 3 10.5ZM3.5 14C3.22386 14 3 14.2239 3 14.5C3 14.7761 3.22386 15 3.5 15H16.5C16.7761 15 17 14.7761 17 14.5C17 14.2239 16.7761 14 16.5 14H3.5Z"
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

function createSelectWithGroups(labelText, name, groups) {
  const wrapper = document.createElement("label");
  const label = document.createElement("span");
  label.textContent = labelText;
  const select = document.createElement("select");
  select.name = name;
  select.required = true;
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Selecione";
  select.append(emptyOption);
  
  Object.entries(groups).forEach(([groupName, items]) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.label;
      optgroup.append(opt);
    });
    select.append(optgroup);
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

async function setMonth(monthKey) {
  monthState.current = monthKey;
  sessionStorage.setItem(monthStorageKey, monthKey);

  const url = new URL(window.location.href);
  url.searchParams.set("m", monthKey);
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  renderMonthToolbar();
  await refreshCurrentView();
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
  // Ocultar top-bar e month-toolbar
  const topBar = document.querySelector('.top-bar');
  const monthToolbar = document.getElementById('month-toolbar');
  const appView = document.getElementById('app-view');
  
  // Esconder FAB na tela de login
  const fabButton = document.getElementById("fab-new-transaction");
  if (fabButton) {
    fabButton.classList.remove("visible");
  }
  
  if (topBar) topBar.style.display = 'none';
  if (monthToolbar) monthToolbar.style.display = 'none';
  if (appView) {
    appView.style.maxWidth = '460px';
    appView.style.margin = '0 auto';
    appView.style.paddingTop = '0';
    appView.style.minHeight = '100vh';
    appView.style.display = 'flex';
    appView.style.alignItems = 'center';
    appView.style.justifyContent = 'center';
  }
  
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

  const categoryField = createSelectWithGroups(
    "Categoria",
    "categoryId",
    categories
  );
  
  categoryField.select.required = false;
  
  // ============ SEÇÃO CRÉDITO ============
  const creditWrapper = document.createElement("div");
  creditWrapper.className = "credit-section";
  
  const creditLabel = document.createElement("label");
  creditLabel.className = "checkbox";
  const creditCheckbox = document.createElement("input");
  creditCheckbox.type = "checkbox";
  creditCheckbox.id = "credit-checkbox";
  const creditText = document.createElement("span");
  creditText.textContent = "Crédito";
  creditLabel.append(creditCheckbox, creditText);
  
  const creditInputWrapper = document.createElement("div");
  creditInputWrapper.className = "credit-input-wrapper hidden";
  
  // Campos de cartão e fatura dentro do wrapper de crédito
  const cardField = createSelect("Cartão", "cardId", []);
  const invoiceField = createSelect("Mês da fatura", "invoiceMonthKey", []);
  
  invoiceField.wrapper.classList.add("hidden");
  cardField.select.required = false;
  invoiceField.select.required = false;
  
  // Função para calcular automaticamente o mês da fatura
  const autoCalculateInvoiceMonth = async () => {
    const selectedCardId = cardField.select.value.trim();
    const selectedDate = dateField.input.value;
    
    if (!selectedCardId || !selectedDate) return;
    
    // Buscar os cartões disponíveis
    const allCards = await cardRepository.listCards();
    const card = allCards.find(c => c.id === selectedCardId);
    
    if (!card || !card.closingDay) return;
    
    // Calcular qual fatura baseado na data e dia de fechamento
    const txDate = new Date(selectedDate + 'T12:00:00');
    const txDay = txDate.getDate();
    const closingDay = Number(card.closingDay);
    
    let invoiceMonth = txDate.getMonth();
    let invoiceYear = txDate.getFullYear();
    
    // Se a compra foi NO DIA ou DEPOIS do fechamento, vai para a fatura do próximo mês
    if (txDay >= closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 11) {
        invoiceMonth = 0;
        invoiceYear += 1;
      }
    }
    
    const calculatedMonthKey = `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`;
    
    // Selecionar automaticamente o mês calculado
    invoiceField.select.value = calculatedMonthKey;
  };
  
  // Lógica para mostrar/esconder campo de mês da fatura
  const toggleInvoiceField = () => {
    const hasCard = cardField.select.value.trim() !== "";
    if (hasCard) {
      invoiceField.wrapper.classList.remove("hidden");
      autoCalculateInvoiceMonth(); // Calcular automaticamente ao selecionar cartão
    } else {
      invoiceField.wrapper.classList.add("hidden");
      invoiceField.select.value = "";
    }
  };
  
  cardField.select.addEventListener("change", toggleInvoiceField);
  
  // Recalcular fatura quando a data mudar (se já tiver cartão selecionado)
  dateField.input.addEventListener("change", () => {
    if (cardField.select.value.trim() !== "") {
      autoCalculateInvoiceMonth();
    }
  });
  
  // Checkbox para definir se o valor é total ou por parcela
  const totalValueLabel = document.createElement("label");
  totalValueLabel.className = "checkbox";
  totalValueLabel.style.marginTop = "0.75rem";
  totalValueLabel.style.padding = "0.5rem";
  totalValueLabel.style.background = "#f0f9ff";
  totalValueLabel.style.borderRadius = "var(--radius-sm)";
  totalValueLabel.style.border = "1px solid rgba(14, 165, 233, 0.2)";
  totalValueLabel.classList.add("hidden"); // Escondido por padrão
  
  const totalValueCheckbox = document.createElement("input");
  totalValueCheckbox.type = "checkbox";
  totalValueCheckbox.id = "total-value-checkbox";
  totalValueCheckbox.checked = false; // Desmarcado por padrão (dividir valor total)
  
  const totalValueText = document.createElement("span");
  totalValueText.textContent = "Valor por parcela (compra já em andamento)";
  totalValueText.style.fontSize = "0.8125rem";
  
  totalValueLabel.append(totalValueCheckbox, totalValueText);
  
  // Campo de parcelamento dentro do crédito
  const installmentWrapper = document.createElement("div");
  installmentWrapper.className = "installment-section";
  
  const installmentLabel = document.createElement("label");
  installmentLabel.className = "checkbox";
  const installmentCheckbox = document.createElement("input");
  installmentCheckbox.type = "checkbox";
  installmentCheckbox.id = "installment-checkbox";
  const installmentText = document.createElement("span");
  installmentText.textContent = "Compra parcelada";
  installmentLabel.append(installmentCheckbox, installmentText);
  
  const installmentInputWrapper = document.createElement("div");
  installmentInputWrapper.className = "installment-input-wrapper hidden";
  
  const installmentInput = createInput("Número de parcelas", "number", "installments");
  installmentInput.input.min = "2";
  installmentInput.input.max = "36";
  installmentInput.input.placeholder = "Ex: 12";
  installmentInput.input.required = false;
  
  const installmentCurrentInput = createInput("Parcela inicial", "number", "installmentCurrent");
  installmentCurrentInput.input.min = "1";
  installmentCurrentInput.input.value = "1";
  installmentCurrentInput.input.placeholder = "Ex: 1";
  installmentCurrentInput.input.required = false;
  
  const installmentPreview = document.createElement("div");
  installmentPreview.className = "installment-preview";
  
  installmentInputWrapper.append(installmentInput.wrapper, installmentCurrentInput.wrapper, installmentPreview);
  installmentWrapper.append(installmentLabel, installmentInputWrapper);
  
  // Campo de assinatura dentro do crédito
  const subscriptionWrapper = document.createElement("div");
  subscriptionWrapper.className = "subscription-section";
  
  const subscriptionLabel = document.createElement("label");
  subscriptionLabel.className = "checkbox";
  const subscriptionCheckbox = document.createElement("input");
  subscriptionCheckbox.type = "checkbox";
  subscriptionCheckbox.id = "subscription-checkbox";
  const subscriptionText = document.createElement("span");
  subscriptionText.textContent = "Assinatura";
  subscriptionLabel.append(subscriptionCheckbox, subscriptionText);
  
  const subscriptionPreview = document.createElement("div");
  subscriptionPreview.className = "subscription-preview";
  subscriptionPreview.style.fontSize = "0.8125rem";
  subscriptionPreview.style.color = "var(--text-secondary)";
  subscriptionPreview.style.marginTop = "0.5rem";
  subscriptionPreview.style.padding = "0.5rem";
  subscriptionPreview.style.background = "var(--surface)";
  subscriptionPreview.style.borderRadius = "var(--radius-sm)";
  subscriptionPreview.classList.add("hidden");
  
  subscriptionWrapper.append(subscriptionLabel, subscriptionPreview);
  
  // Montar wrapper de crédito
  creditInputWrapper.append(cardField.wrapper, invoiceField.wrapper, totalValueLabel, installmentWrapper, subscriptionWrapper);
  creditWrapper.append(creditLabel, creditInputWrapper);
  
  // Campo de financiamento (apenas para despesas)
  const financingWrapper = document.createElement("div");
  financingWrapper.className = "financing-section hidden";
  
  const financingLabel = document.createElement("label");
  financingLabel.className = "checkbox";
  const financingCheckbox = document.createElement("input");
  financingCheckbox.type = "checkbox";
  financingCheckbox.id = "financing-checkbox";
  const financingText = document.createElement("span");
  financingText.textContent = "Financiamento (parcelas de mesmo valor)";
  financingLabel.append(financingCheckbox, financingText);
  
  const financingInputWrapper = document.createElement("div");
  financingInputWrapper.className = "financing-input-wrapper hidden";
  
  const financingTotalInput = createInput("Total de parcelas", "number", "financingTotal");
  financingTotalInput.input.min = "2";
  financingTotalInput.input.max = "360";
  financingTotalInput.input.placeholder = "Ex: 24";
  financingTotalInput.input.required = false;
  
  const financingCurrentInput = createInput("Parcela inicial", "number", "financingCurrent");
  financingCurrentInput.input.min = "1";
  financingCurrentInput.input.value = "1";
  financingCurrentInput.input.placeholder = "Ex: 1";
  financingCurrentInput.input.required = false;
  
  const financingPreview = document.createElement("div");
  financingPreview.className = "financing-preview";
  
  financingInputWrapper.append(financingTotalInput.wrapper, financingCurrentInput.wrapper, financingPreview);
  financingWrapper.append(financingLabel, financingInputWrapper);
  
  // Garantir que financingInputWrapper comece escondido
  financingInputWrapper.classList.add("hidden");
  
  // Campo de recorrência (receitas)
  const recurrenceWrapper = document.createElement("div");
  recurrenceWrapper.className = "recurrence-section";
  
  const recurrenceLabel = document.createElement("label");
  recurrenceLabel.className = "checkbox";
  const recurrenceCheckbox = document.createElement("input");
  recurrenceCheckbox.type = "checkbox";
  recurrenceCheckbox.id = "recurrence-checkbox";
  const recurrenceText = document.createElement("span");
  recurrenceText.textContent = "Transação recorrente";
  recurrenceLabel.append(recurrenceCheckbox, recurrenceText);
  
  recurrenceWrapper.append(recurrenceLabel);
  
  // ============ LÓGICA DE INTERAÇÃO ENTRE CHECKBOXES ============
  
  // Crédito
  creditCheckbox.addEventListener("change", () => {
    creditInputWrapper.classList.toggle("hidden", !creditCheckbox.checked);
    if (!creditCheckbox.checked) {
      cardField.select.value = "";
      invoiceField.select.value = "";
      invoiceField.wrapper.classList.add("hidden");
      installmentCheckbox.checked = false;
      installmentInputWrapper.classList.add("hidden");
      totalValueLabel.classList.add("hidden"); // Esconder checkbox de valor
      totalValueCheckbox.checked = false; // Resetar checkbox
      installmentInput.input.value = "";
      installmentCurrentInput.input.value = "1";
      installmentPreview.textContent = "";
      subscriptionCheckbox.checked = false;
      subscriptionPreview.classList.add("hidden");
      subscriptionPreview.textContent = "";
    } else {
      // Se crédito for marcado, desmarcar financiamento e recorrência
      financingCheckbox.checked = false;
      recurrenceCheckbox.checked = false;
      financingInputWrapper.classList.add("hidden");
      financingTotalInput.input.value = "";
      financingCurrentInput.input.value = "1";
      financingPreview.textContent = "";
    }
  });
  
  // Parcelamento
  installmentCheckbox.addEventListener("change", () => {
    const isChecked = installmentCheckbox.checked;
    installmentInputWrapper.classList.toggle("hidden", !isChecked);
    totalValueLabel.classList.toggle("hidden", !isChecked); // Mostrar/esconder checkbox de valor
    
    if (!isChecked) {
      installmentInput.input.value = "";
      installmentCurrentInput.input.value = "1";
      installmentPreview.textContent = "";
      totalValueCheckbox.checked = false; // Resetar ao desmarcar parcelamento
    } else {
      // Se parcelamento for marcado, desmarcar assinatura
      subscriptionCheckbox.checked = false;
      subscriptionPreview.classList.add("hidden");
      subscriptionPreview.textContent = "";
    }
  });
  
  // Assinatura
  subscriptionCheckbox.addEventListener("change", () => {
    const isChecked = subscriptionCheckbox.checked;
    
    if (isChecked) {
      // Se assinatura for marcada, desmarcar parcelamento
      installmentCheckbox.checked = false;
      installmentInputWrapper.classList.add("hidden");
      totalValueLabel.classList.add("hidden");
      installmentInput.input.value = "";
      installmentCurrentInput.input.value = "1";
      installmentPreview.textContent = "";
      totalValueCheckbox.checked = false;
      
      // Mostrar preview
      subscriptionPreview.classList.remove("hidden");
      subscriptionPreview.textContent = "📅 Será criada automaticamente por 12 meses nas próximas faturas";
    } else {
      subscriptionPreview.classList.add("hidden");
      subscriptionPreview.textContent = "";
    }
  });
  
  // Recorrência
  recurrenceCheckbox.addEventListener("change", () => {
    if (recurrenceCheckbox.checked) {
      creditCheckbox.checked = false;
      financingCheckbox.checked = false;
      creditInputWrapper.classList.add("hidden");
      financingInputWrapper.classList.add("hidden");
      cardField.select.value = "";
      invoiceField.select.value = "";
      invoiceField.wrapper.classList.add("hidden");
      installmentCheckbox.checked = false;
      installmentInputWrapper.classList.add("hidden");
      installmentInput.input.value = "";
      installmentCurrentInput.input.value = "1";
      installmentPreview.textContent = "";
      financingTotalInput.input.value = "";
      financingCurrentInput.input.value = "1";
      financingPreview.textContent = "";
    }
  });
  
  // Financiamento
  financingCheckbox.addEventListener("change", () => {
    financingInputWrapper.classList.toggle("hidden", !financingCheckbox.checked);
    if (!financingCheckbox.checked) {
      financingTotalInput.input.value = "";
      financingCurrentInput.input.value = "1";
      financingPreview.textContent = "";
    } else {
      // Se financiamento for marcado, desmarcar crédito e recorrência
      creditCheckbox.checked = false;
      recurrenceCheckbox.checked = false;
      creditInputWrapper.classList.add("hidden");
      cardField.select.value = "";
      invoiceField.select.value = "";
      invoiceField.wrapper.classList.add("hidden");
      installmentCheckbox.checked = false;
      installmentInputWrapper.classList.add("hidden");
      installmentInput.input.value = "";
      installmentCurrentInput.input.value = "1";
      installmentPreview.textContent = "";
    }
  });
  
  // Mostrar/ocultar opção de crédito apenas para despesas
  const toggleCreditOption = () => {
    const isExpense = kindField.select.value === "expense";
    creditWrapper.classList.toggle("hidden", !isExpense);
    
    if (!isExpense) {
      creditCheckbox.checked = false;
      creditInputWrapper.classList.add("hidden");
      cardField.select.value = "";
      invoiceField.select.value = "";
      invoiceField.wrapper.classList.add("hidden");
      installmentCheckbox.checked = false;
      installmentInputWrapper.classList.add("hidden");
      totalValueLabel.classList.add("hidden"); // Esconder checkbox de valor
      totalValueCheckbox.checked = false; // Resetar checkbox
      installmentInput.input.value = "";
      installmentCurrentInput.input.value = "1";
      installmentPreview.textContent = "";
    }
  };
  
  // Mostrar/ocultar opção de financiamento apenas para despesas
  const toggleFinancingOption = () => {
    const isExpense = kindField.select.value === "expense";
    financingWrapper.classList.toggle("hidden", !isExpense);
    
    if (!isExpense) {
      financingCheckbox.checked = false;
      financingInputWrapper.classList.add("hidden");
      financingTotalInput.input.value = "";
      financingCurrentInput.input.value = "1";
      financingPreview.textContent = "";
    }
  };
  
  kindField.select.addEventListener("change", () => {
    toggleCreditOption();
    toggleFinancingOption();
  });
  
  const updateInstallmentPreview = () => {
    const amount = parseFloat(amountField.input.value) || 0;
    const installments = parseInt(installmentInput.input.value) || 0;
    const current = parseInt(installmentCurrentInput.input.value) || 1;
    const isPerInstallment = totalValueCheckbox?.checked || false;
    
    if (amount > 0 && installments >= 2 && current >= 1 && current <= installments) {
      let installmentValue, lastInstallment, totalValue;
      
      if (isPerInstallment) {
        // Checkbox MARCADO: Valor informado é por parcela (compra antiga)
        // Cada parcela = valor digitado, não divide
        installmentValue = amount;
        lastInstallment = amount;
        totalValue = amount * installments;
      } else {
        // Checkbox DESMARCADO (padrão): Valor total que será dividido
        installmentValue = amount / installments;
        lastInstallment = amount - (installmentValue * (installments - 1));
        totalValue = amount;
      }
      
      const remaining = installments - current + 1;
      
      installmentPreview.innerHTML = `
        <strong>Parcela ${current}/${installments}</strong> • Valor: <strong>${formatCurrency(installmentValue)}</strong><br>
        <small>${!isPerInstallment ? 'Total da compra: ' + formatCurrency(totalValue) + ' • ' : ''}Serão criadas ${remaining} parcela(s) de ${formatCurrency(installmentValue)} cada</small>
        ${Math.abs(lastInstallment - installmentValue) > 0.01 ? 
          `<br><small>Última parcela: ${formatCurrency(lastInstallment)}</small>` : ''}
      `;
    } else {
      installmentPreview.textContent = "";
    }
  };
  
  const updateFinancingPreview = () => {
    const amount = parseFloat(amountField.input.value) || 0;
    const total = parseInt(financingTotalInput.input.value) || 0;
    const current = parseInt(financingCurrentInput.input.value) || 1;
    
    if (amount > 0 && total >= 2 && current >= 1 && current <= total) {
      const remaining = total - current + 1;
      financingPreview.innerHTML = `
        <strong>Parcela ${current}/${total}</strong> • Valor: <strong>${formatCurrency(amount)}</strong><br>
        <small>Serão criadas ${remaining} parcela(s) de ${formatCurrency(amount)} cada</small>
      `;
    } else {
      financingPreview.textContent = "";
    }
  };
  
  amountField.input.addEventListener("input", () => {
    updateInstallmentPreview();
    updateFinancingPreview();
  });
  installmentInput.input.addEventListener("input", updateInstallmentPreview);
  installmentCurrentInput.input.addEventListener("input", updateInstallmentPreview);
  totalValueCheckbox.addEventListener("change", updateInstallmentPreview);
  financingTotalInput.input.addEventListener("input", updateFinancingPreview);
  financingCurrentInput.input.addEventListener("input", updateFinancingPreview);

  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  feedback.textContent = "";

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
    creditWrapper,
    financingWrapper,
    recurrenceWrapper,
    feedback,
    actions
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    
    const installments = installmentCheckbox.checked ? parseInt(installmentInput.input.value) || 0 : 0;
    const installmentCurrent = installmentCheckbox.checked ? parseInt(installmentCurrentInput.input.value) || 1 : 1;
    const isRecurrent = recurrenceCheckbox.checked;
    const isSubscription = subscriptionCheckbox.checked;
    const isFinancing = financingCheckbox.checked;
    const financingTotal = isFinancing ? parseInt(financingTotalInput.input.value) || 0 : 0;
    const financingCurrent = isFinancing ? parseInt(financingCurrentInput.input.value) || 1 : 1;
    
    // Validações
    if (installments > 0 && (installments < 2 || installments > 36)) {
      feedback.textContent = "Número de parcelas deve ser entre 2 e 36.";
      return;
    }
    
    if (installments > 0 && (installmentCurrent < 1 || installmentCurrent > installments)) {
      feedback.textContent = "Parcela inicial inválida.";
      return;
    }
    
    if (isFinancing && (financingTotal < 2 || financingTotal > 360)) {
      feedback.textContent = "Total de parcelas do financiamento deve ser entre 2 e 360.";
      return;
    }
    
    if (isFinancing && (financingCurrent < 1 || financingCurrent > financingTotal)) {
      feedback.textContent = "Parcela inicial inválida.";
      return;
    }
    
    // Validar assinatura (requer cartão)
    if (isSubscription && !cardField.select.value) {
      feedback.textContent = "Assinatura requer um cartão de crédito.";
      return;
    }
    
    // Ajustar valor para parcelamento conforme checkbox
    const originalAmount = parseFloat(amountField.input.value) || 0;
    let finalAmount = originalAmount;
    
    // Se for parcelado, verificar o tipo de valor
    if (installments > 0) {
      const isPerInstallment = totalValueCheckbox?.checked || false;
      
      if (isPerInstallment) {
        // Checkbox MARCADO: valor digitado é por parcela
        // Multiplicar pelo total de parcelas para que quando o sistema dividir,
        // cada parcela fique com o valor original
        finalAmount = originalAmount * installments;
      }
      // Se checkbox DESMARCADO (padrão): valor já é o total, não precisa ajustar
    }
    
    const payload = buildTransactionPayload({
      date: dateField.input,
      description: descriptionField.input,
      amount: { value: finalAmount.toString() },
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
      
      // IMPORTANTE: Ao editar transação, NÃO criar novas parcelas/financiamentos/recorrências
      // Apenas atualizar a transação individual
      const isEditing = transactionModal?.txId;
      const editingTx = transactionModal?.txData || null;

      if (!isEditing && payload.kind === "expense" && payload.cardId) {
        const cardInfo = await cardRepository.getCard(payload.cardId);
        const cardLimitCents = Number(cardInfo?.limitCents) || 0;

        const projection = await computeCardInvoiceProjection(payload.cardId);
        const unpaidTotalCents = projection.monthData.reduce((sum, item) => {
          if (item.paid) return sum;
          return sum + (projection.adjustedMap[item.monthKey] || 0);
        }, 0);

        const plannedAddTotalCents = (() => {
          const baseAmountCents = Math.round(finalAmount * 100);
          if (installments > 1) {
            return baseAmountCents; // total da compra parcelada
          }
          return baseAmountCents; // assinatura conta apenas a competência atual
        })();

        const availableBefore = cardLimitCents - unpaidTotalCents;
        if (availableBefore <= 0) {
          feedback.textContent = "Cartão sem limite disponível.";
          return;
        }
        if (plannedAddTotalCents > availableBefore) {
          const missingCents = plannedAddTotalCents - Math.max(availableBefore, 0);
          feedback.textContent = `Cartão sem limite disponível. Falta ${formatCurrencyFromCents(missingCents)} para registrar esta despesa.`;
          return;
        }
      }
      
      if (!isEditing) {
        // Apenas para NOVAS transações: adicionar notações de agrupamento
        
        // Se for parcelado, adicionar notação de parcela à descrição
        if (installments > 1 && payload.cardId && payload.kind === "expense") {
          // O sistema detecta automaticamente a notação "X/Y" na descrição
          payload.description = `${payload.description} ${installmentCurrent}/${installments}`;
        }
        
        // Se for assinatura, adicionar notação
        if (isSubscription && payload.cardId && payload.kind === "expense") {
          payload.description = `${payload.description} [SUB]`;
        }
        
        // Se for financiamento, adicionar notação
        if (isFinancing && payload.kind === "expense") {
          payload.description = `${payload.description} [FIN:${financingCurrent}/${financingTotal}]`;
        }
        
        // Se for recorrente, marcar na descrição para criar 12 meses
        if (isRecurrent) {
          payload.description = `${payload.description} [REC]`;
        }
      }
      
      // Criar ou atualizar transação
      if (isEditing) {
        const isGroupedEdit = Boolean(
          editingTx && (editingTx.installment || editingTx.financing || editingTx.subscription || editingTx.recurrence)
        );
        if (isGroupedEdit) {
          const applyFuture = confirm(
            "Deseja aplicar esta alteração somente nesta transação?\n\nOK: aplicar nesta e nas futuras\nCancelar: aplicar somente nesta"
          );

          await transactionRepository.updateTransaction(
            transactionModal.txId,
            payload
          );

          if (applyFuture) {
            const groupPatch = {
              description: payload.description,
              amount: payload.amount,
              categoryId: payload.categoryId,
              kind: payload.kind,
            };
            await transactionRepository.updateFutureGroupedTransactions(
              editingTx,
              groupPatch,
              { includeCurrent: false }
            );
          }
        } else {
          await transactionRepository.updateTransaction(
            transactionModal.txId,
            payload
          );
        }
      } else {
        await transactionRepository.createTransaction(payload);
      }
      
      closeTransactionModal();
      await refreshCurrentView();
    } catch (error) {
      console.error('Error saving transaction:', error);
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

function showInstallmentDeleteModal(tx) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.maxWidth = "400px";

  const title = document.createElement("h2");
  title.textContent = "Excluir parcela";

  const description = document.createElement("p");
  description.style.marginBottom = "1.5rem";
  description.style.color = "var(--text-secondary)";
  description.textContent = `Esta é a parcela ${tx.installment.current}/${tx.installment.total} de "${tx.description}". O que deseja fazer?`;

  const btnContainer = document.createElement("div");
  btnContainer.style.display = "flex";
  btnContainer.style.gap = "0.75rem";
  btnContainer.style.flexDirection = "column";

  const deleteCurrentBtn = createButton("Excluir apenas esta parcela", { variant: "secondary" });
  deleteCurrentBtn.addEventListener("click", async () => {
    if (confirm(`Excluir apenas a parcela ${tx.installment.current}/${tx.installment.total}?`)) {
      await transactionRepository.deleteTransaction(tx.id);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const deleteFutureBtn = createButton("Excluir esta e todas as futuras", { variant: "danger" });
  deleteFutureBtn.addEventListener("click", async () => {
    const remaining = tx.installment.total - tx.installment.current + 1;
    if (confirm(`Excluir ${remaining} parcela(s) (da ${tx.installment.current} até a ${tx.installment.total})?`)) {
      await transactionRepository.deleteFutureInstallments(tx);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const cancelBtn = createButton("Cancelar", { variant: "secondary" });
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  btnContainer.append(deleteCurrentBtn, deleteFutureBtn, cancelBtn);
  modal.append(title, description, btnContainer);
  overlay.appendChild(modal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  document.body.appendChild(overlay);
}

function showRecurrenceDeleteModal(tx) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.maxWidth = "400px";

  const title = document.createElement("h2");
  title.textContent = "Excluir recorrência";

  const description = document.createElement("p");
  description.style.marginBottom = "1.5rem";
  description.style.color = "var(--text-secondary)";
  description.textContent = `Esta é a recorrência ${tx.recurrence.current}/${tx.recurrence.total} de "${tx.description}". O que deseja fazer?`;

  const btnContainer = document.createElement("div");
  btnContainer.style.display = "flex";
  btnContainer.style.gap = "0.75rem";
  btnContainer.style.flexDirection = "column";

  const deleteCurrentBtn = createButton("Excluir apenas esta", { variant: "secondary" });
  deleteCurrentBtn.addEventListener("click", async () => {
    if (confirm(`Excluir apenas a recorrência ${tx.recurrence.current}/${tx.recurrence.total}?`)) {
      await transactionRepository.deleteTransaction(tx.id);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const deleteFutureBtn = createButton("Excluir esta e todas as futuras", { variant: "danger" });
  deleteFutureBtn.addEventListener("click", async () => {
    const remaining = tx.recurrence.total - tx.recurrence.current + 1;
    if (confirm(`Excluir ${remaining} recorrência(s) (da ${tx.recurrence.current} até a ${tx.recurrence.total})?`)) {
      await transactionRepository.deleteFutureRecurrences(tx);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const cancelBtn = createButton("Cancelar", { variant: "secondary" });
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  btnContainer.append(deleteCurrentBtn, deleteFutureBtn, cancelBtn);
  modal.append(title, description, btnContainer);
  overlay.appendChild(modal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  document.body.appendChild(overlay);
}

function showSubscriptionDeleteModal(tx) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.maxWidth = "400px";

  const title = document.createElement("h2");
  title.textContent = "Excluir assinatura";

  const description = document.createElement("p");
  description.style.marginBottom = "1.5rem";
  description.style.color = "var(--text-secondary)";
  description.textContent = `Esta é o mês ${tx.subscription.current}/${tx.subscription.total} da assinatura "${tx.description}". O que deseja fazer?`;

  const btnContainer = document.createElement("div");
  btnContainer.style.display = "flex";
  btnContainer.style.gap = "0.75rem";
  btnContainer.style.flexDirection = "column";

  const deleteCurrentBtn = createButton("Excluir apenas este mês", { variant: "secondary" });
  deleteCurrentBtn.addEventListener("click", async () => {
    if (confirm(`Excluir apenas o mês ${tx.subscription.current}/${tx.subscription.total} desta assinatura?`)) {
      await transactionRepository.deleteTransaction(tx.id);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const deleteFutureBtn = createButton("Cancelar assinatura (excluir este e futuros)", { variant: "danger" });
  deleteFutureBtn.addEventListener("click", async () => {
    const remaining = tx.subscription.total - tx.subscription.current + 1;
    if (confirm(`Cancelar assinatura? Serão excluídos ${remaining} mês(es) (do ${tx.subscription.current} até o ${tx.subscription.total})`)) {
      await transactionRepository.deleteFutureSubscriptions(tx);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const cancelBtn = createButton("Voltar", { variant: "secondary" });
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  btnContainer.append(deleteCurrentBtn, deleteFutureBtn, cancelBtn);
  modal.append(title, description, btnContainer);
  overlay.appendChild(modal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  document.body.appendChild(overlay);
}

function showFinancingDeleteModal(tx) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.maxWidth = "400px";

  const title = document.createElement("h2");
  title.textContent = "Excluir parcela de financiamento";

  const description = document.createElement("p");
  description.style.marginBottom = "1.5rem";
  description.style.color = "var(--text-secondary)";
  description.textContent = `Esta é a parcela ${tx.financing.current}/${tx.financing.total} de "${tx.description}". O que deseja fazer?`;

  const btnContainer = document.createElement("div");
  btnContainer.style.display = "flex";
  btnContainer.style.gap = "0.75rem";
  btnContainer.style.flexDirection = "column";

  const deleteCurrentBtn = createButton("Excluir apenas esta parcela", { variant: "secondary" });
  deleteCurrentBtn.addEventListener("click", async () => {
    if (confirm(`Excluir apenas a parcela ${tx.financing.current}/${tx.financing.total}?`)) {
      await transactionRepository.deleteTransaction(tx.id);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const deleteFutureBtn = createButton("Excluir esta e todas as futuras", { variant: "danger" });
  deleteFutureBtn.addEventListener("click", async () => {
    const remaining = tx.financing.total - tx.financing.current + 1;
    if (confirm(`Excluir ${remaining} parcela(s) (da ${tx.financing.current} até a ${tx.financing.total})?`)) {
      await transactionRepository.deleteFutureFinancings(tx);
      document.body.removeChild(overlay);
      await refreshCurrentView();
    }
  });

  const cancelBtn = createButton("Cancelar", { variant: "secondary" });
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  btnContainer.append(deleteCurrentBtn, deleteFutureBtn, cancelBtn);
  modal.append(title, description, btnContainer);
  overlay.appendChild(modal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  document.body.appendChild(overlay);
}

async function openTransactionModal(tx = null, options = {}) {
  if (!transactionModal) {
    transactionModal = createTransactionModal();
  }
  const modal = transactionModal;
  modal.txId = tx?.id || null;
  modal.txData = tx || null;
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
    // Se é no dia ou depois do fechamento, fatura do próximo mês
    let invoiceMonth = txDate.getMonth();
    let invoiceYear = txDate.getFullYear();
    
    if (txDay >= closingDay) {
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
  modal.fields.cardId.value = tx?.cardId || options.defaultCard || "";
  modal.fields.invoiceMonthKey.value = tx?.invoiceMonthKey || options.defaultInvoiceMonth || "";
  modal.feedback.textContent = "";
  
  // Atualizar visibilidade dos campos condicionais baseado nos valores
  const updateConditionalFields = () => {
    const isExpense = modal.fields.kind.value === "expense";
    
    // Mostrar/esconder crédito baseado em despesa
    const creditSection = document.querySelector(".credit-section");
    if (creditSection) {
      if (isExpense) {
        creditSection.classList.remove("hidden");
      } else {
        creditSection.classList.add("hidden");
      }
    }
    
    // Mostrar/esconder financiamento baseado em despesa
    const financingSection = document.querySelector(".financing-section");
    if (financingSection) {
      if (isExpense) {
        financingSection.classList.remove("hidden");
      } else {
        financingSection.classList.add("hidden");
      }
    }
  };
  
  // Executar ao abrir modal
  updateConditionalFields();
  
  // Verificar se a transação faz parte de um grupo (parcela, financiamento, assinatura ou recorrência)
  const isPartOfGroup = tx && (tx.installment || tx.financing || tx.subscription || tx.recurrence);
  
  // Limpar checkboxes e campos extras quando for nova transação
  // OU desabilitar se for edição de transação agrupada
  if (!tx) {
    // Remover avisos anteriores se existirem
    const oldWarning = modal.form.querySelector(".grouped-transaction-warning");
    if (oldWarning) oldWarning.remove();
    
    const creditCheckbox = document.getElementById("credit-checkbox");
    const installmentCheckbox = document.getElementById("installment-checkbox");
    const subscriptionCheckbox = document.getElementById("subscription-checkbox");
    const financingCheckbox = document.getElementById("financing-checkbox");
    const recurrenceCheckbox = document.getElementById("recurrence-checkbox");
    
    if (creditCheckbox) creditCheckbox.checked = false;
    if (installmentCheckbox) installmentCheckbox.checked = false;
    if (subscriptionCheckbox) subscriptionCheckbox.checked = false;
    if (financingCheckbox) financingCheckbox.checked = false;
    if (recurrenceCheckbox) recurrenceCheckbox.checked = false;
    
    // Esconder wrappers de inputs extras
    const creditInputWrapper = document.querySelector(".credit-input-wrapper");
    const installmentInputWrapper = document.querySelector(".installment-input-wrapper");
    const financingInputWrapper = document.querySelector(".financing-input-wrapper");
    const totalValueLabel = document.getElementById("total-value-checkbox")?.parentElement;
    
    if (creditInputWrapper) creditInputWrapper.classList.add("hidden");
    if (installmentInputWrapper) installmentInputWrapper.classList.add("hidden");
    if (financingInputWrapper) financingInputWrapper.classList.add("hidden");
    if (totalValueLabel) totalValueLabel.classList.add("hidden");
    
    // Limpar valores dos campos extras
    const installmentInput = document.querySelector("input[name='installments']");
    const financingTotalInput = document.querySelector("input[name='financingTotal']");
    const financingCurrentInput = document.querySelector("input[name='financingCurrent']");
    const totalValueCheckbox = document.getElementById("total-value-checkbox");
    
    if (installmentInput) installmentInput.value = "";
    if (financingTotalInput) financingTotalInput.value = "";
    if (financingCurrentInput) financingCurrentInput.value = "1";
    if (totalValueCheckbox) totalValueCheckbox.checked = false;
    
    // Limpar previews
    const installmentPreview = document.querySelector(".installment-preview");
    const financingPreview = document.querySelector(".financing-preview");
    
    if (installmentPreview) installmentPreview.textContent = "";
    if (financingPreview) financingPreview.textContent = "";
  } else if (isPartOfGroup) {
    // Se está editando uma transação agrupada, desabilitar opções de agrupamento
    const creditCheckbox = document.getElementById("credit-checkbox");
    const installmentCheckbox = document.getElementById("installment-checkbox");
    const subscriptionCheckbox = document.getElementById("subscription-checkbox");
    const financingCheckbox = document.getElementById("financing-checkbox");
    const recurrenceCheckbox = document.getElementById("recurrence-checkbox");
    
    // Desabilitar checkboxes para evitar criação de novos grupos
    if (creditCheckbox) {
      creditCheckbox.disabled = true;
      creditCheckbox.checked = false;
    }
    if (installmentCheckbox) {
      installmentCheckbox.disabled = true;
      installmentCheckbox.checked = false;
    }
    if (subscriptionCheckbox) {
      subscriptionCheckbox.disabled = true;
      subscriptionCheckbox.checked = false;
    }
    if (financingCheckbox) {
      financingCheckbox.disabled = true;
      financingCheckbox.checked = false;
    }
    if (recurrenceCheckbox) {
      recurrenceCheckbox.disabled = true;
      recurrenceCheckbox.checked = false;
    }
    
    // Adicionar aviso ao usuário
    const warningMsg = document.createElement("div");
    warningMsg.className = "grouped-transaction-warning"; // Classe para identificar e remover depois
    warningMsg.style.padding = "0.75rem";
    warningMsg.style.background = "#fef3c7";
    warningMsg.style.border = "1px solid #f59e0b";
    warningMsg.style.borderRadius = "var(--radius-sm)";
    warningMsg.style.marginBottom = "1rem";
    warningMsg.style.fontSize = "0.875rem";
    warningMsg.style.color = "#92400e";
    warningMsg.innerHTML = `
      <strong>⚠️ Transação Agrupada</strong><br>
      Esta transação faz parte de um ${tx.installment ? 'parcelamento' : tx.financing ? 'financiamento' : tx.subscription ? 'assinatura' : 'grupo recorrente'}.<br>
      Ao salvar, você poderá aplicar a alteração somente nesta ou também nas futuras.
    `;
    
    // Remover avisos anteriores se existirem
    const oldWarning = modal.form.querySelector(".grouped-transaction-warning");
    if (oldWarning) oldWarning.remove();
    
    modal.form.insertBefore(warningMsg, modal.form.firstChild);
  } else {
    // Edição de transação simples - habilitar todos os checkboxes
    const creditCheckbox = document.getElementById("credit-checkbox");
    const installmentCheckbox = document.getElementById("installment-checkbox");
    const subscriptionCheckbox = document.getElementById("subscription-checkbox");
    const financingCheckbox = document.getElementById("financing-checkbox");
    const recurrenceCheckbox = document.getElementById("recurrence-checkbox");
    
    if (creditCheckbox) creditCheckbox.disabled = false;
    if (installmentCheckbox) installmentCheckbox.disabled = false;
    if (subscriptionCheckbox) subscriptionCheckbox.disabled = false;
    if (financingCheckbox) financingCheckbox.disabled = false;
    if (recurrenceCheckbox) recurrenceCheckbox.disabled = false;
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
      await refreshCurrentView();
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
  // Calcular o monthKey baseado na data da transação, não no mês visualizado
  const transactionDate = new Date(fields.date.value + 'T12:00:00');
  const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
  
  const payload = {
    date: fields.date.value,
    description: fields.description.value.trim(),
    amount: Number(fields.amount.value),
    kind: fields.kind.value,
    categoryId: fields.categoryId.value || undefined,
    cardId: fields.cardId.value.trim() || undefined,
    invoiceMonthKey: fields.invoiceMonthKey.value || undefined,
    monthKey: monthKey,
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
  // Calcular o monthKey baseado na data da transação, não no mês visualizado
  let monthKey;
  if (data.date) {
    const transactionDate = new Date(data.date + 'T12:00:00');
    monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
  } else {
    // Fallback para mês atual se não houver data
    monthKey = monthState.current;
  }
  
  return stripUndefined({
    date: data.date,
    description: data.description,
    amount: data.amount,
    kind: data.kind,
    categoryId: data.categoryId,
    cardId: data.cardId,
    invoiceMonthKey: data.invoiceMonthKey,
    monthKey: monthKey,
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
  const allCategories = [...categories.gerais, ...categories.complementares];
  const found = allCategories.find((item) => item.id === categoryId);
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

function parseRecurrence(description) {
  if (!description) {
    return null;
  }
  const match = description.match(/\[REC\]/);
  if (!match) {
    return null;
  }
  // Retornar objeto indicando recorrência de 12 meses
  return { current: 1, total: 12 };
}

function parseSubscription(description) {
  if (!description) {
    return null;
  }
  const match = description.match(/\[SUB\]/);
  if (!match) {
    return null;
  }
  // Retornar objeto indicando assinatura de 12 meses
  return { current: 1, total: 12 };
}

function parseFinancing(description) {
  if (!description) {
    return null;
  }
  const match = description.match(/\[FIN:(\d{1,3})\/(\d{1,3})\]/);
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
  // Para evitar problema de timezone, criar data local parseando manualmente
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("pt-BR");
}

function getTransactionMeta(tx, cardName = null) {
  const category = getCategoryLabel(tx.categoryId);
  const metaParts = [];
  if (cardName) {
    metaParts.push(cardName);
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

function getTransactionTimestamp(tx) {
  return new Date(tx?.date || 0).getTime() || 0;
}

function sortTransactionsByMode(items, sortType) {
  const sorted = [...items];

  switch (sortType) {
    case "alpha-asc":
      return sorted.sort((a, b) =>
        (a.description || "").localeCompare(b.description || "", "pt-BR", {
          sensitivity: "base",
          numeric: true,
        })
      );
    case "alpha-desc":
      return sorted.sort((a, b) =>
        (b.description || "").localeCompare(a.description || "", "pt-BR", {
          sensitivity: "base",
          numeric: true,
        })
      );
    case "value-asc":
      return sorted.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
    case "value-desc":
      return sorted.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    case "installment-asc":
      return sorted.sort((a, b) => (a.installment?.current || 0) - (b.installment?.current || 0));
    case "installment-desc":
      return sorted.sort((a, b) => (b.installment?.current || 0) - (a.installment?.current || 0));
    case "date-asc":
      return sorted.sort((a, b) => getTransactionTimestamp(a) - getTransactionTimestamp(b));
    case "date-desc":
    default:
      return sorted.sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
  }
}

function normalizeDescriptionForGrouping(description) {
  const normalized = (description || "Sem descrição")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, "");

  return normalized || "semdescricao";
}

function resolveGroupingDescriptor(rawDescription) {
  const description = (rawDescription || "Sem descrição")
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ") || "Sem descrição";

  const sourceMatch = description.match(/^(.+?)\s*[-–—:]\s+(.+)$/);
  if (sourceMatch) {
    const source = sourceMatch[1].trim();
    const detail = sourceMatch[2].trim();
    const sourceKey = normalizeDescriptionForGrouping(source);
    if (sourceKey && sourceKey !== "semdescricao") {
      return {
        key: `source:${sourceKey}`,
        label: `${source} -`,
        sourceDetail: detail,
        groupingType: "source",
      };
    }
  }

  return {
    key: `full:${normalizeDescriptionForGrouping(description)}`,
    label: description,
    sourceDetail: null,
    groupingType: "full",
  };
}

function groupTransactionsByDescription(transactions) {
  const groups = new Map();

  transactions.forEach((tx) => {
    const descriptor = resolveGroupingDescriptor(tx.description);
    const description = descriptor.label;
    const key = descriptor.key;
    const txTimestamp = getTransactionTimestamp(tx);

    if (!groups.has(key)) {
      groups.set(key, {
        description,
        amount: 0,
        count: 0,
        transactions: [],
        sourceDetails: new Set(),
        _groupingType: descriptor.groupingType,
        kind: tx.kind,
        cardId: tx.cardId,
        invoiceMonthKey: tx.invoiceMonthKey,
        categoryId: tx.categoryId,
        date: tx.date,
        installment: tx.installment,
        _latestTimestamp: txTimestamp,
        _isGrouped: true,
      });
    }

    const group = groups.get(key);
    group.amount += Number(tx.amount) || 0;
    group.count += 1;
    group.transactions.push(tx);
    if (descriptor.sourceDetail) {
      group.sourceDetails.add(descriptor.sourceDetail);
    }

    if (txTimestamp > group._latestTimestamp) {
      group._latestTimestamp = txTimestamp;
      group.date = tx.date;
    }
  });

  return Array.from(groups.values()).map((group) => {
    if (group._groupingType === "source" && group.sourceDetails.size) {
      const details = Array.from(group.sourceDetails)
        .map((detail) => detail.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true }));
      if (details.length) {
        group.description = `${group.description} (${details.join("/")})`;
      }
    }

    delete group.sourceDetails;
    delete group._groupingType;
    delete group._latestTimestamp;
    return group;
  });
}

function sortCardsByName(cards) {
  const normalize = (value) =>
    (value || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  return [...cards].sort((a, b) => {
    const nameA = normalize(a?.name);
    const nameB = normalize(b?.name);
    const byName = nameA.localeCompare(nameB, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    });
    if (byName !== 0) return byName;
    return (a?.id || "").localeCompare(b?.id || "");
  });
}

async function renderTransactionList(title, items, options = {}) {
  const wrapper = document.createElement("section");
  wrapper.className = "card";
  const heading = document.createElement("h2");
  heading.textContent = title;

  const headerRow = document.createElement("div");
  headerRow.className = "list-header";
  headerRow.appendChild(heading);

  const subtotalValue = document.createElement("div");
  subtotalValue.className = "list-subtotal";
  if (typeof options.subtotalValue === "number") {
    subtotalValue.textContent = formatCurrency(options.subtotalValue);
  }

  const list = document.createElement("div");
  list.className = "transaction-list";

  const isGroupedView = Boolean(options.groupControls?.isGrouped);
  const currentSortMode = options.sortControls?.currentSort;

  let itemsToRender = [...items];
  if (isGroupedView) {
    itemsToRender = groupTransactionsByDescription(itemsToRender);
  }
  if (currentSortMode) {
    itemsToRender = sortTransactionsByMode(itemsToRender, currentSortMode);
  }

  if (!itemsToRender.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum lançamento encontrado.";
    wrapper.append(headerRow, empty);
    return wrapper;
  }

  // Adicionar controles de ordenação e agrupamento se fornecidos
  let sortControls = null;
  if (options.sortControls || options.groupControls) {
    sortControls = document.createElement("div");
    sortControls.className = "sort-controls";
    sortControls.style.display = "flex";
    sortControls.style.gap = "0.5rem";
    sortControls.style.marginTop = "1rem";
    sortControls.style.marginBottom = "1rem";
    sortControls.style.flexWrap = "wrap";
    
    // Adicionar botões de ordenação se fornecidos
    if (options.sortControls) {
      const { currentSort, onSortChange } = options.sortControls;
    
    const sortButtons = [
      { 
        id: "date", 
        label: "Data", 
        icon: FluentIcons.Calendar,
        modes: ["date-desc", "date-asc"]
      },
      { 
        id: "alpha", 
        label: "Nome", 
        iconAsc: FluentIcons.TextSortAscending,
        iconDesc: FluentIcons.TextSortDescending,
        modes: ["alpha-asc", "alpha-desc"]
      },
      { 
        id: "value", 
        label: "Valor", 
        icon: FluentIcons.Money,
        modes: ["value-desc", "value-asc"]
      },
      { 
        id: "installment", 
        label: "Parcela", 
        icon: FluentIcons.NumberSymbol,
        modes: ["installment-asc", "installment-desc"]
      }
    ];
    
    sortButtons.forEach(btn => {
      const button = document.createElement("button");
      button.className = "sort-button icon-only";
      
      // Determinar se este botão está ativo
      const isActive = btn.modes.includes(currentSort);
      
      if (isActive) {
        button.classList.add("active");
      }
      
      // Ícone - para alfabético, mostrar ícone diferente dependendo da direção
      let iconPath;
      if (btn.id === "alpha") {
        iconPath = currentSort === "alpha-asc" ? btn.iconAsc : btn.iconDesc;
      } else {
        iconPath = btn.icon;
      }
      
      const icon = createFluentIcon(iconPath);
      icon.classList.add("sort-icon");
      button.append(icon);

      const directionLabel = currentSort.endsWith("-asc") ? "crescente" : "decrescente";
      button.setAttribute("aria-label", `${btn.label} (${directionLabel})`);
      button.title = `${btn.label} (${directionLabel})`;
      
      // Click handler - alterna entre as duas direções
      button.addEventListener("click", () => {
        const currentMode = currentSort;
        let newMode;
        
        if (btn.modes.includes(currentMode)) {
          // Se já está ativo, alternar direção
          const currentIndex = btn.modes.indexOf(currentMode);
          const nextIndex = (currentIndex + 1) % btn.modes.length;
          newMode = btn.modes[nextIndex];
        } else {
          // Se não está ativo, ativar com primeira direção
          newMode = btn.modes[0];
        }
        
        onSortChange(newMode);
      });
      
      // Hover effect
      sortControls.appendChild(button);
    });
    }
    
    // Adicionar botão de agrupamento se fornecido
    if (options.groupControls) {
      const { isGrouped, onToggleGroup } = options.groupControls;
      
      // Adicionar separador visual
      const separator = document.createElement("div");
      separator.style.width = "1px";
      separator.style.height = "32px";
      separator.style.background = "var(--border)";
      separator.style.margin = "0 0.25rem";
      sortControls.appendChild(separator);
      
      const groupButton = document.createElement("button");
      groupButton.className = "sort-button icon-only";
      if (isGrouped) {
        groupButton.classList.add("active");
      }
      
      const icon = createFluentIcon(FluentIcons.Stack);
      icon.classList.add("sort-icon");
      groupButton.append(icon);
      groupButton.setAttribute("aria-label", "Agrupar");
      groupButton.title = "Agrupar";
      
      groupButton.addEventListener("click", onToggleGroup);
      
      // Hover effect
      sortControls.appendChild(groupButton);
    }
  }

  // Buscar todos os cartões uma vez para criar um cache
  const cards = sortCardsByName(await cardRepository.listCards());
  const cardMap = new Map();
  cards.forEach(card => cardMap.set(card.id, card.name));

  itemsToRender.forEach((tx) => {
    const row = document.createElement("div");
    row.className = "transaction-row";
    
    // Se for item agrupado, adicionar classe especial
    if (tx._isGrouped) {
      row.classList.add("transaction-grouped");
    }

    const normalizedDescription = (tx.description || "").toLowerCase();
    const isAdvanceNegative =
      normalizedDescription.includes("adiantamento") &&
      Number(tx.amount) < 0;

    if (isAdvanceNegative) {
      row.classList.add("transaction-advance");
    }

    const content = document.createElement("div");
    content.className = "transaction-content";

    const main = document.createElement("div");
    const titleLine = document.createElement("strong");
    
    // Se for item agrupado, mostrar quantidade
    if (tx._isGrouped && tx.count > 1) {
      titleLine.textContent = tx.description || "Sem descrição";
      const countBadge = document.createElement("span");
      countBadge.className = "count-badge";
      countBadge.textContent = `${tx.count}x`;
      countBadge.style.marginLeft = "0.5rem";
      countBadge.style.fontSize = "0.75rem";
      countBadge.style.fontWeight = "600";
      countBadge.style.color = "var(--primary)";
      countBadge.style.background = "var(--primary-light)";
      countBadge.style.padding = "0.125rem 0.375rem";
      countBadge.style.borderRadius = "var(--radius-sm)";
      countBadge.title = `${tx.count} transações agrupadas`;
      titleLine.appendChild(countBadge);
    } else {
      titleLine.textContent = tx.description || "Sem descrição";
    }

    if (
      options.showSettlementBadge &&
      tx.settled &&
      !tx._isGrouped &&
      (!tx._isVirtual || tx.isInvoiceSummary)
    ) {
      const settledBadge = document.createElement("span");
      settledBadge.className = "settled-badge";
      settledBadge.textContent = "✓";
      settledBadge.title = "Pago/Recebido";
      titleLine.appendChild(settledBadge);
    }
    
    // Indicador de parcela
    if (tx.installment && tx.installment.current && tx.installment.total) {
      const installmentBadge = document.createElement("span");
      installmentBadge.className = "installment-badge";
      installmentBadge.textContent = `${tx.installment.current}/${tx.installment.total}`;
      installmentBadge.style.marginLeft = "0.5rem";
      installmentBadge.style.fontSize = "0.75rem";
      installmentBadge.style.fontWeight = "600";
      installmentBadge.style.color = "var(--primary)";
      installmentBadge.style.background = "var(--primary-light)";
      installmentBadge.style.padding = "0.125rem 0.375rem";
      installmentBadge.style.borderRadius = "var(--radius-sm)";
      titleLine.appendChild(installmentBadge);
    }
    
    // Indicador de financiamento
    if (tx.financing && tx.financing.current && tx.financing.total) {
      const financingBadge = document.createElement("span");
      financingBadge.className = "financing-badge";
      financingBadge.textContent = `💰 ${tx.financing.current}/${tx.financing.total}`;
      financingBadge.style.marginLeft = "0.5rem";
      financingBadge.style.fontSize = "0.75rem";
      financingBadge.style.fontWeight = "600";
      financingBadge.style.color = "#ea580c";
      financingBadge.style.background = "#ffedd5";
      financingBadge.style.padding = "0.125rem 0.375rem";
      financingBadge.style.borderRadius = "var(--radius-sm)";
      financingBadge.title = "Financiamento";
      titleLine.appendChild(financingBadge);
    }
    
    // Indicador de recorrência
    if (tx.recurrence && tx.recurrence.groupId) {
      const recurrenceBadge = document.createElement("span");
      recurrenceBadge.className = "recurrence-badge";
      recurrenceBadge.textContent = "⟳"; // Símbolo de ciclo
      recurrenceBadge.style.marginLeft = "0.5rem";
      recurrenceBadge.style.fontSize = "0.875rem";
      recurrenceBadge.style.fontWeight = "600";
      recurrenceBadge.style.color = "#059669";
      recurrenceBadge.style.background = "#d1fae5";
      recurrenceBadge.style.padding = "0.125rem 0.375rem";
      recurrenceBadge.style.borderRadius = "var(--radius-sm)";
      recurrenceBadge.title = "Transação recorrente";
      titleLine.appendChild(recurrenceBadge);
    }
    
    // Indicador de assinatura
    if (tx.subscription && tx.subscription.groupId) {
      const subscriptionBadge = document.createElement("span");
      subscriptionBadge.className = "subscription-badge";
      subscriptionBadge.textContent = `📅 ${tx.subscription.current}/${tx.subscription.total}`;
      subscriptionBadge.style.marginLeft = "0.5rem";
      subscriptionBadge.style.fontSize = "0.75rem";
      subscriptionBadge.style.fontWeight = "600";
      subscriptionBadge.style.color = "#7c3aed";
      subscriptionBadge.style.background = "#ede9fe";
      subscriptionBadge.style.padding = "0.125rem 0.375rem";
      subscriptionBadge.style.borderRadius = "var(--radius-sm)";
      subscriptionBadge.title = "Assinatura";
      titleLine.appendChild(subscriptionBadge);
    }
    
    const metaLine = document.createElement("div");
    metaLine.className = "transaction-meta";
    const cardName = tx.cardId ? cardMap.get(tx.cardId) || null : null;
    
    // Para itens agrupados, mostrar apenas o tipo
    if (tx._isGrouped) {
      metaLine.textContent = getTransactionMeta(tx, cardName);
    } else {
      metaLine.textContent = `${getTransactionMeta(tx, cardName)} • ${formatDateLabel(tx.date)}`;
    }
    main.append(titleLine, metaLine);

    const amount = document.createElement("div");
    amount.className = "transaction-amount";
    
    // Se for uma receita (income) em uma fatura de cartão, é um adiantamento
    // Mostrar como valor positivo em verde
    const isInvoiceAdvance = tx.kind === "income" && tx.cardId && tx.invoiceMonthKey;
    
    if (isAdvanceNegative) {
      amount.classList.add("advance");
      amount.textContent = formatCurrency(Math.abs(tx.amount));
    } else if (isInvoiceAdvance) {
      amount.classList.add("income");
      // Inverter o sinal: receita já é negativa no cálculo, mas exibir como positiva
      amount.textContent = formatCurrency(Math.abs(tx.amount));
    } else if (tx.kind === "income") {
      amount.classList.add("income");
      amount.textContent = formatCurrency(tx.amount);
    } else if (tx.kind === "expense") {
      amount.classList.add("expense");
      amount.textContent = formatCurrency(tx.amount);
    } else {
      amount.textContent = formatCurrency(tx.amount);
    }

    content.append(main, amount);

    const actions = document.createElement("div");
    actions.className = "transaction-actions-hidden";

    // Não permitir edição/exclusão de transações virtuais (resumo de fatura) ou agrupadas
    if (!tx._isVirtual && !tx._isGrouped) {
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
        
        // Se for parcela, financiamento, assinatura ou recorrência, mostrar opções
        if (tx.installment && tx.installment.groupId) {
          showInstallmentDeleteModal(tx);
        } else if (tx.financing && tx.financing.groupId) {
          showFinancingDeleteModal(tx);
        } else if (tx.subscription && tx.subscription.groupId) {
          showSubscriptionDeleteModal(tx);
        } else if (tx.recurrence && tx.recurrence.groupId) {
          showRecurrenceDeleteModal(tx);
        } else {
          if (confirm(`Excluir "${tx.description}"?`)) {
            await transactionRepository.deleteTransaction(tx.id);
            await refreshCurrentView();
          }
        }
      });

      actions.append(editBtn, deleteBtn);
    } else {
      // Para transações virtuais (resumo de fatura), adicionar ícone de informação
      const infoBtn = document.createElement("button");
      infoBtn.className = "icon-button";
      infoBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"/>
      </svg>`;
      infoBtn.setAttribute("aria-label", "Resumo da fatura");
      infoBtn.title = "Este é um resumo da fatura. Para ver os detalhes, acesse a página de Faturas.";
      infoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateTo(`#/app/invoices?cardId=${tx.cardId}&m=${tx.invoiceMonthKey}`);
      });
      
      actions.append(infoBtn);
    }
    
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

  // Montar o wrapper com heading, controles de sort (se houver) e lista
  if (typeof options.subtotalValue === "number") {
    headerRow.appendChild(subtotalValue);
  }
  if (sortControls) {
    headerRow.appendChild(sortControls);
  }
  wrapper.append(headerRow, list);
  return wrapper;
}

async function renderTransferSection(transfers, options = {}) {
  if (!transfers.length) {
    return null;
  }
  const details = document.createElement("details");
  details.className = "card transfer-block";
  const summary = document.createElement("summary");
  summary.textContent = `Transferências (${transfers.length})`;
  details.append(summary);
  const list = await renderTransactionList("Transferências", transfers, options);
  const listBody = list.querySelector(".transaction-list");
  if (listBody) {
    details.append(listBody);
  }
  return details;
}

async function renderSettlement(target = appView) {
  const container = target || appView;
  container.innerHTML = "";

  const [rawTransactions, monthTransactions] = await Promise.all([
    transactionRepository.listMonthTransactionsRaw(monthState.current),
    transactionRepository.listMonthTransactions(monthState.current),
  ]);

  const invoiceSummaries = monthTransactions.filter((tx) => tx.isInvoiceSummary);
  const invoicePaidMap = new Map();
  const invoiceItems = await Promise.all(
    invoiceSummaries.map(async (tx) => {
      if (!tx.cardId || !tx.invoiceMonthKey) {
        return { ...tx, paid: false };
      }
      const meta = await cardRepository.getInvoiceMeta(tx.cardId, tx.invoiceMonthKey);
      const paid = Boolean(meta?.paid);
      invoicePaidMap.set(`${tx.cardId}::${tx.invoiceMonthKey}`, paid);
      return { ...tx, paid };
    })
  );

  const baseTransactions = rawTransactions.filter(
    (tx) => !tx._isVirtual && !tx._isGrouped
  );
  const isCardTransaction = (tx) => Boolean(tx.cardId && tx.invoiceMonthKey);
  const income = baseTransactions.filter(
    (tx) => tx.kind === "income" && !isCardTransaction(tx)
  );
  const expenses = baseTransactions.filter(
    (tx) => tx.kind === "expense" && !isCardTransaction(tx)
  );
  const transfers = baseTransactions.filter((tx) => tx.kind === "transfer");

  const sumAmount = (items) =>
    items.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "summary-grid tracking-summary";

  const createTrackingCard = (title, rows, variant) => {
    const card = document.createElement("div");
    card.className = `card tracking-card ${variant || ""}`.trim();
    const heading = document.createElement("div");
    heading.className = "tracking-card-title";
    heading.textContent = title;
    const rowList = document.createElement("div");
    rowList.className = "tracking-card-rows";
    const valueMap = {};
    rows.forEach((row) => {
      const line = document.createElement("div");
      line.className = "tracking-card-row";
      const label = document.createElement("span");
      label.textContent = row.label;
      const value = document.createElement("span");
      value.className = `tracking-card-value ${row.variant || ""}`.trim();
      value.textContent = formatCurrency(row.value);
      line.append(label, value);
      rowList.append(line);
      valueMap[row.key] = value;
    });
    card.append(heading, rowList);
    return { card, valueMap };
  };

  const createBalanceCard = (title, value) => {
    const card = document.createElement("div");
    card.className = "card tracking-card balance";
    const heading = document.createElement("div");
    heading.className = "tracking-card-title";
    heading.textContent = title;
    const valueEl = document.createElement("div");
    valueEl.className = `tracking-balance-value ${value >= 0 ? "positive" : "negative"}`;
    valueEl.textContent = formatCurrency(value);
    card.append(heading, valueEl);
    return { card, valueEl };
  };

  const incomeCard = createTrackingCard(
    "Receitas",
    [
      { key: "plannedIncome", label: "Planejado", value: 0, variant: "positive" },
      { key: "settledIncome", label: "Recebido", value: 0, variant: "positive" },
    ],
    "income"
  );
  const expenseCard = createTrackingCard(
    "Despesas",
    [
      { key: "plannedExpense", label: "Planejado", value: 0, variant: "negative" },
      { key: "settledExpense", label: "Pago", value: 0, variant: "negative" },
    ],
    "expense"
  );
  const plannedBalanceCard = createBalanceCard("Saldo planejado", 0);
  const settledBalanceCard = createBalanceCard("Saldo realizado", 0);

  summaryGrid.append(
    incomeCard.card,
    expenseCard.card,
    plannedBalanceCard.card,
    settledBalanceCard.card
  );

  const pendingCard = document.createElement("div");
  pendingCard.className = "card tracking-pending";
  const pendingTitle = document.createElement("h2");
  pendingTitle.textContent = "Pendências do mês";
  const pendingRows = document.createElement("div");
  pendingRows.className = "tracking-card-rows";

  const pendingIncomeEl = document.createElement("span");
  const pendingExpenseEl = document.createElement("span");

  [
    { label: "Receitas pendentes", variant: "positive", valueEl: pendingIncomeEl },
    { label: "Despesas pendentes", variant: "negative", valueEl: pendingExpenseEl },
  ].forEach((row) => {
    const line = document.createElement("div");
    line.className = "tracking-card-row";
    const label = document.createElement("span");
    label.textContent = row.label;
    row.valueEl.className = `tracking-card-value ${row.variant}`;
    line.append(label, row.valueEl);
    pendingRows.append(line);
  });
  pendingCard.append(pendingTitle, pendingRows);

  const bulkCard = document.createElement("section");
  bulkCard.className = "card tracking-actions";
  const bulkTitle = document.createElement("h2");
  bulkTitle.textContent = "Ações rápidas";
  const bulkActions = document.createElement("div");
  bulkActions.className = "tracking-actions-row";

  const incomeIds = income.map((tx) => tx.id).filter(Boolean);
  const expenseIds = expenses.map((tx) => tx.id).filter(Boolean);
  const allIds = [...incomeIds, ...expenseIds];

  const markIncomeButton = createButton("Marcar todas as receitas como recebidas", {
    variant: "secondary",
  });
  const markExpenseButton = createButton("Marcar todas as despesas como pagas", {
    variant: "secondary",
  });
  const clearButton = createButton("Limpar marcações do mês", {
    variant: "secondary",
  });
  clearButton.classList.add("danger");

  const bulkButtons = [markIncomeButton, markExpenseButton, clearButton];

  const filterOptions = [
    { label: "Todas", value: "all" },
    { label: "Pendentes", value: "pending" },
    { label: "Concluídas", value: "settled" },
  ];

  const applyFilter = (items, filter) => {
    if (filter === "pending") {
      return items.filter((tx) => !Boolean(tx.settled));
    }
    if (filter === "settled") {
      return items.filter((tx) => Boolean(tx.settled));
    }
    return items;
  };

  const createFilterChips = (current, onChange) => {
    const wrapper = document.createElement("div");
    wrapper.className = "tracking-filters";
    filterOptions.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.textContent = option.label;
      button.classList.toggle("is-active", option.value === current);
      button.addEventListener("click", () => onChange(option.value));
      wrapper.append(button);
    });
    return wrapper;
  };

  const renderTrackingListInto = (list, items, kind, emptyMessage) => {
    list.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const emptyText = document.createElement("div");
      emptyText.className = "text-secondary";
      emptyText.textContent = emptyMessage;
      empty.append(emptyText);
      list.append(empty);
      return;
    }

    items.forEach((tx) => {
      const row = document.createElement("div");
      row.className = "tracking-row";

      const checkLabel = document.createElement("label");
      checkLabel.className = "tracking-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(tx.settled);
      checkbox.disabled = settlementState.busy;
      const checkText = document.createElement("span");
      checkText.textContent = kind === "income" ? "Recebido" : "Pago";
      checkLabel.append(checkbox, checkText);

      checkbox.addEventListener("change", async () => {
        if (!tx.id) return;
        const nextValue = checkbox.checked;
        checkbox.disabled = true;
        tx.settled = nextValue;
        updateSummaryValues();
        renderSections();
        try {
          await transactionRepository.updateTransactionSettlement(tx.id, nextValue);
        } catch (error) {
          alert("Não foi possível atualizar a transação.");
          await refreshCurrentView();
        }
      });

      const info = document.createElement("div");
      info.className = "tracking-info";
      const title = document.createElement("div");
      title.className = "tracking-title";
      title.textContent = tx.description || "Sem descrição";
      const subtitle = document.createElement("div");
      subtitle.className = "tracking-subtitle";
      subtitle.textContent = getCategoryLabel(tx.categoryId);
      info.append(title, subtitle);

      const amount = document.createElement("div");
      amount.className = `tracking-amount ${kind}`;
      amount.textContent = formatCurrency(Number(tx.amount) || 0);

      row.append(checkLabel, info, amount);
      list.append(row);
    });
  };

  const renderSection = (title, items, filterKey, emptyMessage) => {
    const section = document.createElement("section");
    section.className = "card tracking-section";

    const header = document.createElement("div");
    header.className = "tracking-header";
    const titleRow = document.createElement("div");
    titleRow.className = "tracking-header-row";
    const heading = document.createElement("h3");
    heading.className = "section-title";
    heading.textContent = title;
    const subtotal = document.createElement("div");
    subtotal.className = "list-subtotal";
    titleRow.append(heading, subtotal);

    const list = document.createElement("div");
    list.className = "tracking-list";

    const filters = createFilterChips(settlementState[filterKey], (value) => {
      settlementState[filterKey] = value;
      renderSections();
    });

    header.append(titleRow, filters);
    section.append(header, list);
    return { section, list, subtotal };
  };

  const incomeSection = renderSection(
    "Receitas",
    income,
    "incomeFilter",
    "Nenhuma receita encontrada."
  );
  const expenseSection = renderSection(
    "Despesas",
    expenses,
    "expenseFilter",
    "Nenhuma despesa encontrada."
  );

  const updateSummaryValues = () => {
    const plannedIncome = sumAmount(income);
    const plannedExpense = sumAmount(expenses) + sumAmount(invoiceItems);
    const settledIncome = sumAmount(income.filter((tx) => Boolean(tx.settled)));
    const settledExpense =
      sumAmount(expenses.filter((tx) => Boolean(tx.settled))) +
      sumAmount(invoiceItems.filter((tx) => tx.paid));
    const plannedBalance = plannedIncome - plannedExpense;
    const settledBalance = settledIncome - settledExpense;
    const pendingIncome = plannedIncome - settledIncome;
    const pendingExpense = plannedExpense - settledExpense;

    incomeCard.valueMap.plannedIncome.textContent = formatCurrency(plannedIncome);
    incomeCard.valueMap.settledIncome.textContent = formatCurrency(settledIncome);
    expenseCard.valueMap.plannedExpense.textContent = formatCurrency(plannedExpense);
    expenseCard.valueMap.settledExpense.textContent = formatCurrency(settledExpense);
    plannedBalanceCard.valueEl.textContent = formatCurrency(plannedBalance);
    plannedBalanceCard.valueEl.className = `tracking-balance-value ${plannedBalance >= 0 ? "positive" : "negative"}`;
    settledBalanceCard.valueEl.textContent = formatCurrency(settledBalance);
    settledBalanceCard.valueEl.className = `tracking-balance-value ${settledBalance >= 0 ? "positive" : "negative"}`;
    pendingIncomeEl.textContent = formatCurrency(pendingIncome);
    pendingExpenseEl.textContent = formatCurrency(pendingExpense);
  };

  const renderSections = () => {
    const incomeFiltered = applyFilter(income, settlementState.incomeFilter);
    const expenseFiltered = applyFilter(expenses, settlementState.expenseFilter);

    renderTrackingListInto(
      incomeSection.list,
      [...incomeFiltered].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)),
      "income",
      "Nenhuma receita encontrada."
    );
    incomeSection.subtotal.textContent = formatCurrency(
      incomeFiltered.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
    );
    renderTrackingListInto(
      expenseSection.list,
      [...expenseFiltered].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)),
      "expense",
      "Nenhuma despesa encontrada."
    );
    expenseSection.subtotal.textContent = formatCurrency(
      expenseFiltered.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
    );
  };

  const runBulkAction = async (action, buttons, applyLocal) => {
    if (settlementState.busy) return;
    settlementState.busy = true;
    buttons.forEach((btn) => {
      btn.disabled = true;
    });
    try {
      applyLocal();
      updateSummaryValues();
      renderSections();
      await action();
    } catch (error) {
      alert("Não foi possível atualizar as marcações.");
      await refreshCurrentView();
    } finally {
      settlementState.busy = false;
      updateBulkButtonsState();
    }
  };

  const updateBulkButtonsState = () => {
    markIncomeButton.disabled = settlementState.busy || !incomeIds.length;
    markExpenseButton.disabled = settlementState.busy || !expenseIds.length;
    clearButton.disabled = settlementState.busy || !allIds.length;
  };

  markIncomeButton.addEventListener("click", () =>
    runBulkAction(
      () => transactionRepository.batchSetSettlement(incomeIds, true),
      bulkButtons,
      () => {
        income.forEach((tx) => {
          tx.settled = true;
        });
      }
    )
  );
  markExpenseButton.addEventListener("click", () =>
    runBulkAction(
      () => transactionRepository.batchSetSettlement(expenseIds, true),
      bulkButtons,
      () => {
        expenses.forEach((tx) => {
          tx.settled = true;
        });
      }
    )
  );
  clearButton.addEventListener("click", () =>
    runBulkAction(
      () => transactionRepository.batchSetSettlement(allIds, false),
      bulkButtons,
      () => {
        income.forEach((tx) => {
          tx.settled = false;
        });
        expenses.forEach((tx) => {
          tx.settled = false;
        });
      }
    )
  );

  updateBulkButtonsState();

  bulkActions.append(markIncomeButton, markExpenseButton, clearButton);
  bulkCard.append(bulkTitle, bulkActions);

  const invoiceSection = document.createElement("section");
  invoiceSection.className = "card tracking-section";
  const invoiceHeader = document.createElement("div");
  invoiceHeader.className = "tracking-header";
  const invoiceTitleRow = document.createElement("div");
  invoiceTitleRow.className = "tracking-header-row";
  const invoiceTitle = document.createElement("h3");
  invoiceTitle.className = "section-title";
  invoiceTitle.textContent = "Faturas de cartões";
  const invoiceSubtotal = document.createElement("div");
  invoiceSubtotal.className = "list-subtotal";
  invoiceTitleRow.append(invoiceTitle, invoiceSubtotal);
  invoiceHeader.append(invoiceTitleRow);
  const invoiceList = document.createElement("div");
  invoiceList.className = "tracking-list";
  invoiceSection.append(invoiceHeader, invoiceList);

  const renderInvoiceList = () => {
    invoiceList.innerHTML = "";
    const invoiceTotal = invoiceItems.reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    );
    invoiceSubtotal.textContent = formatCurrency(invoiceTotal);
    if (!invoiceItems.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const emptyText = document.createElement("div");
      emptyText.className = "text-secondary";
      emptyText.textContent = "Nenhuma fatura encontrada.";
      empty.append(emptyText);
      invoiceList.append(empty);
      return;
    }

    invoiceItems
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .forEach((tx) => {
        const row = document.createElement("div");
        row.className = "tracking-row";

        const checkLabel = document.createElement("label");
        checkLabel.className = "tracking-check";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(tx.paid);
        checkbox.disabled = settlementState.busy;
        const checkText = document.createElement("span");
        checkText.textContent = "Pago";
        checkLabel.append(checkbox, checkText);

        checkbox.addEventListener("change", async () => {
          if (!tx.cardId || !tx.invoiceMonthKey) return;
          const nextValue = checkbox.checked;
          checkbox.disabled = true;
          tx.paid = nextValue;
          invoicePaidMap.set(`${tx.cardId}::${tx.invoiceMonthKey}`, nextValue);
          updateSummaryValues();
          renderInvoiceList();
          try {
            const invoiceTransactions = await transactionRepository.listInvoiceTransactions(
              tx.cardId,
              tx.invoiceMonthKey
            );
            const expenseIds = invoiceTransactions
              .filter((item) => item.kind === "expense")
              .map((item) => item.id)
              .filter(Boolean);
            await Promise.all([
              cardRepository.setInvoicePaid(tx.cardId, tx.invoiceMonthKey, {
                paid: nextValue,
                totalCents: Math.round(Math.abs(Number(tx.amount) || 0) * 100),
              }),
              transactionRepository.batchSetSettlement(expenseIds, nextValue),
            ]);
          } catch (error) {
            alert("Não foi possível atualizar a fatura.");
            await refreshCurrentView();
          }
        });

        const info = document.createElement("div");
        info.className = "tracking-info";
        const title = document.createElement("div");
        title.className = "tracking-title";
        title.textContent = tx.description || "Fatura";
        const subtitle = document.createElement("div");
        subtitle.className = "tracking-subtitle";
        subtitle.textContent = tx.invoiceMonthKey
          ? `Fatura ${tx.invoiceMonthKey}`
          : "Fatura";
        info.append(title, subtitle);

        const amount = document.createElement("div");
        amount.className = "tracking-amount expense";
        amount.textContent = formatCurrency(Number(tx.amount) || 0);

        row.append(checkLabel, info, amount);
        invoiceList.append(row);
      });
  };

  container.append(
    summaryGrid,
    pendingCard,
    bulkCard,
    incomeSection.section,
    expenseSection.section,
    invoiceSection
  );

  const transferSection = await renderTransferSection(
    sortByDateDesc(transfers),
    { showActions: false }
  );
  if (transferSection) {
    container.append(transferSection);
  }

  updateSummaryValues();
  renderSections();
  renderInvoiceList();
}

async function renderDashboard(target = appView) {
  const container = target || appView;
  container.innerHTML = "";
  const transactions = await transactionRepository.listMonthTransactions(
    monthState.current
  );

  const invoiceSummaries = transactions.filter(
    (tx) => tx.isInvoiceSummary && tx.cardId && tx.invoiceMonthKey
  );
  if (invoiceSummaries.length) {
    const paidStates = await Promise.all(
      invoiceSummaries.map(async (tx) => {
        const meta = await cardRepository.getInvoiceMeta(tx.cardId, tx.invoiceMonthKey);
        return { id: tx.id, paid: Boolean(meta?.paid) };
      })
    );
    const paidMap = new Map(paidStates.map((entry) => [entry.id, entry.paid]));
    invoiceSummaries.forEach((tx) => {
      tx.settled = paidMap.get(tx.id) || false;
    });
  }

  const income = transactions.filter((tx) => tx.kind === "income");
  const expenses = transactions.filter((tx) => tx.kind === "expense");
  const invoiceSummariesOnly = expenses.filter((tx) => tx.isInvoiceSummary);
  const expenseItems = expenses.filter((tx) => !tx.isInvoiceSummary);
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

  const handleSortChange = (key, value) => {
    dashboardState[key] = value;
    refreshCurrentView();
  };

  const handleGroupToggle = (key) => {
    dashboardState[key] = !dashboardState[key];
    refreshCurrentView();
  };

  // Card de Receitas
  const incomeList = await renderTransactionList(
    "Receitas do mês",
    income,
    {
      showActions: true,
      showSettlementBadge: true,
      subtotalValue: totalIncome,
      sortControls: {
        currentSort: dashboardState.incomeSort,
        onSortChange: (value) => handleSortChange("incomeSort", value),
      },
      groupControls: {
        isGrouped: dashboardState.incomeGrouped,
        onToggleGroup: () => handleGroupToggle("incomeGrouped"),
      },
    }
  );

  // Card de Despesas
  const expenseList = await renderTransactionList(
    "Despesas do mês",
    expenseItems,
    {
      showActions: true,
      showSettlementBadge: true,
      subtotalValue: expenseItems.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
      sortControls: {
        currentSort: dashboardState.expenseSort,
        onSortChange: (value) => handleSortChange("expenseSort", value),
      },
      groupControls: {
        isGrouped: dashboardState.expenseGrouped,
        onToggleGroup: () => handleGroupToggle("expenseGrouped"),
      },
    }
  );

  const invoiceList = await renderTransactionList(
    "Faturas de cartões",
    invoiceSummariesOnly,
    {
      showActions: true,
      showSettlementBadge: true,
      subtotalValue: invoiceSummariesOnly.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
      sortControls: {
        currentSort: dashboardState.invoiceSort,
        onSortChange: (value) => handleSortChange("invoiceSort", value),
      },
      groupControls: {
        isGrouped: dashboardState.invoiceGrouped,
        onToggleGroup: () => handleGroupToggle("invoiceGrouped"),
      },
    }
  );

  // Adicionar botão de nova transação (desktop)
  const addButton = createButton("Nova transação", {
    onClick: () => openTransactionModal(),
  });
  addButton.style.marginTop = "1rem";
  addButton.classList.add("desktop-button");

  container.append(summaryGrid, incomeList, expenseList, invoiceList, addButton);
}

async function renderTransactions(target = appView) {
  const container = target || appView;
  container.innerHTML = "";
  const transactions = await transactionRepository.listMonthTransactions(
    monthState.current
  );

  const all = sortByDateDesc(transactions);

  const list = await renderTransactionList("Transações", all, {
    showActions: false,
  });

  // Adicionar botão de nova transação (desktop)
  const addButton = createButton("Nova transação", {
    onClick: () => openTransactionModal(),
  });
  addButton.style.marginTop = "1rem";
  addButton.classList.add("desktop-button");

  container.append(list, addButton);
}

async function computeCardInvoiceProjection(cardId) {
  const uid = getUserId();
  const invoicesSnapshot = await get(ref(db, `/users/${uid}/invoices/${cardId}`));

  if (!invoicesSnapshot.exists()) {
    return {
      monthData: [],
      adjustedMap: {},
      carryBeforeMap: {},
    };
  }

  const invoices = invoicesSnapshot.val();
  const monthKeys = Object.keys(invoices).sort();

  const monthData = await Promise.all(
    monthKeys.map(async (monthKey) => {
      const txList = await transactionRepository.listInvoiceTransactions(
        cardId,
        monthKey
      );
      const invoiceItems = txList.filter((tx) =>
        ["expense", "income"].includes(tx.kind)
      );
      const expenseTotalCents = invoiceItems.reduce((sum, tx) => {
        if (tx.kind !== "expense") return sum;
        const value = Number(tx.amount) || 0;
        return sum + Math.round(value * 100);
      }, 0);
      const limitItems = invoiceItems.filter(
        (tx) => !(tx.subscription && tx.isProjected)
      );
      const totalCents = getInvoiceTotalCents(invoiceItems);
      const limitTotalCents = getInvoiceTotalCents(limitItems);
      const paid = Boolean(invoices[monthKey]?.meta?.paid);
      return { monthKey, totalCents, limitTotalCents, expenseTotalCents, paid };
    })
  );

  monthData.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  let carry = 0;
  let limitCarry = 0;
  const adjustedMap = {};
  const carryBeforeMap = {};
  const limitAdjustedMap = {};
  const limitCarryBeforeMap = {};

  monthData.forEach((item) => {
    carryBeforeMap[item.monthKey] = carry;
    const base = item.totalCents + carry;
    const adjusted = Math.max(0, base);
    carry = base - adjusted;
    adjustedMap[item.monthKey] = adjusted;

    limitCarryBeforeMap[item.monthKey] = limitCarry;
    const limitBase = item.limitTotalCents + limitCarry;
    const limitAdjusted = Math.max(0, limitBase);
    limitCarry = limitBase - limitAdjusted;
    limitAdjustedMap[item.monthKey] = limitAdjusted;
  });

  return { monthData, adjustedMap, carryBeforeMap, limitAdjustedMap, limitCarryBeforeMap };
}

async function renderCards(target = appView) {
  const container = target || appView;
  container.innerHTML = "";
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
      await refreshCurrentView();
    } catch (error) {
      cardFeedback.textContent = "Não foi possível salvar o cartão.";
    }
  });

  const cards = sortCardsByName(await cardRepository.listCards());

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
    // Usar o mês selecionado pelo usuário (visão de futuro)
    const selectedMonth = monthState.current;
    
    const cardWrappers = await Promise.all(
      cards.map(async (card) => {
        const projection = await computeCardInvoiceProjection(card.id);
        const monthData = projection.monthData;
        const adjustedMap = projection.adjustedMap;

        const currentMonthAdjusted = adjustedMap[selectedMonth] || 0;
        const currentMonthMeta = monthData.find(
          (item) => item.monthKey === selectedMonth
        );
        const currentMonthTotal = currentMonthMeta?.paid
          ? 0
          : currentMonthAdjusted;

        let futureMonthsRaw = 0;

        monthData.forEach((item) => {
          if (item.paid) {
            return;
          }

          if (item.monthKey > selectedMonth) {
            futureMonthsRaw += Math.max(0, item.expenseTotalCents || 0);
          }
        });

        const limitCents = Number(card.limitCents) || 0;
        const maxFutureAllowed = Math.max(0, limitCents - currentMonthTotal);
        const futureMonthsTotal = Math.min(futureMonthsRaw, maxFutureAllowed);
        const availableCents = Math.max(
          limitCents - currentMonthTotal - futureMonthsTotal,
          0
        );

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

        // Limite total
        const limitLabel = document.createElement("div");
        limitLabel.className = "card-item-label";
        limitLabel.textContent = "LIMITE";
        
        const limitValue = document.createElement("div");
        limitValue.className = "card-item-value";
        limitValue.textContent = formatCurrencyFromCents(limitCents);

        // Fatura atual
        const currentLabel = document.createElement("div");
        currentLabel.className = "card-item-label";
        const monthLabel = formatMonthLabel(selectedMonth);
        currentLabel.textContent = `FATURA ATUAL (${monthLabel})`;
        currentLabel.style.marginTop = "0.5rem";
        
        const currentValue = document.createElement("div");
        currentValue.className = "card-item-value";
        currentValue.textContent = formatCurrencyFromCents(currentMonthTotal);

        // Próximas faturas
        const futureLabel = document.createElement("div");
        futureLabel.className = "card-item-label";
        futureLabel.textContent = "PRÓXIMAS FATURAS";
        futureLabel.style.marginTop = "0.5rem";
        
        const futureValue = document.createElement("div");
        futureValue.className = "card-item-value";
        futureValue.textContent = formatCurrencyFromCents(futureMonthsTotal);

        // Disponível
        const availableLabel = document.createElement("div");
        availableLabel.className = "card-item-label";
        availableLabel.textContent = "DISPONÍVEL";
        availableLabel.style.marginTop = "0.5rem";
        
        const availableValue = document.createElement("div");
        availableValue.className = "card-item-value";
        availableValue.style.color = availableCents > 0
          ? "var(--success)"
          : "var(--text-primary)";
        availableValue.textContent = formatCurrencyFromCents(availableCents);

        const link = document.createElement("button");
        link.className = "button";
        link.style.width = "100%";
        link.style.marginTop = "1rem";
        link.textContent = "Ver faturas";
        link.addEventListener("click", () => {
          navigateTo(`#/app/invoices?cardId=${card.id}&m=${monthState.current}`);
        });

        cardItem.append(
          title, 
          limitLabel, 
          limitValue, 
          currentLabel, 
          currentValue, 
          futureLabel, 
          futureValue, 
          availableLabel, 
          availableValue, 
          link
        );

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
              await refreshCurrentView();
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

        return cardWrapper;
      })
    );
    cardWrappers.forEach((cardWrapper) => {
      cardsGrid.append(cardWrapper);
    });
    cardsSection.append(cardsHeader, cardsGrid);
  }

  container.append(cardsSection, cardForm);
}

async function renderInvoices(target = appView) {
  const container = target || appView;
  container.innerHTML = "";
  const cardId = getQueryParam("cardId");
  
  // Cards de seleção de cartões
  const cards = sortCardsByName(await cardRepository.listCards());
  
  if (!cards.length) {
    const empty = createCard(
      "Nenhum cartão cadastrado",
      "Cadastre um cartão na página de Cartões para visualizar suas faturas."
    );
    container.append(empty);
    return;
  }
  
  const cardsSection = document.createElement("section");
  cardsSection.className = "card";
  
  const cardsHeader = document.createElement("div");
  cardsHeader.className = "section-header";
  const cardsTitle = document.createElement("h3");
  cardsTitle.className = "section-title";
  cardsTitle.textContent = "Selecione um cartão";
  cardsHeader.append(cardsTitle);

  const cardsGrid = document.createElement("div");
  cardsGrid.className = "cards-grid";
  cardsGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";

  cards.forEach(card => {
    const cardItem = document.createElement("button");
    cardItem.className = "card-item";
    cardItem.style.cursor = "pointer";
    cardItem.style.border = card.id === cardId ? "2px solid var(--primary)" : "none";
    cardItem.style.background = card.id === cardId ? "var(--primary-light)" : "var(--surface)";
    
    const title = document.createElement("h3");
    title.textContent = card.name || "Cartão";
    title.style.marginBottom = "0.5rem";
    
    const subtitle = document.createElement("div");
    subtitle.style.fontSize = "0.875rem";
    subtitle.style.color = "var(--text-secondary)";
    subtitle.textContent = card.id === cardId ? "Selecionado" : "Clique para selecionar";
    
    cardItem.append(title, subtitle);
    
    cardItem.addEventListener("click", () => {
      navigateTo(`#/app/invoices?cardId=${card.id}&m=${monthState.current}`);
    });
    
    cardsGrid.append(cardItem);
  });

  cardsSection.append(cardsHeader, cardsGrid);
  container.append(cardsSection);

  if (!cardId) {
    const empty = createCard(
      "Faturas",
      "Selecione um cartão acima para visualizar suas faturas."
    );
    container.append(empty);
    return;
  }

  const card = await cardRepository.getCard(cardId);
  if (!card) {
    const empty = createCard(
      "Cartão não encontrado",
      "O cartão selecionado não existe ou foi removido."
    );
    container.append(empty);
    return;
  }
  
  const cardTitle = createCard(
    card.name || "Faturas",
    "Acompanhe o status das faturas e transações."
  );

  const monthList = document.createElement("div");
  monthList.className = "invoice-months";
  
  // Container para conteúdo dinâmico
  const dynamicContent = document.createElement("div");
  
  // Estado de ordenação e agrupamento
  let currentSort = "date-desc";
  let isGrouped = false;
  
  const renderInvoiceContent = async (selectedMonth) => {
    dynamicContent.innerHTML = "";
    
    const invoiceTransactions = await transactionRepository.listInvoiceTransactions(
      cardId,
      selectedMonth
    );
    const invoiceItems = invoiceTransactions.filter((tx) =>
      ["expense", "income"].includes(tx.kind)
    );
    const totalCents = getInvoiceTotalCents(invoiceItems);

    const meta = await cardRepository.getInvoiceMeta(cardId, selectedMonth);
    const paid = Boolean(meta?.paid);

    const projection = await computeCardInvoiceProjection(cardId);
    const adjustedCents = projection.adjustedMap[selectedMonth] ?? Math.max(0, totalCents);
    const carryBefore = projection.carryBeforeMap[selectedMonth] ?? 0;

    const invoiceSummary = document.createElement("section");
    invoiceSummary.className = "card";
    const summaryTitle = document.createElement("h2");
    summaryTitle.textContent = `Fatura ${formatMonthLabel(selectedMonth)}`;
    const totalLine = document.createElement("p");
    const hasCreditThisMonth = totalCents < 0;
    totalLine.textContent = `Total: ${formatCurrencyFromCents(hasCreditThisMonth ? 0 : adjustedCents)}`;

    let creditGeneratedLine = null;
    if (hasCreditThisMonth) {
      creditGeneratedLine = document.createElement("p");
      creditGeneratedLine.textContent = `Crédito gerado na fatura: ${formatCurrencyFromCents(Math.abs(totalCents))}`;
      creditGeneratedLine.style.color = "var(--success)";
      creditGeneratedLine.style.fontWeight = "600";
    }
    
    let creditLine = null;
    if (carryBefore < 0) {
      creditLine = document.createElement("p");
      creditLine.textContent = `Crédito anterior aplicado: ${formatCurrencyFromCents(Math.abs(carryBefore))}`;
      creditLine.style.color = "var(--success)";
      creditLine.style.fontWeight = "600";
    }
    const statusLine = document.createElement("p");
    statusLine.textContent = `Status: ${paid ? "paga" : "aberta"}`;

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "0.75rem";

    if (!paid) {
      const payButton = createButton("Marcar como paga", {
        onClick: async () => {
          await cardRepository.setInvoicePaid(cardId, selectedMonth, {
            paid: true,
            totalCents,
          });
          await renderInvoiceContent(selectedMonth);
        },
      });
      buttonContainer.append(payButton);
    } else {
      const unpayButton = createButton("Reabrir fatura", {
        variant: "secondary",
        onClick: async () => {
          await cardRepository.setInvoicePaid(cardId, selectedMonth, {
            paid: false,
            totalCents,
          });
          await renderInvoiceContent(selectedMonth);
        },
      });
      buttonContainer.append(unpayButton);
    }

    // Botão de nova transação
    const newTransactionButton = createButton("Nova Transação", {
      variant: "secondary",
      onClick: () => {
        openTransactionModal(null, {
          defaultCard: cardId,
          defaultInvoiceMonth: selectedMonth
        });
      },
    });
    buttonContainer.append(newTransactionButton);

    invoiceSummary.append(
      summaryTitle,
      totalLine,
      ...(creditGeneratedLine ? [creditGeneratedLine] : []),
      ...(creditLine ? [creditLine] : []),
      statusLine,
      buttonContainer
    );

    const txList = await renderTransactionList(
      "Transações da fatura",
      invoiceItems,
      { 
        showActions: true,
        sortControls: {
          currentSort,
          onSortChange: async (newSort) => {
            currentSort = newSort;
            await renderInvoiceContent(selectedMonth);
          }
        },
        groupControls: {
          isGrouped,
          onToggleGroup: async () => {
            isGrouped = !isGrouped;
            await renderInvoiceContent(selectedMonth);
          }
        }
      }
    );

    dynamicContent.append(invoiceSummary, txList);
  };
  
  // Criar tabs de meses
  const monthKeys = getMonthSequence(monthState.current, 6);
  monthKeys.forEach((monthKey) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab";
    button.textContent = formatMonthLabel(monthKey);
    button.classList.toggle("is-active", monthKey === monthState.current);
    button.addEventListener("click", async () => {
      // Atualizar visual dos tabs
      monthList.querySelectorAll(".tab").forEach(tab => tab.classList.remove("is-active"));
      button.classList.add("is-active");
      // Renderizar conteúdo do mês selecionado
      await renderInvoiceContent(monthKey);
    });
    monthList.append(button);
  });
  
  // Renderizar conteúdo inicial
  await renderInvoiceContent(monthState.current);

  container.append(cardTitle, monthList, dynamicContent);
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
    refreshCurrentView();
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

  const categoryField = createSelectWithGroups(
    "Categoria",
    "categoryId",
    categories
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
    refreshCurrentView();
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
      refreshCurrentView();
    });
  });
  categoryField.select.addEventListener("change", () => {
    row.txCandidate.categoryId = categoryField.select.value || undefined;
    updateRowStatus(row);
    refreshCurrentView();
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

// Funções de Backup e Manutenção
async function downloadUserBackup() {
  const uid = authState.user?.uid;
  if (!uid) throw new Error("Usuário não autenticado");
  
  const userDataRef = ref(db, `/users/${uid}`);
  const snapshot = await get(userDataRef);
  
  if (!snapshot.exists()) {
    throw new Error("Nenhum dado encontrado");
  }
  
  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    userId: uid,
    data: snapshot.val()
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pvault-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function restoreUserBackup(file) {
  const uid = authState.user?.uid;
  if (!uid) throw new Error("Usuário não autenticado");
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        if (!backup.version || !backup.data) {
          throw new Error("Formato de backup inválido");
        }
        
        // Restaurar dados
        const userDataRef = ref(db, `/users/${uid}`);
        await set(userDataRef, backup.data);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(file);
  });
}

async function deleteAllTransactions() {
  const uid = authState.user?.uid;
  if (!uid) throw new Error("Usuário não autenticado");
  
  const updates = {};
  updates[`/users/${uid}/tx`] = null;
  updates[`/users/${uid}/txByMonth`] = null;
  updates[`/users/${uid}/cardTxByInvoice`] = null;
  
  await update(ref(db), updates);
}

async function deleteEverything() {
  const uid = authState.user?.uid;
  if (!uid) throw new Error("Usuário não autenticado");
  
  const userDataRef = ref(db, `/users/${uid}`);
  await set(userDataRef, null);
}

async function renderImport(target = appView) {
  const container = target || appView;
  container.innerHTML = "";
  
  // Seção de Backup e Restauração
  const backupCard = document.createElement("section");
  backupCard.className = "card";
  const backupTitle = document.createElement("h2");
  backupTitle.textContent = "Backup e Restauração";
  const backupDesc = document.createElement("p");
  backupDesc.textContent = "Faça backup de todos os seus dados ou restaure um backup anterior.";
  backupDesc.style.marginBottom = "1rem";
  backupDesc.style.color = "var(--text-secondary)";
  
  const backupActions = document.createElement("div");
  backupActions.className = "actions";
  backupActions.style.gap = "0.75rem";
  
  const downloadBackupBtn = createButton("Baixar Backup", { variant: "secondary" });
  downloadBackupBtn.addEventListener("click", async () => {
    try {
      await downloadUserBackup();
    } catch (error) {
      alert("Erro ao gerar backup: " + error.message);
    }
  });
  
  const restoreBackupBtn = createButton("Restaurar Backup", { variant: "secondary" });
  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json";
  restoreInput.style.display = "none";
  restoreInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (confirm("Restaurar backup? Isso irá SUBSTITUIR todos os dados atuais!")) {
      try {
        await restoreUserBackup(file);
        alert("Backup restaurado com sucesso!");
        await refreshCurrentView();
      } catch (error) {
        alert("Erro ao restaurar backup: " + error.message);
      }
    }
    restoreInput.value = "";
  });
  
  restoreBackupBtn.addEventListener("click", () => restoreInput.click());
  
  backupActions.append(downloadBackupBtn, restoreBackupBtn, restoreInput);
  backupCard.append(backupTitle, backupDesc, backupActions);
  
  // Seção de Manutenção
  const maintenanceCard = document.createElement("section");
  maintenanceCard.className = "card";
  const maintenanceTitle = document.createElement("h2");
  maintenanceTitle.textContent = "Manutenção";
  const maintenanceDesc = document.createElement("p");
  maintenanceDesc.textContent = "Ferramentas para gerenciar seus dados.";
  maintenanceDesc.style.marginBottom = "1rem";
  maintenanceDesc.style.color = "var(--text-secondary)";
  
  const maintenanceActions = document.createElement("div");
  maintenanceActions.className = "actions";
  maintenanceActions.style.gap = "0.75rem";
  maintenanceActions.style.flexDirection = "column";
  
  const deleteTransactionsBtn = createButton("Apagar Todas as Transações", { variant: "secondary" });
  deleteTransactionsBtn.addEventListener("click", async () => {
    if (confirm("Tem certeza? Isso irá apagar TODAS as transações!")) {
      if (confirm("Última confirmação: apagar todas as transações?")) {
        try {
          await deleteAllTransactions();
          alert("Todas as transações foram apagadas.");
          await refreshCurrentView();
        } catch (error) {
          alert("Erro ao apagar transações: " + error.message);
        }
      }
    }
  });
  
  const deleteEverythingBtn = createButton("Apagar Tudo (Backup Automático)", { variant: "secondary" });
  deleteEverythingBtn.style.background = "linear-gradient(135deg, var(--danger) 0%, #dc2626 100%)";
  deleteEverythingBtn.style.color = "white";
  deleteEverythingBtn.addEventListener("click", async () => {
    if (confirm("ATENÇÃO: Isso irá apagar TODOS os dados! Um backup será gerado automaticamente.")) {
      if (confirm("CONFIRMAÇÃO FINAL: Apagar absolutamente tudo?")) {
        try {
          await downloadUserBackup(); // Backup automático
          await deleteEverything();
          alert("Todos os dados foram apagados. Backup foi salvo.");
          navigateTo("#/login");
        } catch (error) {
          alert("Erro ao apagar dados: " + error.message);
        }
      }
    }
  });
  
  maintenanceActions.append(deleteTransactionsBtn, deleteEverythingBtn);
  maintenanceCard.append(maintenanceTitle, maintenanceDesc, maintenanceActions);

  // Seção de Importação CSV (original)
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
    refreshCurrentView();
  });

  uploadCard.append(uploadTitle, uploadInput);

  if (!importState.files.length) {
    container.append(backupCard, maintenanceCard, uploadCard, createCard("Nenhum arquivo", "Envie um CSV para começar."));
    return;
  }

  const fileTabs = document.createElement("div");
  fileTabs.className = "import-tabs";
  importState.files.forEach((file) => {
    fileTabs.append(
      createTabButton(file.name, importState.activeFileId === file.id, () => {
        importState.activeFileId = file.id;
        refreshCurrentView();
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
          refreshCurrentView();
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
    refreshCurrentView();
  });
  actionBar.append(importButton);

  container.append(backupCard, maintenanceCard, uploadCard, fileTabs, statusTabs, stats, list, actionBar);

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
    container.append(summaryCard);
  }
}

async function refreshCurrentView() {
  const routeKey = normalizeRoute(getRoute());
  if (viewState.refresh && viewState.routeKey === routeKey) {
    await viewState.refresh();
    return;
  }
  await renderRoute();
}

async function renderRoute() {
  // Incrementar contador e armazenar localmente
  const currentRender = ++renderCounter;
  
  // Se já estiver renderizando, aguardar um pouco e verificar novamente
  if (isRendering) {
    await new Promise(resolve => setTimeout(resolve, 50));
    // Se não somos a renderização mais recente, cancelar
    if (currentRender !== renderCounter) {
      return;
    }
  }
  
  isRendering = true;
  
  try {
    const currentHash = getRoute();
    const hashBase = currentHash.split("?")[0];
    const hashQuery = currentHash.includes("?")
      ? currentHash.slice(currentHash.indexOf("?"))
      : "";

    if (["#/acompanhamento", "#/balanco", "#/app/acompanhamento"].includes(hashBase)) {
      navigateTo(`#/app/balanco${hashQuery}`);
      return;
    }

    const routeKey = normalizeRoute(currentHash);

    if (routeKey === "#/login") {
      if (authState.ready && authState.user) {
        navigateTo("#/app/dashboard");
        return;
      }
      renderLogin();
      return;
    }
  
  // Restaurar top-bar e month-toolbar quando não estiver no login
  const topBar = document.querySelector('.top-bar');
  const monthToolbar = document.getElementById('month-toolbar');
  const appView = document.getElementById('app-view');
  
  if (topBar) topBar.style.display = '';
  if (monthToolbar) monthToolbar.style.display = '';
  if (appView) {
    appView.style.maxWidth = '';
    appView.style.margin = '';
    appView.style.paddingTop = '';
    appView.style.minHeight = '';
    appView.style.display = '';
    appView.style.alignItems = '';
    appView.style.justifyContent = '';
  }

  if (routeKey.startsWith("#/app/") && !authState.ready) {
    return;
  }

  if (routeKey.startsWith("#/app/") && !authState.user) {
    redirectToLogin();
    return;
  }

  if (routeKey.startsWith("#/app/")) {
    await markHistoricalInvoicesPaid("2026-01");
  }

  const route = routes[routeKey] || routes["#/app/dashboard"];

  const headline = createCard(route.title, route.description);
  appView.innerHTML = "";
  const viewContent = document.createElement("div");
  viewContent.className = "view-content";
  appView.append(headline, viewContent);

  viewState.routeKey = routeKey;
  viewState.refresh = null;

  // Remover FAB anterior se existir
  const existingFab = document.querySelector(".fab");
  if (existingFab) {
    existingFab.remove();
  }

  if (routeKey === "#/app/dashboard") {
    await renderDashboard(viewContent);
    viewState.refresh = () => renderDashboard(viewContent);
  } else if (routeKey === "#/app/transactions") {
    await renderTransactions(viewContent);
    viewState.refresh = () => renderTransactions(viewContent);
  } else if (routeKey === "#/app/balanco") {
    await renderSettlement(viewContent);
    viewState.refresh = () => renderSettlement(viewContent);
  } else if (routeKey === "#/app/cards") {
    await renderCards(viewContent);
    viewState.refresh = () => renderCards(viewContent);
  } else if (routeKey === "#/app/invoices") {
    await renderInvoices(viewContent);
    viewState.refresh = () => renderInvoices(viewContent);
  } else if (routeKey === "#/app/import") {
    await renderImport(viewContent);
    viewState.refresh = () => renderImport(viewContent);
  } else {
    const info = createCard(
      "Mês ativo",
      `Você está visualizando ${formatMonthLabel(monthState.current)}.`,
      [createButton("Alterar mês", { variant: "secondary" })]
    );
    viewContent.append(info);
  }

  // Verificar novamente se somos a renderização mais recente antes de finalizar
  if (currentRender !== renderCounter) {
    return;
  }

  // Controlar FAB (mobile) para transações em rotas relevantes
  const fabButton = document.getElementById("fab-new-transaction");
  if (fabButton) {
    if (["#/app/dashboard", "#/app/transactions"].includes(routeKey)) {
      fabButton.classList.add("visible");
    } else {
      fabButton.classList.remove("visible");
    }
  }

  updateActiveTab();
  } finally {
    isRendering = false;
  }
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
  if (baseHash === "#/acompanhamento" || baseHash === "#/balanco") {
    return "#/app/balanco";
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
    authState.ready = true;
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

async function markHistoricalInvoicesPaid(cutoffMonthKey = "2026-01") {
  const uid = getUserId();
  const cards = await cardRepository.listCards();
  const updates = {};
  const touchedCards = new Set();

  await Promise.all(
    cards.map(async (card) => {
      const invoicesSnap = await get(ref(db, `/users/${uid}/invoices/${card.id}`));
      if (!invoicesSnap.exists()) return;

      const invoices = invoicesSnap.val();
      const monthKeys = Object.keys(invoices).filter((m) => m < cutoffMonthKey);

      if (!monthKeys.length) return;

      await Promise.all(
        monthKeys.map(async (monthKey) => {
          const txList = await transactionRepository.listInvoiceTransactions(card.id, monthKey);
          const invoiceItems = txList.filter((tx) => ["expense", "income"].includes(tx.kind));
          const totalCents = getInvoiceTotalCents(invoiceItems);
          const currentMeta = invoices[monthKey]?.meta || {};

          updates[`/users/${uid}/invoices/${card.id}/${monthKey}/meta`] = stripUndefined({
            ...currentMeta,
            paid: true,
            paidAt: currentMeta.paidAt || Date.now(),
            totalCents,
            monthKey,
          });
          touchedCards.add(card.id);
        })
      );
    })
  );

  if (Object.keys(updates).length) {
    await update(ref(db), updates);
    await Promise.all(
      Array.from(touchedCards).map((cardId) => cardRepository.recomputeCardUnpaidTotal(cardId))
    );
  }
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
    const invoicePath = `/users/${uid}/invoices/${cardId}/${monthKey}`;
    const current = await getInvoiceMeta(cardId, monthKey);
    
    // Se não há transações e a fatura não está paga, remover completamente
    if (totalCents === 0 && !current.paid) {
      await update(ref(db), {
        [invoicePath]: null,
      });
    } else {
      // Atualizar com os valores corretos
      await update(ref(db), {
        [metaPath]: stripUndefined({
          ...current,
          monthKey,
          totalCents,
          updatedAt: Date.now(),
        }),
      });
    }
    
    await recomputeCardUnpaidTotal(cardId);
  }

  async function recomputeCardUnpaidTotal(cardId) {
    const uid = getUserId();
    
    // Primeiro, vamos recomputar TODAS as faturas deste cartão para garantir consistência
    const invoicesSnapshot = await get(ref(db, `/users/${uid}/invoices/${cardId}`));
    const updates = {};
    
    if (!invoicesSnapshot.exists()) {
      updates[`/users/${uid}/cards/${cardId}/unpaidTotalCents`] = 0;
      await update(ref(db), updates);
      return 0;
    }
    
    const invoices = invoicesSnapshot.val();
    const monthKeys = Object.keys(invoices);
    
    // Recomputar cada fatura individualmente
    await Promise.all(
      monthKeys.map(async (monthKey) => {
        const txList = await transactionRepository.listInvoiceTransactions(
          cardId,
          monthKey
        );
        const invoiceItems = txList.filter((tx) =>
          ["expense", "income"].includes(tx.kind)
        );
        const totalCents = getInvoiceTotalCents(invoiceItems);
        
        const current = invoices[monthKey]?.meta || {};
        const metaPath = `/users/${uid}/invoices/${cardId}/${monthKey}/meta`;
        
        // Se não há transações e não está paga, remover o meta completamente
        if (totalCents === 0 && !current.paid) {
          updates[`/users/${uid}/invoices/${cardId}/${monthKey}`] = null;
        } else {
          // Atualizar com os valores corretos
          updates[metaPath] = stripUndefined({
            ...current,
            monthKey,
            totalCents,
            updatedAt: Date.now(),
          });
        }
      })
    );
    
    // Agora calcular o total em aberto baseado nos dados atualizados
    let total = 0;
    Object.entries(updates).forEach(([path, value]) => {
      if (value && path.endsWith('/meta') && !value.paid) {
        total += Number(value.totalCents) || 0;
      }
    });
    
    // Adicionar o unpaid total aos updates
    updates[`/users/${uid}/cards/${cardId}/unpaidTotalCents`] = total;
    
    // Aplicar todas as mudanças de uma vez
    await update(ref(db), updates);
    
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
  // Função para calcular a data de fechamento da fatura para parcelas futuras
  function calculateClosingDate(originalDate, closingDay, monthsOffset) {
    if (!closingDay || monthsOffset === 0) {
      return originalDate; // Primeira parcela mantém a data original
    }
    
    const date = new Date(originalDate);
    date.setMonth(date.getMonth() + monthsOffset);
    
    // Ajustar para o dia de fechamento do cartão
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Criar data com o dia de fechamento
    const closingDate = new Date(year, month, closingDay);
    
    // Se o dia de fechamento não existe no mês (ex: 31 em fevereiro),
    // ajustar para o último dia do mês
    if (closingDate.getMonth() !== month) {
      closingDate.setDate(0); // Volta para o último dia do mês anterior (que é o mês correto)
    }
    
    // Retornar no formato YYYY-MM-DD
    return closingDate.toISOString().split('T')[0];
  }
  
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
    const recurrence = parseRecurrence(withSuggestion.description);
    const subscription = parseSubscription(withSuggestion.description);
    const financing = parseFinancing(withSuggestion.description);
    const monthKey = withSuggestion.monthKey;
    const baseInvoiceMonth = withSuggestion.invoiceMonthKey || monthKey;
    
    // Buscar informações do cartão se houver cardId (para obter closingDay)
    let cardInfo = null;
    if (withSuggestion.cardId) {
      cardInfo = await cardRepo.getCard(withSuggestion.cardId);
    }

    // Processar financiamento (despesas com parcelas de mesmo valor)
    if (financing && financing.current >= 1) {
      const amountCents = Math.round((Number(withSuggestion.amount) || 0) * 100);
      const groupId = hashString([
        withSuggestion.description,
        withSuggestion.date,
        amountCents,
        financing.total,
      ].join("|"));
      
      // Remover notação de financiamento da descrição
      const cleanDescription = withSuggestion.description.replace(/\s*\[FIN:\d{1,3}\/\d{1,3}\]\s*$/i, '').trim();
      
      const updates = {};
      const recomputeTargets = new Set();

      for (let index = financing.current; index <= financing.total; index += 1) {
        const offset = index - financing.current;
        const monthForFinancing = addMonths(monthKey, offset);
        const invoiceMonthKey = withSuggestion.cardId
          ? addMonths(baseInvoiceMonth, offset)
          : undefined;
        
        // Calcular a data correta para a parcela do financiamento
        // Primeira parcela: data original
        // Parcelas futuras: mesma data no mês correspondente (ou data de fechamento se tiver cartão)
        const financingDate = (() => {
          if (offset === 0) {
            // Primeira parcela usa a data original
            return withSuggestion.date;
          }
          
          if (cardInfo && cardInfo.closingDay) {
            // Se tem cartão, usar data de fechamento
            return calculateClosingDate(withSuggestion.date, cardInfo.closingDay, offset);
          }
          
          // Sem cartão: preservar o mesmo dia do mês, avançando os meses
          const originalDate = new Date(withSuggestion.date);
          const day = originalDate.getDate();
          const newDate = new Date(originalDate);
          newDate.setMonth(originalDate.getMonth() + offset);
          
          // Se o dia não existe no novo mês (ex: 31 em fevereiro), 
          // ajustar para o último dia do mês
          if (newDate.getDate() !== day) {
            newDate.setDate(0); // Volta para o último dia do mês anterior
          }
          
          return newDate.toISOString().split('T')[0];
        })();
        
        const txRef = push(ref(db, `/users/${uid}/tx`));
        const txId = txRef.key;
        const payload = stripUndefined({
          ...withSuggestion,
          description: cleanDescription,
          id: txId,
          date: financingDate,
          amount: amountCents / 100, // Mesmo valor para todas as parcelas
          monthKey: monthForFinancing,
          invoiceMonthKey,
          isProjected: offset > 0,
          financing: {
            current: index,
            total: financing.total,
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

    // Processar assinatura (despesas com cartão de crédito - 12 meses)
    if (subscription && subscription.current >= 1 && withSuggestion.cardId) {
      const amountCents = Math.round((Number(withSuggestion.amount) || 0) * 100);
      const groupId = hashString([
        withSuggestion.description,
        withSuggestion.date,
        amountCents,
        subscription.total,
        withSuggestion.cardId,
      ].join("|"));
      
      // Remover notação de assinatura da descrição
      const cleanDescription = withSuggestion.description.replace(/\s*\[SUB\]\s*$/i, '').trim();
      
      const updates = {};
      const recomputeTargets = new Set();

      for (let index = subscription.current; index <= subscription.total; index += 1) {
        const offset = index - subscription.current;
        const monthForSubscription = addMonths(monthKey, offset);
        
        // Calcular a fatura correta (avança mês a mês)
        const invoiceMonthKey = addMonths(baseInvoiceMonth, offset);
        
        // Calcular a data correta para a assinatura
        // Manter o mesmo dia, mas mudar o mês
        const subscriptionDate = (() => {
          const originalDate = new Date(withSuggestion.date);
          const day = originalDate.getDate();
          const newDate = new Date(originalDate);
          newDate.setMonth(originalDate.getMonth() + offset);
          
          // Se o dia não existe no novo mês (ex: 31 em fevereiro), 
          // ajustar para o último dia do mês
          if (newDate.getDate() !== day) {
            newDate.setDate(0); // Volta para o último dia do mês anterior
          }
          
          return newDate.toISOString().split('T')[0];
        })();
        
        const txRef = push(ref(db, `/users/${uid}/tx`));
        const txId = txRef.key;
        
        const payload = stripUndefined({
          ...withSuggestion,
          description: cleanDescription,
          id: txId,
          date: subscriptionDate,
          amount: amountCents / 100,
          monthKey: monthForSubscription,
          invoiceMonthKey,
          isProjected: offset > 0,
          subscription: {
            current: index,
            total: subscription.total,
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

    // Processar recorrência (qualquer tipo de transação)
    if (recurrence && recurrence.current >= 1) {
      const amountCents = Math.round((Number(withSuggestion.amount) || 0) * 100);
      const groupId = hashString([
        withSuggestion.description,
        withSuggestion.date,
        amountCents,
        recurrence.total,
      ].join("|"));
      
      // Remover notação de recorrência da descrição
      const cleanDescription = withSuggestion.description.replace(/\s*\[REC\]\s*$/i, '').trim();
      
      const updates = {};
      const recomputeTargets = new Set();

      for (let index = recurrence.current; index <= recurrence.total; index += 1) {
        const offset = index - recurrence.current;
        const monthForRecurrence = addMonths(monthKey, offset);
        
        // Calcular a data correta para a recorrência
        // Manter o mesmo dia, mas mudar o mês
        const recurrenceDate = (() => {
          const originalDate = new Date(withSuggestion.date);
          const day = originalDate.getDate();
          const newDate = new Date(originalDate);
          newDate.setMonth(originalDate.getMonth() + offset);
          
          // Se o dia não existe no novo mês (ex: 31 em fevereiro), 
          // ajustar para o último dia do mês
          if (newDate.getDate() !== day) {
            newDate.setDate(0); // Volta para o último dia do mês anterior
          }
          
          return newDate.toISOString().split('T')[0];
        })();
        
        const txRef = push(ref(db, `/users/${uid}/tx`));
        const txId = txRef.key;
        
        // Criar payload base removendo campos específicos de cartão
        const { cardId, invoiceMonthKey, ...basePayload } = withSuggestion;
        
        const payload = stripUndefined({
          ...basePayload,
          description: cleanDescription,
          id: txId,
          date: recurrenceDate,
          amount: amountCents / 100,
          monthKey: monthForRecurrence,
          isProjected: offset > 0,
          recurrence: {
            current: index,
            total: recurrence.total,
            groupId,
          },
        });
        Object.assign(updates, buildTransactionUpdates(uid, txId, payload));
      }

      await update(ref(db), updates);
      return { ...withSuggestion };
    }

    // Processar parcelamento (despesas com cartão)
    if (installment && installment.current >= 1) {
      const amountCents = Math.round((Number(withSuggestion.amount) || 0) * 100);
      const perInstallment = Math.floor(amountCents / installment.total);
      const remainder = amountCents % installment.total;
      const groupId = buildInstallmentGroupId(withSuggestion, installment);
      const updates = {};
      const recomputeTargets = new Set();
      
      // Remover notação de parcela da descrição original
      const cleanDescription = (withSuggestion.description || '')
        .replace(/\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/i, '')
        .trim();

      for (let index = installment.current; index <= installment.total; index += 1) {
        const offset = index - installment.current;
        const monthForInstallment = addMonths(monthKey, offset);
        const invoiceMonthKey = withSuggestion.cardId
          ? addMonths(baseInvoiceMonth, offset)
          : undefined;
        
        // Calcular a data correta para a parcela
        // Primeira parcela: data original da compra
        // Parcelas futuras: mesma data no mês correspondente (ou data de fechamento se tiver cartão)
        const installmentDate = (() => {
          if (offset === 0) {
            // Primeira parcela usa a data original
            return withSuggestion.date;
          }
          
          if (cardInfo && cardInfo.closingDay) {
            // Se tem cartão, usar data de fechamento
            return calculateClosingDate(withSuggestion.date, cardInfo.closingDay, offset);
          }
          
          // Sem cartão: preservar o mesmo dia do mês, avançando os meses
          const originalDate = new Date(withSuggestion.date);
          const day = originalDate.getDate();
          const newDate = new Date(originalDate);
          newDate.setMonth(originalDate.getMonth() + offset);
          
          // Se o dia não existe no novo mês (ex: 31 em fevereiro), 
          // ajustar para o último dia do mês
          if (newDate.getDate() !== day) {
            newDate.setDate(0); // Volta para o último dia do mês anterior
          }
          
          return newDate.toISOString().split('T')[0];
        })();
        
        const installmentCents =
          perInstallment + (index - 1 < remainder ? 1 : 0);
        const txRef = push(ref(db, `/users/${uid}/tx`));
        const txId = txRef.key;
        const payload = stripUndefined({
          ...withSuggestion,
          description: cleanDescription,
          id: txId,
          date: installmentDate,
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

  async function updateFutureGroupedTransactions(tx, patch, options = {}) {
    const uid = getUserId();
    const groupConfig = (() => {
      if (tx.installment?.groupId) {
        return { field: "installment", groupId: tx.installment.groupId, current: tx.installment.current };
      }
      if (tx.financing?.groupId) {
        return { field: "financing", groupId: tx.financing.groupId, current: tx.financing.current };
      }
      if (tx.subscription?.groupId) {
        return { field: "subscription", groupId: tx.subscription.groupId, current: tx.subscription.current };
      }
      if (tx.recurrence?.groupId) {
        return { field: "recurrence", groupId: tx.recurrence.groupId, current: tx.recurrence.current };
      }
      return null;
    })();

    if (!groupConfig) return;

    const includeCurrent = options.includeCurrent !== false;
    const sanitizedPatch = stripUndefined(patch);

    const allTxRef = ref(db, `/users/${uid}/tx`);
    const snapshot = await get(allTxRef);
    if (!snapshot.exists()) return;

    const allTransactions = snapshot.val();
    const updates = {};
    const recomputeTargets = new Set();

    Object.entries(allTransactions).forEach(([id, transaction]) => {
      const group = transaction[groupConfig.field];
      if (!group || group.groupId !== groupConfig.groupId) {
        return;
      }

      const shouldInclude = includeCurrent
        ? group.current >= groupConfig.current
        : group.current > groupConfig.current;

      if (!shouldInclude) {
        return;
      }

      const next = stripUndefined({ ...transaction, ...sanitizedPatch });
      updates[`/users/${uid}/tx/${id}`] = next;

      if (transaction.cardId && transaction.invoiceMonthKey) {
        recomputeTargets.add(`${transaction.cardId}::${transaction.invoiceMonthKey}`);
      }
    });

    if (!Object.keys(updates).length) return;

    await update(ref(db), updates);
    await Promise.all(
      Array.from(recomputeTargets).map((key) => {
        const [cardId, invoiceMonthKey] = key.split("::");
        return cardRepo.recomputeInvoiceMeta(cardId, invoiceMonthKey);
      })
    );
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

  async function deleteFutureInstallments(tx) {
    const uid = getUserId();
    const groupId = tx.installment?.groupId;
    if (!groupId) return;

    // Buscar todas as transações
    const allTxRef = ref(db, `/users/${uid}/tx`);
    const snapshot = await get(allTxRef);
    if (!snapshot.exists()) return;

    const allTransactions = snapshot.val();
    const updates = {};
    const recomputeTargets = new Set();

    // Encontrar e deletar esta parcela e todas as futuras do mesmo grupo
    Object.entries(allTransactions).forEach(([id, transaction]) => {
      if (
        transaction.installment?.groupId === groupId &&
        transaction.installment?.current >= tx.installment.current
      ) {
        updates[`/users/${uid}/tx/${id}`] = null;
        
        if (transaction.monthKey) {
          updates[`/users/${uid}/txByMonth/${transaction.monthKey}/${id}`] = null;
        }
        
        if (transaction.cardId && transaction.invoiceMonthKey) {
          updates[
            `/users/${uid}/cardTxByInvoice/${transaction.cardId}/${transaction.invoiceMonthKey}/${id}`
          ] = null;
          recomputeTargets.add(`${transaction.cardId}::${transaction.invoiceMonthKey}`);
        }
      }
    });

    await update(ref(db), updates);
    
    // Recomputar faturas afetadas
    await Promise.all(
      Array.from(recomputeTargets).map((key) => {
        const [cardId, invoiceMonthKey] = key.split("::");
        return cardRepo.recomputeInvoiceMeta(cardId, invoiceMonthKey);
      })
    );
  }

  async function deleteFutureRecurrences(tx) {
    const uid = getUserId();
    const groupId = tx.recurrence?.groupId;
    if (!groupId) return;

    // Buscar todas as transações
    const allTxRef = ref(db, `/users/${uid}/tx`);
    const snapshot = await get(allTxRef);
    if (!snapshot.exists()) return;

    const allTransactions = snapshot.val();
    const updates = {};

    // Encontrar e deletar esta recorrência e todas as futuras do mesmo grupo
    Object.entries(allTransactions).forEach(([id, transaction]) => {
      if (
        transaction.recurrence?.groupId === groupId &&
        transaction.recurrence?.current >= tx.recurrence.current
      ) {
        updates[`/users/${uid}/tx/${id}`] = null;
        
        if (transaction.monthKey) {
          updates[`/users/${uid}/txByMonth/${transaction.monthKey}/${id}`] = null;
        }
      }
    });

    await update(ref(db), updates);
  }

  async function deleteFutureSubscriptions(tx) {
    const uid = getUserId();
    const groupId = tx.subscription?.groupId;
    if (!groupId) return;

    // Buscar todas as transações
    const allTxRef = ref(db, `/users/${uid}/tx`);
    const snapshot = await get(allTxRef);
    if (!snapshot.exists()) return;

    const allTransactions = snapshot.val();
    const updates = {};
    const recomputeTargets = new Set();

    // Encontrar e deletar esta assinatura e todas as futuras do mesmo grupo
    Object.entries(allTransactions).forEach(([id, transaction]) => {
      if (
        transaction.subscription?.groupId === groupId &&
        transaction.subscription?.current >= tx.subscription.current
      ) {
        updates[`/users/${uid}/tx/${id}`] = null;
        
        if (transaction.monthKey) {
          updates[`/users/${uid}/txByMonth/${transaction.monthKey}/${id}`] = null;
        }
        
        if (transaction.cardId && transaction.invoiceMonthKey) {
          updates[
            `/users/${uid}/cardTxByInvoice/${transaction.cardId}/${transaction.invoiceMonthKey}/${id}`
          ] = null;
          recomputeTargets.add(`${transaction.cardId}::${transaction.invoiceMonthKey}`);
        }
      }
    });

    await update(ref(db), updates);
    
    // Recomputar faturas afetadas
    await Promise.all(
      Array.from(recomputeTargets).map((key) => {
        const [cardId, invoiceMonthKey] = key.split("::");
        return cardRepo.recomputeInvoiceMeta(cardId, invoiceMonthKey);
      })
    );
  }

  async function deleteFutureFinancings(tx) {
    const uid = getUserId();
    const groupId = tx.financing?.groupId;
    if (!groupId) return;

    // Buscar todas as transações
    const allTxRef = ref(db, `/users/${uid}/tx`);
    const snapshot = await get(allTxRef);
    if (!snapshot.exists()) return;

    const allTransactions = snapshot.val();
    const updates = {};
    const recomputeTargets = new Set();

    // Encontrar e deletar esta parcela de financiamento e todas as futuras do mesmo grupo
    Object.entries(allTransactions).forEach(([id, transaction]) => {
      if (
        transaction.financing?.groupId === groupId &&
        transaction.financing?.current >= tx.financing.current
      ) {
        updates[`/users/${uid}/tx/${id}`] = null;
        
        if (transaction.monthKey) {
          updates[`/users/${uid}/txByMonth/${transaction.monthKey}/${id}`] = null;
        }
        
        if (transaction.cardId && transaction.invoiceMonthKey) {
          updates[
            `/users/${uid}/cardTxByInvoice/${transaction.cardId}/${transaction.invoiceMonthKey}/${id}`
          ] = null;
          recomputeTargets.add(`${transaction.cardId}::${transaction.invoiceMonthKey}`);
        }
      }
    });

    await update(ref(db), updates);
    
    // Recomputar faturas afetadas
    await Promise.all(
      Array.from(recomputeTargets).map((key) => {
        const [cardId, invoiceMonthKey] = key.split("::");
        return cardRepo.recomputeInvoiceMeta(cardId, invoiceMonthKey);
      })
    );
  }

  async function updateTransactionSettlement(txId, settled) {
    if (!txId) return;
    const uid = getUserId();
    const basePath = `/users/${uid}/tx/${txId}`;
    const updates = {
      [`${basePath}/settled`]: Boolean(settled),
      [`${basePath}/settledAt`]: settled ? serverTimestamp() : null,
      [`${basePath}/settledBy`]: settled ? uid : null,
    };
    await update(ref(db), updates);
  }

  async function batchSetSettlement(txIds, settled) {
    const ids = (txIds || []).filter(Boolean);
    if (!ids.length) return;
    const uid = getUserId();
    const updates = {};
    ids.forEach((txId) => {
      const basePath = `/users/${uid}/tx/${txId}`;
      updates[`${basePath}/settled`] = Boolean(settled);
      updates[`${basePath}/settledAt`] = settled ? serverTimestamp() : null;
      updates[`${basePath}/settledBy`] = settled ? uid : null;
    });
    await update(ref(db), updates);
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
    const allTransactions = results.filter(Boolean);
    
    // Filtrar transações de cartão de crédito que não sejam do mês atual
    // (elas aparecem apenas como resumo da fatura no mês de vencimento)
    const transactions = allTransactions.filter(tx => {
      // Se não tem cartão, incluir sempre
      if (!tx.cardId || !tx.invoiceMonthKey) {
        return true;
      }
      
      // Se tem cartão mas a fatura é do mês atual, incluir
      // (transações do cartão aparecem no mês da fatura como resumo)
      return tx.invoiceMonthKey === monthKey;
    });
    
    // Adicionar transações virtuais de resumo de faturas
    // Buscar todas as faturas do mês que tenham transações
    const cards = await cardRepo.listCards();
    const invoiceSummaries = [];
    
    for (const card of cards) {
      // Verificar se há transações no cartão para este mês de fatura
      const invoiceTransactions = await listInvoiceTransactions(card.id, monthKey);
      
      if (invoiceTransactions.length > 0) {
        // Calcular o total da fatura
        const totalCents = invoiceTransactions.reduce((sum, tx) => {
          return sum + Math.round((Number(tx.amount) || 0) * 100);
        }, 0);
        
        // Buscar a data de vencimento (dia de vencimento do cartão)
        const dueDay = card.dueDay || 15; // Padrão: dia 15
        const [year, month] = monthKey.split('-').map(Number);
        const dueDate = new Date(year, month - 1, dueDay);
        
        // Ajustar se o dia não existe no mês
        if (dueDate.getMonth() !== month - 1) {
          dueDate.setDate(0); // Último dia do mês anterior (que é o mês correto)
        }
        
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        // Criar transação virtual de resumo da fatura
        const invoiceSummary = {
          id: `invoice-summary-${card.id}-${monthKey}`,
          description: `Fatura - ${card.name}`,
          amount: totalCents / 100,
          kind: 'expense',
          categoryId: 'utilities', // Categoria "Contas"
          date: dueDateStr,
          monthKey: monthKey,
          cardId: card.id,
          invoiceMonthKey: monthKey,
          isInvoiceSummary: true, // Flag para identificar que é um resumo
          _isVirtual: true, // Não deve ser editável/deletável diretamente
        };
        
        invoiceSummaries.push(invoiceSummary);
      }
    }
    
    // Combinar transações reais com resumos de faturas
    // mas removendo as transações individuais do cartão que já estão no resumo
    const nonCardTransactions = transactions.filter(tx => !tx.cardId || !tx.invoiceMonthKey);
    return [...nonCardTransactions, ...invoiceSummaries];
  }

  async function listMonthTransactionsRaw(monthKey) {
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
    updateFutureGroupedTransactions,
    deleteTransaction,
    deleteFutureInstallments,
    deleteFutureRecurrences,
    deleteFutureSubscriptions,
    deleteFutureFinancings,
    updateTransactionSettlement,
    batchSetSettlement,
    listMonthTransactions,
    listMonthTransactionsRaw,
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
  
  // Configurar FAB de nova transação
  const fabButton = document.getElementById("fab-new-transaction");
  if (fabButton) {
    fabButton.addEventListener("click", () => openTransactionModal());
  }
  
  window.addEventListener("hashchange", handleHashChange);
  renderRoute();
}

init();
