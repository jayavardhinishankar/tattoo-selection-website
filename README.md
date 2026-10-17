# Tattoo Selection Website

A full-stack tattoo gallery. Visitors browse numbered designs in four price categories, select tattoos and see an estimated total (no login needed). An administrator logs in securely to add, edit, hide and delete tattoos, and to manage categories and prices. Admin changes appear on the public site automatically.

**Stack:** React + Vite · Express · MongoDB (Mongoose) · JWT in an httpOnly cookie + bcrypt · Multer + Cloudinary · Axios

```
tattoo-selection-website/
├── backend/
│   ├── config/         db.js, cloudinary.js
│   ├── controllers/    publicController, authController, adminController
│   ├── middleware/     auth (JWT), upload (Multer), errorHandler
│   ├── models/         Admin, TattooCategory, Tattoo, Counter
│   ├── routes/         publicRoutes, adminRoutes
│   ├── services/       imageService (Cloudinary / local fallback)
│   ├── utils/          validators, createAdmin.js, seedCategories.js
│   ├── uploads/        local image fallback (development only)
│   ├── app.js, server.js, .env.example
└── frontend/
    └── src/            components/, pages/ (+ pages/admin/), services/, context/, hooks/, styles/
```

---

## 1. Windows setup (step by step)

### 1.1 Install the tools
1. **Node.js LTS** (v18 or newer): <https://nodejs.org> → install with defaults. Check in PowerShell: `node -v` and `npm -v`.
2. **MongoDB** – choose ONE:
   - **MongoDB Atlas (free cloud, easiest):** create an account at <https://www.mongodb.com/atlas>, create a free cluster, add a database user (username + password), under *Network Access* add your IP (or `0.0.0.0/0` for testing), then *Connect → Drivers* and copy the connection string, e.g. `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tattoo_selection`.
   - **Local MongoDB:** install *MongoDB Community Server* from <https://www.mongodb.com/try/download/community> (tick "Install as a Service"). The connection string is `mongodb://127.0.0.1:27017/tattoo_selection`.

### 1.2 Get the project folders
If you received the folder, just open it. To create the structure from scratch:

```powershell
mkdir tattoo-selection-website
cd tattoo-selection-website
mkdir backend, frontend
```
then place the provided files in the same layout as the tree above.

### 1.3 Install dependencies
```powershell
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

### 1.4 Configure environment variables
```powershell
cd backend
copy .env.example .env
notepad .env
```
Set at least:

| Variable | What to put |
|---|---|
| `MONGODB_URI` | Your Atlas or local connection string (include the database name `tattoo_selection`) |
| `JWT_SECRET` | A long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | e.g. `8h` |
| `CLIENT_ORIGIN` | `http://localhost:5173` |
| `CLOUDINARY_*` | See next section |

The `.env` file is git-ignored and never sent to the browser.

### 1.5 Configure persistent image storage (Cloudinary)
1. Create a free account at <https://cloudinary.com>.
2. On the dashboard copy **Cloud name**, **API Key**, **API Secret** into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `backend/.env`.
3. Restart the backend. Uploaded images are now stored on Cloudinary and the permanent HTTPS URL is saved in MongoDB.

If these three values are blank, the app falls back to saving images in `backend/uploads/` so you can try it locally. **Do not use the fallback in production** — most hosts wipe local files on redeploy.

### 1.5b Create the first administrator (secure, no public registration)
```powershell
cd backend
npm run create-admin
```
You are prompted for username, email and a password (min 10 characters with upper case, lower case and a number). The password is hashed with bcrypt (cost 12) before it is saved. Alternatively set `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in `.env` and run the same command, then delete `ADMIN_PASSWORD` from `.env`.

### 1.6 Start the backend
```powershell
cd backend
npm run dev
```
(or `npm start`). On first start it connects to MongoDB, creates indexes and seeds the four default categories (Small ₹299, Medium ₹599, Large ₹999, Premium ₹1,499) if no categories exist. You should see `API running on http://localhost:5000`.

### 1.7 Start the frontend (second terminal)
```powershell
cd frontend
npm run dev
```

### 1.8 Open in the browser
| Page | URL |
|---|---|
| Public website | <http://localhost:5173> |
| Admin login | <http://localhost:5173/admin/login> |
| Customer feedback | <http://localhost:5173/feedback> |
| Lettering designer | <http://localhost:5173/lettering-designer> |
| API health check | <http://localhost:5000/api/health> |

In development Vite proxies `/api` and `/uploads` to port 5000, so the browser only talks to port 5173 and the login cookie stays same-origin.

---

## 2. How things work

