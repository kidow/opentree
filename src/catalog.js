const TEMPLATE_VALUES = ["glass", "terminal"];
const CLICK_TRACKING_VALUES = ["off", "local"];
const SOCIAL_CARD_STYLE_VALUES = ["glass", "terminal"];

const LINK_PRESETS = {
  github: {
    title: "GitHub",
    url: (handle) => `https://github.com/${handle}`
  },
  linkedin: {
    title: "LinkedIn",
    url: (handle) => `https://www.linkedin.com/in/${handle}`
  },
  x: {
    title: "X",
    url: (handle) => `https://x.com/${handle}`
  },
  youtube: {
    title: "YouTube",
    url: (handle) => `https://www.youtube.com/@${handle}`
  }
};

module.exports = {
  CLICK_TRACKING_VALUES,
  LINK_PRESETS,
  SOCIAL_CARD_STYLE_VALUES,
  TEMPLATE_VALUES
};
