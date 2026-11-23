"use strict";

const STORAGE_KEY = "rashody.expenses.v1";
const CATEGORIES = new Set(["Еда", "Транспорт", "Дом", "Другое"]);

const form = document.querySelector("#expense-form");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const commentInput = document.querySelector("#comment");
const amountError = document.querySelector("#amount-error");
const expenseList = document.querySelector("#expense-list");
const emptyState = document.querySelector("#empty-state");
const monthTotal = document.querySelector("#month-total");

let expenses = loadExpenses();

dateInput.value = getLocalDateValue(new Date());
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

function parseAmount(value) {
  const normalized = value.replace(/\s/g, "");

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
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

function render() {
  expenseList.replaceChildren();
  emptyState.hidden = expenses.length > 0;

  const fragment = document.createDocumentFragment();
  expenses.forEach((expense) => fragment.append(createExpenseItem(expense)));
  expenseList.append(fragment);

  monthTotal.value = formatMoney(getCurrentMonthTotal());
  monthTotal.textContent = monthTotal.value;
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

function getCurrentMonthTotal() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;

  return expenses.reduce((total, expense) => {
    return expense.date.startsWith(currentMonth) ? total + expense.amount : total;
  }, 0);
}

function showAmountError(message) {
  amountError.textContent = message;
  amountInput.setAttribute("aria-invalid", "true");
}

function clearAmountError() {
  amountError.textContent = "";
  amountInput.removeAttribute("aria-invalid");
}
