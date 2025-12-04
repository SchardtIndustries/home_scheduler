# Home Scheduler

**Home Scheduler** is a cross‑platform family organization system designed for real‑world households.  
It includes a customizable web dashboard, a mobile app, and dedicated wall‑display support for Raspberry Pi devices.

Families can manage shared calendars, rotating photo displays, shopping lists, tasks, and synced mobile notifications — all backed by secure Supabase authentication and optional Stripe‑powered subscription tiers.

---

## 🚀 Features (Current)

### **Web Dashboard**

- User authentication with Supabase
- Automatic family creation for new users
- Family management panel:
  - View family members
  - Admin role assignment
  - Invite members via secure invite links
- Subscription management:
  - Integrated Stripe Checkout
  - Plan selection modal with pricing
- Calendar management (initial implementation)
- Dark-mode, full-width responsive layout

### **Supabase Backend**

- Full relational schema with:
  - `profiles`
  - `families`
  - `family_members`
  - `calendars`
  - `events`
  - `todo_lists`
  - `todo_items`
  - `calendar_photos`
  - `device_tokens`
  - `display_configs`
- Row-Level Security across all tables
- Helper function `is_member_of_family(fid)`
- Stripe metadata fields on families:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `stripe_price_id`
  - `current_period_end`

### **Stripe Integration**

- Test-mode product catalog
- Monthly & annual prices (Basic, Plus, Pro)
- Secure Checkout via Supabase Edge Function
- Future support for Customer Billing Portal

---

## 📱 Mobile App (Planned)

The mobile experience will allow family members to:

- Upload photos to a calendar
- Sync native device calendar events
- Receive push notifications (tasks, events, reminders)
- Manage shared todo/shopping lists
- View and edit events on the go

Built with **Expo + React Native**, sharing the same Supabase auth backend.

---

## 🖥️ Raspberry Pi Wall Display (Planned)

A fullscreen display app that:

- Shows selected calendars
- Displays rotating photos
- Supports “kitchen”, “hallway”, “office”, etc. display profiles
- Real‑time updates via Supabase
- Highly readable family dashboard mode

---

## 🗺️ Roadmap

### **Phase 1 – Dashboard Foundations (In Progress)**

- [x] Supabase schema + RLS setup  
- [x] Web dashboard base UI  
- [x] Family admin section  
- [x] Subscription tiers + Stripe Checkout  
- [x] Invite link flow (UI implemented, backend WIP)  
- [ ] Family member acceptance flow  
- [ ] Calendar creation & editing  
- [ ] List creation & editing  
- [ ] Display configuration UI  

### **Phase 2 – Mobile App**

- [ ] Login & family selection  
- [ ] Native calendar sync  
- [ ] Photo uploads  
- [ ] Todo list sync & notifications  
- [ ] Push notification registration  
- [ ] App Store + Google Play release  

### **Phase 3 – Wall Display**

- [ ] Setup wizard on Raspberry Pi  
- [ ] Display mode rendering engine  
- [ ] Calendar views  
- [ ] Photo slideshow  
- [ ] Deep linking to “Display config” in dashboard  

### **Phase 4 – Billing & Growth**

- [ ] Stripe Webhooks → sync subscription status in Supabase  
- [ ] Customer Portal  
- [ ] Enforce tier limits in UI + optional RLS guards  
- [ ] Business tier (“Contact us”)  
- [ ] Internal “ginger_magic” unlimited tier  

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite + TypeScript  
- **Mobile:** Expo + React Native  
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)  
- **Billing:** Stripe (Checkout + Webhooks)  
- **Deployment:** Netlify / Vercel (planned)  
- **Display:** Raspberry Pi with Node or WebKit (planned)

---

## 📦 Local Development

```bash
# install dependencies
npm install

# run dashboard
npm run dev
```

You will need a `.env.local` containing:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Supabase secrets for Edge Functions are stored via:

```bash
supabase secrets set KEY=value
```

---

## 📄 License

Copyright © 2025  
Schardt Industries  
All rights reserved.

---

For feature requests or contributions, contact **Matthew Schardt** or submit issues via GitHub once the repo is public.
