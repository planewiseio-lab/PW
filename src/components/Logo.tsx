type LogoProps = {
  className?: string;
  size?: number;
  title?: string;
};

/** Official PlaneWise pin (airplane + mountains). */
export function Logo({ className, size = 32, title = "PlaneWise" }: LogoProps) {
  const height = Math.round(size * (594 / 520));
  return (
    // Official raster mark — keep native img so the file is never rewritten.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-pin.png"
      alt={title || ""}
      width={size}
      height={height}
      className={className}
      decoding="async"
    />
  );
}
