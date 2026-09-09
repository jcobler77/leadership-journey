# Leadership Class Support Portal

Two pages for the leadership class at Living Water Foursquare Church.

| Page | Path | Who it's for |
|---|---|---|
| Student page | `/` | Teaching videos, syllabus PDFs, special assignments |
| Admin page | `/admin` | The instructor pastes in the links |

Static HTML, CSS, and vanilla JS — no build step and no dependencies. Open
`index.html` directly, or serve the folder with anything.

```
python3 -m http.server 8080     # then http://localhost:8080
```

## Layout

```
index.html            student page
admin/index.html      admin page (served at /admin)
links.json            the published links every student reads
assets/css/system.css design tokens, buttons, tags, inputs, focus
assets/css/pages.css  page layout
assets/js/data.js     storage shape, the eight sessions, URL/ID parsing
assets/js/student.js  renders the session cards
assets/js/admin.js    builds the form, reads and writes the config
assets/js/gate.js     admin sign-in
assets/js/publish.js  writes links.json to the repository from /admin
assets/js/credentials.js  generated salted hash — see tools/set-password.mjs
tools/set-password.mjs    regenerates the sign-in credentials
```

`assets/js/data.js` is the single source of truth for the eight session titles
and formats, so the two pages can never disagree about them.

## How the links get to students

`links.json` in the repository root is the published list — **this is the file
every student reads.** The video files themselves live on Vimeo; `links.json`
only records which Vimeo video belongs to which session.

```json
{
  "videos": [{ "id": "123456789", "hash": "a1b2c3d4e5" }, { "id": "", "hash": "" }],
  "slides": ["https://drive.google.com/file/d/.../view", ""],
  "syllabusUrl": "https://.../syllabus.pdf",
  "leaderSyllabusUrl": "https://.../breakout-leader-syllabus.pdf",
  "assignmentsUrl": "https://.../special-assignments.pdf"
}
```

`videos` and `slides` are indexed by session number minus one, eight of each.
`hash` is the privacy hash Vimeo puts on an unlisted video; it is empty for a
public one. Plain ID strings from an older file are still read correctly.

### Posting a session

1. Upload the video to Vimeo.
2. Open `/admin`, sign in, and paste the video into that session's box. The
   address bar, the Share dialog's link, or the whole `<iframe>` embed code all
   work — **the video then appears under the box, so you can see you have the
   right one.**
3. Press **Publish to students**. The class page updates about a minute later.

That is the whole loop. No files to edit and nothing to commit.

**Save preview** is there if you want the link on your own screen without
sending it to the class yet; the student page shows anything saved locally on
top of what is published. **Copy configuration** gives you the raw JSON, as a
fallback if publishing is ever unavailable.

### The slides

The slides are shared as a PDF each week and **embedded on the class page**,
under that session's video, with an **Open the slides** button beneath.

Paste the PDF's share link into the Slides PDF box. A Google Drive share link
works as pasted — the page translates `/view` into the `/preview` form Drive
needs for embedding, and the button still points at the original link.

The button is not decoration. Phones are unreliable at showing a PDF inside a
frame — some render only the first page, some nothing at all — so the way out
to the real file is always on the page rather than something the reader has to
work out.

### Setting up the publishing key

**Publish** needs a key once, so the admin page can write `links.json` for you.

1. Go to **github.com → Settings → Developer settings → Personal access tokens
   → Fine-grained tokens → Generate new token**.
2. Name it something like `Leadership class publishing`, and set an expiry —
   note the date, because Publish stops working when it lapses and you will
   need a fresh key.
3. **Repository access** → Only select repositories → `leadership-journey`.
4. **Permissions** → Repository permissions → **Contents: Read and write**.
   Nothing else is needed.
5. Generate it, copy it, and paste it into **Publishing key** on `/admin`. It
   confirms with "Connected to jcobler77/leadership-journey".

The key is stored in that browser only. It is never committed, never part of
the site, and never sent anywhere but GitHub. What it can do is limited to
changing files in this one repository — it cannot touch other repositories or
the account. If the laptop is lost or the key is pasted somewhere it should not
be, revoke it on that same settings page and generate another.

### If Publish reports a conflict

GitHub answers a write with 409 when the file version it was handed is not the
current one — which happens for a short window after a successful publish,
while reads still return the previous version. Publish now re-reads and retries
up to three times, waiting longer each time, so this heals itself.

If it still gives up, the message says so plainly. Wait a few seconds and press
Publish again.

### Moving to a real backend

Keep the JSON shape above. Have the admin page `PUT` it and the student page
`GET` it, and replace `loadEffectiveConfig` in `assets/js/data.js` and the
`publish` function in `assets/js/publish.js` with calls to your own endpoint.
Publishing would then be instant rather than waiting on a Pages rebuild.

### A note on Vimeo privacy settings

If the videos are unlisted or private rather than public, Vimeo will refuse to
play them in an embed unless the site's domain is on the video's allowed list —
the player shows an error instead. In Vimeo, that is **Settings → Privacy →
Where can this be embedded?** → add `leadership.joncobler.com`. Public videos
need nothing.

