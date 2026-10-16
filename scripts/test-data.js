#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pkg = require('../package.json');

const OUTPUT_FILE = path.join(__dirname, 'test-data.json');
const REPORT_FILE = path.join(__dirname, 'td-report.md');

// -----------------------------------------------------------------------------
// Configuration pools
//
// These pools mirror the constants and models declared under src/app/core so
// the generated data always conforms to the app's current domain shape:
// - ACCOUNT_TYPES             -> core/constants/account-types.constant.ts
// - SCHEDULED_TRANSACTION_TYPES -> core/constants/scheduled-transaction-types.constant.ts
// - SEED_CATEGORIES           -> core/constants/seed-categories.constant.ts
// - LOCAL_STORAGE_KEYS        -> core/constants/local-storage-keys.constant.ts
// -----------------------------------------------------------------------------

const STORAGE_KEYS = {
  accounts: 'peco.accounts',
  movements: 'peco.movements',
  categories: 'peco.catalog.categories',
  scheduledTransactions: 'peco_scheduled_transactions',
};

const ACCOUNT_NAMES = [
  'Cuenta de nómina',
  'Ahorro U',
  'Ahorro',
  'Tarjeta de crédito',
  'Inversiones',
  'Viajes 2027',
  'Fondo de emergencia',
  'Casa',
  'Auto',
  'Mascotas',
  'Tecnología',
  'Regalos',
  'Salud',
  'Educación',
  'Negocio',
  'Freelance',
  'Proyecto X',
  'Vacaciones',
  'Boda',
  'Gastos del mes',
];

const ACCOUNT_NOTES = [
  'Cuenta principal',
  'Ahorro a largo plazo',
  'Gastos diarios',
  'Fondo compartido',
];

// Account types mirror ACCOUNT_TYPES. Each account stores the whole type object
// (key, name, color, icon) as required by the Account model.
const ACCOUNT_TYPES = [
  {key: 'CASH', name: 'Efectivo', color: 'emerald', icon: 'banknote'},
  {key: 'DEBIT', name: 'Débito', color: 'blue', icon: 'credit-card'},
  {key: 'CREDIT', name: 'Crédito', color: 'rose', icon: 'credit-card'},
  {key: 'SAVINGS', name: 'Ahorros', color: 'amber', icon: 'piggy-bank'},
];

// Scheduled transaction types mirror SCHEDULED_TRANSACTION_TYPES.
const SCHEDULED_TRANSACTION_TYPES = [
  {key: 'INCOME', name: 'Ingreso', color: 'emerald', icon: 'chevron-up'},
  {key: 'EXPENSE', name: 'Egreso', color: 'rose', icon: 'chevron-down'},
  {key: 'TRANSFER', name: 'Transferencia', color: 'sky', icon: 'arrow-left-right'},
];

const RECURRENCE_FREQUENCIES = ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'YEARLY'];

const INCOME_SCHEDULE_NAMES = ['Salario', 'Freelance', 'Renta departamento', 'Bonos'];
const EXPENSE_SCHEDULE_NAMES = [
  'Renta',
  'Internet',
  'Luz',
  'Agua',
  'Gimnasio',
  'Streaming',
  'Seguro auto',
  'Transporte',
];
const TRANSFER_SCHEDULE_NAMES = ['Ahorro mensual', 'Fondo de emergencia', 'Pago tarjeta'];

