import type { Link, Text } from "mdast";
import type { Literal, Node } from "unist";

function isObject(target: unknown): target is { [key: string]: unknown } {
  return typeof target === "object" && target !== null;
}

// https://github.com/syntax-tree/unist#node
export function isNode(node: unknown): node is Node {
  return isObject(node) && "type" in node;
}

// https://github.com/syntax-tree/unist#literal
export function isLiteral(node: unknown): node is Literal {
  return isObject(node) && "value" in node;
}

// https://github.com/syntax-tree/mdast#text
export function isText(node: unknown): node is Text {
  return isLiteral(node) && node.type === "text" && typeof node.value === "string";
}

export function isLink(node: unknown): node is Link {
  return isNode(node) && node.type === "link";
}

export function isBareExternalLink(node: unknown): node is Link & {
  children: [Text];
} {
  return (
    isLink(node) &&
    isText(node.children[0]) &&
    node.children[0].value === node.url &&
    node.url.startsWith("http")
  );
}