Paste the **unlisted link** (the one with the extra code after the video
number, like `vimeo.com/123456789/a1b2c3d4e5`) rather than the bare number for
an unlisted video — that code is the privacy hash, and the embed will not play
without it. The admin page keeps it for you and says "unlisted link" when it
finds one.

## The address

The site is served at **https://leadership.joncobler.com** — a subdomain of
joncobler.com, whose DNS is managed at IONOS, pointed at GitHub Pages.

Two pieces make that work, and both must agree:

1. **A CNAME record at IONOS** for host `leadership`, pointing to
   `jcobler77.github.io`. A subdomain uses a CNAME record — the A records with
   GitHub's IP addresses are only for an apex domain like `joncobler.com`
   itself.
2. **The `CNAME` file in this repository**, containing the single line
   `leadership.joncobler.com`. GitHub Pages reads it to know which domain to
   answer for and which certificate to issue. Deleting the file unsets the
   custom domain, so leave it in place.

Set the DNS record first, then enter the domain under **Settings → Pages →
Custom domain**. In that order GitHub's DNS check passes on the first try.

None of this affects joncobler.com itself — adding a subdomain record leaves
the main site untouched.

### HTTPS

HTTPS is enforced. GitHub issued the certificate for leadership.joncobler.com
and **Settings → Pages → Enforce HTTPS** is on, so http:// requests redirect to
https:// and the site is only ever served encrypted.

Leave it that way. It is not only good practice here: the admin sign-in derives
its key with the Web Crypto API, which browsers refuse to expose on a page
served over plain HTTP. Without HTTPS the student page still works, but /admin
loads and cannot be signed into — it reports "Sign-in needs a secure
connection." That failure looks like a broken sign-in rather than a missing
certificate, which is why it is written down here.

To confirm the site at any time:

```
curl -sI https://leadership.joncobler.com/ | head -1   # expect: HTTP/2 200
curl -sI http://leadership.joncobler.com/  | head -1   # expect: 301 to https
```

If the certificate ever lapses — after a DNS change, say — remove the custom
domain in Settings → Pages, save, re-enter it, and save again. That re-triggers
issuance and clears the stuck state that occasionally follows.

## Signing in to the admin page

`/admin` asks for a user name and password before it shows the link manager.
The sign-in lasts until the tab is closed, and **Sign out** ends it early —
worth using on a shared computer.

To change the credentials:

```
node tools/set-password.mjs "Leadership" "a-new-password"
```

That rewrites `assets/js/credentials.js`. Commit it and redeploy.

### What this sign-in is and is not

The password is **not** stored in this repository. `credentials.js` holds only a
salted PBKDF2-SHA256 hash at 250,000 iterations, which the browser recomputes at
sign-in. That matters because this repository is public: the hash is not
practically reversible, so the password stays safe even though the code is
readable by anyone.

The **gate itself** is a different matter. It runs in the browser, so it keeps
casual visitors out of the link manager but it is not a security boundary — a
determined person who reads the page source can bypass it and edit the links.
Nothing sensitive is behind it (a set of video and PDF links), so for this class
that trade is reasonable.

If you want a real lock, put HTTP basic auth in front of `/admin` at the host.
On Apache or cPanel that is an `.htaccess` in `admin/`:

```apache
AuthType Basic
AuthName "Instructor only"
AuthUserFile /full/path/to/.htpasswd
Require valid-user
```

Generate the `.htpasswd` with `htpasswd -c /full/path/to/.htpasswd Leadership`.
Netlify, Cloudflare Pages, and Vercel each have their own password-protection
setting that does the same thing. The in-page sign-in can stay either way.

## Icon

The browser-tab and home-screen icon is a flat teal square with three
flush-left white rules, ragged right — the page's own design language at 16px.

| File | Used for |
|---|---|
| `favicon.ico` | 16px and 32px, embedded as PNG. Browsers request `/favicon.ico` whether or not the page declares one, so this exists to answer that request. |
| `favicon.svg` | modern browsers; crisp at any size |
| `apple-touch-icon.png` | 180px, for "Add to Home Screen" on a phone |

All three live at the site root and are referenced from both pages, so `/admin`
points back up to them with `../`.

To change the artwork, edit `favicon.svg` and re-render the rest from it — the
PNGs are rasterized from that file, and `favicon.ico` is a container holding the
16px and 32px PNGs.

## Design

"Modernist": flat and architectural, everything flush left, **zero border radius
anywhere**, 2px rules doing all the organizing. One accent — Living Water teal
(`#0f6b78`). No shadows, no gradients, no rounded cards. Archivo from Google
Fonts at 400/500/600/800.

Students are overwhelmingly on phones, so the single-column layout is the
baseline and the two-up video grid is the enhancement. When changing this:
don't round a corner, don't center a heading or a button label, and don't
replace a 2px rule with whitespace.
