'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const shared = require('../src/shared');

// ---------------------------------------------------------------------------
// isTrTLD
// ---------------------------------------------------------------------------

test('isTrTLD returns true for .com.tr domain', () => {
  assert.strictEqual(shared.isTrTLD('example.com.tr'), true);
});

test('isTrTLD returns true for bare .tr domain', () => {
  assert.strictEqual(shared.isTrTLD('example.tr'), true);
});

test('isTrTLD returns false for .com domain', () => {
  assert.strictEqual(shared.isTrTLD('example.com'), false);
});

test('isTrTLD returns false for .net domain', () => {
  assert.strictEqual(shared.isTrTLD('example.net'), false);
});

test('isTrTLD is case-insensitive', () => {
  assert.strictEqual(shared.isTrTLD('example.COM.TR'), true);
});

// ---------------------------------------------------------------------------
// validateContact — normalization (returns contact with defaults filled in)
// ---------------------------------------------------------------------------

const FULL_CONTACT = {
  FirstName:        'Ali',
  LastName:         'Veli',
  AddressLine1:     '123 Test Street',
  City:             'Ankara',
  Country:          'TR',
  ZipCode:          '06000',
  Phone:            '5321234567',
  PhoneCountryCode: '90',
};

test('validateContact returns a complete contact unchanged (all fields supplied)', () => {
  const result = shared.validateContact({ ...FULL_CONTACT });
  assert.strictEqual(result.FirstName,    'Ali');
  assert.strictEqual(result.LastName,     'Veli');
  assert.strictEqual(result.AddressLine1, '123 Test Street');
  assert.strictEqual(result.City,         'Ankara');
  assert.strictEqual(result.Country,      'TR');
  assert.strictEqual(result.ZipCode,      '06000');
});

test('validateContact fills FirstName default when missing', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, FirstName: undefined });
  assert.strictEqual(result.FirstName, 'Isimyok');
});

test('validateContact fills LastName default when missing', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, LastName: undefined });
  assert.strictEqual(result.LastName, 'Isimyok');
});

test('validateContact fills LastName with FirstName when FirstName is supplied but LastName is empty', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, LastName: '   ' });
  assert.strictEqual(result.LastName, 'Ali');
});

test('validateContact fills AddressLine1 default when missing', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, AddressLine1: undefined });
  assert.strictEqual(result.AddressLine1, 'Addres yok');
});

test('validateContact fills City default when missing', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, City: undefined });
  assert.strictEqual(result.City, 'ISTANBUL');
});

test('validateContact fills Country default when missing', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, Country: undefined });
  assert.strictEqual(result.Country, 'TR');
});

test('validateContact fills ZipCode default when missing', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, ZipCode: undefined });
  assert.strictEqual(result.ZipCode, '34000');
});

// ---------------------------------------------------------------------------
// validateContact — phone normalization
// ---------------------------------------------------------------------------

test('validateContact: 10-digit phone → PhoneCountryCode empty, Phone = digits', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, Phone: '5321234567', PhoneCountryCode: undefined });
  assert.strictEqual(result.Phone, '5321234567');
  assert.strictEqual(result.PhoneCountryCode, '90'); // empty CC → default 90
});

test('validateContact: 12-digit phone starting with 90 → splits CC and number', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, Phone: '905321234567', PhoneCountryCode: undefined });
  assert.strictEqual(result.PhoneCountryCode, '90');
  assert.strictEqual(result.Phone, '5321234567');
});

test('validateContact: 11-digit phone starting with 9 → CC = first 2 digits', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, Phone: '90532123456', PhoneCountryCode: undefined });
  assert.strictEqual(result.PhoneCountryCode, '90');
  assert.strictEqual(result.Phone, '532123456');
});

test('validateContact: phone with non-digit chars gets stripped', () => {
  const result = shared.validateContact({ ...FULL_CONTACT, Phone: '+90 532 123 45 67', PhoneCountryCode: undefined });
  // +90 stripped → 905321234567 → 12 digits starting with 90
  assert.strictEqual(result.PhoneCountryCode, '90');
  assert.strictEqual(result.Phone, '5321234567');
});

test('validateContact: completely empty contact gets all defaults', () => {
  const result = shared.validateContact({});
  assert.strictEqual(result.FirstName,        'Isimyok');
  assert.strictEqual(result.LastName,         'Isimyok');
  assert.strictEqual(result.AddressLine1,     'Addres yok');
  assert.strictEqual(result.City,             'ISTANBUL');
  assert.strictEqual(result.Country,          'TR');
  assert.strictEqual(result.ZipCode,          '34000');
  assert.strictEqual(result.PhoneCountryCode, '90');
  assert.strictEqual(result.Phone,            '5555555555');
});
