# Firebase Hosting Deploy Qo'llanmasi

## 1. Firebase CLI o'rnatish

```bash
npm install -g firebase-tools
```

## 2. Login va project tanlash

```bash
firebase login
firebase use algolearn-9da34
```

## 3. Admin huquqini berish (MUHIM)

Spark (bepul) planda admin tekshirish uchun **custom claims** kerak.

### Variant A: Firebase CLI bilan (tavsiya etiladi)

Admin bo'lmoqchi bo'lgan user ID'ni toping (Firebase Console → Authentication):

```bash
firebase admin:auth:claims:set ADMIN_UID_HERE '{"admin": true}'
```

**Eslatma:** `ADMIN_UID_HERE` o'rniga haqiqiy user ID yozing.

### Variant B: Agar CLI bilan xatolik bersa

Firebase Console → Authentication → Users → Admin user → User UID nusxalang.

Lokal kompyuteringizda Node.js script yozing (`set-admin.js`):

```javascript
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'ADMIN_UID_BU_YERGA';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Admin claim qo\'shildi!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Xatolik:', error);
    process.exit(1);
  });
```

Buni ishga tushirish uchun:
```bash
npm init -y
npm install firebase-admin
node set-admin.js
```

`serviceAccountKey.json` ni Firebase Console → Project Settings → Service accounts → Generate new private key orqali oling.

## 4. Rules va indexlarni deploy qilish

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

## 5. Hosting deploy

```bash
firebase deploy --only hosting
```

## Tekshirish

Deploydan so'ng:
1. Sayt URL'iga kiring (Firebase Console'dan ko'rinadi)
2. Admin panelga kirish
3. Har bir bo'limni tekshiring: Dashboard, Kurslar, Darslar, Videolar, Testlar, Kategoriyalar, Foydalanuvchilar

## Xatoliklar bo'lsa

### "Permission denied"
- Admin claim qo'shilganini tekshiring
- Console (F12) da xabar ko'ring

### Bo'sh sahifalar
- Firestore kolleksiyalari bo'sh bo'lishi mumkin
- Oldin kurs/dars/qo'shib ko'ring

### Video yuklash ishlamasa
- Storage ruxsatnomalari to'g'ri ekanini tekshiring
- Firebase Console → Storage → Rules
