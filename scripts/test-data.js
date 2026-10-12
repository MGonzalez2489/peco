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
// -----------------------------------------------------------------------------

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

// Colors must match the app's ACCOUNT_COLORS keys.
const ACCOUNT_COLORS = ['indigo', 'emerald', 'amber', 'rose', 'violet', 'sky'];

// Icons must match the app's IconName union.
const ACCOUNT_ICONS = [
  'wallet',
  'piggy-bank',
  'credit-card',
  'landmark',
  'banknote',
  'house',
  'car',
  'gift',
  'coffee',
  'zap',
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

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomOf = (items) => items[randomInt(0, items.length - 1)];

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

// Generates 5 distinct random dates within the current year (up to today).
const generateCreatedAtPool = () => {
  const yearStart = new Date(CURRENT_YEAR, 0, 1);
  const pool = [];
  const seenDays = new Set();

  while (pool.length < 5) {
    const candidate = new Date(randomIsoDateInRange(yearStart, NOW));
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

// -----------------------------------------------------------------------------
// Account generation
// -----------------------------------------------------------------------------

const generateAccounts = () => {
  const accountCount = randomInt(1, 5);
  const names = shuffle([...ACCOUNT_NAMES]).slice(0, accountCount);
  const colors = shuffle([...ACCOUNT_COLORS]).slice(0, accountCount);
  const icons = shuffle([...ACCOUNT_ICONS]).slice(0, accountCount);
  const createdAtPool = generateCreatedAtPool();

  return names.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    currentBalance: 0, // Computed after movements are generated.
    includeInTotal: true,
    createdAt: createdAtPool[index].toISOString(),
    color: colors[index],
    icon: icons[index],
    pinToHome: Math.random() < 0.35,
  }));
};

// -----------------------------------------------------------------------------
// Movement generation
// -----------------------------------------------------------------------------

const generateMovements = (accounts, balanceByAccount) => {
  const movements = [];

  for (const account of accounts) {
    const count = randomInt(15, 100);
    const accountCreated = new Date(account.createdAt);
    const minDate = Math.max(CURRENT_MONTH_START.getTime(), accountCreated.getTime());
    const monthStart = new Date(minDate);
    const otherAccounts = accounts.filter((candidate) => candidate.id !== account.id);

    for (let index = 0; index < count; index += 1) {
      const type = pickType(accounts.length);
      // Bias 35% of the movements to the current month so the default view has data.
      const lowerBound = Math.random() < 0.35 ? monthStart : accountCreated;
      const date = randomIsoDateInRange(lowerBound, NOW);
      const amount = roundAmount(pickAmount(type));

      const movement = {
        id: crypto.randomUUID(),
        accountId: account.id,
        categoryId: pickCategory(type),
        type,
        amount,
        date,
      };

      if (type === 'TRANSFER') {
        if (otherAccounts.length === 0) {
          // Fallback without a second account: treat as an expense.
          movement.type = 'EXPENSE';
          movement.categoryId = pickCategory('EXPENSE');
          movement.amount = roundAmount(pickAmount('EXPENSE'));
        } else {
          movement.targetAccountId = randomOf(otherAccounts).id;
        }
      }

      if (Math.random() < 0.6) {
        movement.note = randomOf(NOTES);
      }

      movements.push(movement);

      // Accumulate balances so each account shows a consistent current balance.
      const sourceBalance = balanceByAccount.get(account.id);

      if (movement.type === 'INCOME') {
        balanceByAccount.set(account.id, sourceBalance + movement.amount);
      } else if (movement.type === 'EXPENSE') {
        balanceByAccount.set(account.id, sourceBalance - movement.amount);
      } else {
        balanceByAccount.set(account.id, sourceBalance - movement.amount);
        balanceByAccount.set(
          movement.targetAccountId,
          balanceByAccount.get(movement.targetAccountId) + movement.amount,
        );
      }
    }
  }

  return movements;
};

// -----------------------------------------------------------------------------
// Build and write the backup file
// -----------------------------------------------------------------------------

