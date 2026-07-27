import assert from "node:assert/strict";
import {
  getBrasiliaDateParts,
  getBrasiliaMonthKey,
  getBrasiliaMonthStartUtc,
  isBrasiliaMonthTurnoverWindow,
} from "../lib/brasilia";

// 2026-08-01 00:30 BRT = 2026-08-01 03:30 UTC
const day1 = new Date("2026-08-01T03:30:00.000Z");
assert.equal(getBrasiliaMonthKey(day1), "2026-08");
assert.equal(getBrasiliaDateParts(day1).day, 1);
assert.equal(isBrasiliaMonthTurnoverWindow(day1), true);
assert.equal(getBrasiliaMonthStartUtc(day1).toISOString(), "2026-08-01T03:00:00.000Z");

// 2026-07-31 22:00 BRT = 2026-08-01 01:00 UTC → ainda julho em Brasília
const lateJuly = new Date("2026-08-01T01:00:00.000Z");
assert.equal(getBrasiliaMonthKey(lateJuly), "2026-07");
assert.equal(isBrasiliaMonthTurnoverWindow(lateJuly), false);

// 2026-08-01 00:00 BRT exatamente
const midnight = new Date("2026-08-01T03:00:00.000Z");
assert.equal(getBrasiliaMonthKey(midnight), "2026-08");
assert.equal(getBrasiliaMonthStartUtc(midnight).getTime(), midnight.getTime());

console.log("OK: fuso Brasília / virada de mês.");
