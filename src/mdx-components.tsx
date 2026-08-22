import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    table: (props) => (
      <div className="mdx-table-wrap">
        <table {...props} />
      </div>
    ),
  };
}