// Categories mirror SEED_CATEGORIES. The Category model requires id, name,
// displayName, icon, color and applyType (isRoot / isSystem are optional).
const SEED_CATEGORIES = [
  {
    id: 'unknown',
    name: 'unknown',
    displayName: 'Otros',
    icon: 'folder-open',
    color: '#6B7280',
    applyType: 'BOTH',
    isRoot: true,
  },
  {
    id: 'payroll',
    name: 'payroll',
    displayName: 'Nómina',
    icon: 'banknote',
    color: '#10B981',
    applyType: 'INCOME',
  },
  {
    id: 'services',
    name: 'services',
    displayName: 'Servicios',
    icon: 'zap',
    color: '#F59E0B',
    applyType: 'EXPENSE',
  },
  {
    id: 'car',
    name: 'car',
    displayName: 'Auto',
    icon: 'car',
    color: '#3B82F6',
    applyType: 'EXPENSE',
  },
  {
    id: 'kids',
    name: 'kids',
    displayName: 'Hijos',
    icon: 'baby',
    color: '#EC4899',
    applyType: 'EXPENSE',
  },
  {
    id: 'debts',
    name: 'debts',
    displayName: 'Deudas',
    icon: 'credit-card',
    color: '#EF4444',
    applyType: 'EXPENSE',
  },
  {
    id: 'gifts',
    name: 'gifts',
    displayName: 'Regalos',
    icon: 'gift',
    color: '#8B5CF6',
    applyType: 'BOTH',
  },
  {
    id: 'donations',
    name: 'donations',
    displayName: 'Donaciones',
    icon: 'heart-handshake',
    color: '#14B8A6',
    applyType: 'BOTH',
  },
  {
    id: 'transfer',
    name: 'transfer',
    displayName: 'Transferencia',
    icon: 'arrow-left-right',
    color: '#6366F1',
    applyType: 'TRANSFER',
    isSystem: true,
  },
  {
    id: 'adjustment',
    name: 'adjustment',
    displayName: 'Ajuste de Saldo',
    icon: 'scale',
    color: '#64748B',
    applyType: 'BOTH',
    isSystem: true,
  },
];

// Category ids come from the app's SEED_CATEGORIES so rendered movements resolve.
const INCOME_CATEGORIES = ['payroll', 'gifts', 'donations', 'unknown'];
const EXPENSE_CATEGORIES = ['services', 'car', 'kids', 'debts', 'gifts', 'donations', 'unknown'];
const TRANSFER_CATEGORY = 'transfer';

const NOTES = [
  'Sueldo mensual',
  'Renta de oficina',
  'Supermercado',
  'Gasolina',
  'Comida',
  'Servicios de internet',
  'Gimnasio',
  'Salida con amigos',
  'Regalo',
  'Donación',
  'Cine',
  'Transporte',
  'Ropa',
  'Farmacia',
  'Suscripción streaming',
  'Cena familiar',
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH_START = new Date(CURRENT_YEAR, NOW.getMonth(), 1);
const YEAR_START = new Date(CURRENT_YEAR, 0, 1);
const DAY_IN_MS = 86_400_000;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomOf = (items) => items[randomInt(0, items.length - 1)];

const maybe = (probability) => Math.random() < probability;

const shuffle = (items) => {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
};

const roundAmount = (amount) => Math.round(amount * 100) / 100;

const formatMoney = (amount) => `$${amount.toFixed(2)}`;

const monthKey = (isoDate) => {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const randomIsoDateInRange = (start, end) => {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime)).toISOString();
};

const toDateKey = (date) => date.toISOString().split('T')[0];

// Mirrors core/utils/to-iso-date.util.ts (local calendar date, no time).
const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Generates 5 distinct random dates within the current year (up to today).
const generateCreatedAtPool = () => {
  const pool = [];
  const seenDays = new Set();

  while (pool.length < 5) {
    const candidate = new Date(randomIsoDateInRange(YEAR_START, NOW));
    const key = toDateKey(candidate);
    if (seenDays.has(key)) continue;
    seenDays.add(key);
    pool.push(candidate);
  }

  return shuffle(pool);
};

const pickType = (accountCount) => {
  const roll = Math.random();
  if (accountCount >= 2) {
    if (roll < 0.42) return 'INCOME';
    if (roll < 0.92) return 'EXPENSE';
    return 'TRANSFER';
  }
  return roll < 0.45 ? 'INCOME' : 'EXPENSE';
};

const pickAmount = (type) => {
  if (type === 'INCOME') {
    return Math.random() < 0.12 ? randomInt(4000, 9000) : randomInt(400, 3500);
  }
  if (type === 'TRANSFER') {
    return randomInt(250, 2500);
  }
  return Math.random() < 0.05 ? randomInt(1500, 4000) : randomInt(15, 1200);
};

const pickCategory = (type) => {
  if (type === 'INCOME') return randomOf(INCOME_CATEGORIES);
  if (type === 'TRANSFER') return TRANSFER_CATEGORY;
  return randomOf(EXPENSE_CATEGORIES);
};

const categoryById = (id) => SEED_CATEGORIES.find((category) => category.id === id);

