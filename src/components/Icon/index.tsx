import Image from "next-export-optimize-images/image";

export type Props = {
  src: string;
  className?: string;
};

export default function Icon({ src, className }: Props) {
  return (
    <Image
      src={src}
      width={160}
      height={160}
      className={className + " " + "rounded-full"}
      quality={80}
      alt="omemoji"
      priority={true}
    />
  );
}
