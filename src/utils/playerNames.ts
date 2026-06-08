export const formatShortPlayerName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return `${firstName.charAt(0)}. ${lastName}`;
};
