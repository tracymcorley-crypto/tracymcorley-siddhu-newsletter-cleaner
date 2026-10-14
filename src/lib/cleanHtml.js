const PERSONAL_EMAIL_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
];

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function isPersonalEmail(email) {
  const lower = email.toLowerCase();
  const atIdx = lower.lastIndexOf("@");
  if (atIdx === -1) return false;
  const domain = lower.slice(atIdx + 1);
  return PERSONAL_EMAIL_PROVIDERS.includes(domain);
}

function processEmail(email) {
  if (isPersonalEmail(email)) {
    return email.replace(/[@.]/g, "");
  }
  return email.replace(/@/g, "");
}

function processEmails(html, opts) {
  return html.replace(EMAIL_REGEX, (match) => {
    const isPersonal = isPersonalEmail(match);
    if (isPersonal && opts.personalEmails) return processEmail(match);
    if (!isPersonal && opts.businessEmails) return processEmail(match);
    return match;
  });
}

function countEmails(html, opts) {
  const matches = html.match(EMAIL_REGEX) || [];
  return matches.filter((e) => {
    const isPersonal = isPersonalEmail(e);
    return (isPersonal && opts.personalEmails) || (!isPersonal && opts.businessEmails);
  }).length;
}

function processAttr(html, attrName) {
  const attrRegex = new RegExp(
    `\\b${attrName}\\s*=\\s*("([^"]*)"|'([^']*)')`,
    "g"
  );
  return html.replace(attrRegex, (full, quoted, dqVal, sqVal) => {
    const value = dqVal !== undefined ? dqVal : sqVal;
    const quote = dqVal !== undefined ? '"' : "'";
    if (value.startsWith("tel:")) return full;
    try {
      const url = new URL(value);
      let cleaned = url.pathname + url.search + url.hash;
      if (!cleaned.startsWith("/")) cleaned = "/" + cleaned;
      return `${attrName}=${quote}${cleaned}${quote}`;
    } catch {
      return full;
    }
  });
}

function countAttr(html, attrName) {
  const attrRegex = new RegExp(
    `\\b${attrName}\\s*=\\s*("([^"]*)"|'([^']*)')`,
    "g"
  );
  let count = 0;
  let match;
  while ((match = attrRegex.exec(html)) !== null) {
    const val = match[2] !== undefined ? match[2] : match[3];
    if (val.startsWith("tel:")) continue;
    try {
      new URL(val);
      count++;
    } catch {
      /* not a valid URL, skip */
    }
  }
  return count;
}

// ─── Smart Phone Number Detection ──────────────────────────────
// Matches phone-number-formatted digit groups. Requires multiple
// digit groups separated by dashes/dots/spaces or parenthesized area
// codes, so address numbers, ZIP codes, prices, and dates are skipped.

const PHONE_REGEX =
  /\(\d{3}\)\s*\d{3}[-.\s]\d{4}|\+\d{1,3}[-.\s]\d{3}[-.\s]\d{3}[-.\s]\d{4}|\b1[-.\s]\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b\d{3}[-]\d{4}\b/g;

