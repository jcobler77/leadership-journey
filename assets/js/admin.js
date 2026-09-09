/* Admin page: one field per session, a live preview of whatever Vimeo link is
   pasted, and a Publish button that writes links.json for the whole class. */

(function () {
  "use strict";

  var LW = window.LW;
  var Publish = window.LWPublish;
  var PREVIEW_DELAY = 450;

  var videoInputs = [];
  var slidesInputs = [];
  var statusLines = [];
  var previews = [];
  var previewTimers = [];
  var docInputs = {};

  var message = document.getElementById("message");
  var tokenInput = document.getElementById("gh-token");
  var tokenStatus = document.getElementById("token-status");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function makeInput(id, placeholder) {
    var input = el("input", "input");
    input.id = id;
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = placeholder;
    return input;
  }

  function field(labelText, input) {
    var wrapper = el("div", "field");
    var label = el("label", "field-label", labelText);
    label.htmlFor = input.id;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  /* --- The video field ---------------------------------------------------- */

  function showPreview(index, video) {
    var host = previews[index];
    var url = LW.embedUrl(video);

    if (!url) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }

    var frame = host.querySelector("iframe");
    if (!frame) {
      host.innerHTML = "";
      frame = el("iframe", "video-frame");
      frame.loading = "lazy";
      frame.allow = "fullscreen; picture-in-picture";
      frame.setAttribute("allowfullscreen", "");
      frame.title = "Preview of session " + LW.SESSIONS[index].number;
      host.appendChild(frame);
    }
    if (frame.src !== url) frame.src = url;
    host.hidden = false;
  }

  function updateVideoField(index, immediate) {
    var raw = videoInputs[index].value.trim();
    var line = statusLines[index];
    var video = raw ? LW.parseVimeo(raw) : null;

    if (!raw) {
      line.textContent = "";
      line.setAttribute("data-state", "empty");
    } else if (video) {
      line.textContent = "Vimeo " + video.id + (video.hash ? " · unlisted link" : "");
      line.setAttribute("data-state", "ok");
    } else {
      line.textContent = "No Vimeo video found in that";
      line.setAttribute("data-state", "none");
    }

    /* Debounced so a half-typed link does not load a player. */
    window.clearTimeout(previewTimers[index]);
    if (immediate) {
      showPreview(index, video);
    } else {
      previewTimers[index] = window.setTimeout(function () {
        showPreview(index, video);
      }, PREVIEW_DELAY);
    }
  }

  function buildSessionFields() {
    var host = document.getElementById("session-fields");
    if (!host) return;
    var fragment = document.createDocumentFragment();

    LW.SESSIONS.forEach(function (session, index) {
      var block = el("div", "field-block");
      block.appendChild(el("p", "field-title", session.number + " · " + session.title));

      var video = makeInput("video-" + index, "Paste the Vimeo link or embed code");
      var videoField = field("Vimeo video", video);
      var status = el("p", "field-status");
      status.id = "video-status-" + index;
      status.setAttribute("data-state", "empty");
      videoField.appendChild(status);
      block.appendChild(videoField);

      var preview = el("div", "video-preview");
      preview.id = "video-preview-" + index;
      preview.hidden = true;
      block.appendChild(preview);

      var slides = makeInput("slides-" + index, "https://gamma.app/docs/...");
      block.appendChild(field("Gamma slides link", slides));

      video.addEventListener("input", function () {
        video.dataset.dirty = "1";
        updateVideoField(index);
      });
      slides.addEventListener("input", function () {
        slides.dataset.dirty = "1";
      });

      videoInputs.push(video);
      slidesInputs.push(slides);
      statusLines.push(status);
      previews.push(preview);
      previewTimers.push(0);
      fragment.appendChild(block);
    });

    host.appendChild(fragment);
  }

  function collectDocInputs() {
    LW.DOC_FIELDS.forEach(function (name) {
      var input = document.getElementById("doc-" + name);
      docInputs[name] = input;
      if (input) {
        input.addEventListener("input", function () {
          input.dataset.dirty = "1";
        });
      }
    });
  }

  /* --- Form <-> config ----------------------------------------------------- */

  function set(input, value, keepEdits) {
    if (!input) return;
    if (keepEdits && input.dataset.dirty === "1") return;
    input.value = value || "";
    delete input.dataset.dirty;
  }

  /* keepEdits guards the first fill, which lands whenever links.json finishes
     loading — by then the instructor may already be typing. */
  function fillForm(config, keepEdits) {
    videoInputs.forEach(function (input, index) {
      set(input, LW.watchUrl(config.videos[index]), keepEdits);
      updateVideoField(index, true);
    });
    slidesInputs.forEach(function (input, index) {
      set(input, config.slides[index], keepEdits);
    });
    LW.DOC_FIELDS.forEach(function (name) {
      set(docInputs[name], config[name], keepEdits);
    });
  }

  function readForm() {
    var config = LW.emptyConfig();
    videoInputs.forEach(function (input, index) {
      config.videos[index] = LW.toVideo(input.value);
    });
    slidesInputs.forEach(function (input, index) {
      config.slides[index] = input.value.trim();
    });
    LW.DOC_FIELDS.forEach(function (name) {
      config[name] = docInputs[name] ? docInputs[name].value.trim() : "";
    });
    return config;
  }

  function say(text) {
    if (message) message.textContent = text;
  }

  function busy(on) {
    ["publish", "save", "copy", "clear"].forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.disabled = on;
    });
  }

  /* --- Actions -------------------------------------------------------------- */

  function onPublish() {
    var config = readForm();
    try {
      LW.saveConfig(config);
    } catch (err) {
      /* Publishing does not depend on local storage working. */
    }

    busy(true);
    say("Publishing…");
    Publish.publish(config).then(
      function () {
        busy(false);
        say("Published. Students see it in about a minute.");
      },
      function (err) {
        busy(false);
        say(err && err.message ? err.message : "Could not publish.");
      }
    );
  }

  function onSave() {
    try {
      var saved = LW.saveConfig(readForm());
      fillForm(saved);
      say("Saved as a preview on this browser. Publish to send it to students.");
    } catch (err) {
      say("Could not save — this browser is blocking local storage.");
    }
  }

  function onCopy() {
    var payload = LW.toPublishedJson(readForm());
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      say("This browser will not allow copying.");
      return;
    }
    navigator.clipboard.writeText(payload).then(
      function () {
        say("Copied. This is the contents of links.json.");
      },
      function () {
        say("Could not copy to the clipboard.");
      }
    );
  }

  /* Empties the form and the local preview. Published links are untouched
     until Publish is pressed. */
  function onClear() {
    fillForm(LW.emptyConfig());
    LW.clearConfig();
    say("Cleared here. Students still see the published links until you publish.");
  }

  /* --- Publishing key ------------------------------------------------------- */

  function tellToken(text, state) {
    if (!tokenStatus) return;
    tokenStatus.textContent = text;
    tokenStatus.setAttribute("data-state", state || "ok");
  }

  function verifyToken(token) {
    tellToken("Checking…", "ok");
    Publish.check(token).then(
      function (name) {
        tellToken("Connected to " + name, "ok");
      },
      function (err) {
        tellToken(err && err.message ? err.message : "Could not reach GitHub.", "none");
      }
    );
  }

  function setUpToken() {
    if (!tokenInput) return;
    if (!Publish.configured()) {
      tellToken("No repository configured — publishing is off.", "none");
      tokenInput.disabled = true;
      return;
    }

    var existing = Publish.getToken();
    if (existing) {
      tokenInput.value = existing;
      verifyToken(existing);
    } else {
      tellToken("Not connected. Paste a key to publish.", "none");
    }

    tokenInput.addEventListener("change", function () {
      var token = tokenInput.value.trim();
      Publish.setToken(token);
      if (token) verifyToken(token);
      else tellToken("Not connected. Paste a key to publish.", "none");
    });
  }

  /* --- Start ---------------------------------------------------------------- */

  buildSessionFields();
  collectDocInputs();
  setUpToken();

  LW.loadEffectiveConfig().then(function (config) {
    fillForm(config, true);
  });

  document.getElementById("publish").addEventListener("click", onPublish);
  document.getElementById("save").addEventListener("click", onSave);
  document.getElementById("copy").addEventListener("click", onCopy);
  document.getElementById("clear").addEventListener("click", onClear);
})();