- **Tattoo numbers** come from an atomic counter document (`Counter` collection, `$inc` + upsert). They are unique even under concurrent inserts, never change on edit (the field is `immutable`) and are **never reused** after a delete.
- **Public visibility:** only tattoos with `isActive: true` in an active category are returned by the public API. Inactive or deleted tattoos disappear.
- **Auto-updates:** public pages fetch from the API on load and on every category/search change, poll every 10–15 s while the tab is visible, and refetch when the tab regains focus. The API sends `Cache-Control: no-store`. A failed background refresh keeps the last good data on screen.
- **Selections** live in `localStorage`. The Selection page re-checks every selected tattoo against the API, so price changes are reflected and tattoos deleted by the admin are flagged "No longer available" and excluded from the total (nothing breaks).
- **Image cleanup:** replacing an image or deleting a tattoo removes the old file from Cloudinary (or local disk). If saving to the database fails, the just-uploaded image is removed.
- **Categories:** a category that still contains tattoos cannot be deleted (HTTP 409 with a clear message). Category *starting price* ("Starting from") is shown separately from each tattoo's own price.
- **Admin folder import:** from Add New Tattoo, an administrator can select a folder of up to 100 JPG/PNG/WEBP images (5 MB each), choose a category, review/edit AI-suggested names, and import images at that category's starting price and description. Gemini image suggestions require `GEMINI_API_KEY` to be set in the local `backend/.env`; without it, names can be entered manually. Selected images are sent to Google Gemini when generating suggestions.
- **Admin tattoo exports:** in Manage Tattoos, select individual rows or all rows on the current page, then download the selected images as a ZIP organized into category folders.
- **Customer feedback:** visitor submissions are private and pending moderation by default. Only approved feedback is returned to the public testimonials view. Optional images use the same validated Cloudinary/local upload storage as tattoo images.
- **Lettering requests:** the designer offers 160 open-source Google Fonts plus the distinct families in the supplied Windows font list, grouped and searchable by style. Google Fonts load on demand; Windows system fonts are used only when installed on the viewing device and are not redistributed. The designer accepts one alphabetic character per design. Request details collect the customer name, optional roll number, instructions, and artist-adjustment preference. Requests store the exact text and typography configuration plus an escaped, durable SVG reference; these are design references, not production-ready stencils.
- **Admin submissions:** Customer Feedback and Letter Tattoo Requests are available in the authenticated dashboard. Admin-only status changes, deletion, and private internal notes are not exposed through public endpoints.

### Security measures
- bcrypt password hashing; no plain-text passwords; no public registration.
- JWT (expiry from `JWT_EXPIRES_IN`) in an **httpOnly, SameSite** cookie (`Secure` in production); Bearer header also accepted.
- All `/api/admin/*` routes except `login` and `logout` pass through `protect` + role check.
- Login rate limit (10 attempts / 15 min / IP) and constant-time-ish failure path.
- Input validation and sanitising (types, lengths, price range, ObjectId checks, `$`-operator stripping, regex escaping for search).
- Uploads: MIME allow-list (JPG/PNG/WEBP), size limit (`MAX_IMAGE_MB`, default 5), and a magic-byte check of the real file content.
- AI tattoo-name suggestions use the authenticated, rate-limited `POST /api/admin/tattoos/suggest-name` endpoint. Configure `GEMINI_API_KEY` in `backend/.env` (optionally `GEMINI_MODEL`, default `gemini-2.5-flash`); keep credentials server-side and never add them to frontend configuration.
- `helmet` headers, CORS restricted to `CLIENT_ORIGIN`, JSON body limit, centralized error handler.

### Production notes
- **Render deployment:** this repository includes `render.yaml` for one Node web service. Render installs both projects, builds the Vite frontend, and Express serves the built site and API on the same HTTPS origin, including client-side routes. The root URL is the website; `/api/health` is the health check.
- Create a MongoDB Atlas database and a Cloudinary account before deploying. In Render's Blueprint setup, provide `MONGODB_URI` and the three `CLOUDINARY_*` values. Atlas Network Access must allow the deployed Render service to connect; use the narrowest rule supported by your Atlas/Render plan. Set `GEMINI_API_KEY` only if you want admin AI image-name suggestions.
- Render generates `JWT_SECRET` through the Blueprint; keep it private. Do not add `.env` files, database URIs, or API keys to GitHub. The `.gitignore` excludes local environment files and generated frontend assets.
- After the service is live, create the first admin by running `npm run create-admin` from `backend` on a trusted computer with `MONGODB_URI` set to the production Atlas connection string. Use a unique strong password and do not put it in the frontend or GitHub. Then open `/admin/login` on the deployed website.
- Images should use Cloudinary in production; the local uploads fallback is not persistent on hosted instances.

---

## 3. API reference

**Public**
- `GET /api/categories` · `GET /api/categories/:id`
- `GET /api/tattoos?category=&search=&page=&limit=` · `GET /api/tattoos/:id` · `GET /api/tattoos/number/:number`
- `POST /api/feedback` (multipart form; optional `image`) · `GET /api/feedback/approved?page=&limit=`
- `POST /api/lettering-requests` (stores exact design settings and an SVG reference)

