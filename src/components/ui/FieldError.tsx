export function FieldError({
  id,
  message,
  hidden,
  defaultMessage = "Please enter your email address.",
}: {
  id?: string;
  message: string;
  hidden: boolean;
  defaultMessage?: string;
}) {
  return (
    <p className={`field-error${hidden ? " hidden" : ""}`} id={id} role="alert">
      {message || defaultMessage}
    </p>
  );
}
