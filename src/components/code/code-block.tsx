import { highlightCode } from "@/lib/code/highlight";
import { CodeBlockFrame, type CodeBlockFrameProps } from "./code-block-frame";

type CodeBlockProps = Omit<CodeBlockFrameProps, "html">;

/**
 * Server component: highlights on the server, then hands the HTML to a small
 * client frame for copy / line-number / wrap controls. Code is displayed,
 * never executed.
 */
export async function CodeBlock(props: CodeBlockProps) {
  const html = await highlightCode(props.code, props.language);
  return <CodeBlockFrame {...props} html={html} />;
}
