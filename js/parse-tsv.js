// Tab-separated parser. It mirrors the vendored `tsv` package's Parser('\t') that the
// old page used, so values come out identical: integers become numbers, everything
// else (including decimals) stays a string. Do not "fix" the decimal handling here,
// the scores are compared against the old page's output.

const LINE_BREAK = /[\n\r]/;
const COMMENT_PREFIX = /#@/;
const QUOTED = /(['"]?)(.*)\1/;

function unquote(text) {
  const match = text.match(QUOTED);
  return (match && match[2]) || text;
}

function toValue(raw) {
  const value = unquote(raw);
  const number = +value;
  return number === parseInt(value, 10) ? number : value;
}

function isDataLine(line) {
  return !COMMENT_PREFIX.test(line[0]);
}

function splitValues(line, separator) {
  return line.split(separator).map(toValue);
}

/**
 * @param {string} text Whole file contents.
 * @param {string} [separator="\t"]
 * @returns {Array<Record<string, string | number>>} One object per data line, keyed by header.
 */
export function parseTsv(text, separator = '\t') {
  const lines = text.split(LINE_BREAK).filter(isDataLine);
  const header = splitValues(lines.shift(), separator);
  if (lines.length < 1) return [];

  return lines.map((line) => {
    const row = {};
    splitValues(line, separator).forEach((value, index) => {
      row[header[index] || index] = value;
    });
    return row;
  });
}
