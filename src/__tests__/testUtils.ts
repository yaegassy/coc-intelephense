export function printDebug(data: any) {
  console.log(`==DEBUG==: ${JSON.stringify(data, null, 2)}`);
}

export function stripInitialNewline(text: string) {
  return text.replace(/^\n/, '');
}
