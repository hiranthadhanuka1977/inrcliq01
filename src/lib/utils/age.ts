export function calculateAge(month: number, day: number, year: number) {
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function parseDateOfBirth(month: number, day: number, year: number) {
  return new Date(year, month - 1, day);
}
