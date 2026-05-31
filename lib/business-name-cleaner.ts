export function cleanBusinessName(rawName: string): string {
  // Remove everything after common delimiters that indicate services/taglines
  const delimiters = [' • ', ' - ', ' | ', ' – ', ' — '];
  
  for (const delimiter of delimiters) {
    const index = rawName.indexOf(delimiter);
    if (index > 5) { // Only cut if there's a real name before the delimiter
      rawName = rawName.substring(0, index).trim();
    }
  }
  
  // Remove location suffixes that aren't part of the name
  rawName = rawName.replace(/\s*Warszawa\s*$/i, '');
  rawName = rawName.replace(/\s*Salon fryzjerski\s*$/i, '');
  rawName = rawName.replace(/\s*Salon urody\s*$/i, '');
  
  return rawName.trim();
}
