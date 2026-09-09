/* ==========================================================================
   Shared data model for the student and admin pages.
   Plain script (no modules) so the pages also work opened straight from disk.
   ========================================================================== */

window.LW = (function () {
  "use strict";

  var STORAGE_KEY = "lw-leadership-links";

  var SESSIONS = [
    { number: "01", title: "Identity, Presence & Joy",                        format: "Zoom" },
    { number: "02", title: "Whole-Brain Discipleship & Relational Maturity",  format: "Zoom" },
    { number: "03", title: "Emotional Regulation & Enemy Mode",               format: "Zoom" },
    { number: "04", title: "Joy & Kingdom Community",                         format: "In-Person" },
    { number: "05", title: "Group Identity & Five Rhythms",                   format: "Zoom" },
    { number: "06", title: "Repairing Joy & Rebuilding Trust",                format: "Zoom" },
    { number: "07", title: "Differentiation, Boundaries & Intentional Neglect", format: "Zoom" },
    { number: "08", title: "Inside-Out Leadership Plan & Celebration",        format: "In-Person" }
  ];

  var SESSION_COUNT = SESSIONS.length;

  /* Accepts a full vimeo.com URL, a player URL, or a bare ID. */
  function parseVimeoId(raw) {
    var match = String(raw == null ? "" : raw).match(/(\d{6,})/);
    return match ? match[1] : "";
  }

  function embedUrl(id) {
    return "https://player.vimeo.com/video/" + id;
  }

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

  function emptyConfig() {
    return {
      videos: new Array(SESSION_COUNT).fill(""),
      slides: new Array(SESSION_COUNT).fill(""),
      syllabusUrl: "",
      leaderSyllabusUrl: "",
      assignmentsUrl: ""
    };
  }

  function toStringList(value) {
    var list = new Array(SESSION_COUNT).fill("");
    if (!Array.isArray(value)) return list;
    for (var i = 0; i < SESSION_COUNT; i++) {
      var entry = value[i];
      list[i] = typeof entry === "string" ? entry.trim() : "";
    }
    return list;
  }

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalize(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    return {
      videos: toStringList(source.videos),
      slides: toStringList(source.slides),
      syllabusUrl: toText(source.syllabusUrl),
      leaderSyllabusUrl: toText(source.leaderSyllabusUrl),
      assignmentsUrl: toText(source.assignmentsUrl)
    };
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
    clean.videos = clean.videos.map(parseVimeoId); /* store bare IDs */
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  function readRawConfig() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SESSIONS: SESSIONS,
    SESSION_COUNT: SESSION_COUNT,
    parseVimeoId: parseVimeoId,
    embedUrl: embedUrl,
    safeUrl: safeUrl,
    emptyConfig: emptyConfig,
    normalize: normalize,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    readRawConfig: readRawConfig
  };
})();