**Admin** (cookie/Bearer required except login/logout)
- `POST /api/admin/login` `{ identifier, password }` · `POST /api/admin/logout` · `GET /api/admin/me`
- `GET /api/admin/dashboard`
- `GET /api/admin/feedback?status=&page=&limit=` · `PATCH /api/admin/feedback/:id/status` · `DELETE /api/admin/feedback/:id`
- `GET /api/admin/lettering-requests?search=&status=&page=&limit=` · `GET /api/admin/lettering-requests/:id` · `PATCH|DELETE /api/admin/lettering-requests/:id`
- `GET|POST /api/admin/tattoos` · `GET|PUT|DELETE /api/admin/tattoos/:id` (POST/PUT are `multipart/form-data`, image field `image`)
- `GET|POST /api/admin/categories` · `PUT|DELETE /api/admin/categories/:id`

All responses are JSON: `{ success, data?, message?, pagination? }`.

---

## 4. Testing checklist

Run through these after setup (≈10 minutes). Each should behave as described.

| # | Workflow | Expected result |
|---|---|---|
| 1 | Open `/` without logging in | Four category cards with name, "Starting from ₹…", tattoo count, **Explore Tattoos** |
| 2 | Compare card prices with the admin Manage Prices page | They match (they come from MongoDB) |
| 3 | Add several tattoos | Numbers are #001, #002, #003… and unique |
| 4 | Search "2" or a name on `/gallery` | Matching tattoos only |
| 5 | Click **View Details** | Modal with large image, number, name, description, category, price |
| 6 | **Select This Tattoo** on 2–3 tattoos, open **My Selection** | Numbers, names, prices and total; remove one and clear all work; refresh keeps the selection |
| 7 | Log in at `/admin/login` with correct credentials | Dashboard opens |
| 8 | Log in with a wrong password / empty fields | "Invalid email/username or password." / field messages |
| 9 | Log out, then visit `/admin/tattoos` | Redirected to login |
| 10 | Without logging in, `curl -X DELETE http://localhost:5000/api/admin/tattoos/<id>` | `401` |
| 11 | Add New Tattoo with an image | Success message; appears at top of Manage Tattoos and on the public site |
| 12 | Edit a tattoo's name, price, category, image | Saved; **number unchanged** |
| 13 | Toggle a tattoo Inactive | It disappears from the public gallery (within ~10 s, or on reload) |
| 14 | Change a category's starting price in Manage Prices | Public category card updates |
| 15 | Delete a tattoo → confirm | Gone from admin and public; add a new one — the deleted number is **not** reused |
| 16 | Delete a category that has tattoos | Rejected with an explanatory message |
| 17 | Upload a `.pdf`/`.txt`, a renamed non-image file, or an image over 5 MB | Rejected with an error |
| 18 | Submit the tattoo form with empty name or negative price | Validation messages |
| 19 | Open an empty category | "No tattoos here yet" message |
| 20 | Stop the backend and reload the site | Friendly error with a **Try again** button |
| 21 | Submit customer feedback with an optional photo | Saved as pending; it does not appear publicly until an admin approves it |
| 22 | Approve feedback in `/admin/feedback` | It appears in public testimonials without exposing contact details |
| 23 | Submit a lettering request from `/lettering-designer` | Request, typography settings, and durable SVG are saved for admin review |
| 24 | Review/update a lettering request in `/admin/lettering-requests` | Preview/download, status, and private notes work; notes remain admin-only |
| 25 | Call feedback/request admin APIs without a session | Requests return `401` |

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `JWT_SECRET is missing or too weak` | Set a long random `JWT_SECRET` in `backend/.env` |
| `MongooseServerSelectionError` / cannot connect | Local: start the "MongoDB" Windows service. Atlas: check username/password (URL-encode special characters), add your IP under Network Access |
| `EADDRINUSE: port 5000` | Another app uses the port: change `PORT` in `.env` **and** the proxy target in `frontend/vite.config.js` |
| Frontend shows "Cannot reach the server" | Backend not running, or wrong port in `vite.config.js` |
| Admin login works but dashboard bounces to login | Cookies blocked; use `http://localhost:5173` (not another host name); in production check `CLIENT_ORIGIN`, HTTPS and `VITE_API_URL` |
| Images missing after upload | Cloudinary values wrong (check the backend console). With the local fallback, make sure `/uploads` is proxied (restart `npm run dev`) |
| `npm` scripts blocked in PowerShell ("running scripts is disabled") | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Command Prompt |
| "A record with that … already exists" | Category names must be unique |
| `create-admin`: "already exists" | That username/email is taken — choose another |
| Port 5173 busy | Vite picks the next port automatically; also add that origin to `CLIENT_ORIGIN` (comma-separated) |

---

## 6. Scripts

Backend: `npm run dev` · `npm start` · `npm run create-admin` · `npm run seed`
Frontend: `npm run dev` · `npm run build` · `npm run preview`
