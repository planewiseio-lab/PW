import type { ReactNode } from "react";
import Link from "next/link";
import type { LegalBlock } from "@/lib/legal";

const TOKEN =
  /(https:\/\/[^\s]+)|(\/contact)|(\/legal(?:#[a-z0-9-]+)?)|(info@planewise\.io)/g;

function LinkedText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token === "info@planewise.io") {
      nodes.push(
        <a key={`${token}-${match.index}`} href={`mailto:${token}`}>
          {token}
        </a>,
      );
    } else if (token.startsWith("http")) {
      nodes.push(
        <a key={`${token}-${match.index}`} href={token} rel="noopener noreferrer">
          {token}
        </a>,
      );
    } else {
      nodes.push(
        <Link key={`${token}-${match.index}`} href={token}>
          {token}
        </Link>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function ListItem({ item }: { item: string }) {
  const url = item.startsWith("http")
    ? item
    : item.includes("https://")
      ? item.slice(item.indexOf("https://"))
      : null;
  if (url && item.includes("https://") && item !== url) {
    const label = item.slice(0, item.indexOf("https://")).trim().replace(/:$/, "");
    return (
      <li>
        {label ? `${label} : ` : null}
        <a href={url} rel="noopener noreferrer">
          {url}
        </a>
      </li>
    );
  }
  if (url && item === url) {
    return (
      <li>
        <a href={url} rel="noopener noreferrer">
          {url}
        </a>
      </li>
    );
  }
  return (
    <li>
      <LinkedText text={item} />
    </li>
  );
}

export function ArticleBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "h3") return <h3>{block.text}</h3>;
  if (block.type === "ul") {
    return (
      <ul>
        {block.items.map((item) => (
          <ListItem key={item} item={item} />
        ))}
      </ul>
    );
  }
  return (
    <p>
      <LinkedText text={block.text} />
    </p>
  );
}