// -----------------------------------------------------------------------------
// Account generation
// -----------------------------------------------------------------------------

const generateAccounts = () => {
  const accountCount = randomInt(1, 5);
  const names = shuffle([...ACCOUNT_NAMES]).slice(0, accountCount);
  const types = shuffle([...ACCOUNT_TYPES]);
  const createdAtPool = generateCreatedAtPool();

  return names.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    currentBalance: 0, // Computed after movements are generated.
    type: {...types[index % types.length]},
    includeInTotal: maybe(0.85),
    createdAt: createdAtPool[index].toISOString(),
    pinToHome: maybe(0.35),
    isRoot: index === 0, // Exactly one account is the root account.
    note: maybe(0.25) ? randomOf(ACCOUNT_NOTES) : undefined,
  }));
};

// -----------------------------------------------------------------------------
// Movement generation
// -----------------------------------------------------------------------------

const generateMovements = (accounts) => {
  const movements = [];

  for (const account of accounts) {
    const count = randomInt(15, 90);
    const accountCreated = new Date(account.createdAt);
    const minDate = Math.max(CURRENT_MONTH_START.getTime(), accountCreated.getTime());
    const monthStart = new Date(minDate);
    const otherAccounts = accounts.filter((candidate) => candidate.id !== account.id);

    for (let index = 0; index < count; index += 1) {
      let type = pickType(accounts.length);
      // Bias 35% of the movements to the current month so the default view has data.
      const lowerBound = Math.random() < 0.35 ? monthStart : accountCreated;
      const date = randomIsoDateInRange(lowerBound, NOW);
      let amount = roundAmount(pickAmount(type));
      let categoryId = pickCategory(type);
      let targetAccountId;

      if (type === 'TRANSFER') {
        if (otherAccounts.length === 0) {
          // Fallback without a second account: treat as an expense.
          type = 'EXPENSE';
          categoryId = pickCategory('EXPENSE');
          amount = roundAmount(pickAmount('EXPENSE'));
        } else {
          targetAccountId = randomOf(otherAccounts).id;
        }
      }

      const movement = {
        id: crypto.randomUUID(),
        accountId: account.id,
        categoryId,
        type,
        amount,
        date,
      };

      if (targetAccountId) movement.targetAccountId = targetAccountId;
      if (maybe(0.6)) movement.note = randomOf(NOTES);

      movements.push(movement);
    }
  }

  return movements;
};

// Builds reversal movements the same way core/utils/build-reversal-movement.util.ts
// does. A reversed movement keeps its own balance impact and its reversal adds the
// opposite one, so the net effect over an account stays consistent.
const generateReversals = (movements) => {
  // A reversal flips INCOME <-> EXPENSE while keeping the original category, so
  // only `BOTH` categories remain compatible after the flip.
  const candidates = movements.filter(
    (movement) =>
      movement.type !== 'TRANSFER' && categoryById(movement.categoryId)?.applyType === 'BOTH',
  );
  if (candidates.length === 0) return [];

  const count = Math.min(candidates.length, randomInt(0, 2));
  const picked = shuffle([...candidates]).slice(0, count);
  const reversals = [];

  for (const original of picked) {
    original.isReversal = true;

    const originalTime = new Date(original.date).getTime();
    const reversalTime = Math.min(NOW.getTime(), originalTime + randomInt(1, 5) * DAY_IN_MS);
    const reversedType = original.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
    const label = original.type === 'INCOME' ? 'ingreso' : 'egreso';

    reversals.push({
      id: crypto.randomUUID(),
      accountId: original.accountId,
      categoryId: original.categoryId,
      type: reversedType,
      amount: original.amount,
      date: new Date(reversalTime).toISOString(),
      note: `Reversión de ${label} ${original.id}`,
      reversalId: original.id,
      isReversal: true,
    });
  }

  return reversals;
};

// -----------------------------------------------------------------------------
// Scheduled transaction generation
// -----------------------------------------------------------------------------

