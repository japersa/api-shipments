export class TextFunctions {
  static cleanSpecialCharacters(text: string = '') {
    let textFormat = text
      .toString()
      .replace(/[^a-zA-Z0-9.,áéíóú+ÁÉÍÓÚñÑ\s]/g, '');
    textFormat = textFormat.replace(/(\r\n\t|\n|\t|\r)/gm, '').trim();
    return textFormat;
  }
}