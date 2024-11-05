import Picture from "next-export-optimize-images/picture";

export type Props = {
  src: string;
  className?: string;
};

export default function Icon({ src, className }: Props) {
  return (
    <Picture
      src={src}
      width={160}
      height={160}
      className={className + " " + "rounded-full"}
      quality={70}
      alt="omemoji"
    />
  );
}