const generateScheduledTransactions = (accounts) => {
  if (accounts.length === 0) return [];

  const count = randomInt(2, 5);
  const canTransfer = accounts.length >= 2;
  const schedules = [];

  for (let index = 0; index < count; index += 1) {
    const roll = Math.random();
    const typeKey = canTransfer
      ? roll < 0.35
        ? 'INCOME'
        : roll < 0.8
          ? 'EXPENSE'
          : 'TRANSFER'
      : roll < 0.4
        ? 'INCOME'
        : 'EXPENSE';

    const type = SCHEDULED_TRANSACTION_TYPES.find((candidate) => candidate.key === typeKey);
    const source = randomOf(accounts);
    const destination =
      typeKey === 'TRANSFER'
        ? randomOf(accounts.filter((candidate) => candidate.id !== source.id))
        : undefined;

    const categoryId =
      typeKey === 'TRANSFER'
        ? TRANSFER_CATEGORY
        : typeKey === 'INCOME'
          ? randomOf(INCOME_CATEGORIES)
          : randomOf(EXPENSE_CATEGORIES);

    const frequency = randomOf(RECURRENCE_FREQUENCIES);
    const interval = frequency === 'MONTHLY' ? randomInt(1, 3) : 1;

    // nextExecutionDate stays in the future (date-only string, like the form
    // input) so importing the fixture never auto-applies a schedule.
    const nextExecutionDate = toIsoDate(addDays(NOW, randomInt(1, 45)));

    const stopCondition = randomOf(['NEVER', 'OCCURRENCES', 'DATE']);
    const totalOccurrences = stopCondition === 'OCCURRENCES' ? randomInt(3, 24) : undefined;
    const endDate =
      stopCondition === 'DATE' ? toIsoDate(addDays(NOW, randomInt(60, 365))) : undefined;
    const completedOccurrences = totalOccurrences
      ? randomInt(0, Math.max(0, totalOccurrences - 1))
      : randomInt(0, 8);

    const earliestCreation = new Date(
      Math.max(new Date(source.createdAt).getTime(), YEAR_START.getTime()),
    );
    const createdAt = randomIsoDateInRange(earliestCreation, NOW);
    const updatedAt = randomIsoDateInRange(new Date(createdAt), NOW);

    const namePool =
      typeKey === 'INCOME'
        ? INCOME_SCHEDULE_NAMES
        : typeKey === 'TRANSFER'
          ? TRANSFER_SCHEDULE_NAMES
          : EXPENSE_SCHEDULE_NAMES;

    schedules.push({
      id: crypto.randomUUID(),
      name: randomOf(namePool),
      estimatedAmount: roundAmount(pickAmount(typeKey)),
      type,
      categoryId,
      sourceAccountId: source.id,
      destinationAccountId: destination?.id,
      frequency,
      interval,
      nextExecutionDate,
      autoApply: maybe(0.6),
      active: maybe(0.8),
      totalOccurrences,
      completedOccurrences,
      endDate,
      createdAt,
      updatedAt,
    });
  }

  return schedules;
};

// Creates a few canceled occurrences (isCanceled + scheduledTransactionId) so the
// fixture also exercises the omitted-payment branch of the Movement model.
const generateCanceledOccurrences = (schedules) => {
  if (schedules.length === 0) return [];

  const count = Math.min(schedules.length, randomInt(0, 2));
  const picked = shuffle([...schedules]).slice(0, count);
  const occurrences = [];

  for (const schedule of picked) {
    schedule.completedOccurrences += 1;

    occurrences.push({
      id: crypto.randomUUID(),
      accountId: schedule.sourceAccountId,
      categoryId: schedule.categoryId,
      type: schedule.type.key,
      amount: schedule.estimatedAmount,
      date: randomIsoDateInRange(new Date(schedule.createdAt), NOW),
      note: `${schedule.name} — omitido`,
      targetAccountId: schedule.destinationAccountId,
      isCanceled: true,
      scheduledTransactionId: schedule.id,
    });
  }

  return occurrences;
};

// -----------------------------------------------------------------------------
// Balance computation (mirrors core/utils/movement-balance-impact.util.ts)
// -----------------------------------------------------------------------------

const computeBalances = (accounts, movements) => {
  const balances = new Map(accounts.map((account) => [account.id, 0]));

  for (const movement of movements) {
    if (movement.isCanceled) continue;

    const sourceImpact = movement.type === 'INCOME' ? movement.amount : -movement.amount;
    balances.set(movement.accountId, balances.get(movement.accountId) + sourceImpact);

    if (movement.type === 'TRANSFER' && movement.targetAccountId) {
      balances.set(
        movement.targetAccountId,
        balances.get(movement.targetAccountId) + movement.amount,
      );
    }
  }

  return balances;
};

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

