"use strict";

const STORAGE_KEY = "rashody.expenses.v1";
const BUDGET_STORAGE_KEY = "rashody.budget.v1";
const CATEGORY_NAMES = ["Еда", "Транспорт", "Дом", "Другое"];
const CATEGORIES = new Set(CATEGORY_NAMES);

const form = document.querySelector("#expense-form");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const commentInput = document.querySelector("#comment");
const amountError = document.querySelector("#amount-error");
const expenseList = document.querySelector("#expense-list");
const emptyState = document.querySelector("#empty-state");
const monthTotal = document.querySelector("#month-total");
const categoryTotalOutputs = {
  Еда: document.querySelector("#category-total-food"),
  Транспорт: document.querySelector("#category-total-transport"),
  Дом: document.querySelector("#category-total-home"),
  Другое: document.querySelector("#category-total-other"),
};
const categoryLimitOutputs = {
  Еда: document.querySelector("#category-limit-food"),
  Транспорт: document.querySelector("#category-limit-transport"),
  Дом: document.querySelector("#category-limit-home"),
  Другое: document.querySelector("#category-limit-other"),
};
const categoryRemainingOutputs = {
  Еда: document.querySelector("#category-remaining-food"),
  Транспорт: document.querySelector("#category-remaining-transport"),
  Дом: document.querySelector("#category-remaining-home"),
  Другое: document.querySelector("#category-remaining-other"),
};
const categoryStatusLabels = {
  Еда: document.querySelector("#category-status-label-food"),
  Транспорт: document.querySelector("#category-status-label-transport"),
  Дом: document.querySelector("#category-status-label-home"),
  Другое: document.querySelector("#category-status-label-other"),
};
const budgetForm = document.querySelector("#budget-form");
const budgetTotal = document.querySelector("#budget-total");
const budgetFields = {
  Еда: {
    input: document.querySelector("#budget-food"),
    error: document.querySelector("#budget-food-error"),
  },
  Транспорт: {
    input: document.querySelector("#budget-transport"),
    error: document.querySelector("#budget-transport-error"),
  },
  Дом: {
    input: document.querySelector("#budget-home"),
    error: document.querySelector("#budget-home-error"),
  },
  Другое: {
    input: document.querySelector("#budget-other"),
    error: document.querySelector("#budget-other-error"),
  },
};

let expenses = loadExpenses();
let budgetLimits = loadBudgetLimits();

dateInput.value = getLocalDateValue(new Date());
fillBudgetInputs();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = parseAmount(amountInput.value);
  if (amount === null) {
    showAmountError("Введите целую сумму больше нуля");
    amountInput.focus();
    return;
  }

  if (!dateInput.value) {
    dateInput.reportValidity();
    return;
  }

  clearAmountError();

  const expense = {
    id: createId(),
    amount,
    category: CATEGORIES.has(categoryInput.value) ? categoryInput.value : "Другое",
    date: dateInput.value,
    comment: commentInput.value.trim(),
  };

  expenses.unshift(expense);
  saveExpenses();
  render();

  amountInput.value = "";
  commentInput.value = "";
  amountInput.focus();
});

amountInput.addEventListener("input", () => {
  if (amountError.textContent) {
    clearAmountError();
  }
});

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nextLimits = {};
  let firstInvalidInput = null;

  CATEGORY_NAMES.forEach((category) => {
    const field = budgetFields[category];
    const limit = parseBudgetLimit(field.input.value);

    if (limit === null) {
      showFieldError(field.input, field.error, "Введите целую сумму от нуля");
      firstInvalidInput ||= field.input;
      return;
    }

    clearFieldError(field.input, field.error);
    nextLimits[category] = limit;
  });

  if (firstInvalidInput) {
    firstInvalidInput.focus();
    return;
  }

  budgetLimits = nextLimits;
  saveBudgetLimits();
  fillBudgetInputs();
  render();
});

CATEGORY_NAMES.forEach((category) => {
  const field = budgetFields[category];
  field.input.addEventListener("input", () => {
    if (field.error.textContent) {
      clearFieldError(field.input, field.error);
    }
  });
});

