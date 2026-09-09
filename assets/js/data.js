/* ==========================================================================
   Shared data model for the student and admin pages.
   Plain script (no modules) so the pages also work opened straight from disk.
   ========================================================================== */

window.LW = (function () {
  "use strict";

  var STORAGE_KEY = "lw-leadership-links";

  var SESSIONS = [
    { number: "01", title: "Identity, Presence & Joy",                          format: "Zoom" },
    { number: "02", title: "Whole-Brain Discipleship & Relational Maturity",    format: "Zoom" },
    { number: "03", title: "Emotional Regulation & Enemy Mode",                 format: "Zoom" },
    { number: "04", title: "Joy & Kingdom Community",                           format: "In-Person" },
    { number: "05", title: "Group Identity & Five Rhythms",                     format: "Zoom" },
    { number: "06", title: "Repairing Joy & Rebuilding Trust",                  format: "Zoom" },
    { number: "07", title: "Differentiation, Boundaries & Intentional Neglect", format: "Zoom" },
    { number: "08", title: "Inside-Out Leadership Plan & Celebration",          format: "In-Person" }
  ];

  var SESSION_COUNT = SESSIONS.length;
  var DOC_FIELDS = ["syllabusUrl", "leaderSyllabusUrl", "assignmentsUrl"];

  /* --- Vimeo ------------------------------------------------------------- */
  /* Takes anything Vimeo hands you: the address bar, the Share dialog's link,
     the full <iframe> embed code, or a bare ID. Unlisted videos carry a privacy
     hash that the embed will not play without, so it is captured too. */

  function parseVimeo(raw) {
    var text = String(raw == null ? "" : raw).trim();
    if (!text) return null;

    /* The Share dialog gives a whole <iframe>. Work from its src. */
    var iframe = text.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
    if (iframe) text = iframe[1].replace(/&amp;/gi, "&");

    var id = "";
    var hash = "";

    var player = text.match(/player\.vimeo\.com\/video\/(\d+)/i);
    if (player) {
      id = player[1];
    } else {
      /* vimeo.com/<id>[/<hash>], and the /manage/videos/, /channels/, /groups/
         and /album/ shapes. The hash is hex, which keeps a trailing path
         segment like "settings" from being mistaken for one. */
      var page = text.match(/vimeo\.com\/(?:[\w-]+\/)*?(\d{6,})(?:\/([0-9a-f]{6,}))?/i);
      if (page) {
        id = page[1];
        hash = page[2] || "";
      }
    }

    if (!id) {
      var any = text.match(/(\d{6,})/);
      if (any) id = any[1];
    }
    if (!id) return null;

    if (!hash) {
      var query = text.match(/[?&]h=([0-9a-zA-Z]+)/i);
      if (query) hash = query[1];
    }

    return { id: id, hash: hash };
  }

  function emptyVideo() {
    return { id: "", hash: "" };
  }

  /* Accepts an object, a legacy bare-ID string, or anything pasted. */
  function toVideo(value) {
    if (value && typeof value === "object") {
      var id = typeof value.id === "string" ? value.id.trim() : "";
      if (!/^\d+$/.test(id)) return emptyVideo();
      var hash = typeof value.hash === "string" ? value.hash.trim() : "";
      return { id: id, hash: hash };
    }
    return parseVimeo(value) || emptyVideo();
  }

  function hasVideo(video) {
    return !!(video && video.id);
  }

  function embedUrl(video) {
    if (!hasVideo(video)) return "";
    return (
      "https://player.vimeo.com/video/" +
      encodeURIComponent(video.id) +
      (video.hash ? "?h=" + encodeURIComponent(video.hash) : "")
    );
  }

  /* The address a person recognizes, for showing back in the admin form. */
  function watchUrl(video) {
    if (!hasVideo(video)) return "";
    return "https://vimeo.com/" + video.id + (video.hash ? "/" + video.hash : "");
  }

  /* --- Links -------------------------------------------------------------- */

  /* Only http(s) links are ever written into an href. A schemeless paste is
     assumed to be https; anything else (javascript:, data:) is dropped. */
  function safeUrl(raw) {
    var value = String(raw == null ? "" : raw).trim();
    if (!value) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = "https://" + value;
    try {
      var url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (err) {
      return "";
    }
  }

  /* --- Slides ------------------------------------------------------------- */

  /* A share link and an embeddable link are not the same address. Google Drive
     serves /view as a page and /preview as something an iframe can show, so the
     pasted link is translated rather than the instructor having to know. */
  function slidesEmbedUrl(raw) {
    var url = safeUrl(raw);
    if (!url) return "";

    var drive = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (drive) return "https://drive.google.com/file/d/" + drive[1] + "/preview";

    var driveOpen = url.match(/drive\.google\.com\/open\?id=([^&#]+)/i);
    if (driveOpen) return "https://drive.google.com/file/d/" + driveOpen[1] + "/preview";

    var docs = url.match(/docs\.google\.com\/(?:presentation|document)\/d\/([^/?#]+)/i);
    if (docs) return url.replace(/\/(edit|view|pub)[^/]*$/i, "/preview");

    if (/dropbox\.com/i.test(url)) return url.replace(/([?&])dl=0/i, "$1raw=1");

    return url;
  }

  /* --- Config ------------------------------------------------------------- */

  function emptyConfig() {
    var videos = [];
    var slides = [];
    for (var i = 0; i < SESSION_COUNT; i++) {
      videos.push(emptyVideo());
      slides.push("");
    }
    return {
      videos: videos,
      slides: slides,
      syllabusUrl: "",
      leaderSyllabusUrl: "",
      assignmentsUrl: ""
    };
  }

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalize(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var config = emptyConfig();
    for (var i = 0; i < SESSION_COUNT; i++) {
      if (Array.isArray(source.videos)) config.videos[i] = toVideo(source.videos[i]);
      if (Array.isArray(source.slides)) config.slides[i] = toText(source.slides[i]);
    }
    DOC_FIELDS.forEach(function (key) {
      config[key] = toText(source[key]);
    });
    return config;
  }

  function loadConfig() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? normalize(JSON.parse(stored)) : emptyConfig();
    } catch (err) {
      /* Private browsing, blocked storage, or corrupt JSON. */
      return emptyConfig();
    }
  }

  function saveConfig(config) {
    var clean = normalize(config);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  function clearConfig() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* nothing to do */
    }
  }

  /* --- The published list -------------------------------------------------- */

  function meta(name, fallback) {
    var tag = document.querySelector('meta[name="' + name + '"]');
    return tag && tag.content ? tag.content : fallback;
  }

  function publishedUrl() {
    return meta("lw-links-url", "links.json");
  }

  function fetchPublished() {
    if (!window.fetch) return Promise.resolve(null);
    return fetch(publishedUrl(), { cache: "no-cache" })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (json) {
        return json ? normalize(json) : null;
      })
      .catch(function () {
        /* Missing file, or opened over file:// where fetch is blocked. */
        return null;
      });
  }

  /* Anything saved in this browser shows on top of the published list, so the
     instructor can preview a link before publishing it. A blank local field
     never blanks out a published one. */
  function merge(base, overlay) {
    var result = normalize(base);
    var top = normalize(overlay);
    for (var i = 0; i < SESSION_COUNT; i++) {
      if (hasVideo(top.videos[i])) result.videos[i] = top.videos[i];
      if (top.slides[i]) result.slides[i] = top.slides[i];
    }
    DOC_FIELDS.forEach(function (key) {
      if (top[key]) result[key] = top[key];
    });
    return result;
  }

  function loadEffectiveConfig() {
    var local = loadConfig();
    return fetchPublished().then(function (published) {
      return published ? merge(published, local) : local;
    });
  }

  /* The exact bytes written to links.json. */
  function toPublishedJson(config) {
    return JSON.stringify(normalize(config), null, 2) + "\n";
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SESSIONS: SESSIONS,
    SESSION_COUNT: SESSION_COUNT,
    DOC_FIELDS: DOC_FIELDS,
    parseVimeo: parseVimeo,
    emptyVideo: emptyVideo,
    toVideo: toVideo,
    hasVideo: hasVideo,
    embedUrl: embedUrl,
    watchUrl: watchUrl,
    safeUrl: safeUrl,
    slidesEmbedUrl: slidesEmbedUrl,
    emptyConfig: emptyConfig,
    normalize: normalize,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    fetchPublished: fetchPublished,
    loadEffectiveConfig: loadEffectiveConfig,
    merge: merge,
    toPublishedJson: toPublishedJson,
    meta: meta
  };
})();