const isCategoryCompatible = (categoryId, type) => {
  const category = categoryById(categoryId);
  if (!category) return false;
  if (type === 'TRANSFER') return category.applyType === 'TRANSFER';
  if (type === 'INCOME') return category.applyType === 'INCOME' || category.applyType === 'BOTH';
  return category.applyType === 'EXPENSE' || category.applyType === 'BOTH';
};

const validate = (accounts, movements, scheduledTransactions) => {
  const accountIds = new Set(accounts.map((account) => account.id));
  const uniqueNames = accounts.length === new Set(accounts.map((account) => account.name)).size;
  const hasValidType = accounts.every(
    (account) =>
      account.type &&
      typeof account.type === 'object' &&
      typeof account.type.key === 'string' &&
      typeof account.type.name === 'string' &&
      typeof account.type.color === 'string' &&
      typeof account.type.icon === 'string',
  );
  const hasSingleRoot = accounts.filter((account) => account.isRoot === true).length === 1;

  const countsWithinRange = accounts.every((account) => {
    const count = movements.filter((movement) => movement.accountId === account.id).length;
    return count >= 15 && count <= 100;
  });

  const referencesValid = movements.every(
    (movement) =>
      accountIds.has(movement.accountId) &&
      isCategoryCompatible(movement.categoryId, movement.type) &&
      (movement.type !== 'TRANSFER' ||
        (typeof movement.targetAccountId === 'string' && accountIds.has(movement.targetAccountId))),
  );

  const datesWithinAccountLifecycle = movements.every((movement) => {
    const account = accounts.find((candidate) => candidate.id === movement.accountId);
    if (!account) return false;
    const date = new Date(movement.date).getTime();
    const created = new Date(account.createdAt).getTime();
    return date >= created && date <= NOW.getTime();
  });

  const balancesMatchMovements = accounts.every((account) => {
    const expected = roundAmount(
      movements.reduce((total, movement) => total + balanceImpact(movement, account.id), 0),
    );
    return account.currentBalance === expected;
  });

  const schedulesValid = scheduledTransactions.every(
    (schedule) =>
      typeof schedule.name === 'string' &&
      schedule.name.length > 0 &&
      typeof schedule.estimatedAmount === 'number' &&
      schedule.type &&
      typeof schedule.type.key === 'string' &&
      accountIds.has(schedule.sourceAccountId) &&
      isCategoryCompatible(schedule.categoryId, schedule.type.key) &&
      typeof schedule.frequency === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(schedule.nextExecutionDate) &&
      typeof schedule.completedOccurrences === 'number' &&
      typeof schedule.active === 'boolean' &&
      typeof schedule.autoApply === 'boolean' &&
      (schedule.type.key !== 'TRANSFER' ||
        (typeof schedule.destinationAccountId === 'string' &&
          accountIds.has(schedule.destinationAccountId) &&
          schedule.destinationAccountId !== schedule.sourceAccountId)),
  );

  return {
    uniqueNames,
    hasValidType,
    hasSingleRoot,
    countsWithinRange,
    referencesValid,
    datesWithinAccountLifecycle,
    balancesMatchMovements,
    schedulesValid,
  };
};

const balanceImpact = (movement, accountId) => {
  if (movement.isCanceled) return 0;

  switch (movement.type) {
    case 'INCOME':
      return movement.accountId === accountId ? movement.amount : 0;
    case 'EXPENSE':
      return movement.accountId === accountId ? -movement.amount : 0;
    case 'TRANSFER':
      if (movement.accountId === accountId) return -movement.amount;
      if (movement.targetAccountId === accountId) return movement.amount;
      return 0;
    default:
      return 0;
  }
};

// -----------------------------------------------------------------------------
// Build and write the backup file
// -----------------------------------------------------------------------------

