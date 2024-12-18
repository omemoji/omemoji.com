export interface LinkCardProps {
  url: string;
  title: string;
  description: string;
  og_imgUrl: string | undefined;
  og_w: number | undefined;
  og_h: number | undefined;
}
import Picture from "next-export-optimize-images/picture";

const shortenURL = (url: string) => {
  const starts = url.indexOf("/") + 2;
  const leftShortenURL = url.substring(starts);
  const ends = leftShortenURL.indexOf("/");
  const URL = ends != -1 ? leftShortenURL.substring(0, ends) : leftShortenURL;
  return URL;
};

export default function LinkCard({
  url,
  title,
  description,
  og_imgUrl,
  og_w,
  og_h,
}: LinkCardProps) {
  return (
    <div className="my-6">
      <a
        href={url}
        target="_blank"
        rel="noopener"
        className=" hover:no-underline "
      >
        <div className=" hover:bg-gray-400/30 transition-colors w-full  h-[120px] rounded-lg border-solid border border-[color:var(--border)] flex ">
          <div className="p-4 pr-0 flex overflow-hidden flex-col mr-auto w-full">
            <div className="text-[color:var(--fg)] whitespace-nowrap xs:text-lg font-bold overflow-hidden text-ellipsis">
              {title}{" "}
            </div>
            <div className="text-[color:var(--quote)] whitespace-nowrap  text-sm   overflow-hidden m-0 text-ellipsis">
              {description}
            </div>
            <div className="text-[color:var(--link)] whitespace-nowrap overflow-hidden mb-0 mt-auto  pb-0 text-sm text-ellipsis">
              {shortenURL(url)}
            </div>
          </div>

          {og_imgUrl !== "" && (
            <Picture
              src={og_imgUrl}
              width={og_w}
              height={og_h}
              quote={30}
              alt=""
              loading="lazy"
              className="h-[118px] max-w-[120px] xs:max-w-[300px] w-auto m-0 rounded-r-lg object-cover"
            />
          )}
        </div>
      </a>
    </div>
  );
}
