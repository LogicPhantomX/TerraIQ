# TerraIQ Web

React + Vite web application. Installs fast, runs in any browser.

## Setup (3 steps)

### 1. Install
```bash
npm install
```
This installs ~15 packages. Much lighter than the mobile app.

### 2. Create .env file
Copy .env.example to .env and fill in your keys:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ANTHROPIC_KEY=sk-ant-your-key
VITE_PLANTID_KEY=your-plantid-key
VITE_WEATHER_KEY=your-openweather-key
```

### 3. Run
```bash
npm run dev
```
Opens at http://localhost:5173

## Build for production
```bash
npm run build
```
Outputs to /dist — deploy to Vercel, Netlify, or any static host.

## Deploy to Vercel (free)
```bash
npm install -g vercel
vercel
```
Done. You get a live URL in 60 seconds.

## Pages
- / — Landing page
- /login — Email + Phone OTP login
- /signup — 3-step registration
- /dashboard — Farm overview
- /scanner — Crop disease detection
- /soil — Soil analysis with Allamanda products
- /irrigation — 7-day watering plan
- /harvest — Shelf life tracker
- /market — Market price advisor
- /analytics — Charts and stats
- /cooperative — Farmer group management
- /profile — Settings
