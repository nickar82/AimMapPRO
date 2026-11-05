# Βήματα για Google Play, AdMob και GitHub

## 1. Keystore (υπογραφή)
Στον υπολογιστή σου (χρειάζεται Java):

    keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
    base64 -w0 upload.jks        # στο macOS: base64 -i upload.jks

Κράτα το `upload.jks` και τους κωδικούς σε ασφαλές μέρος. Μην το ανεβάσεις στο repository.

## 2. GitHub secrets (Settings > Secrets and variables > Actions)
| Secret | Τι είναι |
|---|---|
| KEYSTORE_BASE64 | η έξοδος του base64 παραπάνω |
| KEYSTORE_PASSWORD | κωδικός keystore |
| KEY_ALIAS | `upload` |
| KEY_PASSWORD | κωδικός κλειδιού |
| ADMOB_APP_ID | `ca-app-pub-XXXX~YYYY` από το AdMob (προαιρετικό στην αρχή) |
| ADMOB_INTERSTITIAL_ID | `ca-app-pub-XXXX/ZZZZ` (μονάδα Interstitial) |

Χωρίς τα δύο AdMob secrets η εφαρμογή χρησιμοποιεί τις δοκιμαστικές διαφημίσεις της Google. Μην πατάς ποτέ τις δικές σου πραγματικές διαφημίσεις στις δοκιμές.

## 3. Google Play Console
1. Δημιούργησε εφαρμογή. Το package name είναι `com.aimmap.myapp` και δεν αλλάζει μετά. Άφησε ενεργό το Play App Signing.
2. Ανέβασε το `app-release.aab` σε Internal testing και πρόσθεσε τον εαυτό σου ως tester.
3. Monetize > Products > In-app products > Create: product ID `aimmap_pro` (ακριβώς), τύπος εφάπαξ προϊόν, τιμή 1,49 EUR, ενεργό.
4. Settings > License testing: πρόσθεσε το Gmail σου, ώστε οι δοκιμαστικές αγορές να μη χρεώνουν.
5. Οι αγορές δουλεύουν μόνο σε εγκατάσταση από το Play (internal testing link). Στο sideloaded APK το κουμπί αγοράς δεν θα ολοκληρώσει.
6. Store listing και συμμόρφωση: privacy policy (URL), Data safety (τοποθεσία, advertising ID, ιστορικό αγορών), δήλωση "contains ads", content rating, άδειες κάμερας/τοποθεσίας.

## 4. AdMob
1. Δημιούργησε εφαρμογή Android και μονάδα Interstitial. Βάλε τα ids στα secrets.
2. Privacy & messaging: δημιούργησε το μήνυμα συγκατάθεσης GDPR (EEA/UK). Χωρίς αυτό δεν εμφανίζεται φόρμα και μπορεί να μη σερβίρονται διαφημίσεις στην Ευρώπη.
3. Η διαφήμιση εμφανίζεται μόνο στη Free, μόνο στο άνοιγμα, και όχι στην πρώτη εκκίνηση (εκεί ζητούνται οι άδειες).

## 5. Γνωστά όρια
- Η αγορά ελέγχεται τοπικά από το Google Play Billing, χωρίς server. Επιστροφή χρημάτων δεν αφαιρεί αυτόματα το Pro. Αν χρειαστεί, προστίθεται επαλήθευση απόδειξης (π.χ. iaptic).
- Το Capacitor 8 στοχεύει API 36, όπως απαιτεί το Play από 31 Αυγούστου 2026.
