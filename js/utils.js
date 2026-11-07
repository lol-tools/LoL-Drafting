// Small helpers shared by the page modules.

/**
 * Red (min) to yellow (mid) to green (max) as a hex colour. Same mapping the old page used
 * for the scaling-difference cells.
 */
export function getColorByNumber(number, min, max) {
  const mid = (min + max) / 2;
  const minColor = { red: 255, green: 0, blue: 0 };
  const midColor = { red: 255, green: 255, blue: 0 };
  const maxColor = { red: 0, green: 255, blue: 0 };
  const answer = { red: 0, green: 0, blue: 0 };
  if (Math.abs(number - min) < Math.abs(max - number)) {
    const percentFromMid = (number - min) / (mid - min);
    answer.red = minColor.red + Math.round((midColor.red - minColor.red) * percentFromMid);
    answer.green = minColor.green + Math.round((midColor.green - minColor.green) * percentFromMid);
    answer.blue = minColor.blue + Math.round((midColor.blue - minColor.blue) * percentFromMid);
  } else {
    const percentFromMid = (number - mid) / (max - mid);
    answer.red = midColor.red + Math.round((maxColor.red - midColor.red) * percentFromMid);
    answer.green = midColor.green + Math.round((maxColor.green - midColor.green) * percentFromMid);
    answer.blue = midColor.blue + Math.round((maxColor.blue - midColor.blue) * percentFromMid);
  }
  return '#' + [answer.red, answer.green, answer.blue].map((c) => c.toString(16).padStart(2, '0')).join('');
}
