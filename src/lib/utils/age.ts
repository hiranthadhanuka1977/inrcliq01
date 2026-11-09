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

/** Rejects impossible days such as 31 February, and any birthday after today. */
export function dateOfBirthError(month: number, day: number, year: number) {
  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) {
    return "Please enter a valid date of birth.";
  }
  if (month < 1 || month > 12 || day < 1 || year < 1900 || year > new Date().getFullYear()) {
    return "Please enter a valid date of birth.";
  }
  const birth = new Date(year, month - 1, day);
  birth.setHours(0, 0, 0, 0);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return "Please enter a valid date of birth.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (birth.getTime() > today.getTime()) {
    return "Date of birth cannot be in the future.";
  }
  return null;
}

export function parseDateOfBirth(month: number, day: number, year: number) {
  return new Date(year, month - 1, day);
}
