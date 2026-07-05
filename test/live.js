/**
 * Canlı test runner — GERÇEK kimlik bilgilerinle çalışır.
 *
 * Kullanım:
 *   DNA_USER='kullanici' DNA_PASS='sifre' node test/live.js
 *   DNA_USER='550e8400-...uuid...' DNA_PASS='api-token' DNA_TEST=1 node test/live.js   (REST + OTE)
 *
 * Sadece OKUMA yapan / para harcamayan metotları çağırır.
 * Para harcayan / değiştiren metotlar (Register, Renew, Transfer, SaveContacts...)
 * en altta KAPALI olarak duruyor — bilerek açman gerekir.
 */
const DomainNameApi = require('../index');

const USER = process.env.DNA_USER || 'ownername';
const PASS = process.env.DNA_PASS || 'ownerpass';
const TEST = process.env.DNA_TEST === '1'; // REST için OTE ortamı
const DOMAIN = process.env.DNA_DOMAIN || 'bnyx-3c596887.site'; // GetDetails/GetContacts için sahip olduğun bir domain

const api = new DomainNameApi(USER, PASS, TEST);

const DELAY_MS = Number(process.env.DNA_DELAY || 1000); // testler arası bekleme (ms)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Küçük yardımcı: metodu çağır, sonucu düzgün yazdır, sonra bekle.
async function run(label, fn) {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    const res = await fn();
    console.dir(res, { depth: 4, colors: true });
  } catch (err) {
    console.error('  throw ile hata:', err.message);
  }
  await sleep(DELAY_MS);
}

(async () => {
  console.log(`nodejs-dna v${DomainNameApi.VERSION}`);
  console.log(`Transport: ${api.getActiveTransport()}  |  testMode(OTE): ${TEST}`);

  // --- Saf yardımcılar (ağ yok) ---
  await run('IsTrTLD("deneme.com.tr")', () => api.IsTrTLD('deneme.com.tr'));
  await run('ValidateContact({...eksik...})', () =>
    api.ValidateContact({ FirstName: 'Ali', LastName: 'Veli', EMail: 'a@b.com' }));

  // --- Güvenli okuma çağrıları (para harcamaz) ---
  await run('GetResellerDetails()', () => api.GetResellerDetails());
  await run('GetCurrentBalance("USD")', () => api.GetCurrentBalance('USD'));
  await run('CheckAvailability(["deneme-xyz-123"], ["com","net"], 1)', () =>
    api.CheckAvailability(['deneme-xyz-123'], ['com', 'net'], 1));
  await run('GetTldList(5)', () => api.GetTldList(5));
  await run('GetList()  (ilk sayfa)', () => api.GetList());
  await run(`GetDetails("${DOMAIN}")`, () => api.GetDetails(DOMAIN));
  await run(`GetContacts("${DOMAIN}")`, () => api.GetContacts(DOMAIN));

  // ----------------------------------------------------------------------
  // ⚠️  AŞAĞISI PARA HARCAR / DEĞİŞTİRİR — açmak için yorumu kaldır.
  // ----------------------------------------------------------------------
  // await run('Renew', () => api.Renew(DOMAIN, 1));
  // await run('EnableTheftProtectionLock', () => api.EnableTheftProtectionLock(DOMAIN));
  // await run('ModifyPrivacyProtectionStatus', () => api.ModifyPrivacyProtectionStatus(DOMAIN, 1));
  // (Register/Transfer için test-register.js'deki contacts yapısına bak.)

  console.log('\n✔ bitti');
})();