const buildMarkdownReport = (accounts, movements, scheduledTransactions, dataFileRelativePath) => {
  const incomeMovements = movements.filter((movement) => movement.type === 'INCOME');
  const expenseMovements = movements.filter((movement) => movement.type === 'EXPENSE');
  const transferMovements = movements.filter((movement) => movement.type === 'TRANSFER');

  const totalIncome = roundAmount(
    incomeMovements.reduce((total, movement) => total + movement.amount, 0),
  );
  const totalExpenses = roundAmount(
    expenseMovements.reduce((total, movement) => total + movement.amount, 0),
  );
  const totalTransfers = roundAmount(
    transferMovements.reduce((total, movement) => total + movement.amount, 0),
  );
  const netBalance = roundAmount(totalIncome - totalExpenses);

  const byMonth = new Map();
  for (const movement of movements) {
    const key = monthKey(movement.date);
    const entry = byMonth.get(key) ?? {count: 0, income: 0, expenses: 0, transfers: 0};
    entry.count += 1;
    if (movement.type === 'INCOME') entry.income += movement.amount;
    else if (movement.type === 'EXPENSE') entry.expenses += movement.amount;
    else entry.transfers += movement.amount;
    byMonth.set(key, entry);
  }
  const monthRows = [...byMonth.entries()].sort(([left], [right]) => left.localeCompare(right));

  const movementsByAccount = new Map(
    accounts.map((account) => [
      account.id,
      movements.filter(
        (movement) => movement.accountId === account.id || movement.targetAccountId === account.id,
      ),
    ]),
  );

  const checks = validate(accounts, movements, scheduledTransactions);

  const lines = [];
  lines.push('# Test Data Report');
  lines.push('');
  lines.push(`- **Generated at:** \`${NOW.toISOString()}\``);
  lines.push(`- **App version:** \`${pkg.version}\``);
  lines.push(`- **Data file:** \`${dataFileRelativePath}\``);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Accounts | ${accounts.length} |`);
  lines.push(`| Movements | ${movements.length} |`);
  lines.push(`| Scheduled transactions | ${scheduledTransactions.length} |`);
  lines.push(`| Total income | ${formatMoney(totalIncome)} |`);
  lines.push(`| Total expenses | ${formatMoney(totalExpenses)} |`);
  lines.push(`| Total transfers | ${formatMoney(totalTransfers)} |`);
  lines.push(`| Net balance | ${formatMoney(netBalance)} |`);
  lines.push('');

  lines.push('## Accounts');
  lines.push('');
  lines.push(
    '| Name | Type | Root | Created at | Current balance | Target goal | Movements | Note |',
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const account of accounts) {
    lines.push(
      `| ${account.name} | ${account.type.name} (${account.type.key}) | ${
        account.isRoot === true ? 'yes' : 'no'
      } | ${account.createdAt.split('T')[0]} | ${formatMoney(
        account.currentBalance,
      )} | ${
        account.targetGoal === undefined ? 'n/a' : formatMoney(account.targetGoal)
      } | ${movementsByAccount.get(account.id).length} | ${account.note ?? 'n/a'} |`,
    );
  }
  lines.push('');

  lines.push('## Scheduled transactions');
  lines.push('');
  if (scheduledTransactions.length === 0) {
    lines.push('_None generated._');
  } else {
    lines.push(
      '| Name | Type | Amount | Frequency | Next execution | Completed | Active | Auto-apply |',
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const schedule of scheduledTransactions) {
      lines.push(
        `| ${schedule.name} | ${schedule.type.name} (${schedule.type.key}) | ${formatMoney(
          schedule.estimatedAmount,
        )} | ${schedule.frequency}${
          schedule.interval && schedule.interval > 1 ? ` x${schedule.interval}` : ''
        } | ${schedule.nextExecutionDate} | ${schedule.completedOccurrences}${
          schedule.totalOccurrences === undefined ? '' : `/${schedule.totalOccurrences}`
        } | ${schedule.active ? 'yes' : 'no'} | ${schedule.autoApply ? 'yes' : 'no'} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Movements per month');
  lines.push('');
  lines.push('| Month | Movements | Income | Expenses | Transfers | Net |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [month, entry] of monthRows) {
    const net = roundAmount(entry.income - entry.expenses);
    lines.push(
      `| ${month} | ${entry.count} | ${formatMoney(entry.income)} | ${formatMoney(
        entry.expenses,
      )} | ${formatMoney(entry.transfers)} | ${formatMoney(net)} |`,
    );
  }
  lines.push('');

  lines.push('## Validation');
  lines.push('');
  lines.push(
    `- ${checks.uniqueNames ? '[x]' : '[ ]'} All accounts have distinct names (${accounts.length} accounts).`,
  );
  lines.push(
    `- ${checks.hasValidType ? '[x]' : '[ ]'} Every account stores a valid type object (key, name, color, icon).`,
  );
  lines.push(
    `- ${checks.hasSingleRoot ? '[x]' : '[ ]'} Exactly one account is marked as the root account (isRoot).`,
  );
  lines.push(
    `- ${checks.countsWithinRange ? '[x]' : '[ ]'} Every account has between 15 and 100 movements.`,
  );
  lines.push(
    `- ${checks.referencesValid ? '[x]' : '[ ]'} Every movement references a valid account and a category compatible with its type.`,
  );
  lines.push(
    `- ${checks.datesWithinAccountLifecycle ? '[x]' : '[ ]'} Every movement date is within its account's lifecycle (createdAt..today).`,
  );
  lines.push(
    `- ${checks.balancesMatchMovements ? '[x]' : '[ ]'} Every account balance matches the accumulated movement impact.`,
  );
  lines.push(
    `- ${checks.schedulesValid ? '[x]' : '[ ]'} Every scheduled transaction matches the model (source account, category, transfer destination).`,
  );
  lines.push('');

  return lines.join('\n');
};

