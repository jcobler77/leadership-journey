/* Student page: renders the eight session cards and points the document
   buttons at whatever the instructor has saved. */

(function () {
  "use strict";

  var LW = window.LW;
  var config = LW.emptyConfig();

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildVideo(session, index) {
    var video = config.videos[index];

    if (LW.hasVideo(video)) {
      var frame = el("iframe", "video-frame");
      frame.src = LW.embedUrl(video);
      frame.title = "Session " + session.number + " · " + session.title;
      frame.loading = "lazy";
      frame.allow = "autoplay; fullscreen; picture-in-picture";
      frame.setAttribute("allowfullscreen", "");
      return frame;
    }

    var placeholder = el("div", "video-placeholder");
    placeholder.appendChild(el("p", "kicker kicker-sm", "Video posts after the session"));
    placeholder.appendChild(
      el("p", "video-placeholder-title", "Session " + session.number + " · Vimeo")
    );
    return placeholder;
  }

  function buildCard(session, index) {
    var card = el("article", "session-card");

    var head = el("div", "session-head");
    head.appendChild(el("span", "session-num", session.number));

    var meta = el("div", "session-meta");
    meta.appendChild(el("h3", "card-title", session.title));
    meta.appendChild(el("span", "tag tag-neutral", session.format));
    head.appendChild(meta);
    card.appendChild(head);

    card.appendChild(buildVideo(session, index));

    /* The slides button is absent entirely when there is no link. */
    var slidesUrl = LW.safeUrl(config.slides[index]);
    if (slidesUrl) {
      var link = el("a", "btn btn-secondary", "Session slides");
      link.href = slidesUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute(
        "aria-label",
        "Session " + session.number + " slides — " + session.title
      );
      card.appendChild(link);
    }

    return card;
  }

  function renderSessions() {
    var grid = document.getElementById("session-grid");
    if (!grid) return;
    var fragment = document.createDocumentFragment();
    LW.SESSIONS.forEach(function (session, index) {
      fragment.appendChild(buildCard(session, index));
    });
    grid.appendChild(fragment);
  }

  /* A document button with no link stays visible but disabled, so students can
     see the material exists and is simply not posted yet. */
  function applyDocumentLink(id, rawUrl) {
    var node = document.getElementById(id);
    if (!node) return;
    var url = LW.safeUrl(rawUrl);
    if (url) {
      node.href = url;
      node.removeAttribute("aria-disabled");
    } else {
      node.removeAttribute("href");
      node.setAttribute("aria-disabled", "true");
      node.setAttribute("title", "Not posted yet");
    }
  }

  LW.loadEffectiveConfig().then(function (effective) {
    config = effective;
    renderSessions();
    applyDocumentLink("syllabus-link", config.syllabusUrl);
    applyDocumentLink("leader-syllabus-link", config.leaderSyllabusUrl);
    applyDocumentLink("assignments-link", config.assignmentsUrl);
  });
})();
