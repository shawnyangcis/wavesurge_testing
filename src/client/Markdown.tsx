import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function Markdown({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ img: () => null, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{text}</ReactMarkdown>;
}