function parseAmount(value) {
  const normalized = value.replace(/\s/g, "");

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function parseBudgetLimit(value) {
  const normalized = value.replace(/\s/g, "");

  if (normalized === "") {
    return 0;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const limit = Number(normalized);
  return Number.isSafeInteger(limit) && limit >= 0 ? limit : null;
}

function formatMoney(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    return "0 ₸";
  }

  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}г.` : "";
}

function getLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadExpenses() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) {
      return [];
    }

    return stored.filter(isValidExpense);
  } catch {
    return [];
  }
}

function loadBudgetLimits() {
  const emptyLimits = Object.fromEntries(CATEGORY_NAMES.map((category) => [category, 0]));

  try {
    const stored = JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return emptyLimits;
    }

    CATEGORY_NAMES.forEach((category) => {
      if (Number.isSafeInteger(stored[category]) && stored[category] >= 0) {
        emptyLimits[category] = stored[category];
      }
    });
  } catch {
    return emptyLimits;
  }

  return emptyLimits;
}

function isValidExpense(expense) {
  return Boolean(
    expense
      && typeof expense.id === "string"
      && Number.isSafeInteger(expense.amount)
      && expense.amount > 0
      && CATEGORIES.has(expense.category)
      && /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
      && typeof expense.comment === "string"
  );
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function saveBudgetLimits() {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgetLimits));
}

function render() {
  expenseList.replaceChildren();
  emptyState.hidden = expenses.length > 0;

  const fragment = document.createDocumentFragment();
  expenses.forEach((expense) => fragment.append(createExpenseItem(expense)));
  expenseList.append(fragment);

  const totals = getCurrentMonthTotals();
  monthTotal.value = formatMoney(totals.total);
  monthTotal.textContent = monthTotal.value;

  CATEGORY_NAMES.forEach((category) => {
    const formattedTotal = formatMoney(totals.byCategory[category]);
    const formattedLimit = formatMoney(budgetLimits[category]);
    const difference = budgetLimits[category] - totals.byCategory[category];
    const isOverrun = difference < 0;
    const formattedRemaining = formatMoney(Math.abs(difference));
    const statusLabel = categoryStatusLabels[category];

    categoryTotalOutputs[category].value = formattedTotal;
    categoryTotalOutputs[category].textContent = formattedTotal;
    categoryLimitOutputs[category].value = formattedLimit;
    categoryLimitOutputs[category].textContent = formattedLimit;
    categoryRemainingOutputs[category].value = formattedRemaining;
    categoryRemainingOutputs[category].textContent = formattedRemaining;
    statusLabel.textContent = isOverrun ? "Перерасход:" : "Осталось";
    statusLabel.parentElement.classList.toggle("category-totals__status--overrun", isOverrun);
  });

  renderBudgetTotal();
}

function fillBudgetInputs() {
  CATEGORY_NAMES.forEach((category) => {
    budgetFields[category].input.value = formatMoney(budgetLimits[category]).replace(" ₸", "");
  });
}

function renderBudgetTotal() {
  const total = CATEGORY_NAMES.reduce((sum, category) => sum + budgetLimits[category], 0);
  const formattedTotal = formatMoney(total);
  budgetTotal.value = formattedTotal;
  budgetTotal.textContent = formattedTotal;
}

function createExpenseItem(expense) {
  const item = document.createElement("li");
  item.className = "expense-item";

  const category = document.createElement("p");
  category.className = "expense-item__category";
  category.textContent = expense.category;

  const amount = document.createElement("p");
  amount.className = "expense-item__amount";
  amount.textContent = formatMoney(expense.amount);

  const date = document.createElement("p");
  date.className = "expense-item__date";
  date.textContent = formatDate(expense.date);

  item.append(category, amount, date);

  if (expense.comment) {
    const comment = document.createElement("p");
    comment.className = "expense-item__comment";
    comment.textContent = expense.comment;
    item.append(comment);
  }

  return item;
}

function getCurrentMonthTotals() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const byCategory = Object.fromEntries(CATEGORY_NAMES.map((category) => [category, 0]));

  expenses.forEach((expense) => {
    if (expense.date.startsWith(currentMonth)) {
      byCategory[expense.category] += expense.amount;
    }
  });

  return {
    byCategory,
    total: CATEGORY_NAMES.reduce((sum, category) => sum + byCategory[category], 0),
  };
}

function showAmountError(message) {
  amountError.textContent = message;
  amountInput.setAttribute("aria-invalid", "true");
}

function clearAmountError() {
  amountError.textContent = "";
  amountInput.removeAttribute("aria-invalid");
}

function showFieldError(input, error, message) {
  error.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function clearFieldError(input, error) {
  error.textContent = "";
  input.removeAttribute("aria-invalid");
}
