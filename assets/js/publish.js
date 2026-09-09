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
  var API = "https://api.github.com";

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
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /* Turns an HTTP status into something worth reading. */
  function explain(status) {
    if (status === 401) return "GitHub did not accept that key. Create a new one and paste it again.";
    if (status === 403) return "That key cannot write to " + repo() + ". It needs Contents: Read and write.";
    if (status === 404) return "GitHub cannot see " + repo() + ". Check the key grants access to that repository.";
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

  function publish(config) {
    var token = getToken();
    if (!configured()) return Promise.reject(new Error("No repository is configured for publishing."));
    if (!token) return Promise.reject(new Error("Paste a publishing key first, then Publish."));

    var json = LW.toPublishedJson(config);

    /* A 409 means the file changed between read and write; one retry with a
       fresh sha settles it. */
    return currentSha(token)
      .then(function (sha) {
        return put(token, json, sha);
      })
      .catch(function (err) {
        if (err && err.status === 409) {
          return currentSha(token).then(function (sha) {
            return put(token, json, sha);
          });
        }
        throw err;
      });
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
