import Image from "next-export-optimize-images/image";
import getImageSize from "lib/getImageSize";
import { w_md } from "../../../tailwind.config";

export type NextImageProps = {
  src: string;
  category?: string;
  alt: string;
  priority?: boolean;
  className?: string;
  classNameCaption?: string;
};

const w_base = w_md;
const h_base = 540;

const NextImage: React.FC<NextImageProps> = async ({
  src,
  alt,
  category,
  className,
  classNameCaption,
  priority,
}: NextImageProps) => {
  //detect width and height

  const w = (await getImageSize(src)).img.width;
  const h = (await getImageSize(src)).img.height;
  const aspect = w / h;
  const aspect_base = w_base / h_base;

  const width =
    aspect > aspect_base ? Math.min(w_base, w) : Math.min(h_base, h) * aspect;

  const height =
    aspect <= aspect_base ? Math.min(h_base, h) : Math.min(w_base, w) / aspect;
  return (
    <>
      <figure>
        <Image
          width={width}
          height={height}
          src={src}
          alt={alt || src}
          quality={70}
          priority={priority ?? false}
          className={className + " object-contain"}
        />
        {category != "artwork" && (
          <figcaption
            className={
              classNameCaption +
              " " +
              "text-center text-[color:var(--quote)] mt-4"
            }
          >
            {alt}
          </figcaption>
        )}
      </figure>
    </>
  );
};

export default NextImage;
