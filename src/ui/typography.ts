// French typography applied at render time: station texts keep plain spaces in the data.
const NBSP = ' ';

/** Non-breaking space before « : ; ? ! » and inside « ». Code-like text (learn) is left alone by the caller. */
export const fr = (text: string) =>
  text
    .replace(/ ([:;?!»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`);
