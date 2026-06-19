type Props = {
  html: string;
  title?: string;
};

function buildSrcDoc(html: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1000, initial-scale=1" />
<style>
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    background: transparent;
  }
  * { box-sizing: border-box; }
</style>
</head>
<body>${html}</body>
</html>`;
}

export function HtmlSlideRenderer({ html, title = "HTML slide" }: Props) {
  return (
    <iframe
      title={title}
      srcDoc={buildSrcDoc(html)}
      sandbox="allow-scripts"
      style={{
        width: "100%",
        height: "100%",
        border: 0,
        display: "block",
        background: "transparent",
      }}
    />
  );
}
