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
assets/css/system.css design tokens, buttons, tags, inputs, focus
assets/css/pages.css  page layout
assets/js/data.js     storage shape, the eight sessions, URL/ID parsing
assets/js/student.js  renders the session cards
assets/js/admin.js    builds the form, reads and writes the config
assets/js/gate.js     admin sign-in
assets/js/credentials.js  generated salted hash — see tools/set-password.mjs
tools/set-password.mjs    regenerates the sign-in credentials
```

`assets/js/data.js` is the single source of truth for the eight session titles
and formats, so the two pages can never disagree about them.

## How the links get there

The instructor opens `/admin`, pastes a Vimeo URL (or a bare ID) and a Gamma
link per session plus the three PDF links, and presses **Save**. Both pages read
and write one `localStorage` key, `lw-leadership-links`:

```json
{
  "videos": ["123456789", "", "", "", "", "", "", ""],
  "slides": ["https://gamma.app/docs/...", "", "", "", "", "", "", ""],
  "syllabusUrl": "https://.../syllabus.pdf",
  "leaderSyllabusUrl": "https://.../breakout-leader-syllabus.pdf",
  "assignmentsUrl": "https://.../special-assignments.pdf"
}
```

`videos` and `slides` are indexed by session number minus one. Video fields are
reduced to bare IDs on save (`String(raw).match(/(\d{6,})/)`), and embedded from
`https://player.vimeo.com/video/<id>`.

**Because this is `localStorage`, the links live in one browser.** They do not
follow students across devices, and they are not shared between the instructor's
laptop and a student's phone. **Copy configuration** puts the saved JSON on the
clipboard so it can be handed to someone else, who can paste it into their own
browser's storage.

### Moving to a backend

Keep the JSON shape above. Have the admin page `PUT` it and the student page
`GET` it, and replace the two calls in `assets/js/data.js` — `loadConfig` and
`saveConfig` — with fetches. Nothing else changes.

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

## Design

"Modernist": flat and architectural, everything flush left, **zero border radius
anywhere**, 2px rules doing all the organizing. One accent — Living Water teal
(`#0f6b78`). No shadows, no gradients, no rounded cards. Archivo from Google
Fonts at 400/500/600/800.

Students are overwhelmingly on phones, so the single-column layout is the
baseline and the two-up video grid is the enhancement. When changing this:
don't round a corner, don't center a heading or a button label, and don't
replace a 2px rule with whitespace.