const generate = () => {
  const accounts = generateAccounts();
  const scheduledTransactions = generateScheduledTransactions(accounts);

  const baseMovements = generateMovements(accounts);
  const reversals = generateReversals(baseMovements);
  const canceledOccurrences = generateCanceledOccurrences(scheduledTransactions);
  const movements = shuffle([...baseMovements, ...reversals, ...canceledOccurrences]);

  const balanceByAccount = computeBalances(accounts, movements);
  for (const account of accounts) {
    account.currentBalance = roundAmount(balanceByAccount.get(account.id));
    if (maybe(0.5) && account.currentBalance > 0) {
      account.targetGoal = roundAmount(account.currentBalance * (1.3 + Math.random() * 2.5));
    }
  }

  const dataFileRelativePath = `scripts/${path.basename(OUTPUT_FILE)}`;

  const backup = {
    version: pkg.version,
    exportedAt: NOW.toISOString(),
    data: {
      [STORAGE_KEYS.accounts]: accounts,
      [STORAGE_KEYS.movements]: movements,
      [STORAGE_KEYS.categories]: SEED_CATEGORIES,
      [STORAGE_KEYS.scheduledTransactions]: scheduledTransactions,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(backup, null, 2)}\n`);
  fs.writeFileSync(
    REPORT_FILE,
    `${buildMarkdownReport(accounts, movements, scheduledTransactions, dataFileRelativePath)}\n`,
  );

  const totalIncome = movements
    .filter((movement) => movement.type === 'INCOME')
    .reduce((total, movement) => total + movement.amount, 0);
  const totalExpenses = movements
    .filter((movement) => movement.type === 'EXPENSE')
    .reduce((total, movement) => total + movement.amount, 0);

  // eslint-disable-next-line no-console
  console.log('Test data generated successfully!');
  console.log(`  File: ${OUTPUT_FILE}`);
  console.log(`  Report: ${REPORT_FILE}`);
  console.log(`  Accounts: ${accounts.length}`);
  for (const account of accounts) {
    console.log(
      `    - ${account.name} [${account.type.key}]${
        account.isRoot ? ' (root)' : ''
      }: ${account.currentBalance.toFixed(2)} | ${
        movements.filter((movement) => movement.accountId === account.id).length
      } movements | created ${account.createdAt.split('T')[0]} | target goal ${
        account.targetGoal === undefined ? 'none' : account.targetGoal.toFixed(2)
      }`,
    );
  }
  console.log(`  Scheduled transactions: ${scheduledTransactions.length}`);
  console.log(`  Movements: ${movements.length}`);
  console.log(`  Incomes: $${totalIncome.toFixed(2)} | Expenses: $${totalExpenses.toFixed(2)}`);
  console.log('');
  console.log(
    'To load it in the app, go to Ajustes > Datos y copias > Importar información and select scripts/test-data.json.',
  );
};

generate();
