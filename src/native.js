// Native bridge for the Android app. Bundled by esbuild into www/native.js, which exposes window.AimNative.
// The web page (www/index.html) works without it (plain browser); it only reads window.AimNative.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';
import { PRO_ID, INTERSTITIAL_ID, ADS_TEST } from './config.js';

const PAYMENT_CANCELLED = 6777006; // cdv-purchase ErrorCode.PAYMENT_CANCELLED

// ---------------- Google Play Billing (one-time "AimMap Pro") ----------------
let cbOwned = () => {}, cbPrice = () => {}, billingStarted = false;
function isOwned() {
  try { if (store.owned(PRO_ID)) return true; } catch (e) {}
  // Purchases Google Play reports for this account (also after a reinstall) show up as local transactions.
  try { return (store.localTransactions || []).some(t => (t.products || []).some(p => p.id === PRO_ID)); } catch (e) { return false; }
}
function productPrice() {
  try {
    const p = store.get(PRO_ID, Platform.GOOGLE_PLAY), o = p && p.getOffer && p.getOffer();
    const ph = o && o.pricingPhases && o.pricingPhases[0];
    return (ph && ph.price) || (p && p.pricing && p.pricing.price) || null;
  } catch (e) { return null; }
}
function check() {
  const pr = productPrice(); if (pr) cbPrice(pr);
  if (isOwned()) cbOwned();
}
const billing = {
  async init({ onOwned, onPrice }) {
    cbOwned = onOwned || cbOwned; cbPrice = onPrice || cbPrice;
    if (billingStarted) { check(); return; }
    billingStarted = true;
    store.register([{ id: PRO_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.GOOGLE_PLAY }]);
    store.when()
      .approved(t => { try { t.finish(); } catch (e) {} cbOwned(); })   // acknowledge, otherwise Google refunds after 3 days
      .productUpdated(check)
      .receiptUpdated(check);
    store.error(e => console.warn('IAP error', e && e.code, e && e.message));
    await store.initialize([Platform.GOOGLE_PLAY]);
    check();
  },
  async buy() {
    const p = store.get(PRO_ID, Platform.GOOGLE_PLAY), o = p && p.getOffer && p.getOffer();
    if (!o) return { error: 'The store is not available right now. Try again in a moment.' };
    const err = await o.order();
    if (err) return err.code === PAYMENT_CANCELLED ? {} : { error: 'The purchase could not be completed.' };
    return {};
  },
  async restore() {
    try { await store.restorePurchases(); } catch (e) {}
    try { await store.update(); } catch (e) {}
    check();
  }
};

// ---------------- AdMob: one full-screen ad when the app opens (free version only) ----------------
let adsReady = null;
function initAds() {
  if (!adsReady) {
    adsReady = (async () => {
      try {   // EU/UK consent (Google UMP). The form is shown only where it is required.
        const info = await AdMob.requestConsentInfo();
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) {}
      await AdMob.initialize({ initializeForTesting: ADS_TEST });
    })();
  }
  return adsReady;
}
async function showInterstitial() {
  await initAds();
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 20000);
    const fin = () => { clearTimeout(timer); resolve(); };
    (async () => {
      try {
        await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, fin);
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, fin);
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, fin);
        await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: ADS_TEST });
        await AdMob.showInterstitial();
      } catch (e) { fin(); }
    })();
  });
}

// ---------------- files ----------------
const toB64 = text => btoa(unescape(encodeURIComponent(text)));
const files = {
  async saveImage(name, b64) {
    try {
      await Filesystem.writeFile({ path: 'AimMap/' + name, data: b64, directory: Directory.Documents, recursive: true });
      return 'Documents/AimMap/' + name;
    } catch (e) {
      await Filesystem.writeFile({ path: 'AimMap/' + name, data: b64, directory: Directory.External, recursive: true });
      return 'AimMap/' + name;
    }
  },
  async shareImage(name, b64) {
    const r = await Filesystem.writeFile({ path: name, data: b64, directory: Directory.Cache });
    await Share.share({ title: 'AimMap', files: [r.uri] });
  },
  async shareText(name, text) {
    const r = await Filesystem.writeFile({ path: name, data: toB64(text), directory: Directory.Cache });
    await Share.share({ title: name, files: [r.uri] });
  }
};

window.AimNative = {
  isNative: Capacitor.isNativePlatform(),
  billing,
  ads: { showInterstitial },
  app: {
    onBack(cb) { App.addListener('backButton', () => cb()); },
    exit() { App.exitApp(); }
  },
  files
};
