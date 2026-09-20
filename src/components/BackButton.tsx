import '@/styles/back-btn.css';

type BackButtonProps = {
  href: string;
  label?: string;
  /** on-dark: hero/page-hero (navy) backgrounds. on-light: over white sections. */
  variant?: 'on-dark' | 'on-light';
  className?: string;
};

export default function BackButton({
  href,
  label = 'Back',
  variant = 'on-dark',
  className = ''
}: BackButtonProps) {
  return (
    <a href={href} className={`back-btn back-btn--${variant} ${className}`.trim()}>
      <svg
        className="back-btn__arrow"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5"></path>
        <path d="M12 19l-7-7 7-7"></path>
      </svg>
      {label}
    </a>
  );
}