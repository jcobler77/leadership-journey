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
assets/js/credentials.js  generated salted hash — see tools/set-password.mjs
tools/set-password.mjs    regenerates the sign-in credentials
```

`assets/js/data.js` is the single source of truth for the eight session titles
and formats, so the two pages can never disagree about them.

## How the links get to students

`links.json` in the repository root is the published list — **this is the file
every student reads.** The video files themselves live on Vimeo; `links.json`
only records which Vimeo ID belongs to which session.

```json
{
  "videos": ["123456789", "", "", "", "", "", "", ""],
  "slides": ["https://gamma.app/docs/...", "", "", "", "", "", "", ""],
  "syllabusUrl": "https://.../syllabus.pdf",
  "leaderSyllabusUrl": "https://.../breakout-leader-syllabus.pdf",
  "assignmentsUrl": "https://.../special-assignments.pdf"
}
```

`videos` and `slides` are indexed by session number minus one. Video entries are
bare Vimeo IDs, embedded from `https://player.vimeo.com/video/<id>`.

### Posting a session

1. Upload the video to Vimeo.
2. Open `/admin`, sign in, and paste the Vimeo link into that session's field.
   A full `https://vimeo.com/123456789` URL or a bare ID both work.
3. Press **Save**. This saves to *your browser only* — open the student page and
   the video is there, so you can check it before anyone else sees it.
4. Press **Copy configuration**, paste the result over `links.json`, and commit.
   Now every student sees it.

Step 3 is a private preview; step 4 is what publishes.

### Why the preview and the published file are separate

The admin page writes to `localStorage`, which lives in one browser and never
travels. Saving on your laptop does not put anything on a student's phone — her
browser has its own empty storage, so without `links.json` she would see
"Video posts after the session" on all eight cards while the videos sat live on
Vimeo the whole time.

So the student page reads `links.json` first, then layers anything saved in the
current browser on top. A student has nothing saved locally and sees exactly
what is published. You see the published list plus your own unpublished
previews. A blank local field never blanks out a published link.

### Moving to a backend

Keep the JSON shape above. Have the admin page `PUT` it and the student page
`GET` it, and replace `loadEffectiveConfig` and `saveConfig` in
`assets/js/data.js` with fetches. Publishing then takes effect without a commit,
and nothing else changes.

### A note on Vimeo privacy settings

If the videos are unlisted or private rather than public, Vimeo will refuse to
play them in an embed unless the site's domain is on the video's allowed list —
the player shows an error instead. In Vimeo, that is **Settings → Privacy →
Where can this be embedded?** → add the domain the class page is served from.
Public videos need nothing.

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

## Design

"Modernist": flat and architectural, everything flush left, **zero border radius
anywhere**, 2px rules doing all the organizing. One accent — Living Water teal
(`#0f6b78`). No shadows, no gradients, no rounded cards. Archivo from Google
Fonts at 400/500/600/800.

Students are overwhelmingly on phones, so the single-column layout is the
baseline and the two-up video grid is the enhancement. When changing this:
don't round a corner, don't center a heading or a button label, and don't
replace a 2px rule with whitespace.
