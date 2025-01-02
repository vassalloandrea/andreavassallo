import navigation from "src/data/navigation.json";

export type NavigationLeaf = {
  href: string;
  text: string;
  matchPattern: string;
  header: boolean;
};

export type NavigationItem = NavigationLeaf & {
  children?: NavigationLeaf[];
};

function normalizePath(path: string): string {
  let normalized = path === "/" ? "/" : path.replace(/\/$/, "");
  normalized = normalized.replace(/\/index\.html$/, "");

  return normalized || "/";
}

export function isItemActive(item: NavigationItem, currentPath: string): boolean {
  const normalizedPath = normalizePath(currentPath);
  const matchPattern = new RegExp(item.matchPattern);

  if (matchPattern.test(normalizedPath)) {
    return true;
  }

  if (item.children && item.children.length > 0) {
    return item.children.some((child) => {
      return isItemActive(child, normalizedPath);
    });
  }

  return false;
}

export function getHeaderNavigation(): NavigationItem[] {
  return navigation.filter((item: NavigationItem) => item.header);
}