function processTelLinks(html) {
  const telHrefRegex = /(href\s*=\s*["'])tel:[^"']*["']/gi;
  let count = 0;
  const cleaned = html.replace(telHrefRegex, (match, prefix) => {
    count++;
    return `${prefix}#${prefix.includes('"') ? '"' : "'"}`;
  });
  return { cleaned, count };
}

function removePhoneNumbersFromText(text) {
  let count = 0;
  const cleaned = text.replace(PHONE_REGEX, () => {
    count++;
    return "";
  });
  return { cleaned, count };
}

function processPhoneNumbers(html) {
  const telResult = processTelLinks(html);
  html = telResult.cleaned;
  let count = telResult.count;

  let cleaned = "";
  let pos = 0;

  while (pos < html.length) {
    if (html.startsWith("<!--", pos)) {
      const commentEnd = html.indexOf("-->", pos + 4);
      if (commentEnd !== -1) {
        cleaned += html.slice(pos, commentEnd + 3);
        pos = commentEnd + 3;
      } else {
        cleaned += html.slice(pos);
        break;
      }
      continue;
    }

    if (html[pos] === "<") {
      const tagEnd = html.indexOf(">", pos);
      if (tagEnd === -1) {
        cleaned += html.slice(pos);
        break;
      }
      const tag = html.slice(pos, tagEnd + 1);
      cleaned += tag;
      pos = tagEnd + 1;

      const openMatch = tag.match(/^<\s*(script|style)\b/i);
      if (openMatch && !/^<\s*\//.test(tag)) {
        const tagName = openMatch[1];
        const closePattern = new RegExp(`</\\s*${tagName}\\s*>`, "i");
        const closeMatch = html.slice(pos).match(closePattern);
        if (closeMatch) {
          const closeEnd = pos + closeMatch.index + closeMatch[0].length;
          cleaned += html.slice(pos, closeEnd);
          pos = closeEnd;
        }
      }
      continue;
    }

    let textEnd = pos;
    while (textEnd < html.length && html[textEnd] !== "<") {
      textEnd++;
    }
    const text = html.slice(pos, textEnd);
    const result = removePhoneNumbersFromText(text);
    cleaned += result.cleaned;
    count += result.count;
    pos = textEnd;
  }

  return { cleaned, count };
}

// ─── Cleaner 2 Functions ───────────────────────────────────────

function removeLinks(html) {
  const hrefRegex = /\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let count = 0;
  const cleaned = html.replace(hrefRegex, (full, quoted, dqVal, sqVal) => {
    count++;
    const quote = dqVal !== undefined ? '"' : "'";
    return `href=${quote}#${quote}`;
  });
  return { cleaned, count };
}

function removeSrcAttrs(html) {
  const srcRegex = /\bsrc\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let count = 0;
  const cleaned = html.replace(srcRegex, (full, quoted, dqVal, sqVal) => {
    count++;
    const quote = dqVal !== undefined ? '"' : "'";
    return `src=${quote}#${quote}`;
  });
  return { cleaned, count };
}

function removeTextContent(html) {
  let cleaned = "";
  let pos = 0;
  let count = 0;

  while (pos < html.length) {
    if (html.startsWith("<!--", pos)) {
      const commentEnd = html.indexOf("-->", pos + 4);
      if (commentEnd !== -1) {
        cleaned += html.slice(pos, commentEnd + 3);
        pos = commentEnd + 3;
      } else {
        cleaned += html.slice(pos);
        break;
      }
      continue;
    }

    if (html[pos] === "<") {
      const tagEnd = html.indexOf(">", pos);
      if (tagEnd === -1) {
        cleaned += html.slice(pos);
        break;
      }
      const tag = html.slice(pos, tagEnd + 1);
      cleaned += tag;
      pos = tagEnd + 1;

      const openMatch = tag.match(/^<\s*(script|style)\b/i);
      if (openMatch && !/^<\s*\//.test(tag)) {
        const tagName = openMatch[1];
        const closePattern = new RegExp(`</\\s*${tagName}\\s*>`, "i");
        const closeMatch = html.slice(pos).match(closePattern);
        if (closeMatch) {
          const closeEnd = pos + closeMatch.index + closeMatch[0].length;
          cleaned += html.slice(pos, closeEnd);
          pos = closeEnd;
        }
      }
      continue;
    }

    let textEnd = pos;
    while (textEnd < html.length && html[textEnd] !== "<") {
      textEnd++;
    }
    const text = html.slice(pos, textEnd);
    const trimmed = text.trim();
    if (trimmed) count += trimmed.length;
    pos = textEnd;
  }

  return { cleaned, count };
}

// ─── Exports ───────────────────────────────────────────────────

export function cleanNewsletterHtml(input, options) {
  if (!input || !input.trim()) {
    return { html: "", stats: { hrefs: 0, srcs: 0, emails: 0, numbers: 0 } };
  }

  const opts = options || {
    href: true,
    src: true,
    businessEmails: true,
    personalEmails: true,
    numbers: true,
  };

  let html = input;

  if (opts.businessEmails || opts.personalEmails) {
    html = processEmails(html, opts);
  }

  let hrefsProcessed = 0;
  let srcsProcessed = 0;
  let emailsProcessed = 0;
  let numbersProcessed = 0;

  emailsProcessed = countEmails(input, opts);

  if (opts.numbers) {
    const result = processPhoneNumbers(html);
    html = result.cleaned;
    numbersProcessed = result.count;
  }

  if (opts.href) {
    hrefsProcessed = countAttr(html, "href");
    html = processAttr(html, "href");
  }

  if (opts.src) {
    srcsProcessed = countAttr(html, "src");
    html = processAttr(html, "src");
  }

  return {
    html,
    stats: {
      hrefs: hrefsProcessed,
      srcs: srcsProcessed,
      emails: emailsProcessed,
      numbers: numbersProcessed,
    },
  };
}

export function cleanNewsletterHtml2(input, options) {
  if (!input || !input.trim()) {
    return { html: "", stats: { links: 0, srcs: 0, text: 0, numbers: 0 } };
  }

  const opts = options || {
    removeLinks: true,
    removeSrc: true,
    removeText: true,
    removeNumbers: true,
  };

  let html = input;
  let linksProcessed = 0;
  let srcsProcessed = 0;
  let textProcessed = 0;
  let numbersProcessed = 0;

  if (opts.removeLinks) {
    const result = removeLinks(html);
    html = result.cleaned;
    linksProcessed = result.count;
  }

  if (opts.removeSrc) {
    const result = removeSrcAttrs(html);
    html = result.cleaned;
    srcsProcessed = result.count;
  }

  if (opts.removeNumbers) {
    const result = processPhoneNumbers(html);
    html = result.cleaned;
    numbersProcessed = result.count;
  }

  if (opts.removeText) {
    const result = removeTextContent(html);
    html = result.cleaned;
    textProcessed = result.count;
  }

  return {
    html,
    stats: {
      links: linksProcessed,
      srcs: srcsProcessed,
      text: textProcessed,
      numbers: numbersProcessed,
    },
  };
}
