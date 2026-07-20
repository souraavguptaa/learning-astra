/** Sliding toggle switch — per Bento's radios-checkboxes-toggle.md: "use toggles only for
 * immediate binary settings, not form submission choices." Track fills with the accent color and
 * the thumb slides across on toggle; both are CSS transitions, no JS animation. */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center w-10 h-6 rounded-pill shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra disabled:opacity-50 ${
        checked ? "bg-astra" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-pill shadow transform transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}
