// 한글은 전각, 영문·숫자는 여유를 둔 반각 폭으로 계산해 좁은 날짜 칸의 겹침을 방지합니다.
export const pdfTextWidth = (text: string, fontSize: number) =>
  Array.from(text).reduce((width, character) => {
    if (character === " ") return width + fontSize * 0.35;

    return width + fontSize * (character.codePointAt(0)! <= 0x7f ? 0.65 : 1);
  }, 0);

export const truncatePdfText = (
  text: string,
  maximumWidth: number,
  fontSize: number,
) => {
  if (pdfTextWidth(text, fontSize) <= maximumWidth) return text;

  let result = "";
  for (const character of Array.from(text)) {
    if (pdfTextWidth(`${result}${character}…`, fontSize) > maximumWidth) break;
    result += character;
  }

  return `${result}…`;
};
