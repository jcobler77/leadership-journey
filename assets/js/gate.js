/* Admin sign-in.
 *
 * This is a client-side gate: it keeps casual visitors out of the link
 * manager, and it is not a security boundary. Anyone willing to read the page
 * source can get past it. What it does protect is the password itself, which
 * is stored only as a salted PBKDF2 hash and is not recoverable from this
 * repository. For a real lock, put HTTP basic auth on /admin at the host —
 * see the README.
 */

(function () {
  "use strict";

  var SESSION_KEY = "lw-admin-unlocked";
  var creds = window.LW_ADMIN_CREDENTIALS || {};

  var gate = document.getElementById("gate");
  var admin = document.getElementById("admin");
  var form = document.getElementById("gate-form");
  var userInput = document.getElementById("gate-user");
  var passInput = document.getElementById("gate-pass");
  var note = document.getElementById("gate-message");
  var signOut = document.getElementById("sign-out");

  function say(text) {
    if (note) note.textContent = text;
  }

  function unlock() {
    gate.hidden = true;
    admin.hidden = false;
    document.title = "Manage links · Leadership Class";
  }

  function lock() {
    admin.hidden = true;
    gate.hidden = false;
    if (passInput) passInput.value = "";
  }

  function remembered() {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function remember(on) {
    try {
      if (on) window.sessionStorage.setItem(SESSION_KEY, "1");
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      /* Storage blocked — the sign-in just won't persist across reloads. */
    }
  }

  function fromBase64(value) {
    var binary = window.atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function toBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  function derive(secret) {
    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle) return Promise.reject(new Error("insecure-context"));
    return subtle
      .importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"])
      .then(function (key) {
        return subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: fromBase64(creds.salt),
            iterations: creds.iterations,
            hash: "SHA-256"
          },
          key,
          256
        );
      })
      .then(toBase64);
  }

  function onSubmit(event) {
    event.preventDefault();
    var user = userInput.value.trim().toLowerCase();
    var password = passInput.value;

    if (!user || !password) {
      say("Enter both the user name and the password.");
      return;
    }

    say("Checking…");
    derive(user + ":" + password).then(
      function (candidate) {
        if (candidate === creds.hash) {
          remember(true);
          say("");
          unlock();
        } else {
          say("That user name and password did not match.");
          passInput.value = "";
          passInput.focus();
        }
      },
      function (err) {
        say(
          err && err.message === "insecure-context"
            ? "Sign-in needs a secure connection. Open this page over https."
            : "Could not check the sign-in in this browser."
        );
      }
    );
  }

  if (!creds.hash || !creds.salt) {
    say("No sign-in is configured. Run tools/set-password.mjs.");
    return;
  }

  if (remembered()) unlock();
  if (form) form.addEventListener("submit", onSubmit);
  if (signOut) {
    signOut.addEventListener("click", function () {
      remember(false);
      lock();
      if (userInput) userInput.focus();
    });
  }
})();
