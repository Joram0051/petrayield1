# PetraYield – Deployment Guide
## Stack: Firebase Auth + Firestore + Vercel

---

## STEP 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add Project** → name it `petrayield`
3. Disable Google Analytics (optional) → **Create Project**

---

## STEP 2 — Enable Firebase Auth

1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Email/Password** → Enable → **Save**
   - *(Users register with phone-derived emails like `254700000000@petrayield.app`)*

---

## STEP 3 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create Database**
2. Choose **Production mode** → Select your region (e.g. `europe-west1` for Africa) → **Enable**
3. Go to **Rules** tab → paste the contents of `firestore.rules` → **Publish**

---

## STEP 4 — Get Your Firebase Config

1. Firebase Console → ⚙ **Project Settings** → **Your apps**
2. Click **</>** (Web) → Register app as `petrayield-web`
3. Copy the `firebaseConfig` object — it looks like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "petrayield-xxxxx.firebaseapp.com",
  projectId: "petrayield-xxxxx",
  storageBucket: "petrayield-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. Open `firebase.js` and **replace the placeholder config** with your real values.

---

## STEP 5 — Set Your USDT Wallet Address

1. Open `dashboard.html`
2. Find this line near the top of the `<script>` block:
   ```js
   const PLATFORM_WALLET = "0xYOUR_USDT_BEP20_WALLET_ADDRESS_HERE";
   ```
3. Replace it with your real Binance/BEP20 USDT wallet address.

---

## STEP 6 — Set Your Admin Email

1. Open `admin.html`
2. Find:
   ```js
   const ADMIN_EMAILS = ['admin@petrayield.app'];
   ```
3. Replace with your real admin email.
4. Register that email as a user on the platform first, then you can access `/admin.html`.

---

## STEP 7 — Deploy to Vercel

### Option A — Via GitHub (Recommended)

1. Create a free account at https://github.com
2. Create a new repository named `petrayield`
3. Upload all files in this folder to the repository
4. Go to https://vercel.com → **New Project** → Import your GitHub repo
5. Vercel auto-detects settings → click **Deploy**
6. Your site goes live at `https://petrayield.vercel.app` (or custom domain)

### Option B — Via Vercel CLI

```bash
npm install -g vercel
cd petrayield
vercel
# Follow prompts → choose your account → deploy
```

---

## STEP 8 — Custom Domain (Optional)

1. Vercel Dashboard → Your Project → **Settings → Domains**
2. Add your domain (e.g. `petrayield.com`)
3. Update DNS records as shown by Vercel

---

## HOW THE DEPOSIT FLOW WORKS

```
User chooses barrel
      ↓
User sends USDT to your BEP20 wallet
      ↓
User submits TX hash in app
      ↓
Deposit saved to Firestore (status: "pending")
      ↓
YOU: Go to /admin.html → Deposits tab
      ↓
Verify TX on https://bscscan.com
      ↓
Click "Confirm" → barrel activates automatically
      ↓
User sees barrel in their dashboard ✅
```

---

## ADMIN PANEL

Access at: `https://your-domain.com/admin.html`

**Tabs:**
- **Deposits** — See pending deposits, verify TX hashes on BSCScan, confirm or reject
- **Withdrawals** — See pending withdrawals, mark as sent after you transfer USDT manually
- **Users** — Full user list with balances and barrel counts
- **Active Barrels** — All running investment cycles

---

## PROJECT FILES

```
petrayield/
├── index.html        ← Login / Register page
├── dashboard.html    ← User dashboard (all pages)
├── admin.html        ← Admin panel (password protected)
├── firebase.js       ← Firebase config + all DB helpers
├── vercel.json       ← Vercel routing config
├── firestore.rules   ← Firestore security rules
├── package.json      ← Project metadata
└── SETUP.md          ← This file
```

---

## FIRESTORE COLLECTIONS

| Collection     | Purpose                          |
|----------------|----------------------------------|
| `users`        | User profiles + balances         |
| `deposits`     | Deposit requests (pending/confirmed) |
| `withdrawals`  | Withdrawal requests              |
| `barrels`      | Active investment barrels        |
| `transactions` | Full transaction history         |
| `referrals`    | Referral tracking                |

---

## SUPPORT

For issues, check:
- Firebase Console logs
- Browser DevTools → Console tab
- Vercel deployment logs
