# Webbins: Website Developer Service

Glass-style website with the **Webbins** brand, built with plain JavaScript + Vite + Firebase (Auth + Firestore).
Theme colors: sky blue, leaf green, mint and sunlight gold.

## How it works

| Who | What they see |
| --- | --- |
| Visitor | Home page with the Webbins brand, **Get started**, and **Log in / Sign up** (top right) |
| Customer | After sign up (nickname + searchable country list) they see **everything on one long page**: their dashboard (status + chat), Meet me, Skills, Works, Packages, How we work, Reviews, Background and career, Payment, License and trust, Contact. A **Menu** button and quick links jump to any section. |
| Owner (`patacjustinekeo@gmail.com`) | **Owner dashboard** at the top: all customers, Local (Philippines) vs International, Inquiries / Ongoing work / Paid / Handled, unread messages, chat with photos, status buttons and **Allow feedback**. |

Chat supports **photos**. Photos are shrunk on the device and saved inside the message, so no extra Firebase service is needed.

## 1. Run it in GitHub Codespaces

```bash
unzip justine-service-site.zip
cd justine-service-site
npm install
npm run dev
```
Open port **5173** from the **Ports** tab.

## 2. Firebase setup (project `my-website-6f396`)

1. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
2. **Firestore Database → Create database**.
3. **Firestore Database → Rules**: paste `firestore.rules` and **Publish**. **This version has new rules (photo messages). Publish again.**
4. **Authentication → Settings → Authorized domains**: add your Codespaces address (no `https://`), and later your real website address.

## 3. Owner account

The owner email is `patacjustinekeo@gmail.com`, set in `src/config.js` and `firestore.rules`.
Sign up with that email, or use **Continue with Google** (already verified). With email sign-up, click the link Firebase emails you, then press **I verified**.

## 4. Where your photos go (`public/images/`)

Until a file exists, the website shows a dashed box that says **"Put your image here"** with the exact path.

| File | Shown on |
| --- | --- |
| `profile.jpg` | Meet me, chat avatar (square photo of you) |
| `background.jpg` | Background and career (16:9) |
| `career.jpg` | Background and career (16:9) |
| `license.jpg` | License and trust (photo of your license or certificate) |
| `work-1.jpg` ... `work-6.jpg` | My works (photos of your websites, about 1600x1000) |

Change titles and names in `WORKS` and `IMAGES` in `src/config.js`.

## 5. Change the texts

Everything is in **`src/config.js`**: bio, skills, packages and prices (`PACKS`), process steps and reminders, license details, pledges, contacts.
The prices, numbers, timeline, license details and social links are samples. Replace them with real ones.

## 6. Google Search Console and sitemap

- The `google-site-verification` meta tag is already in the `<head>` of `index.html`.
- `public/images/sitemap.xml` is included as requested. See the note in the chat about its address and namespace before you submit it.

## 7. Made for low-end devices

Same animations, lighter work for the device: only transform and opacity are animated, heavy blur is limited to a few surfaces
(and removed on weak devices), off-screen sections are skipped until needed, chat only redraws what changed and loads the last 100 messages,
photos are shrunk before upload, and analytics loads later when the device is idle.

## Deploy later (optional)

```bash
npm run build
```
Upload `dist/` to Cloudflare Pages, Firebase Hosting or Netlify, and add that domain to Firebase Authorized domains.