const buildMarkdownReport = (accounts, movements, dataFileRelativePath) => {
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

  // Validation checks for data integrity.
  const uniqueNames = accounts.length === new Set(accounts.map((account) => account.name)).size;
  const uniqueColors = accounts.length === new Set(accounts.map((account) => account.color)).size;
  const countsWithinRange = accounts.every((account) => {
    const count = movements.filter((movement) => movement.accountId === account.id).length;
    return count >= 15 && count <= 100;
  });
  const datesWithinAccountLifecycle = movements.every((movement) => {
    const account = accounts.find((candidate) => candidate.id === movement.accountId);
    if (!account) return false;
    const date = new Date(movement.date).getTime();
    const created = new Date(account.createdAt).getTime();
    return date >= created && date <= NOW.getTime();
  });
  const balancesMatchMovements = accounts.every((account) => {
    const expected = roundAmount(
      movements.reduce((total, movement) => {
        if (movement.accountId === account.id) {
          if (movement.type === 'INCOME') return total + movement.amount;
          return total - movement.amount;
        }
        if (movement.type === 'TRANSFER' && movement.targetAccountId === account.id) {
          return total + movement.amount;
        }
        return total;
      }, 0),
    );
    return account.currentBalance === expected;
  });

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
  lines.push(`| Total income | ${formatMoney(totalIncome)} |`);
  lines.push(`| Total expenses | ${formatMoney(totalExpenses)} |`);
  lines.push(`| Total transfers | ${formatMoney(totalTransfers)} |`);
  lines.push(`| Net balance | ${formatMoney(netBalance)} |`);
  lines.push('');

  lines.push('## Accounts');
  lines.push('');
  lines.push('| Name | Color | Created at | Current balance | Target goal | Movements |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const account of accounts) {
    lines.push(
      `| ${account.name} | ${account.color} | ${account.createdAt.split('T')[0]} | ${formatMoney(
        account.currentBalance,
      )} | ${
        account.targetGoal === undefined ? 'n/a' : formatMoney(account.targetGoal)
      } | ${movementsByAccount.get(account.id).length} |`,
    );
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
    `- ${uniqueNames ? '[x]' : '[ ]'} All accounts have distinct names (${accounts.length} accounts).`,
  );
  lines.push(
    `- ${uniqueColors ? '[x]' : '[ ]'} All accounts have distinct colors (${accounts.length} accounts).`,
  );
  lines.push(
    `- ${countsWithinRange ? '[x]' : '[ ]'} Every account has between 15 and 100 movements.`,
  );
  lines.push(
    `- ${datesWithinAccountLifecycle ? '[x]' : '[ ]'} Every movement date is within its account's lifecycle (createdAt..today).`,
  );
  lines.push(
    `- ${balancesMatchMovements ? '[x]' : '[ ]'} Every account balance matches the accumulated movement impact.`,
  );
  lines.push('');

  return lines.join('\n');
};

const generate = () => {
  const accounts = generateAccounts();
  const balanceByAccount = new Map(accounts.map((account) => [account.id, 0]));
  const movements = generateMovements(accounts, balanceByAccount);

  for (const account of accounts) {
    account.currentBalance = roundAmount(balanceByAccount.get(account.id));
    if (Math.random() < 0.5 && account.currentBalance > 0) {
      account.targetGoal = roundAmount(account.currentBalance * (1.3 + Math.random() * 2.5));
    }
  }

  const dataFileRelativePath = `scripts/${path.basename(OUTPUT_FILE)}`;

  const backup = {
    version: pkg.version,
    exportedAt: NOW.toISOString(),
    data: {
      'peco.accounts': accounts,
      'peco.movements': movements,
      'peco_scheduled_transactions': [],
    },
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(backup, null, 2)}\n`);
  fs.writeFileSync(
    REPORT_FILE,
    `${buildMarkdownReport(accounts, movements, dataFileRelativePath)}\n`,
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
      `    - ${account.name} (${account.color}): ${account.currentBalance.toFixed(2)} | ${
        movements.filter((movement) => movement.accountId === account.id).length
      } movements | created ${account.createdAt.split('T')[0]} | target goal ${
        account.targetGoal === undefined ? 'none' : account.targetGoal.toFixed(2)
      }`,
    );
  }
  console.log(`  Movements: ${movements.length}`);
  console.log(`  Incomes: $${totalIncome.toFixed(2)} | Expenses: $${totalExpenses.toFixed(2)}`);
  console.log('');
  console.log(
    'To load it in the app, go to Ajustes > Datos y copias > Importar información and select scripts/test-data.json.',
  );
};

generate();
