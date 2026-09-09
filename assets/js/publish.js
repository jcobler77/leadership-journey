/* ==========================================================================
   Publishing: writes links.json straight to the repository from the admin
   page, so posting a session is paste-and-click rather than copy-and-commit.

   Uses the GitHub contents API with a fine-grained token the instructor pastes
   once. The token lives in this browser's localStorage and is never written to
   the repository. See the README for how to create one and what it can reach.
   ========================================================================== */

window.LWPublish = (function () {
  "use strict";

  var LW = window.LW;
  var TOKEN_KEY = "lw-admin-gh-token";
  /* Overridable so a test can point at a local server and exercise the real
     browser cache, which request interception cannot. */
  var API = LW.meta("lw-github-api", "https://api.github.com");

  function repo() {
    return LW.meta("lw-repo", "");
  }
  function branch() {
    return LW.meta("lw-branch", "main");
  }
  function filePath() {
    return LW.meta("lw-links-path", "links.json");
  }

  function getToken() {
    try {
      return window.localStorage.getItem(TOKEN_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function setToken(token) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      /* storage blocked — it simply will not persist */
    }
  }

  function configured() {
    return !!repo();
  }

  function base64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  function request(method, url, token, body) {
    return fetch(url, {
      method: method,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      /* GitHub sends Cache-Control: private, max-age=60 on authenticated
         responses. Without this the browser answers a repeat read from cache,
         we send a stale sha, and the write comes back 409 — every time, for a
         minute after any publish. */
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /* Turns an HTTP status into something worth reading. */
  function explain(status) {
    if (status === 401) return "GitHub did not accept that key. Create a new one and paste it again.";
    if (status === 403) return "That key cannot write to " + repo() + ". It needs Contents: Read and write.";
    if (status === 404) return "GitHub cannot see " + repo() + ". Check the key grants access to that repository.";
    if (status === 409) return "GitHub kept rejecting the update as out of date. Wait a moment and press Publish again.";
    if (status === 422) return "GitHub rejected the update. Try again.";
    return "GitHub returned an error (" + status + ").";
  }

  function contentsUrl() {
    return API + "/repos/" + repo() + "/contents/" + filePath();
  }

  /* The current file's sha, which GitHub requires in order to replace it. null
     means the file does not exist yet, which is fine for a first publish. */
  function currentSha(token) {
    return request("GET", contentsUrl() + "?ref=" + encodeURIComponent(branch()), token).then(
      function (response) {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(explain(response.status));
        return response.json().then(function (data) {
          return data.sha || null;
        });
      }
    );
  }

  function put(token, json, sha) {
    var body = {
      message: "Update class links",
      content: base64(json),
      branch: branch()
    };
    if (sha) body.sha = sha;
    return request("PUT", contentsUrl(), token, body).then(function (response) {
      if (response.ok) return response.json();
      var error = new Error(explain(response.status));
      error.status = response.status;
      throw error;
    });
  }

  /* Confirms the key can reach the repository, without writing anything. */
  function check(token) {
    if (!configured()) return Promise.reject(new Error("No repository is configured for publishing."));
    if (!token) return Promise.reject(new Error("Paste a publishing key first."));
    return request("GET", API + "/repos/" + repo(), token).then(function (response) {
      if (!response.ok) throw new Error(explain(response.status));
      return response.json().then(function (data) {
        return data.full_name || repo();
      });
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  /* A 409 means the sha we sent was not the file's current one. That happens
     when the file genuinely changed, and also for a short window after a
     successful publish, while GitHub still answers reads with the previous
     sha. Retrying instantly reads the same stale value, so each attempt waits
     a little longer before looking again. */
  var RETRY_DELAYS = [400, 1200, 3000];

  function attempt(token, json, tries) {
    return currentSha(token)
      .then(function (sha) {
        return put(token, json, sha);
      })
      .catch(function (err) {
        if (err && err.status === 409 && tries < RETRY_DELAYS.length) {
          return wait(RETRY_DELAYS[tries]).then(function () {
            return attempt(token, json, tries + 1);
          });
        }
        throw err;
      });
  }

  function publish(config) {
    var token = getToken();
    if (!configured()) return Promise.reject(new Error("No repository is configured for publishing."));
    if (!token) return Promise.reject(new Error("Paste a publishing key first, then Publish."));
    return attempt(token, LW.toPublishedJson(config), 0);
  }

  return {
    TOKEN_KEY: TOKEN_KEY,
    repo: repo,
    branch: branch,
    configured: configured,
    getToken: getToken,
    setToken: setToken,
    check: check,
    publish: publish
  };
})();
