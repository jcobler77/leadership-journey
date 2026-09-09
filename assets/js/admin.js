/* Admin page: builds one field block per session, mirrors the saved config
   into the inputs, and writes it back on Save. */

(function () {
  "use strict";

  var LW = window.LW;
  var DOC_FIELDS = ["syllabusUrl", "leaderSyllabusUrl", "assignmentsUrl"];

  var videoInputs = [];
  var slidesInputs = [];
  var statusLines = [];
  var docInputs = {};

  var message = document.getElementById("message");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function field(labelText, input) {
    var wrapper = el("div", "field");
    var label = el("label", "field-label", labelText);
    label.htmlFor = input.id;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  function makeInput(id, placeholder) {
    var input = el("input", "input");
    input.id = id;
    input.type = "text";
    input.inputMode = "url";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = placeholder;
    return input;
  }

  /* Empty when blank, the parsed ID when one is found, a plain note when the
     field has text but no ID in it. */
  function updateStatus(index) {
    var raw = videoInputs[index].value.trim();
    var line = statusLines[index];
    if (!raw) {
      line.textContent = "";
      line.setAttribute("data-state", "empty");
      return;
    }
    var id = LW.parseVimeoId(raw);
    if (id) {
      line.textContent = "Embeds Vimeo " + id;
      line.setAttribute("data-state", "ok");
    } else {
      line.textContent = "No Vimeo ID found in that link";
      line.setAttribute("data-state", "none");
    }
  }

  function buildSessionFields() {
    var host = document.getElementById("session-fields");
    if (!host) return;
    var fragment = document.createDocumentFragment();

    LW.SESSIONS.forEach(function (session, index) {
      var block = el("div", "field-block");
      block.appendChild(
        el("p", "field-title", session.number + " · " + session.title)
      );

      var video = makeInput("video-" + index, "https://vimeo.com/123456789");
      var videoField = field("Vimeo URL or ID", video);
      var status = el("p", "field-status");
      status.id = "video-status-" + index;
      status.setAttribute("data-state", "empty");
      videoField.appendChild(status);
      block.appendChild(videoField);

      var slides = makeInput("slides-" + index, "https://gamma.app/docs/...");
      block.appendChild(field("Gamma slides link", slides));

      video.addEventListener("input", function () {
        video.dataset.dirty = "1";
        updateStatus(index);
      });
      slides.addEventListener("input", function () {
        slides.dataset.dirty = "1";
      });

      videoInputs.push(video);
      slidesInputs.push(slides);
      statusLines.push(status);
      fragment.appendChild(block);
    });

    host.appendChild(fragment);
  }

  function collectDocInputs() {
    DOC_FIELDS.forEach(function (name) {
      var input = document.getElementById("doc-" + name);
      docInputs[name] = input;
      if (input) {
        input.addEventListener("input", function () {
          input.dataset.dirty = "1";
        });
      }
    });
  }

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
      set(input, config.videos[index], keepEdits);
      updateStatus(index);
    });
    slidesInputs.forEach(function (input, index) {
      set(input, config.slides[index], keepEdits);
    });
    DOC_FIELDS.forEach(function (name) {
      set(docInputs[name], config[name], keepEdits);
    });
  }

  function readForm() {
    var config = LW.emptyConfig();
    videoInputs.forEach(function (input, index) {
      config.videos[index] = input.value.trim();
    });
    slidesInputs.forEach(function (input, index) {
      config.slides[index] = input.value.trim();
    });
    DOC_FIELDS.forEach(function (name) {
      config[name] = docInputs[name] ? docInputs[name].value.trim() : "";
    });
    return config;
  }

  function say(text) {
    if (message) message.textContent = text;
  }

  function onSave() {
    try {
      var saved = LW.saveConfig(readForm());
      fillForm(saved); /* show the reduced bare IDs back to the instructor */
      say("Saved on this browser only. Use Copy configuration to publish.");
    } catch (err) {
      say("Could not save — this browser is blocking local storage.");
    }
  }

  function onCopy() {
    /* Pretty-printed so it can be pasted straight into links.json. */
    var payload = JSON.stringify(LW.toPublishable(readForm()), null, 2);
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      say("This browser will not allow copying. Save, then copy by hand.");
      return;
    }
    navigator.clipboard.writeText(payload).then(
      function () {
        say("Copied. Paste it into links.json to publish it to students.");
      },
      function () {
        say("Could not copy to the clipboard.");
      }
    );
  }

  /* State only — nothing is written until Save. */
  function onClear() {
    fillForm(LW.emptyConfig());
    say("Cleared. Press Save to apply.");
  }

  buildSessionFields();
  collectDocInputs();
  LW.loadEffectiveConfig().then(function (config) {
    fillForm(config, true);
  });

  document.getElementById("save").addEventListener("click", onSave);
  document.getElementById("copy").addEventListener("click", onCopy);
  document.getElementById("clear").addEventListener("click", onClear);
})();
