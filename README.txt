MYSURU MITHRA — READY PACKAGE

MAIN FILE
index.html = the QR-code destination for students.
journey.html = team slider + mystery sticker game.
admin.html = your private feedback dashboard for mobile.

BEFORE USE
1. Open Supabase SQL Editor and run supabase_setup.sql.
2. In Supabase Authentication, create ONE team/admin email + password.
3. Open config.js and paste your Supabase Project URL and Publishable/anon key.
4. Do NOT use a secret/service_role key in config.js.
5. Upload the whole folder to your static host. Keep all files in the same structure.
6. Open index.html on the hosted URL and submit one test rating.
7. Open /admin.html on your phone, log in, and confirm the record appears.
8. Open qr-maker.html, paste the hosted index.html URL, make the QR code, and print it.

RECOMMENDED HOSTING
Use GitHub Pages / Netlify / Vercel for the static website. Use Supabase as the backend/database/authentication.

GAME
- Name is requested once per browser session.
- Exactly two chances: matching cards + hard three-cup shuffle.
- Cup shuffle is sequential side-to-side with 18 swaps.
- Winning either game unlocks exactly 2 downloadable stickers.
- The supplied Shinchan sticker images are in stickers/sticker1.jpg and stickers/sticker2.jpg.

FEEDBACK
- Student submits name, dish, 1–5 stars, optional review.
- Feedback is inserted into Supabase.
- Public page shows only aggregate rating/count through a protected summary function.
- Full records are visible only after team login in admin.html.
